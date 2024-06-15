import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
const PORT = 3000;
const VERIFY_TOKEN = 'E5udpopGayiEXbQpPOQCHdoAsxa38hsn';
const LARK_WEBHOOK_URL = 'https://open.larksuite.com/anycross/trigger/lark/callback/MGJiZTMwMjNlNjRjMzc1NzFhMzAxODQ1OGMyZWRmZWNm';
const LARK_API_URL = 'https://open.larksuite.com/open-apis/im/v1/messages/';
const AUTH_TOKEN = 'om_dc13264520392913993dd051dba21dcf';  // Replace with your actual authorization token

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

// Root endpoint to check server status
app.get('/', (req, res) => {
    res.status(200).send('Server is running.');
});

// Endpoint to handle GitHub webhook events
app.post('/webhook', (req, res) => {
    const data = req.body;
    processEvent(req.headers['x-github-event'], data);
    res.status(204).send();
});

// Process GitHub events and send message to Lark
const processEvent = (event, data) => {
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

// Send message to Lark
const sendMessageToLark = (message) => {
    const payload = {
        msg_type: 'text',
        content: {
            text: message,
        },
    };

    console.log('Sending message to Lark:', JSON.stringify(payload));

    axios.post(LARK_WEBHOOK_URL, payload)
        .then(response => {
            console.log('Message sent to Lark:', response.data);
            // Forward the message to another chat in Lark
            forwardMessageToLark(response.data.message_id, 'chat_id', 'your_uuid', 'target_chat_id');
        })
        .catch(error => {
            console.error('Failed to send message to Lark:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        });
};

// Forward message to another chat in Lark
const forwardMessageToLark = (messageId, receiveIdType, uuid, receiveId) => {
    const url = `${LARK_API_URL}${messageId}/forward`;

    const headers = {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
    };

    const params = {
        receive_id_type: receiveIdType,
        uuid: uuid,
    };

    const requestBody = {
        receive_id: receiveId,
    };

    axios.post(url, requestBody, { headers: headers, params: params })
        .then(response => {
            console.log('Message forwarded successfully:', response.data);
        })
        .catch(error => {
            console.error('Failed to forward message:', error);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        });
};

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
