import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const app = express();
const PORT = 3000;
const SECRET = 'E5udpopGayiEXbQpPOQCHdoAsxa38hsn';
const LARK_WEBHOOK_URL = 'https://open.larksuite.com/anycross/trigger/lark/callback/MGJiZTMwMjNlNjRjMzc1NzFhMzAxODQ1OGMyZWRmZWNm';

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to verify GitHub signature
app.use((req, res, next) => {
    const signature = req.headers['x-hub-signature'];
    if (!signature) {
        return res.status(400).send('Missing signature');
    }

    const payload = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha1', SECRET);
    hmac.update(payload, 'utf-8');
    const digest = `sha1=${hmac.digest('hex')}`;

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        next();
    } else {
        return res.status(400).send('Invalid signature');
    }
});

app.post('/webhook', (req, res) => {
    const event = req.headers['x-github-event'];
    const data = req.body;

    processEvent(event, data);

    res.status(204).send();
});

const processEvent = (event, data) => {
    let message;
    if (event === 'push') {
        message = `New push to ${data.repository.name} by ${data.pusher.name}.`;
    } else if (event === 'pull_request') {
        message = `New pull request #${data.number} in ${data.repository.name}.`;
    } else {
        message = `New event: ${event}`;
    }

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
