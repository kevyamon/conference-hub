// sync-client.js
const PUSHER_KEY = '985daeb16dee57e0382b';
const PUSHER_CLUSTER = 'eu';

const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');
const token = urlParams.get('token');
const isMaster = (role === 'master' && token);

// Configuration Pusher
const pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    authEndpoint: '/api/pusher-auth',
    auth: {
        params: { token: token }
    }
});

const channel = pusher.subscribe('private-presentation');

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
                    
                    channel.trigger('client-scroll', { p: percentage });
                    lastScrollY = currentScroll;
                }
                throttleTimeout = null;
            }, 50);
        }
    });

    // Synchronisation de la navigation pour le Master
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetUrl = btn.getAttribute('href');
            if (targetUrl && !targetUrl.startsWith('http') && !targetUrl.startsWith('#')) {
                // Notifier l'audience
                channel.trigger('client-nav', { url: targetUrl });
                
                // Préserver le statut Master sur la page suivante
                e.preventDefault();
                const separator = targetUrl.includes('?') ? '&' : '?';
                window.location.href = `${targetUrl}${separator}role=${role}&token=${token}`;
            }
        });
    });

} else {
    // Bloquer le scroll manuel pour l'audience
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // Suivre la navigation du Master
    channel.bind('client-nav', (data) => {
        if (data && data.url) {
            // Éviter de recharger si on est déjà sur la bonne page
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
            // Rétrocompatibilité au cas où
            const y = typeof data === 'object' ? data.y : data;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            percentage = maxScroll > 0 ? y / maxScroll : 0;
        }
        
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetY = percentage * maxScroll;
        
        window.scrollTo({
            top: targetY,
            behavior: 'smooth'
        });
    });
}