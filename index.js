const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/github-webhook', async (req, res) => {
    const payload = req.body;

    // Here, customize the message based on the event type
    const message = {
        "msg_type": "text",
        "content": {
            "text": `New commit in repository: ${payload.repository.full_name}\nCommit message: ${payload.head_commit.message}\nURL: ${payload.head_commit.url}`
        }
    };

    // Send the message to Lark
    try {
        const response = await axios.post('https://open.larksuite.com/open-apis/bot/v2/hook/YOUR_LARK_BOT_WEBHOOK_URL', message);
        res.status(200).send('Event received and processed.');
    } catch (error) {
        console.error('Error sending message to Lark:', error);
        res.status(500).send('Error processing event.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
