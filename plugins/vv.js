import pkg from '@whiskeysockets/baileys';
const { downloadMediaMessage } = pkg;
import config from '../config.cjs';

const OwnerCmd = async (m, Matrix) => {
  const botNumber = Matrix.user.id.split(':')[0] + '@s.whatsapp.net';
  const ownerNumber = config.OWNER_NUMBER + '@s.whatsapp.net';
  const prefix = config.PREFIX;
  
  // Define your channel link here
  const channelLink = "https://whatsapp.com/channel/0029VakUEfb4o7qVdkwPk83E"; // Replace with your actual channel link

  // Check if sender is Owner or Bot
  const isOwner = m.sender === ownerNumber;
  const isBot = m.sender === botNumber;
  const isAuthorized = isOwner || isBot;

  // Extract command if prefixed
  const cmd = m.body.startsWith(prefix) 
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() 
    : '';

  // Handle the join channel button trigger
  if (m.body && m.body === `${prefix}join-channel`) {
    try {
      await Matrix.sendMessage(m.from, {
        text: `🌟 *Join Our Channel* 🌟\n\nClick the link below to join our channel for updates:\n${channelLink}`,
        detectLinks: true
      });
      return;
    } catch (error) {
      console.error("Failed to send channel link:", error);
    }
  }

  // Detect reaction on View Once message
  const isReaction = m.message?.reactionMessage;
  const reactedToViewOnce = isReaction && m.quoted && (m.quoted.message.viewOnceMessage || m.quoted.message.viewOnceMessageV2);

  // Detect emoji reply (alone or with text) only on View Once media
  const isEmojiReply = m.body && /^[\p{Emoji}](\s|\S)*$/u.test(m.body.trim()) && 
                       m.quoted && (m.quoted.message.viewOnceMessage || m.quoted.message.viewOnceMessageV2);

  // Secret Mode = Emoji Reply or Reaction (For Bot/Owner Only) on View Once media
  const secretMode = (isEmojiReply || reactedToViewOnce) && isAuthorized;

  // Allow only `.vv`, `.vv2`, `.vv3`, `.join-channel`
  if (cmd && !['vv', 'vv2', 'vv3', 'join-channel'].includes(cmd)) return;
  
  // Restrict VV commands properly
  if (cmd && cmd !== 'join-channel' && !isAuthorized) return m.reply('*Only the owner or bot can use this command!*');

  // If not command & not secret mode, exit
  if (!cmd && !secretMode) return;

  // Ensure the message is a reply to a View Once message
  const targetMessage = reactedToViewOnce ? m.quoted : m;
  if (!targetMessage.quoted) return;
  
  let msg = targetMessage.quoted.message;
  if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
  else if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;

  // Additional check to ensure it's media (image, video, or audio)
  const messageType = msg ? Object.keys(msg)[0] : null;
  const isMedia = messageType && ['imageMessage', 'videoMessage', 'audioMessage'].includes(messageType);
  
  if (!msg || !isMedia) return;

  try {
    let buffer = await downloadMediaMessage(targetMessage.quoted, 'buffer');
    if (!buffer) return;

    let mimetype = msg.audioMessage?.mimetype || 'audio/ogg';

    // Create buttons
    const buttons = [
      {
        buttonId: `${prefix}vv`,
        buttonText: { displayText: 'Send to Me' },
        type: 1
      },
      {
        buttonId: `${prefix}vv2`,
        buttonText: { displayText: 'Send to Bot' },
        type: 1
      },
      {
        buttonId: `${prefix}vv3`,
        buttonText: { displayText: 'Send to Owner' },
        type: 1
      },
      {
        buttonId: `${prefix}join-channel`,
        buttonText: { displayText: 'Join Channel' },
        type: 1
      }
    ];

    // Set recipient
    let recipient = secretMode || cmd === 'vv2' 
      ? botNumber
      : cmd === 'vv3' 
        ? ownerNumber
        : m.from;

    // Prepare the message with buttons
    const messageOptions = {
      caption: `> *© Powered By Caseyrhodes*\n\nChoose an option:`,
      footer: "View Once Media Handler",
      buttons: buttons,
      headerType: 1
    };

    // Send media with buttons attached
    if (messageType === 'imageMessage') {
      await Matrix.sendMessage(recipient, { 
        image: buffer, 
        ...messageOptions 
      });
    } else if (messageType === 'videoMessage') {
      await Matrix.sendMessage(recipient, { 
        video: buffer, 
        mimetype: 'video/mp4',
        ...messageOptions 
      });
    } else if (messageType === 'audioMessage') {  
      await Matrix.sendMessage(recipient, { 
        audio: buffer, 
        mimetype,
        ptt: true,
        ...messageOptions 
      });
    }

  } catch (error) {
    console.error(error);
    if (cmd) await m.reply('*Failed to process View Once message!*');
  }
};

export default OwnerCmd;
