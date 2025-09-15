import Tesseract from 'tesseract.js';
import translate from 'translate-google-api';
import { writeFile } from 'fs/promises';
import config from '../config.cjs';

const translateCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const args = m.body?.slice(prefix.length + cmd.length).trim() || '';

  const validCommands = ['translate', 'trt'];

  if (validCommands.includes(cmd)) {
    const targetLang = args.split(' ')[0];
    const text = args.slice(targetLang.length).trim();

    try {
      if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedMsg = m.message.extendedTextMessage.contextInfo.quotedMessage;
        
        // Handle quoted image message
        if (quotedMsg.imageMessage) {
          try {
            const stream = await sock.downloadMediaMessage(quotedMsg);
            if (!stream) throw new Error('Failed to download media.');

            const filePath = `./${Date.now()}.png`;
            await writeFile(filePath, stream);
            
            const { data: { text: extractedText } } = await Tesseract.recognize(filePath, 'eng', {
              logger: m => console.log(m)
            });

            const result = await translate(extractedText, { to: targetLang });
            const translatedText = result[0];

            const responseMessage = `${targetLang}:\n\n${translatedText}`;
            
            // Add buttons for common languages
            const buttons = [
              {buttonId: `${prefix}translate en ${translatedText}`, buttonText: {displayText: 'English'}, type: 1},
              {buttonId: `${prefix}translate es ${translatedText}`, buttonText: {displayText: 'Spanish'}, type: 1},
              {buttonId: `${prefix}translate fr ${translatedText}`, buttonText: {displayText: 'French'}, type: 1},
              {buttonId: `${prefix}translate de ${translatedText}`, buttonText: {displayText: 'German'}, type: 1},
              {buttonId: `${prefix}translate ja ${translatedText}`, buttonText: {displayText: 'Japanese'}, type: 1}
            ];
            
            const buttonMessage = {
              text: responseMessage,
              footer: "Translate to other languages:",
              buttons: buttons,
              headerType: 1
            };
            
            await sock.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
          } catch (error) {
            console.error("Error extracting and translating text from image:", error);
            
            // Error message with buttons
            const errorButtons = [
              {buttonId: `${prefix}help translate`, buttonText: {displayText: 'Help'}, type: 1},
              {buttonId: `${prefix}translate en Hello`, buttonText: {displayText: 'Example'}, type: 1}
            ];
            
            const errorMessage = {
              text: 'Error extracting and translating text from image.',
              footer: "Try again or check the help section",
              buttons: errorButtons,
              headerType: 1
            };
            
            await sock.sendMessage(m.key.remoteJid, errorMessage, { quoted: m });
          }
        } 
        // Handle quoted text message
        else if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
          try {
            const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
            const result = await translate(quotedText, { to: targetLang });
            const translatedText = result[0];

            const responseMessage = `${targetLang}:\n\n${translatedText}`;
            
            // Add buttons for common languages
            const buttons = [
              {buttonId: `${prefix}translate en ${quotedText}`, buttonText: {displayText: 'English'}, type: 1},
              {buttonId: `${prefix}translate es ${quotedText}`, buttonText: {displayText: 'Spanish'}, type: 1},
              {buttonId: `${prefix}translate fr ${quotedText}`, buttonText: {displayText: 'French'}, type: 1},
              {buttonId: `${prefix}translate de ${quotedText}`, buttonText: {displayText: 'German'}, type: 1},
              {buttonId: `${prefix}translate ja ${quotedText}`, buttonText: {displayText: 'Japanese'}, type: 1}
            ];
            
            const buttonMessage = {
              text: responseMessage,
              footer: "Translate to other languages:",
              buttons: buttons,
              headerType: 1
            };
            
            await sock.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
          } catch (error) {
            console.error("Error translating quoted text:", error);
            
            // Error message with buttons
            const errorButtons = [
              {buttonId: `${prefix}help translate`, buttonText: {displayText: 'Help'}, type: 1},
              {buttonId: `${prefix}translate en Hello`, buttonText: {displayText: 'Example'}, type: 1}
            ];
            
            const errorMessage = {
              text: 'Error translating quoted text.',
              footer: "Try again or check the help section",
              buttons: errorButtons,
              headerType: 1
            };
            
            await sock.sendMessage(m.key.remoteJid, errorMessage, { quoted: m });
          }
        }
      } else if (text && targetLang) {
        // Handle direct text translation
        const result = await translate(text, { to: targetLang });
        const translatedText = result[0];

        const responseMessage = `${targetLang}:\n\n${translatedText}`;
        
        // Add buttons for common languages
        const buttons = [
          {buttonId: `${prefix}translate en ${text}`, buttonText: {displayText: 'English'}, type: 1},
          {buttonId: `${prefix}translate es ${text}`, buttonText: {displayText: 'Spanish'}, type: 1},
          {buttonId: `${prefix}translate fr ${text}`, buttonText: {displayText: 'French'}, type: 1},
          {buttonId: `${prefix}translate de ${text}`, buttonText: {displayText: 'German'}, type: 1},
          {buttonId: `${prefix}translate ja ${text}`, buttonText: {displayText: 'Japanese'}, type: 1}
        ];
        
        const buttonMessage = {
          text: responseMessage,
          footer: "Translate to other languages:",
          buttons: buttons,
          headerType: 1
        };
        
        await sock.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
      } else {
        // Show usage instructions with buttons for common languages and examples
        const responseMessage = "Usage: /translate <target_lang> <text>\nExample: /translate en कैसे हो भाई\nOr reply to an image/text message with /translate <target_lang>";
        
        // Add buttons for common languages and examples
        const buttons = [
          {buttonId: `${prefix}translate en Hello`, buttonText: {displayText: 'English Example'}, type: 1},
          {buttonId: `${prefix}translate es Hola`, buttonText: {displayText: 'Spanish Example'}, type: 1},
          {buttonId: `${prefix}translate fr Bonjour`, buttonText: {displayText: 'French Example'}, type: 1},
          {buttonId: `${prefix}help translate`, buttonText: {displayText: 'Help'}, type: 1},
          {buttonId: `${prefix}translate languages`, buttonText: {displayText: 'Language Codes'}, type: 1}
        ];
        
        const buttonMessage = {
          text: responseMessage,
          footer: "Try an example or get help:",
          buttons: buttons,
          headerType: 1
        };
        
        await sock.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
      }
    } catch (error) {
      console.error("Error in translate command:", error);
      
      // Error message with buttons
      const errorButtons = [
        {buttonId: `${prefix}help translate`, buttonText: {displayText: 'Help'}, type: 1},
        {buttonId: `${prefix}translate en Hello`, buttonText: {displayText: 'Example'}, type: 1},
        {buttonId: `${prefix}support`, buttonText: {displayText: 'Support'}, type: 1}
      ];
      
      const errorMessage = {
        text: 'An error occurred while processing your request.',
        footer: "Please try again or contact support",
        buttons: errorButtons,
        headerType: 1
      };
      
      await sock.sendMessage(m.key.remoteJid, errorMessage, { quoted: m });
    }
  }
};

export default translateCommand;
