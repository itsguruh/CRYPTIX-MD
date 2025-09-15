import config from '../config.cjs';

const gcEvent = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === 'welcome') {
    if (!m.isGroup) return m.reply("*📛 THIS COMMAND CAN ONLY BE USED IN GROUPS*");
    const groupMetadata = await Matrix.groupMetadata(m.from);
    const participants = groupMetadata.participants;
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const botAdmin = participants.find(p => p.id === botNumber)?.admin;
    const senderAdmin = participants.find(p => p.id === m.sender)?.admin;

    if (!botAdmin) return m.reply("*📛 BOT MUST BE AN ADMIN TO USE THIS COMMAND*");
    if (!senderAdmin) return m.reply("*📛 YOU MUST BE AN ADMIN TO USE THIS COMMAND*");
    let responseMessage;

    if (text === 'on') {
      config.WELCOME = true;
      responseMessage = "✅ *WELCOME & LEFT message has been enabled.*";
    } else if (text === 'off') {
      config.WELCOME = false;
      responseMessage = "❌ *WELCOME & LEFT message has been disabled.*";
    } else {
      // Create buttons for the welcome command
      const buttons = [
        { buttonId: `${prefix}welcome on`, buttonText: { displayText: 'TURN ON' }, type: 1 },
        { buttonId: `${prefix}welcome off`, buttonText: { displayText: 'TURN OFF' }, type: 1 }
      ];
      
      const buttonMessage = {
        text: "🎉 *WELCOME MESSAGE SETTINGS*\n\nSelect an option to enable or disable welcome/left messages:",
        footer: config.BOT_NAME,
        buttons: buttons,
        headerType: 1
      };
      
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    try {
      // Add confirmation buttons after changing the setting
      const buttons = [
        { buttonId: `${prefix}welcome`, buttonText: { displayText: 'SETTINGS' }, type: 1 },
        { buttonId: `${prefix}help`, buttonText: { displayText: 'HELP' }, type: 1 }
      ];
      
      const buttonMessage = {
        text: responseMessage,
        footer: config.BOT_NAME,
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

export default gcEvent;
