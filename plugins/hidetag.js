import config from '../config.cjs';

const tagall = async (m, gss) => {
  try {
    const botNumber = gss.user.id;
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();
    
    const validCommands = ['hidetag'];
    if (!validCommands.includes(cmd)) return;

    if (!m.key.remoteJid.endsWith('@g.us')) return m.reply("*📛 THIS COMMAND CAN ONLY BE USED IN GROUPS*");

    const groupMetadata = await gss.groupMetadata(m.from);
    const participants = groupMetadata.participants;
    
    const botParticipant = participants.find(p => p.id === botNumber);
    const senderParticipant = participants.find(p => p.id === m.sender);
    
    if (!botParticipant?.admin) return m.reply("*📛 BOT MUST BE AN ADMIN TO USE THIS COMMAND*");
    if (!senderParticipant?.admin) return m.reply("*📛 YOU MUST BE AN ADMIN TO USE THIS COMMAND*");

    // Extract the message to be sent
    const customMessage = text || 'no message';
    let message = `乂 *Attention Everyone* 乂\n\n*Message:* ${customMessage}\n\n`;

    for (let participant of participants) {
      message += `❒ @${participant.id.split('@')[0]}\n`;
    }

    await gss.sendMessage(m.from, { 
      text: message, 
      mentions: participants.map(a => a.id)
    }, { quoted: m });
    
  } catch (error) {
    console.error('Error:', error);
    await m.reply('An error occurred while processing the command.');
  }
};

export default tagall;
