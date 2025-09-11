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

import config from './config.cjs';
import { Handler, Callupdate, GroupUpdate } from './data/index.js';
import pkg from './lib/autoreact.cjs';
const { emojis, doReact } = pkg;

const prefix = process.env.PREFIX || config.PREFIX;
const app = express();
let useQR = false;
let initialConnection = true;
const PORT = process.env.PORT || 3000;
const startTime = new Date();

const MAIN_LOGGER = pino({ level: process.env.LOG_LEVEL || 'info' });
const logger = MAIN_LOGGER.child({});
// Make sure logger has a valid level
if (process.env.LOG_LEVEL) logger.level = process.env.LOG_LEVEL;

const msgRetryCounterCache = new NodeCache();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

async function downloadSessionData() {
    try {
        if (!config.SESSION_ID) {
            return false;
        }
        // Expect SESSION_ID like "CRYPTIX-MD~<fileID>#<decryptKey>"
        const sessdata = config.SESSION_ID.split("CRYPTIX-MD~")[1];
        if (!sessdata || !sessdata.includes("#")) {
            return false;
        }
        const [fileID, decryptKey] = sessdata.split("#");
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
    } catch (error) {
        console.error("Error downloading session data:", error);
        return false;
    }
}

async function start() {
    try {
        // Try downloading session if SESSION_ID provided
        await downloadSessionData();

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        const Matrix = makeWASocket({
            version,
            logger: pino({ level: process.env.LOG_LEVEL || 'silent' }),
            printQRInTerminal: false,
            browser: ["CRYPTIX-MD", "Safari", "3.3"],
            auth: state,
            msgRetryCounterCache,
            getMessage: async (key) => ({})
        });

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
                                <img src="${qrUrl}" alt="QR Code">
                            </div>
                        `);
                    });

                    app.get('/pair', async (req, res) => {
                        const { number } = req.query;
                        if (!number) {
                            return res.status(400).send('Please provide a number in the query parameter, e.g., /pair?number=254XXXXXXXXXX');
                        }
                        const code = await Matrix.requestPairingCode(number);
                        res.send({ code });
                    });

                    pairingCodeGenerated = true;
                }

                if (connection === 'close') {
                    // Only reconnect if NOT logged out
                    if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                        setTimeout(start, 3000);
                    } else {
                        console.log("Logged out from WhatsApp. Please reauthenticate manually.");
                    }
                } else if (connection === 'open') {
                    if (initialConnection) {
                        const startMess = {
                            image: { url: "https://files.catbox.moe/f6q239.jpg" },
                            caption: `*Hi CRYPTIX-MD User! 👋🏻*\nSimple, Straightforward, But Loaded With Features 🎊\nThanks for using CRYPTIX-MD 🫂\nYour prefix: ${prefix}\n\nPowered by *CRYPTIX-MD BOT*`,
                            buttons: [
                                { buttonId: 'help', buttonText: { displayText: '📋 HELP' }, type: 1 },
                                { buttonId: 'menu', buttonText: { displayText: '📱 MENU' }, type: 1 },
                                { buttonId: 'source', buttonText: { displayText: '⚙️ SOURCE' }, type: 1 }
                            ],
                            headerType: 1
                        };
                        try {
                            await Matrix.sendMessage(Matrix.user.id, startMess);
                        } catch (err) {
                            console.error("Error sending start message:", err);
                        }
                        initialConnection = false;
                    }
                }

            } catch (err) {
                console.error("Error in connection.update handler:", err);
            }
        });

        Matrix.ev.on('creds.update', saveCreds);

        // Message handlers
        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const m = chatUpdate.messages[0];
                if (!m || !m.message) return;

                const messageText = m.message.conversation
                    || m.message.extendedTextMessage?.text
                    || "";

                if (messageText.startsWith(prefix)) {
                    const command = messageText.slice(prefix.length).trim().split(/\s+/).shift().toLowerCase();
                    // You may want to import a commands map and call proper plugin
                    if (command === 'ping') {
                        await Matrix.sendMessage(m.key.remoteJid, { text: 'Pong! 🏓' });
                    }
                    else if (command === 'uptime') {
                        const uptimeInSeconds = Math.floor((Date.now() - startTime) / 1000);
                        const hours = Math.floor(uptimeInSeconds / 3600);
                        const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
                        const seconds = uptimeInSeconds % 60;
                        await Matrix.sendMessage(m.key.remoteJid, { text: `Uptime: ${hours}h ${minutes}m ${seconds}s.` });
                    }
                }

                const lowerBody = (messageText || "").toLowerCase();
                if (lowerBody.includes("hello") || lowerBody.includes("hi")) {
                    await Matrix.sendMessage(m.key.remoteJid, { text: "Hello! How can I assist you today? 😊" });
                }

                if (m.message.buttonsResponseMessage) {
                    const selected = m.message.buttonsResponseMessage.selectedButtonId;
                    if (selected === 'help') {
                        await Matrix.sendMessage(m.key.remoteJid, {
                            text: `📋 *CRYPTIX-MD Help Menu*\nUse ${prefix}menu to see commands.`
                        });
                    } else if (selected === 'menu') {
                        await Matrix.sendMessage(m.key.remoteJid, {
                            text: `📱 *CRYPTIX-MD Main Menu*\nType ${prefix}menu to see all features.`
                        });
                    } else if (selected === 'source') {
                        await Matrix.sendMessage(m.key.remoteJid, {
                            text: `⚙️ *Source Code*\nGitHub: https://github.com/itsguruh/CRYPTIX-MD`
                        });
                    }
                }

                // Auto react if configured
                if (config.AUTO_REACT === 'true' && !m.key.fromMe) {
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    await doReact(randomEmoji, m, Matrix);
                }

            } catch (err) {
                console.error("Error in messages.upsert handler:", err);
            }
        });

        // Call updates
        Matrix.ev.on('call', (json) => {
            try {
                Callupdate(json, Matrix);
            } catch (err) {
                console.error("Error in call update:", err);
            }
        });

        // Group updates
        Matrix.ev.on('group-participants.update', (messag) => {
            try {
                GroupUpdate(Matrix, messag);
            } catch (err) {
                console.error("Error in group update:", err);
            }
        });

        startExpress(); // Start the HTTP server

    } catch (error) {
        console.error("Error in start():", error);
        setTimeout(start, 5000);
    }
}

function startExpress() {
    app.get('/', (req, res) => {
        res.send('CRYPTIX‑MD Bot is running ✔️');
    });

    app.listen(PORT, () => {
        console.log(`Express server listening on port ${PORT}`);
    });
}

start();
