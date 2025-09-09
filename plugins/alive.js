import fs from 'fs';
import config from '../config.cjs';

// Helper function to convert text to tiny caps
const toTinyCap = (text) => {
  const smallCapsMap = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ',
    'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ',
    's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
  };
  
  return text.split('').map(char => {
    const lowerChar = char.toLowerCase();
    return smallCapsMap[lowerChar] || char;
  }).join('');
};

const alive = async (m, Matrix) => {
  const uptimeSeconds = process.uptime();
  const days = Math.floor(uptimeSeconds / (3600 * 24));
  const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  // Get current time and date
  const now = new Date();
  const currentTime = now.toLocaleTimeString();
  const currentDate = now.toLocaleDateString();
  
  // Get user's pushname
  const pushname = m.pushName || 'User';

  const prefix = config.PREFIX;
  
  // Check if it's a button response
  const isButtonResponse = m.message?.buttonsResponseMessage;
  
  if (isButtonResponse) {
    const selectedButtonId = m.message.buttonsResponseMessage.selectedButtonId;
    
    if (selectedButtonId === `${prefix}voice`) {
      const audioUrls = [
        'https://files.catbox.moe/0joaof.mp3'
      ];

      const randomAudioUrl = audioUrls[Math.floor(Math.random() * audioUrls.length)];
      
      // Send audio
      await Matrix.sendMessage(m.from, {
        audio: { url: randomAudioUrl },
        mimetype: 'audio/mp4',
        ptt: true
      }, { quoted: m });
      
      return; // Exit after sending audio
    } else if (selectedButtonId === `${prefix}repo`) {
      // Handle repo button - send only prefix
      await Matrix.sendMessage(m.from, { 
        text: prefix 
      }, { quoted: m });
      return;
    }
  }
  
  // Regular command handling
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (!['alive', 'uptime', 'runtime'].includes(cmd)) return;

  const str = `
╭──❖ 「 *${toTinyCap("Bot Status")}* 」 ❖─
│ 👤 ʜɪ: *${pushname}*
│ 🕓 ᴛɪᴍᴇ: *${currentTime}*
│ 📆 ᴅᴀᴛᴇ: *${currentDate}*
│ 🧭 ᴜᴘᴛɪᴍᴇ: *${uptime}*
│ ⚙️ ᴍᴏᴅᴇ: *${config.MODE || 'default'}*
│ 🔰 ᴠᴇʀsɪᴏɴ: *${config.version || '1.0.0'}*
╰─────────❖`;

  const buttons = [
    {
      buttonId: `${prefix}repo`,
      buttonText: { displayText: '📂 Repo' },
      type: 1
    },
    {
      buttonId: `${prefix}voice`,
      buttonText: { displayText: '🎶 Voice Note' },
      type: 1
    }
  ];

  // Fixed verification contact with proper structure
  const fakeVCard = {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: "status@broadcast"
    },
    message: {
      contactMessage: {
        displayName: "CRYPTIX-MD ᴀɪ ✅",
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:CRYPTIX VERIFIED ✅\nORG:CRYPTIX BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
      }
    }
  };

  const buttonMessage = {
    image: fs.readFileSync('./media/Casey.jpg'),
    caption: str,
    footer: 'Choose an option',
    buttons: buttons,
    headerType: 4,
    contextInfo: {
      mentionedJid: [m.sender],
      forwardingScore: 999,
      isForwarded: true
    }
  };

  await Matrix.sendMessage(m.from, buttonMessage, {
    quoted: fakeVCard // Use the fixed verification contact
  });
};

export default alive;
