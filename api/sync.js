const Pusher = require('pusher');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'POST requis.' });
    }

    const { token, action, payload } = req.body;

    if (!token || token !== process.env.MASTER_TOKEN) {
        return res.status(401).json({ message: 'Accès refusé.' });
    }

    try {
        await pusher.trigger('presentation-channel', action, payload);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erreur Pusher:', error);
        return res.status(500).json({ success: false });
    }
}