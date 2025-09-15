import config from '../config.cjs';

const autotypingCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === 'autotyping') {
    if (!isCreator) return m.reply("*📛 THIS IS AN OWNER COMMAND*");
    
    // If no argument is provided, show buttons
    if (!text || (text !== 'on' && text !== 'off')) {
      const buttons = [
        { buttonId: `${prefix}autotyping on`, buttonText: { displayText: '🟢 Enable' }, type: 1 },
        { buttonId: `${prefix}autotyping off`, buttonText: { displayText: '🔴 Disable' }, type: 1 }
      ];
      
      const buttonMessage = {
        text: "Select an option for Auto-Typing:",
        footer: "Owner Command",
        buttons: buttons,
        headerType: 1
      };
      
      try {
        await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      } catch (error) {
        console.error("Error sending buttons:", error);
        await Matrix.sendMessage(m.from, { text: 'Usage:\n- `autotyping on`: Enable Auto-Typing\n- `autotyping off`: Disable Auto-Typing' }, { quoted: m });
      }
      return;
    }
    
    let responseMessage;
    let statusEmoji = '';

    if (text === 'on') {
      config.AUTO_TYPING = true;
      responseMessage = "✅ *Auto-Typing has been enabled.*";
      statusEmoji = '🟢';
    } else if (text === 'off') {
      config.AUTO_TYPING = false;
      responseMessage = "❌ *Auto-Typing has been disabled.*";
      statusEmoji = '🔴';
    }

    try {
      // Send confirmation with a button to show current status
      const buttons = [
        { buttonId: `${prefix}autotyping`, buttonText: { displayText: `${statusEmoji} Current Status` }, type: 1 }
      ];
      
      const buttonMessage = {
        text: responseMessage,
        footer: "Auto-Typing Settings",
        buttons: buttons,
        headerType: 1
      };
      
      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    } catch (error) {
      console.error("Error processing your request:", error);
      await Matrix.sendMessage(m.from, { text: 'Error processing your request.' }, { quoted: m });
    }
  }
};

export default autotypingCommand;
