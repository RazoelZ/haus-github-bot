import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
const PORT = 3000;
const VERIFY_TOKEN = 'E5udpopGayiEXbQpPOQCHdoAsxa38hsn';
const LARK_WEBHOOK_URL = 'https://open.larksuite.com/anycross/trigger/lark/callback/MGJiZTMwMjNlNjRjMzc1NzFhMzAxODQ1OGMyZWRmZWNm';

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to verify GitHub signature
app.use((req, res, next) => {
    console.log('Received request:', req.method, req.url);  // Log request method and URL
    const signature = req.headers['x-hub-signature'];
    if (!signature) {
        console.log('Missing signature');
        return res.status(400).send('Missing signature');
    }

    const payload = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha1', VERIFY_TOKEN);
    hmac.update(payload, 'utf-8');
    const digest = `sha1=${hmac.digest('hex')}`;

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        console.log('Signature verified');
        next();
    } else {
        console.log('Invalid signature');
        return res.status(400).send('Invalid signature');
    }
});

app.get('/', (req, res) => {
    res.status(200).send('Server is running.');
});

app.post('/webhook', (req, res) => {
    console.log('Received GitHub event:', req.headers['x-github-event']);
    const data = req.body;
    console.log('Payload:', JSON.stringify(data, null, 2));  // Log full payload

    processEvent(req.headers['x-github-event'], data);

    res.status(204).send();
});

const processEvent = (event, data) => {
    console.log('Processing event:', event);
    let message;
    if (event === 'push') {
        message = `New push to ${data.repository.name} by ${data.pusher.name}.`;
    } else if (event === 'pull_request') {
        message = `New pull request #${data.number} in ${data.repository.name}.`;
    } else {
        message = `New event: ${event}`;
    }
    console.log('Message to send to Lark:', message);

    sendMessageToLark(message);
};

const sendMessageToLark = (message) => {
    const payload = {
        msg_type: 'text',
        content: {
            text: message,
        },
    };

    axios.post(LARK_WEBHOOK_URL, payload)
        .then(response => {
            console.log('Message sent to Lark:', response.data);
        })
        .catch(error => {
            console.error('Failed to send message to Lark:', error);
        });
};

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
