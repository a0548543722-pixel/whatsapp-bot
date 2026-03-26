const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

let qrCodeData = null;
let isReady = false;
let client = null;

function initClient() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log('QR Code received');
        qrCodeData = qr;
    });

    client.on('ready', () => {
        console.log('WhatsApp Bot is ready!');
        isReady = true;
        qrCodeData = null;
    });

    client.on('message', async (message) => {
        const from = message.from;
        const body = message.body;
        
        // Check message type
        const isGroup = from.includes('@g.us');
        const isBroadcast = from.includes('broadcast');
        const isPrivate = from.includes('@c.us') || from.includes('@lid');
        
        console.log(`Message from ${from}: ${body}`);
        
        // Send to webhook (only private messages)
        if (WEBHOOK_URL && isPrivate && !isBroadcast) {
            try {
                // Extract phone number
                let phone = from.replace('@c.us', '').replace('@lid', '');
                
                await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'incoming',
                        phone: phone,
                        message: body,
                        timestamp: new Date().toISOString()
                    })
                });
                console.log('Message sent to webhook');
            } catch (err) {
                console.error('Webhook error:', err.message);
            }
        }
    });

    client.on('disconnected', () => {
        console.log('Disconnected, reinitializing...');
        isReady = false;
        setTimeout(initClient, 5000);
    });

    client.initialize();
}

initClient();

// QR Code page
app.get('/', async (req, res) => {
    if (isReady) {
        res.send('<h1 style="color:green;font-family:Arial;text-align:center;margin-top:100px;">✅ WhatsApp Bot Connected!</h1>');
    } else if (qrCodeData) {
        const qrImage = await qrcode.toDataURL(qrCodeData);
        res.send(`
            <html>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:Arial">
                <h1>Scan QR Code with
