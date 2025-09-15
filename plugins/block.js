import config from '../config.cjs';

// Matrix to store pending block actions (userJid -> action data)
const blockMatrix = new Map();

const block = async (m, Matrix) => {
  try {
    // Get the owner's JID from config
    const ownerJid = config.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

    // Get the bot's paired JID (the device itself)
    const botJid = Matrix.user.id.includes(':') ? Matrix.user.id.split(':')[0] : Matrix.user.id;

    // Normalize sender JID
    const senderJid = m.sender.includes(':') ? m.sender.split(':')[0] : m.sender;

    // Check if the sender is the owner (either config number or the paired bot device)
    const isOwner = senderJid === ownerJid || senderJid === botJid;

    const prefix = config.PREFIX;
    const body = m.body || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

    // Handle confirmation responses
    if (body.startsWith(`${prefix}confirm-block-`)) {
      if (!isOwner) {
        const buttonMessage = {
          text: "*📛 THIS IS AN OWNER ONLY COMMAND*",
          footer: "You don't have permission to use this command",
          buttons: [
            { buttonId: `${prefix}support`, buttonText: { displayText: "REQUEST SUPPORT" }, type: 1 }
          ],
          headerType: 1
        };
        return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
      }

      const targetUser = body.split('-').pop();
      const pendingAction = blockMatrix.get(senderJid);

      if (pendingAction && pendingAction.action === 'block') {
        // Execute the block
        await Matrix.updateBlockStatus(pendingAction.userJid, "block");

        // Remove from matrix
        blockMatrix.delete(senderJid);

        return await Matrix.sendMessage(m.from, { 
          text: `✅ Successfully blocked *${targetUser}*` 
        }, { quoted: m });
      }

      return await Matrix.sendMessage(m.from, { 
        text: "❌ No pending block action or action expired" 
      }, { quoted: m });
    }

    // Handle cancel responses
    if (body === `${prefix}cancel`) {
      if (blockMatrix.has(senderJid)) {
        blockMatrix.delete(senderJid);
        return await Matrix.sendMessage(m.from, { 
          text: "❌ Block operation cancelled" 
        }, { quoted: m });
      }
    }

    // Only process block command
    if (cmd !== 'block') return;

    if (!isOwner) {
      // Send a button message for non-owners
      const buttonMessage = {
        text: "*📛 THIS IS AN OWNER ONLY COMMAND*",
        footer: "You don't have permission to use this command",
        buttons: [
          { buttonId: `${prefix}support`, buttonText: { displayText: "REQUEST SUPPORT" }, type: 1 }
        ],
        headerType: 1
      };
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const text = body.slice(prefix.length + cmd.length).trim();

    // Check if any user is mentioned or quoted
    if (!m.mentionedJid?.length && !m.quoted && !text) {
      const buttonMessage = {
        text: `Please mention a user, quote a message, or provide a number.\nUsage: ${prefix}block @user`,
        footer: "Select an option below",
        buttons: [
          { buttonId: `${prefix}help block`, buttonText: { displayText: "HELP GUIDE" }, type: 1 },
          { buttonId: `${prefix}listblock`, buttonText: { displayText: "BLOCKED LIST" }, type: 1 }
        ],
        headerType: 1
      };
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    let users = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);

    // If no mentioned/quoted user, try to extract from text
    if (!users && text) {
      const numberMatch = text.match(/[\d+]+/g);
      if (numberMatch) {
        // Format the number properly for WhatsApp
        users = numberMatch[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      }
    }

    if (!users) {
      const buttonMessage = {
        text: 'Could not identify a valid user to block.',
        footer: "Please try again",
        buttons: [
          { buttonId: `${prefix}help block`, buttonText: { displayText: "HELP" }, type: 1 }
        ],
        headerType: 1
      };
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    // Ensure the user JID is in the correct format
    if (!users.endsWith('@s.whatsapp.net')) {
      users = users.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }

    const userName = users.split('@')[0];
    const displayName = m.quoted?.pushName || userName;

    // Create confirmation buttons before taking action
    const confirmButtons = {
      text: `Are you sure you want to block *${displayName}*?`,
      footer: "This action cannot be undone",
      buttons: [
        { buttonId: `${prefix}confirm-block-${userName}`, buttonText: { displayText: "YES, BLOCK" }, type: 1 },
        { buttonId: `${prefix}cancel`, buttonText: { displayText: "CANCEL" }, type: 1 }
      ],
      headerType: 1
    };

    // Store the pending action in the matrix
    blockMatrix.set(senderJid, {
      action: 'block',
      userJid: users,
      timestamp: Date.now(),
      userName: userName
    });

    // Clean up old pending actions (older than 5 minutes)
    const now = Date.now();
    for (const [key, value] of blockMatrix.entries()) {
      if (now - value.timestamp > 5 * 60 * 1000) {
        blockMatrix.delete(key);
      }
    }

    await Matrix.sendMessage(m.from, confirmButtons, { quoted: m });
      
  } catch (error) {
    console.error('Error in block command:', error);
    
    const errorButtons = {
      text: '❌ An error occurred while processing the command.',
      footer: "Please try again later",
      buttons: [
        { buttonId: `${prefix}support`, buttonText: { displayText: "REPORT ERROR" }, type: 1 }
      ],
      headerType: 1
    };
    
    await Matrix.sendMessage(m.from, errorButtons, { quoted: m });
  }
};

export default block;
