// index.js
import express from 'express';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';

async function startBot() {
  // Load auth state from multiple files (better than single file)
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  // Create the WhatsApp socket connection
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);

      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}

// Start the WhatsApp bot
startBot().catch(err => console.error('Failed to start bot:', err));

// Setup Express server to keep app alive on Heroku
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_, res) => {
  res.send('CRYPTIX-MD WhatsApp Bot is running!');
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});
