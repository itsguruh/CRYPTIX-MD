import Tesseract from 'tesseract.js';
import { writeFile, unlink } from 'fs/promises';
import config from '../config.cjs';

const givetextCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const args = m.body.slice(prefix.length + cmd.length).trim().split(' ');

  const validCommands = ['givetext', 'text'];

  if (validCommands.includes(cmd)) {
    if (!m.quoted || m.quoted?.message?.imageMessage === undefined) {
      return m.reply(`Send/Reply with an image to extract text ${prefix + cmd}`);
    }

    let lang = 'eng'; 
    if (args.length > 0) {
      lang = args[0]; 
    }

    try {
      // Download the media
      const media = await Matrix.downloadMediaMessage(m.quoted);
      if (!media) throw new Error('Failed to download media.');

      const filePath = `./${Date.now()}.png`;
      await writeFile(filePath, media);

      const { data: { text } } = await Tesseract.recognize(filePath, lang, {
        logger: m => console.log(m)
      });

      const responseMessage = `Extracted Text:\n\n${text}`;
      await Matrix.sendMessage(m.key.remoteJid, { text: responseMessage }, { quoted: m }); 

      await unlink(filePath); 
    } catch (error) {
      console.error("Error extracting text from image:", error);
      await Matrix.sendMessage(m.key.remoteJid, { text: 'Error extracting text from image.' }, { quoted: m }); 
    }
  }
};

export default givetextCommand;
