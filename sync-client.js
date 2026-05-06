// sync-client.js
const PUSHER_KEY = '985daeb16dee57e0382b';
const PUSHER_CLUSTER = 'eu';

const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');
const token = urlParams.get('token');
const isMaster = (role === 'master' && token);

console.log('🚀 Sync Client Initialized', { role, isMaster });

// Configuration Pusher
const pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    authEndpoint: '/api/pusher-auth',
    auth: {
        params: { token: token }
    }
});

const channel = pusher.subscribe('private-presentation');

channel.bind('pusher:subscription_succeeded', () => {
    console.log('✅ Subscribed to private-presentation');
});

channel.bind('pusher:subscription_error', (status) => {
    console.error('❌ Subscription error:', status);
});

if (isMaster) {
    let lastScrollY = window.scrollY;
    let throttleTimeout = null;

    window.addEventListener('scroll', () => {
        if (!throttleTimeout) {
            throttleTimeout = setTimeout(() => {
                const currentScroll = window.scrollY;
                if (Math.abs(currentScroll - lastScrollY) > 5) {
                    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                    const percentage = maxScroll > 0 ? currentScroll / maxScroll : 0;
                    
                    console.log('📤 Sending scroll:', percentage);
                    channel.trigger('client-scroll', { p: percentage });
                    lastScrollY = currentScroll;
                }
                throttleTimeout = null;
            }, 50);
        }
    });

    // Synchronisation de la navigation pour le Master
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-btn');
        if (btn) {
            const targetUrl = btn.getAttribute('href');
            if (targetUrl && !targetUrl.startsWith('http') && !targetUrl.startsWith('#')) {
                e.preventDefault();
                console.log('📤 Sending navigation:', targetUrl);
                
                // Notifier l'audience
                channel.trigger('client-nav', { url: targetUrl });
                
                // Laisser un petit délai pour l'envoi Pusher avant de changer de page
                setTimeout(() => {
                    const separator = targetUrl.includes('?') ? '&' : '?';
                    window.location.href = `${targetUrl}${separator}role=${role}&token=${token}`;
                }, 300);
            }
        }
    });

} else {
    console.log('👥 Running in Audience mode');
    // Bloquer le scroll manuel pour l'audience
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // Désactiver la navigation manuelle pour l'audience (visuel + blocage clic)
    const disableNav = () => {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.6';
            btn.style.cursor = 'default';
        });
    };
    disableNav();
    // Au cas où le DOM change
    window.addEventListener('load', disableNav);

    // Intercepter les clics résiduels
    document.addEventListener('click', (e) => {
        if (e.target.closest('.nav-btn')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // Suivre la navigation du Master
    channel.bind('client-nav', (data) => {
        console.log('📥 Received navigation:', data);
        if (data && data.url) {
            if (!window.location.pathname.endsWith(data.url)) {
                window.location.href = data.url;
            }
        }
    });

    channel.bind('client-scroll', (data) => {
        let percentage;
        
        if (typeof data === 'object' && data.p !== undefined) {
            percentage = data.p;
        } else {
            const y = typeof data === 'object' ? data.y : data;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            percentage = maxScroll > 0 ? y / maxScroll : 0;
        }
        
        console.log('📥 Received scroll:', percentage);
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetY = percentage * maxScroll;
        
        window.scrollTo({
            top: targetY,
            behavior: 'smooth'
        });
    });
}