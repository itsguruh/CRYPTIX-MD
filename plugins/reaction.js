import axios from 'axios';
import config from '../config.cjs';

const gifCommandHandler = async (m, gss) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();
  
  const gifCommands = ['cry', 'kiss', 'kill', 'kick', 'hug', 'pat', 'lick', 'bite', 'yeet', 'bully', 'bonk', 'wink', 'poke', 'nom', 'slap', 'smile', 'wave', 'awoo', 'blush', 'smug', 'dance', 'happy', 'sad', 'cringe', 'cuddle', 'shinobu', 'handhold', 'glomp', 'highfive'];

  // Show gif menu as text list
  if (cmd === 'gif' || cmd === 'gifs') {
    let menuText = "🎬 *GIF MENU*\n\nAvailable GIF categories:\n\n";
    
    gifCommands.forEach((command, index) => {
      menuText += `• ${command.charAt(0).toUpperCase() + command.slice(1)}\n`;
    });
    
    menuText += `\nUsage: ${prefix}<category>\nExample: ${prefix}kiss`;
    menuText += `\n\n${config.FOOTER}`;

    await gss.sendMessage(m.from, { text: menuText }, { quoted: m });
    return;
  }

  // Handle direct gif commands
  if (gifCommands.includes(cmd)) {
    try {
      const { data } = await axios.get(`https://api.waifu.pics/sfw/${cmd}`);
      if (data && data.url) {
        // Send as GIF instead of converting to sticker
        await gss.sendMessage(m.from, {
          video: { url: data.url },
          caption: `Here's your ${cmd} GIF!`,
          gifPlayback: true
        }, { quoted: m });
      } else {
        m.reply('Error fetching GIF.');
      }
    } catch (error) {
      console.error('Error fetching GIF:', error);
      m.reply('Error fetching GIF.');
    }
  }
};

export default gifCommandHandler;
