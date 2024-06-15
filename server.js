import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
const PORT = 3000;
const VERIFY_TOKEN = 'E5udpopGayiEXbQpPOQCHdoAsxa38hsn';
const LARK_WEBHOOK_URL = 'https://open.larksuite.com/anycross/trigger/lark/callback/MGJiZTMwMjNlNjRjMzc1NzFhMzAxODQ1OGMyZWRmZWNm';
const LARK_API_URL = 'https://open.larksuite.com/open-apis/im/v1/messages/';
const AUTH_TOKEN = 't-g2056fnE6RN2W36G4AMIGE2NAVGS7CLDPB4CHKUQ';  // Replace with your actual authorization token

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to verify GitHub signature
app.use((req, res, next) => {
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
        const branch = data.ref.split('/').pop(); // Extract branch name from ref
        const commits = data.commits.map(commit => {
            return `- ${commit.message} by ${commit.author.name}`;
        }).join('\n');

        message = `New push to ${data.repository.name} on branch ${branch} by ${data.pusher.name}:\n${commits}`;
    } else if (event === 'pull_request') {
        const sourceBranch = data.pull_request.head.ref;
        const targetBranch = data.pull_request.base.ref;
        message = `New pull request #${data.number} in ${data.repository.name} from ${sourceBranch} to ${targetBranch}.`;
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
        content: JSON.stringify({
            text: message,
        }),
        receive_id: 'oc_da933eb5b74c65d365a70b5277ac459d',  // Replace with actual receive_id
    };


    axios.post(LARK_API_URL, payload, {
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
        },
        params: {
            receive_id_type: 'chat_id',  // Specify the correct type of receive_id
        },
        paramsSerializer: params => {
            return Object.entries(params)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&');
        }
    })
        .then(response => {
            console.log('Message sent to Lark:', response.data);
        })
        .catch(error => {
            console.error('Failed to send message to Lark:', error);
        });
};



// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
