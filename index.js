const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

let qrCodeData = null;
let isReady = false;
let client = null;

// Initialize WhatsApp Client
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
        const isGroup = from.includes('@g.us');
        
        console.log(`Message from ${from}: ${body}`);
        
        // Save to Supabase
        if (SUPABASE_URL && SUPABASE_KEY && !isGroup) {
            try {
                const phone = from.replace('@c.us', '');
                
                // Save conversation
                await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_conversations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        phone_number: phone,
                        last_message: body,
                        last_message_at: new Date().toISOString()
                    })
                });
                
                // Save message
                await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    },
                    body: JSON.stringify({
                        phone_number: phone,
                        message: body,
                        direction: 'incoming',
                        status: 'received'
                    })
                });
                
                console.log('Message saved to CRM');
            } catch (err) {
                console.error('Error saving to CRM:', err.message);
            }
        }
    });

    client.on('disconnected', () => {
        console.log('WhatsApp disconnected, reinitializing...');
        isReady = false;
        setTimeout(initClient, 5000);
    });

    client.initialize();
}

initClient();

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

// Send message API
app.post('/send', async (req, res) => {
    const { phone, message } = req.body;
    
    if (!isReady || !client) {
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message required' });
    }
    
    try {
        const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
        await client.sendMessage(chatId, message);
        
        // Save outgoing message to Supabase
        if (SUPABASE_URL && SUPABASE_KEY) {
            const cleanPhone = phone.replace('@c.us', '');
            await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    phone_number: cleanPhone,
                    message: message,
                    direction: 'outgoing',
                    status: 'sent'
                })
            });
        }
        
        res.json({ success: true, message: 'Message sent' });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: err.message });
    }
});

// Status API
app.get('/status', (req, res) => {
    res.json({ connected: isReady });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
