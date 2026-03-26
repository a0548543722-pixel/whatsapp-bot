const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

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
        console.log(`Message from ${message.from}: ${message.body}`);
    });

    client.on('disconnected', () => {
        console.log('Disconnected');
        isReady = false;
        setTimeout(initClient, 5000);
    });

    client.initialize();
}

initClient();

app.get('/', async (req, res) => {
    if (isReady) {
        res.send('<h1>✅ WhatsApp Bot Connected!</h1>');
    } else if
