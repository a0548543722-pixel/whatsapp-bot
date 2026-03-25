const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

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
    console.log('QR Code received, scan with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Ready
client.on('ready', () => {
    console.log('WhatsApp Bot is ready!');
});

// Incoming messages
client.on('message', async (message) => {
    console.log(`Message from ${message.from}: ${message.body}`);
    
    // Auto reply example
    if (message.body.toLowerCase() === 'hi') {
        message.reply('Hello! How can I help you?');
    }
});

client.initialize();

// Keep alive server
app.get('/', (req, res) => {
    res.send('WhatsApp Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
