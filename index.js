import dotenv from 'dotenv';
dotenv.config();

import {
    makeWASocket,
    fetchLatestBaileysVersion,
    DisconnectReason,
    useMultiFileAuthState,
    generateWAMessageFromContent,
} from '@whiskeysockets/baileys';
import { Handler, Callupdate, GroupUpdate } from './data/index.js';
import express from 'express';
import pino from 'pino';
import fs from 'fs';
import { File } from 'megajs';
import NodeCache from 'node-cache';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import config from './config.cjs';
import pkg from './lib/autoreact.cjs';
const { emojis, doReact } = pkg;
import QRCode from 'qrcode';

const prefix = process.env.PREFIX || config.PREFIX;
const app = express();
let useQR = false;
let initialConnection = true;
const PORT = process.env.PORT || 3000;
const startTime = new Date(); // NEW: Variable to track bot's start time

const MAIN_LOGGER = pino({ level: 'silent' });
const logger = MAIN_LOGGER.child({});
logger.level = "silent";

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

        const sessdata = config.SESSION_ID.split("CRYPTIX-MD~")[1];

        if (!sessdata || !sessdata.includes("#")) {
            return false;
        }

        const [fileID, decryptKey] = sessdata.split("#");

        try {
            const file = File.fromURL(`https://mega.nz/file/${fileID}#${decryptKey}`);

            const data = await new Promise((resolve, reject) => {
                file.download((err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            await fs.promises.writeFile(credsPath, data);
            return true;
        } catch (error) {
            return false;
        }
    } catch (error) {
        return false;
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        
        const Matrix = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ["CRYPTIX-MD", "safari", "3.3"],
            auth: state,
            msgRetryCounterCache,
            getMessage: async (key) => {
                return {};
            }
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
                        res.send(`Your Pairing Code is: ${code}`);
                    });

                    pairingCodeGenerated = true;
                }
                
                if (connection === 'close') {
                    if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                        setTimeout(start, 3000);
                    }
                } else if (connection === 'open') {
                    if (initialConnection) {
                        
                        // Send welcome message with a new image
                        const startMess = {
                            image: { url: "https://files.catbox.moe/f6q239.jpg" },
                            caption: `*Hi CRYPTIX-MD User! 👋🏻* > Simple, Straightforward, But Loaded With Features 🎊. Meet CRYPTIX-MD WhatsApp Bot.
*Thanks for using CRYPTIX-MD 🫂* Join WhatsApp Channel: 😇  
> https://whatsapp.com/channel/0029VbAaqOjLCoX3uQD1Ns3y

- *YOUR PREFIX:* = ${prefix}

Don't forget to give a star to the repo ⬇️  
> https://github.com/itsguruh/CRYPTIX-MD
> © Powered BY GURU 🍀 👌`,
                            buttons: [
                                {
                                    buttonId: 'help',
                                    buttonText: { displayText: '📋 HELP' },
                                    type: 1
                                },
                                {
                                    buttonId: 'menu',
                                    buttonText: { displayText: '📱 MENU' },
                                    type: 1
                                },
                                {
                                    buttonId: 'source',
                                    buttonText: { displayText: '⚙️ SOURCE' },
                                    type: 1
                                }
                            ],
                            headerType: 1
                        };

                        try {
                            await Matrix.sendMessage(Matrix.user.id, startMess);
                        } catch (error) {
                            // Silent error handling
                        }
                        
                        // Follow newsletters after successful connection
                        await followNewsletters(Matrix);
                        
                        // Join WhatsApp group after successful connection
                        await joinWhatsAppGroup(Matrix);
                        
                        initialConnection = false;
                    }
                }
            } catch (error) {
                // Silent error handling
            }
        });
        
        Matrix.ev.on('creds.update', saveCreds);

        // Enhanced messages.upsert handler
        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const m = chatUpdate.messages[0];
                if (!m || !m.message) return;

                // NEW: Handle new commands like !ping and !uptime
                const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
                if (body.startsWith(prefix)) {
                    const command = body.slice(prefix.length).trim().split(/\s+/).shift().toLowerCase();
                    const args = body.slice(prefix.length).trim().split(/\s+/).slice(1);

                    switch (command) {
                        case 'ping':
                            await Matrix.sendMessage(m.key.remoteJid, { text: 'Pong! 🏓' });
                            break;
                        case 'uptime':
                        case 'runtime':
                            const uptimeInSeconds = Math.floor((new Date() - startTime) / 1000);
                            const hours = Math.floor(uptimeInSeconds / 3600);
                            const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
                            const seconds = uptimeInSeconds % 60;
                            await Matrix.sendMessage(m.key.remoteJid, { text: `My runtime is ${hours}h ${minutes}m ${seconds}s. 🚀` });
                            break;
                    }
                }
                
                // NEW: Handle simple auto-replies
                const lowerBody = body.toLowerCase();
                if (lowerBody.includes("hello") || lowerBody.includes("hi")) {
                    await Matrix.sendMessage(m.key.remoteJid, { text: "Hello! How can I assist you today? 😊" });
                }

                // Handle button responses
                if (m.message.buttonsResponseMessage) {
                    const selected = m.message.buttonsResponseMessage.selectedButtonId;
                    if (selected === 'help') {
                        try {
                            await Matrix.sendMessage(m.key.remoteJid, { 
                                text: `📋 *CRYPTIX-MD HELP MENU*\n\nUse ${prefix}menu to see all available commands.\nUse ${prefix}list to see command categories.` 
                            });
                        } catch (error) {
                            // Silent error handling
                        }
                        return;
                    } else if (selected === 'menu') {
                        try {
                            await Matrix.sendMessage(m.key.remoteJid, { 
                                text: `📱 *CRYPTIX-MD MAIN MENU*\n\nType ${prefix}menu to see the full command list.\nType ${prefix}all to see all features.` 
                            });
                        } catch (error) {
                            // Silent error handling
                        }
                        return;
                    } else if (selected === 'source') {
                        try {
                            await Matrix.sendMessage(m.key.remoteJid, { 
                                text: `⚙️ *CRYPTIX-MD SOURCE CODE*\n\nGitHub Repository: https://github.com/itsguruh/CRYPTIX-MD\n\nGive it a star ⭐ if you like it!` 
                            });
                        } catch (error) {
                            // Silent error handling
                        }
                        return;
                    }
                }

                // Auto-react to messages if enabled
                if (config.AUTO_REACT === 'true' && !m.key.fromMe) {
                    try {
                        const reactions = [
                            '🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '🧊', '🐳', '💥', '🥀', '❤‍🔥', '🥹', '😩', '🫣', 
                            '🤭', '👻', '👾', '🫶', '😻', '🙌', '🫂', '🫀', '👩‍🦰', '🧑‍🦰', '👩‍⚕️', '🧑‍⚕️', '🧕', 
                            '👩‍🏫', '👨‍💻', '👰‍♀', '🦹🏻‍♀️', '🧟‍♀️', '🧟', '🧞‍♀️', '🧞', '🙅‍♀️', '💁‍♂️', '💁‍♀️', '🙆‍♀️', 
                            '🙋‍♀️', '🤷', '🤷‍♀️', '🤦', '🤦‍♀️', '💇‍♀️', '💇', '💃', '🚶‍♀️', '🚶', '🧶', '🧤', '👑', 
                            '💍', '👝', '💼', '🎒', '🥽', '🐻', '🐼', '🐭', '🐣', '🪿', '🦆', '🦊', '🦋', '🦄', 
                            '🪼', '🐋', '🐳', '🦈', '🐍', '🕊️', '🦦', '🦚', '🌱', '🍃', '🎍', '🌿', '☘️', '🍀', 
                            '🍁', '🪺', '🍄', '🍄‍🟫', '🪸', '🪨', '🌺', '🪷', '🪻', '🥀', '🌹', '🌷', '💐', '🌾', 
                            '🌸', '🌼', '🌻', '🌝', '🌚', '🌕', '🌎', '💫', '🔥', '☃️', '❄️', '🌨️', '🫧', '🍟', 
                            '🍫', '🧃', '🧊', '🪀', '🤿', '🏆', '🥇', '🥈', '🥉', '🎗️', '🤹', '🤹‍♀️', '🎧', '🎤', 
                            '🥁', '🧩', '🎯', '🚀', '🚁', '🗿', '🎙️', '⌛', '⏳', '💸', '💎', '⚙️', '⛓️', '🔪', 
                            '🧸', '🎀', '🪄', '🎈', '🎁', '🎉', '🏮', '🪩', '📩', '💌', '📤', '📦', '📊', '📈', 
                            '📑', '📉', '📂', '🔖', '🧷', '📌', '📝', '🔏', '🔐', '🩷', '❤️', '🧡', '💛', '💚', 
                            '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '❤‍🔥', '❤‍🩹', '💗', '💖', '💘', '💝', '❌', 
                            '✅', '🔰', '〽️', '🌐', '🌀', '⤴️', '⤵️', '🔴', '🟢', '🟡', '🟠', '🔵', '🟣', '⚫', 
                            '⚪', '🟤', '🔇', '🔊', '📢', '🔕', '♥️', '🕐', '🚩', '🇵🇰'
                        ];
                        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                        
                        await Matrix.sendMessage(m.key.remoteJid, {
                            react: {
                                text: randomReaction,
                                key: m.key
                            }
                        });
                    } catch (error) {
                        // Silent error handling for reactions
                    }
                }

                // Fast auto-read messages
                if (config.READ_MESSAGE === 'true' && !m.key.fromMe) {
                    try {
                        await Matrix.readMessages([m.key]);
                    } catch (error) {
                        // Silent error handling for read messages
                    }
                }

                // Existing handlers - silent mode
                await Handler(chatUpdate, Matrix, logger);
            } catch (error) {
                // Silent error handling
            }
        });

        Matrix.ev.on("call", async (json) => {
            try {
                await Callupdate(json, Matrix);
            } catch (error) {
                // Silent error handling
            }
        });
        
        Matrix.ev.on("group-participants.update", async (messag) => {
            try {
                await GroupUpdate(Matrix, messag);
            } catch (error) {
                // Silent error handling
            }
        });
        
        if (config.MODE === "public") {
            Matrix.public = true;
        } else if (config.MODE === "private") {
            Matrix.public = false;
        }

        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.key) return;
                
                if (!mek.key.fromMe && config.AUTO_REACT) {
                    if (mek.message) {
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await doReact(randomEmoji, mek, Matrix);
                    }
                }
            } catch (err) {
                // Silent error handling
            }
        });

        // Status update handler
        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek || !mek.key || !mek.message) return;
                
                const fromJid = mek.key.participant || mek.key.remoteJid;
                if (mek.key.fromMe) return;
                if (mek.message.protocolMessage || mek.message.ephemeralMessage || mek.message.reactionMessage) return; 
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REACT === "true") {
                    try {
                        const ravlike = await Matrix.decodeJid(Matrix.user.id);
                        const statusEmojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👻', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '♻️', '🎉', '💜', '💙', '✨', '🖤', '💚'];
                        const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                        await Matrix.sendMessage(mek.key.remoteJid, {
                            react: {
                                text: randomEmoji,
                                key: mek.key,
                            } 
                        }, { statusJidList: [mek.key.participant, ravlike] });
                    } catch (error) {
                        // Silent error handling
                    }
                }
                
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                    try {
                        await Matrix.readMessages([mek.key]);
                        
                        if (config.AUTO_STATUS_REPLY) {
                            const customMessage = config.STATUS_READ_MSG || '✅ Auto Status Seen Bot By JINX-XMD';
                            await Matrix.sendMessage(fromJid, { text: customMessage }, { quoted: mek });
                        }
                    } catch (error) {
                        // Silent error handling
                    }
                }
            } catch (err) {
                // Silent error handling
            }
        });

    } catch (error) {
        setTimeout(start, 5000); // Restart after error with delay
    }
}

// Newsletter following function
async function followNewsletters(Matrix) {
    try {
        const newsletterChannels = [
            "12036
