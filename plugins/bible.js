import config from '../config.cjs';
import fetch from 'node-fetch';
import pkg from '@whiskeysockets/baileys';
const { prepareWAMessageMedia, proto } = pkg;

// Cache for image and fancy font mapping
const imageCache = {
  buffer: null,
  timestamp: 0,
  ttl: 3600000 // 1 hour cache
};

const fancyMap = {
  a: '𝖺', b: '𝖻', c: '𝖼', d: '𝖽', e: '𝖾', f: '𝖿', g: '𝗀', h: '𝗁', i: '𝗂',
  j: '𝗃', k: '𝗄', l: '𝗅', m: '𝗆', n: '𝗇', o: '𝗈', p: '𝗉', q: '𝗊', r: '𝗋',
  s: '𝗌', t: '𝗍', u: '𝗎', v: '𝗏', w: '𝗐', x: '𝗑', y: '𝗒', z: '𝗓',
  A: '𝖠', B: '𝖡', C: '𝖢', D: '𝖣', E: '𝖤', F: '𝖥', G: '𝖦', H: '𝖧', I: '𝖨',
  J: '𝖩', K: '𝖪', L: '𝖫', M: '𝖬', N: '𝖭', O: '𝖮', P: '𝖯', Q: '𝖰', R: '𝖱',
  S: '𝖲', T: '𝖳', U: '𝖴', V: '𝖵', W: '𝖶', X: '𝖷', Y: '𝖸', Z: '𝖹',
  0: '𝟢', 1: '𝟣', 2: '𝟤', 3: '𝟥', 4: '𝟦', 5: '𝟧', 6: '𝟨', 7: '𝟩', 8: '𝟪', 9: '𝟫'
};

function toFancyFont(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += fancyMap[text[i]] || text[i];
  }
  return result;
}

// Image fetch utility with caching
async function fetchMenuImage() {
  const now = Date.now();
  
  // Return cached image if available and not expired
  if (imageCache.buffer && (now - imageCache.timestamp) < imageCache.ttl) {
    return imageCache.buffer;
  }

  const imageUrl = "https://files.catbox.moe/y3j3kl.jpg";
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return imageCache.buffer; // Return old cache if available even if expired
    }
    
    const buffer = await response.buffer();
    
    // Update cache
    imageCache.buffer = buffer;
    imageCache.timestamp = now;
    
    return buffer;
  } catch (error) {
    console.error("Error fetching image:", error);
    return imageCache.buffer; // Return old cache if available
  }
}

// Predefined button templates for reusability
const buttonTemplates = {
  menuButton: { 
    buttonId: `${config.PREFIX}menu`, 
    buttonText: { displayText: `📋 ${toFancyFont("Menu")}` }, 
    type: 1 
  },
  readAgainButton: (reference) => ({
    buttonId: `${config.PREFIX}bible ${reference}`, 
    buttonText: { displayText: `📖 ${toFancyFont("Read Again")}` }, 
    type: 1 
  })
};

// Common message context
const messageContext = {
  forwardingScore: 1,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363302677217436@newsletter',
    newsletterName: 'POWERED BY CASEYRHODES TECH',
    serverMessageId: -1
  }
};

// Create message template function
function createMessageTemplate(content, options = {}) {
  const {
    isImage = false,
    caption = '',
    buttons = [],
    mentions = []
  } = options;
  
  const baseTemplate = {
    footer: config.FOOTER,
    mentions: mentions.length ? mentions : undefined,
    headerType: isImage ? 4 : 1,
    contextInfo: messageContext
  };
  
  if (isImage) {
    return {
      ...baseTemplate,
      image: content,
      caption: caption,
      buttons: buttons
    };
  } else {
    return {
      ...baseTemplate,
      text: content,
      buttons: buttons
    };
  }
}

const bibleCommand = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    const body = m.body || '';
    
    // Early return if not a bible command
    if (!body.startsWith(prefix) || !body.slice(prefix.length).toLowerCase().startsWith('bible')) {
      return;
    }
    
    const text = body.slice(prefix.length + 6).trim(); // "bible " is 6 characters

    if (!text) {
      const message = createMessageTemplate(
        `*${toFancyFont("Please specify the book, chapter, and verse. Example: bible john 3:16")}*`,
        {
          buttons: [buttonTemplates.menuButton],
          mentions: [m.sender]
        }
      );
      
      return await Matrix.sendMessage(m.from, message, { quoted: m });
    }

    // Fetch Bible data and image in parallel for better performance
    const reference = encodeURIComponent(text);
    const [bibleResponse, imageBuffer] = await Promise.allSettled([
      fetch(`https://bible-api.com/${reference}`),
      fetchMenuImage()
    ]);

    // Handle Bible API response
    if (bibleResponse.status === 'rejected' || !bibleResponse.value.ok) {
      throw new Error('Bible API request failed');
    }
    
    const data = await bibleResponse.value.json();
    
    if (!data || data.error || !data.reference) {
      const message = createMessageTemplate(
        `*${toFancyFont("Invalid reference. Example: bible john 3:16.")}*`,
        {
          buttons: [buttonTemplates.menuButton],
          mentions: [m.sender]
        }
      );
      
      return await Matrix.sendMessage(m.from, message, { quoted: m });
    }

    const verses = data.verses ? data.verses.length : 1;
    const messageText = `*${toFancyFont("Caseyrhodes Bible")}*\n\n*${toFancyFont("Reading:")}* ${data.reference}\n*${toFancyFont("Verse:")}* ${verses}\n\n*${toFancyFont("Read:")}*\n${data.text}\n\n*${toFancyFont("Translation:")}* ${data.translation_name}`;

    // Use image if available
    if (imageBuffer.status === 'fulfilled' && imageBuffer.value) {
      try {
        const imageMessage = await prepareWAMessageMedia(
          { image: imageBuffer.value },
          { upload: Matrix.waUploadToServer }
        );
        
        const message = createMessageTemplate(
          imageMessage.image,
          {
            isImage: true,
            caption: messageText,
            buttons: [
              buttonTemplates.readAgainButton(text),
              buttonTemplates.menuButton
            ],
            mentions: [m.sender]
          }
        );
        
        await Matrix.sendMessage(m.from, message, { quoted: m });
      } catch (imageError) {
        console.error("Error preparing image:", imageError);
        // Fallback to text message
        await sendTextFallback();
      }
    } else {
      // Send text-only version
      await sendTextFallback();
    }
    
    async function sendTextFallback() {
      const message = createMessageTemplate(
        messageText,
        {
          buttons: [
            buttonTemplates.readAgainButton(text),
            buttonTemplates.menuButton
          ],
          mentions: [m.sender]
        }
      );
      
      await Matrix.sendMessage(m.from, message, { quoted: m });
    }

  } catch (error) {
    console.error("Error occurred in bible command:", error);
    const message = createMessageTemplate(
      `*${toFancyFont("An error occurred while fetching the Bible verse. Please try again later.")}*`,
      {
        buttons: [buttonTemplates.menuButton],
        mentions: [m.sender]
      }
    );
    
    await Matrix.sendMessage(m.from, message, { quoted: m });
  }
};

export default bibleCommand;
