import config from '../config.cjs';
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from "@whiskeysockets/baileys";

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
    k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ",
    u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

// Function to check if user is bot owner using matrix.user.id
function isBotOwner(sender) {
  // Get owner ID from matrix.user.id or fallback to config
  const ownerId = matrix?.user?.id || config.OWNER_NUMBER;
  
  if (!ownerId) {
    console.error("❌ No owner ID configured in matrix.user.id or config.OWNER_NUMBER");
    return false;
  }
  
  // Handle both matrix ID format and WhatsApp number format
  const senderNumber = sender.split('@')[0];
  const ownerNumber = ownerId.includes('@') ? ownerId.split('@')[0] : ownerId;
  
  return senderNumber === ownerNumber;
}

const restartBot = async (m, sock) => {
  const prefix = config.PREFIX;
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = body.slice(prefix.length + cmd.length).trim();
  const sender = m.sender;

  // Helper function to reply to messages
  const reply = (text, options = {}) => sock.sendMessage(m.key.remoteJid, { text, ...options }, { quoted: m });

  if (cmd === 'restart') {
    // Check if user is bot owner using matrix.user.id
    if (!isBotOwner(sender)) {
      return reply("❌ This command is only for the bot owner.");
    }

    try {
      // Create button message
      const buttonMessage = {
        text: `*${toFancyFont("Restarting Bot...")}*`,
        footer: 'Bot will restart momentarily',
        buttons: [
          { buttonId: `${prefix}menu`, buttonText: { displayText: `📃 ${toFancyFont("Menu")}` }, type: 1 },
          { buttonId: `${prefix}status`, buttonText: { displayText: `📊 ${toFancyFont("Status")}` }, type: 1 }
        ],
        headerType: 1,
        viewOnce: true,
        mentions: [m.sender]
      };

      // Send restart message
      await sock.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });

      // Send confirmation message
      await reply(`✅ *${toFancyFont("Restart Command Received")}*\n\n` +
            `📝 *${toFancyFont("Command")}:* ${prefix}restart\n` +
            `👤 *${toFancyFont("User")}:* @${m.sender.split('@')[0]}\n` +
            `⏰ *${toFancyFont("Time")}:* ${new Date().toLocaleString()}\n\n` +
            `🔄 *${toFancyFont("Bot is now restarting...")}*`,
        { mentions: [m.sender] }
      );

      // Log the restart
      console.log(`🔄 Restart initiated by owner ${m.sender} at ${new Date().toLocaleString()}`);

      // Delay before exit for better user experience
      setTimeout(() => {
        console.log('✅ Bot shutting down for restart...');
        process.exit(0);
      }, 2000);

    } catch (error) {
      console.error('❌ Restart Error:', error);

      // Send error message
      await reply(`❌ *${toFancyFont("Restart Failed")}*\n\n` +
            `📛 *${toFancyFont("Error")}:* ${error.message}\n\n` +
            `⚠️ *${toFancyFont("Please try again or contact support")}*`,
        { mentions: [m.sender] }
      );

      // Add reaction to indicate error
      await sock.sendMessage(m.key.remoteJid, {
        react: { text: "❌", key: m.key }
      });
    }
  }
};

// Additional utility function for bot status
export const botStatus = async (m, sock) => {
  const prefix = config.PREFIX;
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const sender = m.sender;

  // Helper function to reply to messages
  const reply = (text, options = {}) => sock.sendMessage(m.key.remoteJid, { text, ...options }, { quoted: m });

  if (cmd === 'status') {
    // Optional: You can also restrict status command to owner if desired
    // if (!isBotOwner(sender)) {
    //   return reply("❌ This command is only for the bot owner.");
    // }

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const statusMessage = {
      text: `🤖 *${toFancyFont("Bot Status")}*\n\n` +
            `✅ *${toFancyFont("Online")}:* Yes\n` +
            `⏰ *${toFancyFont("Uptime")}:* ${hours}h ${minutes}m ${seconds}s\n` +
            `📊 *${toFancyFont("Memory Usage")}:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
            `🔄 *${toFancyFont("Restart Command")}:* ${prefix}restart\n\n` +
            `⚡ *${toFancyFont("Powered by Baileys")}*`,
      footer: 'Bot System Status',
      mentions: [m.sender]
    };

    await sock.sendMessage(m.key.remoteJid, statusMessage, { quoted: m });
  }
};

export default restartBot;
