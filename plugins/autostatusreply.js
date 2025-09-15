import config from '../config.cjs';

// Main command function
const anticallCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim().toLowerCase();
  
  const validCommands = ['autostatusreply'];

  if (validCommands.includes(cmd)) {
    if (!isCreator) return m.reply("*📛 THIS IS AN OWNER COMMAND*");
    
    let responseMessage;
    let buttons = [];

    if (text === 'on') {
      config.AUTO_STATUS_REPLY = true;
      responseMessage = "✅ *AUTO STATUS REPLY has been enabled.*";
      
      // Add toggle off button
      buttons = [
        { buttonId: `${prefix}autostatusreply off`, buttonText: { displayText: '🔴 TURN OFF' }, type: 1 }
      ];
    } else if (text === 'off') {
      config.AUTO_STATUS_REPLY = false;
      responseMessage = "❌ *AUTO STATUS REPLY has been disabled.*";
      
      // Add toggle on button
      buttons = [
        { buttonId: `${prefix}autostatusreply on`, buttonText: { displayText: '🟢 TURN ON' }, type: 1 }
      ];
    } else {
      // Show current status and options
      const status = config.AUTO_STATUS_REPLY ? '🟢 ENABLED' : '🔴 DISABLED';
      responseMessage = `📊 *AUTO STATUS REPLY SETTINGS*\n\nCurrent Status: ${status}\n\nSelect an option:`;
      
      // Add both toggle buttons
      buttons = [
        { buttonId: `${prefix}autostatusreply on`, buttonText: { displayText: '🟢 ENABLE' }, type: 1 },
        { buttonId: `${prefix}autostatusreply off`, buttonText: { displayText: '🔴 DISABLE' }, type: 1 }
      ];
    }

    try {
      const buttonMessage = {
        text: responseMessage,
        footer: config.BOT_NAME || "Matrix Bot",
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

export default anticallCommand;
