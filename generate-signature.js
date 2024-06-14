import crypto from 'crypto';
import fs from 'fs';

const GITHUB_SECRET = 'drBGP0orc7wUFI5qzM2msg';
const payload = fs.readFileSync('payload.json');
const hmac = crypto.createHmac('sha256', GITHUB_SECRET);
const signature = 'sha256=' + hmac.update(payload).digest('hex');
console.log(signature);
