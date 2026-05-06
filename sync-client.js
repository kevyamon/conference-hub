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
                    channel.trigger('client-scroll', { y: currentScroll });
                    lastScrollY = currentScroll;
                }
                throttleTimeout = null;
            }, 50);
        }
    });

} else {
    // Bloquer le scroll manuel pour l'audience
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    channel.bind('client-scroll', (data) => {
        const positionY = typeof data === 'object' ? data.y : data;
        
        // On utilise documentElement.scrollTo pour être plus compatible avec overflow:hidden
        window.scrollTo({
            top: positionY,
            behavior: 'smooth'
        });
    });
}