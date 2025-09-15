import config from '../config.cjs';

// Main command function
const anticallcommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === 'anticall') {
    if (!isCreator) return m.reply("*📛 THIS IS AN OWNER COMMAND*");
    
    // If no parameter is provided, show the current status with buttons
    if (!text || (text !== 'on' && text !== 'off')) {
      const currentStatus = config.REJECT_CALL ? 'Enabled ✅' : 'Disabled ❌';
      
      const buttons = [
        {
          buttonId: `${prefix}anticall on`,
          buttonText: { displayText: 'Turn ON 🔒' },
          type: 1
        },
        {
          buttonId: `${prefix}anticall off`,
          buttonText: { displayText: 'Turn OFF 🔓' },
          type: 1
        }
      ];
      
      const buttonMessage = {
        text: `*Anti-Call Settings*\n\nCurrent Status: ${currentStatus}\n\nSelect an option:`,
        footer: config.BOT_NAME || 'Matrix Bot',
        buttons: buttons,
        headerType: 1
      };
      
      try {
        await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      } catch (error) {
        console.error("Error sending button message:", error);
        await Matrix.sendMessage(m.from, { 
          text: `*Anti-Call Settings*\n\nCurrent Status: ${currentStatus}\n\nUsage:\n- \`${prefix}anticall on\`: Enable Anti-Call\n- \`${prefix}anticall off\`: Disable Anti-Call` 
        }, { quoted: m });
      }
      return;
    }
    
    let responseMessage;
    let statusEmoji;

    if (text === 'on') {
      config.REJECT_CALL = true;
      responseMessage = "Anti-Call has been enabled. 🔒";
      statusEmoji = '✅';
    } else if (text === 'off') {
      config.REJECT_CALL = false;
      responseMessage = "Anti-Call has been disabled. 🔓";
      statusEmoji = '❌';
    }

    // Create confirmation button
    const buttons = [
      {
        buttonId: `${prefix}anticall`,
        buttonText: { displayText: 'Check Status 🔄' },
        type: 1
      }
    ];
    
    const buttonMessage = {
      text: responseMessage,
      footer: config.BOT_NAME || 'Matrix Bot',
      buttons: buttons,
      headerType: 1
    };

    try {
      await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    } catch (error) {
      console.error("Error processing your request:", error);
      // Fallback to text if buttons fail
      await Matrix.sendMessage(m.from, { text: responseMessage }, { quoted: m });
    }
  }
};

export default anticallcommand;
