import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 3000;

const LARK_WEBHOOK_URL = process.env.LARK_WEBHOOK_URL || 'https://open.larksuite.com/open-apis/bot/v2/hook/6a17f8c8-102a-4b92-a239-767e50408eea';
const LARK_SECRET = process.env.LARK_SECRET || 'drBGP0orc7wUFI5qzM2msg';
const GITHUB_SECRET = process.env.GITHUB_SECRET || 'drBGP0orc7wUFI5qzM2msg';

app.use(bodyParser.json({ verify: verifyGitHubSignature }));

// Verify GitHub signature
function verifyGitHubSignature(req, res, buf, encoding) {
    const signature = req.headers['x-hub-signature-256'];
    const hmac = crypto.createHmac('sha256', GITHUB_SECRET);
    const digest = 'sha256=' + hmac.update(buf).digest('hex');
    if (signature !== digest) {
        throw new Error('Invalid signature');
    }
}

// Generate signature for Lark
function generateLarkSignature(timestamp, secret) {
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', secret);
    const signature = hmac.update(stringToSign).digest('base64');
    return signature;
}

app.post('/github-webhook', async (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    console.log(`Received event: ${event}`);
    console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

    let message = '';

    switch (event) {
        case 'push':
            message = `New push by ${payload.pusher.name} in ${payload.repository.name}:\n${payload.head_commit.message}`;
            break;
        case 'issues':
            message = `New issue by ${payload.issue.user.login}:\n${payload.issue.title}`;
            break;
        case 'pull_request':
            message = `New pull request by ${payload.pull_request.user.login}:\n${payload.pull_request.title}`;
            break;
        default:
            message = `New event: ${event}`;
    }

    const timestamp = Math.floor(Date.now() / 1000); // Convert to seconds
    const signature = generateLarkSignature(timestamp, LARK_SECRET);

    console.log(`Sending message to Lark: ${message}`);
    console.log(`Lark Signature: ${signature}`);
    console.log(`Lark Timestamp: ${timestamp}`);

    try {
        await axios.post(LARK_WEBHOOK_URL, {
            msg_type: 'text',
            content: { text: message },
        }, {
            headers: {
                'X-Lark-Signature': signature,
                'X-Lark-Timestamp': timestamp,
            }
        });

        console.log('Message sent to Lark successfully.');
        res.status(200).send('Event processed');
    } catch (err) {
        console.error('Error sending message to Lark:', err.response ? err.response.data : err.message);
        res.status(500).send('Error processing event');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
