import dotenv from 'dotenv';
dotenv.config();

import {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';

import express from 'express';
import pino from 'pino';
import fs from 'fs';
import { File } from 'megajs';
import NodeCache from 'node-cache';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

async function start() {
  // Dynamically import config and any modules that are .cjs
  const configModule = await import('./config.cjs');
  const config = configModule.default || configModule;  // to handle how it's exported

  const dataIndex = await import('./data/index.js');
  const { Handler, Callupdate, GroupUpdate } = dataIndex;

  const autoreactModule = await import('./lib/autoreact.cjs');
  const pkg = autoreactModule.default || autoreactModule;
  const { emojis, doReact } = pkg;

  const prefix = process.env.PREFIX || config.PREFIX;
  const PORT = process.env.PORT || config.PORT;
  const startTime = new Date();

  const MAIN_LOGGER = pino({ level: process.env.LOG_LEVEL || config.LOG_LEVEL });
  const logger = MAIN_LOGGER.child({});
  if (process.env.LOG_LEVEL) {
    logger.level = process.env.LOG_LEVEL;
  }

  const msgRetryCounterCache = new NodeCache();
  const app = express();

  async function downloadSessionData() {
    try {
      if (!config.SESSION_ID) return false;
      const sessdata = config.SESSION_ID.split('CRYPTIX-MD~')[1];
      if (!sessdata || !sessdata.includes('#')) return false;
      const [fileID, decryptKey] = sessdata.split('#');
      const url = `https://mega.nz/file/${fileID}#${decryptKey}`;
      const file = File.fromURL(url);
      const data = await new Promise((resolve, reject) => {
        file.download((err, d) => {
          if (err) reject(err);
          else resolve(d);
        });
      });
      await fs.promises.writeFile(credsPath, data);
      return true;
    } catch (err) {
      console.error('Error downloading session data:', err);
      return false;
    }
  }

  await downloadSessionData();

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const Matrix = makeWASocket({
    version,
    logger: pino({ level: process.env.LOG_LEVEL || config.LOG_LEVEL }),
    printQRInTerminal: false,
    browser: ["CRYPTIX‑MD", "Safari", "3.3"],
    auth: state,
    msgRetryCounterCache,
    getMessage: async (key) => ({})
  });

  let initialConnection = true;
  let pairingCodeGenerated = false;

  Matrix.ev.on('connection.update', async (update) => {
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
          console.log('Logged out from WhatsApp. Please reauthenticate manually.');
        }
      } else if (connection === 'open' && initialConnection) {
        const startMess = {
          image: { url: "https://files.catbox.moe/f6q239.jpg" },
          caption: config.WELCOME_MSG,
          buttons: [
            { buttonId: 'help', buttonText: { displayText: '📋 HELP' }, type: 1 },
            { buttonId: 'menu', buttonText: { displayText: '📱 MENU' }, type: 1 },
            { buttonId: 'source', buttonText: { displayText: '⚙️ SOURCE' }, type: 1 }
          ],
          headerType: 1
        };
        await Matrix.sendMessage(Matrix.user.id, startMess).catch(console.error);
        initialConnection = false;
      }
    } catch (err) {
      console.error('Error in connection.update handler:', err);
    }
  });

  Matrix.ev.on('creds.update', saveCreds);

  Matrix.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const m = chatUpdate.messages[0];
      if (!m || !m.message) return;

      const messageText = m.message.conversation || m.message.extendedTextMessage?.text || "";

      if (messageText.startsWith(prefix)) {
        const cmd = messageText.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
        if (cmd === 'ping') {
          await Matrix.sendMessage(m.key.remoteJid, { text: 'Pong! 🏓' });
        } else if (cmd === 'uptime') {
          const uptime = Math.floor((Date.now() - startTime) / 1000);
          const hrs = Math.floor(uptime / 3600);
          const mins = Math.floor((uptime % 3600) / 60);
          const secs = uptime % 60;
          await Matrix.sendMessage(m.key.remoteJid, { text: `Uptime: ${hrs}h ${mins}m ${secs}s.` });
        }
      }

      const lower = (messageText || "").toLowerCase();
      if (lower.includes("hello") || lower.includes("hi")) {
        await Matrix.sendMessage(m.key.remoteJid, { text: "Hello! How can I assist you today? 😊" });
      }

      if (m.message.buttonsResponseMessage) {
        const selected = m.message.buttonsResponseMessage.selectedButtonId;
        if (selected === 'help') {
          await Matrix.sendMessage(m.key.remoteJid, { text: `📋 *Help Menu*\nUse ${prefix}menu for commands.` });
        } else if (selected === 'menu') {
          await Matrix.sendMessage(m.key.remoteJid, { text: `📱 *Main Menu*\nType ${prefix}menu to see features.` });
        } else if (selected === 'source') {
          await Matrix.sendMessage(m.key.remoteJid, {
            text: `⚙️ *Source Code*\nGitHub: ${config.SOURCE_URL}`
          });
        }
      }

      if (config.AUTO_REACT === 'true' && !m.key.fromMe) {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await doReact(randomEmoji, m, Matrix);
      }
    } catch (err) {
      console.error('Error in messages.upsert handler:', err);
    }
  });

  Matrix.ev.on('call', (json) => {
    try {
      Callupdate(json, Matrix);
    } catch (err) {
      console.error('Error in call event:', err);
    }
  });

  Matrix.ev.on('group-participants.update', (msg) => {
    try {
      GroupUpdate(Matrix, msg);
    } catch (err) {
      console.error('Error in group participants update:', err);
    }
  });

  // Express server to respond to web requests
  app.get('/', (req, res) => {
    res.send('CRYPTIX‑MD Bot is running ✔️');
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Fatal error on startup:', err);
  process.exit(1);
});
