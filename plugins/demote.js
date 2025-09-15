import fs from 'fs';
import config from '../config.cjs';
import path from 'path';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

const demote = async (m, Matrix) => {
    try {
        const prefix = config.PREFIX || ".";
        const body = m.message?.conversation || 
                    m.message?.extendedTextMessage?.text || 
                    m.message?.imageMessage?.caption || "";
        
        if (!body.startsWith(prefix)) return;
        
        const args = body.slice(prefix.length).trim().split(" ");
        const command = args[0].toLowerCase();

        if (!["demote", "d", "dismiss", "removeadmin"].includes(command)) return;

        // Check if the command is used in a group
        const isGroup = m.key.remoteJid.endsWith('@g.us');
        if (!isGroup) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "❌ This command can only be used in groups." },
            { quoted: m }
        );

        // Get group metadata to check admin status
        const groupMetadata = await Matrix.groupMetadata(m.key.remoteJid);
        const participants = groupMetadata.participants;
        
        // Get sender JID (handle both direct messages and group messages)
        const sender = m.key.participant || m.key.remoteJid;
        
        // Debug: Log the sender and participants
        console.log("Sender:", sender);
        console.log("Participants:", participants);
        
        // Check if the user is an admin - look for participant by jid
        const senderParticipant = participants.find(p => p.id === sender);
        
        const isAdmins = senderParticipant && senderParticipant.admin === 'admin';
        if (!isAdmins) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "❌ Only group admins can use this command." },
            { quoted: m }
        );

        // Check if the bot is an admin
        const botJid = Matrix.user.id.includes(':') 
            ? Matrix.user.id.split(':')[0] + '@s.whatsapp.net' 
            : Matrix.user.id;
            
        const botParticipant = participants.find(p => p.id === botJid);
        
        const isBotAdmins = botParticipant && botParticipant.admin === 'admin';
        if (!isBotAdmins) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "❌ I need to be an admin to use this command." },
            { quoted: m }
        );

        let number;
        if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            number = m.message.extendedTextMessage.contextInfo.participant.split("@")[0];
        } else if (args[1]) {
            number = args[1].replace(/[@\s]/g, '');
        } else {
            return await Matrix.sendMessage(
                m.key.remoteJid,
                { text: "❌ Please reply to a message or provide a number to demote." },
                { quoted: m }
            );
        }

        // Prevent demoting the bot itself
        if (number === config.BOT_NUMBER) return await Matrix.sendMessage(
            m.key.remoteJid,
            { text: "❌ The bot cannot demote itself." },
            { quoted: m }
        );

        const jid = number + "@s.whatsapp.net";

        try {
            await Matrix.groupParticipantsUpdate(m.key.remoteJid, [jid], "demote");
            
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
                ? fs.readFileSync(randomImage) // Read file as buffer
                : { url: "https://i.ibb.co/20ryR2pN/caseywebs.jpg" };

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
                    newsletterName: 'ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ✅',
                    serverMessageId: 143
                }
            };

            await Matrix.sendMessage(
                m.key.remoteJid,
                {
                    image: imageContent,
                    caption: `Successfully demoted @${number} to a normal member.`,
                    mentions: [jid],
                    contextInfo: channelContext
                },
                { quoted: verifiedContact }
            );
            
        } catch (error) {
            console.error("Demote command error:", error);
            await Matrix.sendMessage(
                m.key.remoteJid,
                { text: `❌ Failed to demote the member. Error: ${error.message}` },
                { quoted: m }
            );
        }
    } catch (error) {
        console.error("Demote command error:", error);
        await Matrix.sendMessage(
            m.key.remoteJid,
            { text: `❌ An error occurred: ${error.message}` },
            { quoted: m }
        );
    }
};

export default demote;
