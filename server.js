import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 3000;

const LARK_WEBHOOK_URL = process.env.LARK_WEBHOOK_URL || 'https://open.larksuite.com/open-apis/bot/v2/hook/6a17f8c8-102a-4b92-a239-767e50408eea';
const GITHUB_SECRET = process.env.GITHUB_SECRET || 'Cws7g0jLMmAItPd9YLsdR';

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

app.get('/', (req, res) => {
    res.send('Hello World!');
}
);

app.post('/github-webhook', (req, res) => {
    const event = req.headers['x-github-event'];
    const payload = req.body;

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

    axios.post(LARK_WEBHOOK_URL, {
        msg_type: 'text',
        content: { text: message }
    }).then(() => {
        res.status(200).send('Event processed');
    }).catch(err => {
        console.error('Error sending message to Lark:', err);
        res.status(500).send('Error processing event');
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
