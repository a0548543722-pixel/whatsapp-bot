const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeData = null;
let isReady = false;

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// QR Code
client.on('qr', (qr) => {
    console.log('QR Code received');
    qrCodeData = qr;
});

// Ready
client.on('ready', () => {
    console.log('WhatsApp Bot is ready!');
    isReady = true;
    qrCodeData = null;
});

// Incoming messages
client.on('message', async (message) => {
    console.log(`Message from ${message.from}: ${message.body}`);
});

client.initialize();

// QR Code page
app.get('/', async (req, res) => {
    if (isReady) {
        res.send('<h1>✅ WhatsApp Bot Connected!</h1>');
    } else if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        res.send(`
            <html>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:Arial">
                <h1>Scan QR Code with WhatsApp</h1>
                <img src="${qrImage}" style="width:300px;height:300px"/>
                <p>Open WhatsApp → Linked Devices → Link a Device</p>
                <script>setTimeout(()=>location.reload(),20000)</script>
            </body>
            </html>
        `);
    } else {
        res.send('<h1>⏳ Loading... Refresh in a few seconds</h1><script>setTimeout(()=>location.reload(),3000)</script>');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
