import { downloadMediaMessage } from '@whiskeysockets/baileys';
import Jimp from 'jimp';
import config from '../config.cjs';

const setProfilePicture = async (m, Matrix) => {
  const botNumber = Matrix.user.id;
  const isBot = m.sender === botNumber;
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  
  if (cmd !== "fullpp") return;

  // Enhanced owner verification logic
  let isOwner = false;
  
  if (config.OWNER_NUMBER) {
    // If owner number is configured, check against it
    isOwner = m.sender.endsWith(config.OWNER_NUMBER.replace(/[^0-9]/g, ''));
  } else {
    // If no owner number is configured, check if sender is the bot itself
    // or if this is the first time setup (you can add additional logic here)
    isOwner = isBot || m.sender === botNumber;
    
    // Alternative: You could also check if this is a private chat with specific conditions
    // isOwner = isBot || (m.from === m.sender && !m.from.includes('@g.us'));
  }
  
  // Allow only bot owner to use this command
  if (!isOwner) {
    return m.reply("❌ This command can only be used by the bot owner.");
  }

  // Check if the replied message is an image
  if (!m.quoted?.message?.imageMessage) {
    return m.reply("⚠️ Please *reply to an image* to set as profile picture.");
  }

  await m.react('⏳'); // Loading reaction

  try {
    // Download the image with retry mechanism
    let media;
    for (let i = 0; i < 3; i++) {
      try {
        media = await downloadMediaMessage(m.quoted, 'buffer', {});
        if (media) break;
      } catch (error) {
        if (i === 2) {
          await m.react('❌');
          return m.reply("❌ Failed to download image. Try again.");
        }
      }
    }

    // Process image
    const image = await Jimp.read(media);
    if (!image) throw new Error("Invalid image format");

    // Make square if needed
    const size = Math.max(image.bitmap.width, image.bitmap.height);
    if (image.bitmap.width !== image.bitmap.height) {
      const squareImage = new Jimp(size, size, 0x000000FF);
      squareImage.composite(image, (size - image.bitmap.width) / 2, (size - image.bitmap.height) / 2);
      // Fix: Use blit instead of clone for copying
      image.blit(squareImage, 0, 0);
    }

    // Resize to WhatsApp requirements
    image.resize(640, 640);
    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    // Update profile picture
    await Matrix.updateProfilePicture(botNumber, buffer);
    await m.react('✅');

    // Success response
    return Matrix.sendMessage(
      m.from,
      {
        text: "✅ *Profile Picture Updated successfully!*",
        mentions: [m.sender]
      },
      { quoted: m }
    );

  } catch (error) {
    console.error("Error setting profile picture:", error);
    await m.react('❌');
    return m.reply("❌ An error occurred while updating the profile picture.");
  }
};

export default setProfilePicture;
