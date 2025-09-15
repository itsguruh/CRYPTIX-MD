import config from '../config.cjs';

const unblock = async (m, gss) => {
  try {
    const botNumber = await gss.decodeJid(gss.user.id);
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['unblock'];

    if (!validCommands.includes(cmd)) return;
    
    if (!isCreator) return;

    try {
        // Check if message is a reply to someone
        if (m.quoted && m.quoted.sender) {
            // Unblock the quoted user directly
            const quotedUser = m.quoted.sender;
            await gss.updateBlockStatus(quotedUser, 'unblock');
            return;
        }
        
        // Check if user mentioned someone
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            // Unblock the first mentioned user directly
            const mentionedUser = m.mentionedJid[0];
            await gss.updateBlockStatus(mentionedUser, 'unblock');
            return;
        }
        
        // If no quoted or mentioned user, check for phone number in text
        if (text) {
            // Extract user ID from message text
            let userToUnblock = text.split(' ')[0];
            if (!userToUnblock.includes('@')) {
                userToUnblock += '@s.whatsapp.net';
            }
            
            await gss.updateBlockStatus(userToUnblock, 'unblock');
            return;
        }
        
    } catch (error) {
        console.error('Error in unblock command:', error);
    }
  } catch (error) {
    console.error('Error in unblock command:', error);
  }
};

export default unblock;
