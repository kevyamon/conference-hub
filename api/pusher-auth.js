const Pusher = require('pusher');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
});

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Pusher envoie les données en x-www-form-urlencoded ou JSON
    // Vercel parse automatiquement les deux dans req.body
    const { socket_id, channel_name, token } = req.body;

    if (!socket_id || !channel_name) {
        return res.status(400).send('socket_id and channel_name are required');
    }

    try {
        // Optionnel: On peut restreindre le canal 'private-presentation' au Master
        // Mais pour la simplicité, on laisse l'audience s'abonner aussi (lecture seule par défaut)
        
        // Si c'est le canal master et qu'un token est fourni, on peut valider
        // Pour l'instant on autorise l'auth si les paramètres sont là
        const auth = pusher.authenticate(socket_id, channel_name);
        res.send(auth);
    } catch (error) {
        console.error('❌ Pusher Auth Error:', error);
        res.status(500).send('Internal Server Error');
    }
}
