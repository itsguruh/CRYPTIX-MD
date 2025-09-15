import config from "../config.cjs";

const getpp = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
    if (!["getpp", "pp"].includes(cmd)) return;
    
    await Matrix.sendMessage(m.from, { react: { text: "🖼️", key: m.key } });
    
    const isGroup = m.from.endsWith('@g.us');
    const sender = m.sender;
    
    const reply = async (text) => {
      await Matrix.sendMessage(m.from, { text }, { quoted: m });
    };
    
    // Get quoted participant if message is a reply
    const quotedParticipant = m.message?.extendedTextMessage?.contextInfo?.participant;
    
    let targetJid;
    if (isGroup) {
      // If it's a reply to someone's message in group
      if (quotedParticipant) {
        targetJid = quotedParticipant;
      } 
      // If mentioned someone in the command
      else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }
      // If no reply or mention, use sender's own profile
      else {
        targetJid = sender;
      }
    } else {
      // In private chat, always use sender's profile
      targetJid = sender;
    }
    
    let imageUrl;
    try {
      imageUrl = await Matrix.profilePictureUrl(targetJid, 'image');
    } catch {
      imageUrl = "https://i.ibb.co/fGSVG8vJ/caseyweb.jpg";
    }
    
    const targetUser = targetJid.split('@')[0];
    
    // Verification contact card
    const fakeVCard = {
      key: {
        fromMe: false,
        participant: '0@s.whatsapp.net',
        remoteJid: "status@broadcast"
      },
      message: {
        contactMessage: {
          displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ✅",
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
        }
      }
    };

    const messageOptions = {
      image: { url: imageUrl },
      caption: `📸 Profile picture of @${targetUser}\n\n✨ _Powered by CaseyRhodes AI_`,
      mentions: [targetJid],
      contextInfo: {
        mentionedJid: [targetJid],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363402973786789@newsletter",
          newsletterName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ɴᴇᴡꜱʟᴇᴛᴛᴇʀ 🌟",
          serverMessageId: -1
        }
      }
    };
    
    await Matrix.sendMessage(m.from, messageOptions, { quoted: fakeVCard });
    
  } catch (err) {
    console.error("Error in getpp:", err);
    const reply = async (text) => {
      await Matrix.sendMessage(m.from, { text }, { quoted: m });
    };
    reply("❌ Failed to fetch profile picture.");
  }
};

export default getpp;
