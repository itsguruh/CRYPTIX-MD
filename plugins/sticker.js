import fs from 'fs-extra';
import config from '../config.cjs';

const stickerCommand = async (m, gss) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  const packname = global.packname || "Caseyrhodes-MD";
  const author = global.author || "🖤🌟";

  const validCommands = ['sticker', 's', 'autosticker'];

  const arg = text.split(' ')[0];

  if (cmd === 'autosticker') {
    if (arg === 'on') {
      config.AUTO_STICKER = true;
      await m.reply('Auto-sticker is now enabled.');
    } else if (arg === 'off') {
      config.AUTO_STICKER = false;
      await m.reply('Auto-sticker is now disabled.');
    } else {
      await m.reply('Usage: /autosticker on|off');
    }
    return;
  }

  if (config.AUTO_STICKER && !m.key.fromMe) {
    if (m.type === 'imageMessage') {
      let media = await m.download();
      if (media) {
        await gss.sendImageAsSticker(m.from, media, m, { packname, author });
        console.log('Auto sticker sent');
      } else {
        console.error('Failed to download media for auto-sticker.');
      }
      return;
    } else if (m.type === 'videoMessage' && m.msg.seconds <= 11) {
      let media = await m.download();
      if (media) {
        await gss.sendVideoAsSticker(m.from, media, m, { packname, author });
      } else {
        console.error('Failed to download video for auto-sticker.');
      }
      return;
    }
  }

  if (validCommands.includes(cmd)) {
    const quoted = m.quoted || {};

    if (!quoted || (quoted.mtype !== 'imageMessage' && quoted.mtype !== 'videoMessage')) {
      return m.reply(`Send/Reply with an image or video to convert into a sticker using ${prefix + cmd}`);
    }

    try {
      const media = await quoted.download();
      if (!media) throw new Error('Failed to download media.');
      
      if (quoted.mtype === 'imageMessage') {
        await gss.sendImageAsSticker(m.from, media, m, { packname, author });
        
        // Success message with buttons
        const buttonMessage = {
          text: "✅ Sticker created successfully!\n\nWhat would you like to do next?",
          footer: "Caseyrhodes-MD",
          buttons: [
            { buttonId: `${prefix}sticker`, buttonText: { displayText: "🎨 Make Another" }, type: 1 },
            { buttonId: `${prefix}help`, buttonText: { displayText: "📖 Help" }, type: 1 }
          ],
          headerType: 1
        };
        await gss.sendMessage(m.from, buttonMessage, { quoted: m });
        
      } else if (quoted.mtype === 'videoMessage' && quoted.msg.seconds <= 11) {
        await gss.sendVideoAsSticker(m.from, media, m, { packname, author });
        
        // Success message with buttons
        const buttonMessage = {
          text: "✅ Video sticker created successfully!\n\nWhat would you like to do next?",
          footer: "Caseyrhodes-MD",
          buttons: [
            { buttonId: `${prefix}sticker`, buttonText: { displayText: "🎬 Make Another" }, type: 1 },
            { buttonId: `${prefix}help`, buttonText: { displayText: "📖 Help" }, type: 1 },
            { buttonId: `${prefix}tools`, buttonText: { displayText: "⚙️ Tools" }, type: 1 }
          ],
          headerType: 1
        };
        await gss.sendMessage(m.from, buttonMessage, { quoted: m });
        
      } else {
        m.reply('Video too long. Please send a video that is less than 11 seconds.');
      }
    } catch (error) {
      console.error(error);
      
      // Error message with button
      const errorButtonMessage = {
        text: `❌ Error: ${error.message}\n\nNeed help?`,
        footer: "Caseyrhodes-MD",
        buttons: [
          { buttonId: `${prefix}help`, buttonText: { displayText: "📖 Get Help" }, type: 1 }
        ],
        headerType: 1
      };
      await gss.sendMessage(m.from, errorButtonMessage, { quoted: m });
    }
  }
};

export default stickerCommand;
