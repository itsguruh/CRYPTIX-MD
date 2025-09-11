import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import NodeCache from 'node-cache';
import { File } from 'megajs';
import QRCode from 'qrcode';

import {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

async function start() {
  // Dynamic import of config
  const configImport = await import('./config.cjs');
  const config = configImport.default || configImport;

  // Dynamic import of other modules with full paths
  const dataModule = await import('./data/index.js');
  const { Handler, Callupdate, GroupUpdate } = dataModule;

  const arModule = await import('./lib/autoreact.cjs');
  const pkg = arModule.default || arModule;
  const { emojis, doReact } = pkg;

  const prefix = process.env.PREFIX || config.PREFIX;
  const PORT = process.env.PORT || config.PORT;

  const logger = pino({ level: process.env.LOG_LEVEL || config.LOG_LEVEL });

  const msgRetryCounterCache = new NodeCache();
  const app = express();

  async function downloadSessionData() {
    try {
      if (!config.SESSION_ID) return false;
      const parts = config.SESSION_ID.split('CRYPTIX-MD~')[1];
      if (!parts || !parts.includes('#')) return false;
      const [fileID, decryptKey] = parts.split('#');
      const url = `https://mega.nz/file/${fileID}#${decryptKey}`;
      const file = File.fromURL(url);
      const data = await new Promise((resolve, reject) => {
        file.download((err, d) => (err ? reject(err) : resolve(d)));
      });
      await fs.promises.writeFile(credsPath, data);
      return true;
    } catch (err) {
      console.error('Error downloading session:', err);
      return false;
    }
  }

  await downloadSessionData();

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    logger: pino({ level: process.env.LOG_LEVEL || 'silent' }),
    printQRInTerminal: false,
    browser: ['CRYPTIX-MD', 'Safari', '3.3'],
    auth: state,
    msgRetryCounterCache,
    getMessage: async () => ({}),
  });

  let initialConnection = true;
  let pairingCodeGenerated = false;

  socket.ev.on('connection.update', async (update) => {
    try {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !pairingCodeGenerated) {
        const qrUrl = await QRCode.toDataURL(qr);
        app.get('/qr', (req, res) => {
          res.send(`
            <div style="text-align: center;">
              <h1>Scan this QR Code</h1>
              <img src="${qrUrl}" alt="QR Code"/>
            </div>
          `);
        });
        pairingCodeGenerated = true;
      }

      if (connection === 'close') {
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
          setTimeout(start, 3000);
        } else {
          console.log('Logged out. Please reauthenticate manually.');
        }
      } else if (connection === 'open' && initialConnection) {
        const startMess = {
          image: { url: 'https://files.catbox.moe/f6q239.jpg' },
          caption: config.WELCOME_MSG,
          buttons: [
            { buttonId: 'help', buttonText: { displayText: '📋 HELP' }, type: 1 },
            { buttonId: 'menu', buttonText: { displayText: '📱 MENU' }, type: 1 },
            { buttonId: 'source', buttonText: { displayText: '⚙️ SOURCE' }, type: 1 }
          ],
          headerType: 1,
        };
        await socket.sendMessage(socket.user.id, startMess).catch(console.error);
        initialConnection = false;
      }
    } catch (err) {
      console.error('Error in connection.update handler:', err);
    }
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const m = chatUpdate.messages[0];
      if (!m || !m.message) return;
      const messageText = m.message.conversation || m.message.extendedTextMessage?.text || '';

      if (messageText.startsWith(prefix)) {
        const cmd = messageText.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
        if (cmd === 'ping') {
          await socket.sendMessage(m.key.remoteJid, { text: 'Pong! 🏓' });
        } else if (cmd === 'uptime') {
          const uptime = Math.floor((Date.now() - process.uptime()) / 1000);
          await socket.sendMessage(m.key.remoteJid, { text: `Uptime: ${uptime} seconds.` });
        }
      }

      const lower = (messageText || '').toLowerCase();
      if (lower.includes('hello') || lower.includes('hi')) {
        await socket.sendMessage(m.key.remoteJid, { text: "Hello! How can I assist you today? 😊" });
      }

      if (m.message.buttonsResponseMessage) {
        const selected = m.message.buttonsResponseMessage.selectedButtonId;
        if (selected === 'help') {
          await socket.sendMessage(m.key.remoteJid, { text: `📋 Help Menu - use ${prefix}menu.` });
        } else if (selected === 'source') {
          await socket.sendMessage(m.key.remoteJid, {
            text: `⚙️ Source Code:\n${config.SOURCE_URL}`
          });
        }
      }

      if (config.AUTO_REACT === 'true' && !m.key.fromMe) {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await doReact(randomEmoji, m, socket);
      }
    } catch (err) {
      console.error('Error in messages.upsert handler:', err);
    }
  });

  socket.ev.on('group-participants.update', (groupUpdate) => {
    try {
      GroupUpdate(socket, groupUpdate);
    } catch (err) {
      console.error('Error in group update:', err);
    }
  });

  socket.ev.on('call', (json) => {
    try {
      Callupdate(json, socket);
    } catch (err) {
      console.error('Error in call event:', err);
    }
  });

  app.get('/', (req, res) => {
    res.send('CRYPTIX-MD Bot is running ✔️');
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Fatal error on startup:', err);
  process.exit(1);
});
