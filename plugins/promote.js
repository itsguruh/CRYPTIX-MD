import fs from 'fs';
import config from '../config.cjs';
import path from 'path';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

const promote = async (m, Matrix) => {
    try {
        const prefix = config.PREFIX || ".";
        const body = m.message?.conversation || 
                    m.message?.extendedTextMessage?.text || 
                    m.message?.imageMessage?.caption || "";
        
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(" ");
        const command = args[0].toLowerCase();

        if (!["promote", "p", "admin", "makeadmin"].includes(command)) return;

        // Check if the command is used in a group
        const isGroup = m.key.remoteJid.endsWith('@g.us');
        if (!isGroup) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "This command can only be used in groups." },
            { quoted: m }
        );

        // Get group metadata to check admin status
        const groupMetadata = await Matrix.groupMetadata(m.key.remoteJid);
        const participants = groupMetadata.participants;
        
        // Get sender JID (handle both direct messages and group messages)
        const sender = m.key.participant || m.key.remoteJid;
        
        // Check if the user is an admin - look for participant by jid
        const senderParticipant = participants.find(p => p.jid === sender);
        
        const isAdmins = senderParticipant && senderParticipant.admin === 'admin';
        if (!isAdmins) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "★ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴꜱ ᴄᴀɴ ᴜꜱᴇ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ." },
            { quoted: m }
        );

        // Check if the bot is an admin
        const botJid = Matrix.user.id.includes(':') 
            ? Matrix.user.id.split(':')[0] + '@s.whatsapp.net' 
            : Matrix.user.id;
            
        const botParticipant = participants.find(p => p.jid === botJid);
        
        const isBotAdmins = botParticipant && botParticipant.admin === 'admin';
        if (!isBotAdmins) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "★I ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀɴ ᴀᴅᴍɪɴ ᴛᴏ ᴜꜱᴇ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ." },
            { quoted: m }
        );

        let number;
        if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            number = m.message.extendedTextMessage.contextInfo.participant.split("@")[0];
        } else if (args[1] && args[1].includes("@")) {
            number = args[1].replace(/[@\s]/g, '');
        } else {
            return await Matrix.sendMessage(
                m.key.remoteJid,
                { text: "★ᴘʟᴇᴀꜱᴇ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴍᴇꜱꜱᴀɢᴇ ᴏʀ ᴘʀᴏᴠɪᴅᴇ ᴀ ɴᴜᴍʙᴇʀ ᴛᴏ ᴘʀᴏᴍᴏᴛᴇ." },
                { quoted: m }
            );
        }

        // Prevent promoting the bot itself
        if (number === config.BOT_NUMBER) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "❌ The bot cannot promote itself." },
            { quoted: m }
        );

        const jid = number + "@s.whatsapp.net";

        try {
            await Matrix.groupParticipantsUpdate(m.key.remoteJid, [jid], "promote");
            
            // Get random image from assets folder
            const imageDir = path.join(process.cwd(), "assets");
            let randomImage = null;
            
            if (fs.existsSync(imageDir)) {
                const images = fs.readdirSync(imageDir)
                    .filter(file => file.match(/\.(jpg|png|jpeg|webp)$/i));
                
                if (images.length > 0) {
                    const chosen = images[Math.floor(Math.random() * images.length)];
                    randomImage = path.join(imageDir, chosen);
                }
            }
            
            // Use default image if no image found
            const imageContent = randomImage 
                ? { url: randomImage } // Use file path directly
                : { url: "https://files.catbox.moe/weux9l.jpg" };

            // Verified contact (quoted base)
            const verifiedContact = {
                key: {
                    fromMe: false,
                    participant: `0@s.whatsapp.net`,
                    remoteJid: "status@broadcast"
                },
                message: {
                    contactMessage: {
                        displayName: "Caseyrhodes-AI",
                        vcard: "BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD"
                    }
                }
            };

            // Channel forwarding context
            const channelContext = {
                mentionedJid: [jid],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363402973786789@newsletter',
                    newsletterName: 'CASEYRHODES TECH',
                    serverMessageId: 143
                }
            };

            await Matrix.sendMessage(
                m.key.remoteJid,
                {
                    image: imageContent,
                    caption: `✅ Successfully promoted @${number} to admin.`,
                    mentions: [jid],
                    contextInfo: channelContext
                },
                { quoted: verifiedContact }
            );
            
        } catch (error) {
            console.error("Promote command error:", error);
            await Matrix.sendMessage(
                m.key.remoteJid,
                { text: `❌ Failed to promote the member. Error: ${error.message}` },
                { quoted: m }
            );
        }
    } catch (error) {
        console.error("Promote command error:", error);
        await Matrix.sendMessage(
            m.key.remoteJid,
            { text: `❌ An error occurred: ${error.message}` },
            { quoted: m }
        );
    }
};

export default promote;
