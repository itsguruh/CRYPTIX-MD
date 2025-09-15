import moment from "moment-timezone";
import fs from "fs";
import os from "os";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;
const more = String.fromCharCode(8206);
const readmore = more.repeat(4001);
import config from "../config.cjs";
import axios from "axios";

// Time logic
const xtime = moment.tz("Africa/Nairobi").format("HH:mm:ss");
const xdate = moment.tz("Africa/Nairobi").format("DD/MM/YYYY");
const time2 = moment().tz("Africa/Nairobi").format("HH:mm:ss");
let pushwish = "";

if (time2 < "05:00:00") {
  pushwish = `Good Morning 🌄`;
} else if (time2 < "11:00:00") {
  pushwish = `Good Morning 🌄`;
} else if (time2 < "15:00:00") {
  pushwish = `Good Afternoon 🌅`;
} else if (time2 < "18:00:00") {
  pushwish = `Good Evening 🌃`;
} else if (time2 < "19:00:00") {
  pushwish = `Good Evening 🌃`;
} else {
  pushwish = `Good Night 🌌`;
}

// Fancy font utility
function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", 
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", 
    q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", 
    y: "ʏ", z: "ᴢ",
  };
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

// Fixed image URLs array
const menuImages = [
  "https://i.ibb.co/fGSVG8vJ/caseyweb.jpg",
  "https://i.ibb.co/20ryR2pN/caseywebs.jpg",
  "https://i.ibb.co/Ng6PQcMv/caseyweb.jpg" // Add your third image URL here
];

// Image fetch utility - now selects a random image
async function fetchMenuImage() {
  // Select a random image from the array
  const randomIndex = Math.floor(Math.random() * menuImages.length);
  const imageUrl = menuImages[randomIndex];
  
  console.log(`🖼️ Trying to fetch image: ${imageUrl}`);
  
  for (let i = 0; i < 3; i++) {
    try {
      const response = await axios.get(imageUrl, { 
        responseType: "arraybuffer",
        timeout: 10000
      });
      
      console.log(`✅ Successfully fetched image ${randomIndex + 1}`);
      return Buffer.from(response.data);
    } catch (error) {
      if (error.response?.status === 429 && i < 2) {
        console.log(`⏳ Rate limit hit, retrying in 2s...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      console.error("❌ Failed to fetch image:", error.message);
      return null;
    }
  }
}

// Function to send audio
async function sendMenuAudio(Matrix, m) {
  try {
    const audioUrls = [
      'https://github.com/caseyweb/autovoice/raw/refs/heads/main/caseytech/alive.mp3',
      'https://github.com/caseyweb/autovoice/raw/refs/heads/main/caseytech/roddyrich.mp3',
      'https://github.com/caseyweb/autovoice/raw/refs/heads/main/caseytech/casey.mp3'
    ];
   
    const randomAudioUrl = audioUrls[Math.floor(Math.random() * audioUrls.length)];
    
    await Matrix.sendMessage(m.from, {
      audio: { url: randomAudioUrl },
      mimetype: 'audio/mp4',
      ptt: true
    }, { 
      quoted: {
        key: {
          fromMe: false,
          participant: `0@s.whatsapp.net`,
          remoteJid: "status@broadcast"
        },
        message: {
          contactMessage: {
            displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ✅",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
          }
        }
      }
    });
  } catch (audioError) {
  console.error("❌ Failed to send audio:", audioError.message);
  }
}

const menu = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
    const mode = config.MODE === "public" ? "public" : "private";

    const validCommands = ["list", "help", "menu"];
    const subMenuCommands = [
      "download-menu", "converter-menu", "ai-menu", "tools-menu",
      "group-menu", "search-menu", "main-menu", "owner-menu",
      "stalk-menu", "fun-menu", "anime-menu", "other-menu",
      "reactions-menu"
    ];

    // React to menu command with different emojis
    if (validCommands.includes(cmd)) {
      const reactionEmojis = ["🌟", "🤖", "✨", "🚀", "💫", "🔥"];
      const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
      
      try {
        await Matrix.sendMessage(m.from, {
          react: {
            text: randomEmoji,
            key: m.key
          }
        });
      } catch (reactError) {
        console.error("Failed to send reaction:", reactError.message);
      }
    }

    // Fetch image for all cases
    const menuImage = await fetchMenuImage();

    // Handle main menu
    if (validCommands.includes(cmd)) {
      const mainMenu = `*HI 👋* *${pushwish}*
*╭───────────────┈⊷*
*┊• 🌟 ʙᴏᴛ ɴᴀᴍᴇ :* *ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ*
*┊• ⏰ ᴛɪᴍᴇ :* *${xtime}*
*┊• 📅 ᴅᴀᴛᴇ :* *${xdate}*
*┊• 🎭 ᴅᴇᴠ :* *ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ ᴢᴏɴᴇ*
*┊• 📍 ᴘʀᴇғɪx :*  *[ ${prefix} ]*
*╰───────────────┈⊷*
${readmore}
┏        *【 ᴍᴇɴᴜ ʟɪsᴛ 】⇳︎*
- . ①  *ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ*
- . ②  *ɢʀᴏᴜᴘ ᴍᴇɴᴜ*
- . ③  *ғᴜɴ ᴍᴇɴᴜ*
- . ④  *ᴏᴡɴᴇʀ ᴍᴇɴᴜ*
- . ⑤  *ᴀɪ ᴍᴇɴᴜ*
- . ⑥  *ᴀɴɪᴍᴇ ᴍᴇɴᴜ*
- . ⑦  *ᴄᴏɴᴠᴇʀᴛ ᴍᴇɴᴜ*
- . ⑧  *ᴏᴛʜᴇʀ ᴍᴇɴᴜ*
- . ⑨  *ʀᴇᴀᴄᴛɪᴏɴs ᴍᴇɴᴜ*
- . ⑩  *ᴍᴀɪɴ ᴍᴇɴᴜ*
┗
*╭─────────────────⊷*
*┊Hallo my family ${pushwish}*
*╰─────────────────⊷*
`;

      const messageOptions = {
        viewOnce: true,
        buttons: [
          { buttonId: `${prefix}download-menu`, buttonText: { displayText: `📥 ᴅᴏᴡɴʟᴏᴀᴅ ` }, type: 1 },
          { buttonId: `${prefix}group-menu`, buttonText: { displayText: `👥 ɢʀᴏᴜᴘ` }, type: 1 },
          { buttonId: `${prefix}fun-menu`, buttonText: { displayText: `🎉 ғᴜɴ` }, type: 1 },
          { buttonId: `${prefix}owner-menu`, buttonText: { displayText: `👑 ᴏᴡɴᴇʀ` }, type: 1 },
          { buttonId: `${prefix}ai-menu`, buttonText: { displayText: `🤖 ᴀɪ` }, type: 1 },
          { buttonId: `${prefix}anime-menu`, buttonText: { displayText: `🌸 ᴀɴɪᴍᴇ` }, type: 1 },
          { buttonId: `${prefix}converter-menu`, buttonText: { displayText: `🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ` }, type: 1 },
          { buttonId: `${prefix}other-menu`, buttonText: { displayText: `🌟 ᴏᴛʜᴇʀ` }, type: 1 },
          { buttonId: `${prefix}reactions-menu`, buttonText: { displayText: `🎭 ʀᴇᴀᴄᴛɪᴏɴs` }, type: 1 },
          { buttonId: `${prefix}main-menu`, buttonText: { displayText: `📂 ᴍᴀɪɴ` }, type: 1 }
        ],
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363302677217436@newsletter',
            newsletterName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟",
            serverMessageId: 143
          },
        },
      };

      // Send menu with or without image
      if (menuImage) {
        await Matrix.sendMessage(m.from, { 
          image: menuImage,
          caption: mainMenu,
          ...messageOptions
        }, { 
          quoted: {
            key: {
                fromMe: false,
                participant: `0@s.whatsapp.net`,
                remoteJid: "status@broadcast"
            },
            message: {
                contactMessage: {
                    displayName: "CASEYRHODES VERIFIED ✅",
                    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD"
                }
            }
          }
        });
      } else {
        await Matrix.sendMessage(m.from, {
          text: mainMenu,
          ...messageOptions
        }, { 
          quoted: {
            key: {
              fromMe: false,
              participant: `0@s.whatsapp.net`,
              remoteJid: "status@broadcast"
            },
            message: {
              contactMessage: {
                displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ ✅",
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
              }
            }
          }
        });
      }
      
      // Send audio after menu
      await sendMenuAudio(Matrix, m);
    }
  
    // Handle sub-menu commands
    if (subMenuCommands.includes(cmd)) {
      let menuTitle;
      let menuResponse;

      switch (cmd) {
        case "download-menu":
          menuTitle = "📥 Download Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ᴀᴘᴋ")}
╎${toFancyFont("ғᴀᴄᴇʙᴏᴏᴋ")}
╎${toFancyFont("ᴍᴇᴅɪᴀғɪʀᴇ")}
╎${toFancyFont("ᴘɪɴᴛᴇʀᴇsᴛ")}
╎${toFancyFont("ɢɪᴛᴄʟᴏɴᴇ")}
╎${toFancyFont("ɢᴅʀɪᴠᴇ")}
╎${toFancyFont("ɪɴsᴛᴀ")}
╎${toFancyFont("ʏᴛᴍᴘ3")}
╎${toFancyFont("ʏᴛᴍᴘ4")}
╎${toFancyFont("ᴘʟᴀʏ")}
╎${toFancyFont("sᴏɴɢ")}
╎${toFancyFont("ᴠɪᴅᴇᴏ")}
╎${toFancyFont("ʏᴛᴍᴘ3ᴅᴏᴄ")}
╎${toFancyFont("ʏᴛᴍᴘ4ᴅᴏᴄ")}
╎${toFancyFont("ᴛɪᴋᴛᴏᴋ")}
╰───────────◦•◦❥•`;
          break;

        case "group-menu":
          menuTitle = "👥 Group Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ʟɪɴᴋɢʀᴏᴜᴘ")}
╎${toFancyFont("sᴇᴛᴘᴘɢᴄ")}
╎${toFancyFont("sᴇᴛɴᴀᴍᴇ")}
╎${toFancyFont("sᴇᴛᴅᴇsᴄ")}
╎${toFancyFont("ɢʀᴏᴜᴘ")}
╎${toFancyFont("ɢᴄsᴇᴛᴛɪɴɢ")}
╎${toFancyFont("ᴡᴇʟᴄᴏᴍᴇ")}
╎${toFancyFont("ᴀᴅᴅ")}
╎${toFancyFont("ᴋɪᴄᴋ")}
╎${toFancyFont("ʜɪᴅᴇᴛᴀɢ")}
╎${toFancyFont("ᴛᴀɢᴀʟʟ")}
╎${toFancyFont("ᴀɴᴛɪʟɪɴᴋ")}
╎${toFancyFont("ᴀɴᴛɪᴛᴏxɪᴄ")}
╎${toFancyFont("ᴘʀᴏᴍᴏᴛᴇ")}
╎${toFancyFont("ᴅᴇᴍᴏᴇ")}
╎${toFancyFont("ɢᴇᴛʙɪᴏ")}
╰───────────◦•◦❥•`;
          break;

        case "fun-menu":
          menuTitle = "🎉 Fun Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ɢᴀʏ")}
╎${toFancyFont("sɪᴍᴘ")}
╎${toFancyFont("ʜᴀɴᴅsᴏᴍᴇ")}
╎${toFancyFont("sᴛᴜᴘɪᴅ")}
╎${toFancyFont("ᴄʜᴀʀᴀᴄᴛᴇʀ")}
╎${toFancyFont("ғᴀᴄᴛ")}
╎${toFancyFont("ᴛʀᴜᴛʜ")}
╎${toFancyFont("ᴅᴀʀᴇ")}
╎${toFancyFont("ғʟɪʀᴛ")}
╎${toFancyFont("ᴄᴏᴜᴘʟᴇ")}
╎${toFancyFont("sʜɪᴘ")}
╎${toFancyFont("ᴊᴏᴋᴇ")}
╎${toFancyFont("ᴍᴇᴍᴇ")}
╎${toFancyFont("ǫᴜᴏᴛᴇ")}
╎${toFancyFont("ʀᴏʟʟ")}
╰─────────◦•◦❥•`;
          break;

        case "owner-menu":
          menuTitle = "👑 Owner Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ᴊᴏɪɴ")}
╎${toFancyFont("ʟᴇᴀᴠᴇ")}
╎${toFancyFont("ʙʟᴏᴄᴋ")}
╎${toFancyFont("ᴜɴʙʟᴏᴄᴋ")}
╎${toFancyFont("sᴇᴛᴘᴘʙᴏᴛ")}
╎${toFancyFont("ᴀɴᴛɪᴄᴀʟʟ")}
╎${toFancyFont("sᴇᴛsᴛᴀᴛᴜs")}
╎${toFancyFont("sᴇᴛɴᴀᴍᴇʙᴏᴛ")}
╎${toFancyFont("ᴀᴜᴛᴏʀᴇᴄᴏʀᴅɪɴɢ")}
╎${toFancyFont("ᴀᴜᴛᴏʟɪᴋᴇ")}
╎${toFancyFont("ᴀᴜᴛᴏᴛʏᴘɪɴɢ")}
╎${toFancyFont("ᴀʟᴡᴀʏsᴏɴʟɪɴᴇ")}
╎${toFancyFont("ᴀᴜᴛᴏʀᴇᴀᴅ")}
╎${toFancyFont("ᴀᴜᴛᴏsᴠɪᴇᴡ")}
╰───────────◦•◦❥•`;
          break;

        case "ai-menu":
          menuTitle = "🤖 AI Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ᴀɪ")}
╎${toFancyFont("ʙᴜɢ")}
╎${toFancyFont("ʀᴇᴘᴏʀᴛ")}
╎${toFancyFont("ɢᴘᴛ")}
╎${toFancyFont("ᴅᴀʟʟ")}
╎${toFancyFont("ʀᴇᴍɪɴɪ")}
╎${toFancyFont("ɢᴇᴍɪɴɪ")}
╎${toFancyFont("ʙᴀʀᴅ")}
╎${toFancyFont("ʙʟᴀᴄᴋʙᴏx")}
╎${toFancyFont("ᴍɪsᴛʀᴀʟ")}
╎${toFancyFont("ʟʟᴀᴍᴀ")}
╎${toFancyFont("ᴄʟᴀᴜᴅᴇ")}
╎${toFancyFont("ᴅᴇᴇᴘsᴇᴇᴋ")}
╰──────────◦•◦❥•`;
          break;

        case "anime-menu":
          menuTitle = "🌸 Anime Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ᴀɴɪᴍᴇ")}
╎${toFancyFont("ᴀɴɪᴍᴇᴘɪᴄ")}
╎${toFancyFont("ᴀɴɪᴍᴇǫᴜᴏᴛᴇ")}
╎${toFancyFont("ᴀɴɪᴍᴇᴡᴀʟʟ")}
╎${toFancyFont("ᴀɴɪᴍᴇᴄʜᴀʀ")}
╎${toFancyFont("ᴡᴀɪғᴜ")}
╎${toFancyFont("ʜᴜsʙᴀɴᴅᴏ")}
╎${toFancyFont("ɴᴇᴋᴏ")}
╎${toFancyFont("sʜɪɴᴏʙᴜ")}
╎${toFancyFont("ᴍᴇɢᴜᴍɪɴ")}
╎${toFancyFont("ᴀᴡᴏᴏ")}
╎${toFancyFont("ᴛʀᴀᴘ")}
╎${toFancyFont("ʙʟᴏᴡᴊᴏʙ")}
╰─────────◦•◦❥•`;
          break;

        case "converter-menu":
          menuTitle = "🔄 Converter Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ᴀᴛᴛᴘ")}
╎${toFancyFont("ᴀᴛᴛᴘ2")}
╎${toFancyFont("ᴀᴘᴛᴘ3")}
╎${toFancyFont("ᴇʙɪɴᴀʀʏ")}
╎${toFancyFont("ᴅʙɪɴᴀʀʏ")}
╎${toFancyFont("ᴇᴍᴏᴊɪᴍɪx")}
╎${toFancyFont("ᴍᴘ3")}
╎${toFancyFont("ᴍᴘ4")}
╎${toFancyFont("sᴛɪᴄᴋᴇʀ")}
╎${toFancyFont("ᴛᴏɪᴍɢ")}
╎${toFancyFont("ᴛᴏᴠɪᴅ")}
╎${toFancyFont("ᴛᴏɢɪғ")}
╎${toFancyFont("ᴛᴏᴜʀʟ")}
╎${toFancyFont("ᴛɪɴʏᴜʀʟ")}
╰──────────◦•◦❥•`;
          break;

        case "other-menu":
          menuTitle = "📌 Other Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ᴄᴀʟᴄ")}
╎${toFancyFont("ᴛᴇᴍᴘᴍᴀɪʟ")}
╎${toFancyFont("ᴄʜᴇᴄᴋᴍᴀɪʟ")}
╎${toFancyFont("ᴛʀᴛ")}
╎${toFancyFont("ᴛᴛs")}
╎${toFancyFont("ssᴡᴇʙ")}
╎${toFancyFont("ʀᴇᴀᴅᴍᴏʀᴇ")}
╎${toFancyFont("sᴛʏʟᴇᴛᴇxᴛ")}
╎${toFancyFont("ᴡᴇᴀᴛʜᴇʀ")}
╎${toFancyFont("ᴄʟᴏᴄᴋ")}
╎${toFancyFont("ǫʀᴄᴏᴅᴇ")}
╎${toFancyFont("ʀᴇᴀᴅǫʀ")}
╎${toFancyFont("ᴄᴜʀʀᴇɴᴄʏ")}
╰─────────◦•◦❥•`;
          break;

        case "reactions-menu":
          menuTitle = "🎭 Reactions Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ʟɪᴋᴇ")}
╎${toFancyFont("ʟᴏᴠᴇ")}
╎${toFancyFont("ʜᴀʜᴀ")}
╎${toFancyFont("ᴡᴏᴡ")}
╎${toFancyFont("sᴀᴅ")}
╎${toFancyFont("ᴀɴɢʀʏ")}
╎${toFancyFont("ᴅɪsʟɪᴋᴇ")}
╎${toFancyFont("ᴄʀʏ")}
╎${toFancyFont("ᴋɪss")}
╎${toFancyFont("ᴘᴀᴛ")}
╎${toFancyFont("sʟᴀᴘ")}
╎${toFancyFont("ᴘᴜɴᴄʜ")}
╎${toFancyFont("ᴋɪʟʟ")}
╎${toFancyFont("ʜᴜɢ")}
╰──────◦•◦❥•`;
          break;

        case "main-menu":
          menuTitle = "🏠 Main Menu";
          menuResponse = `
╭─ 乂  
╎${toFancyFont("ᴘɪɴɢ")}
╎${toFancyFont("ᴀʟɪᴠᴇ")}
╎${toFancyFont("ᴏᴡɴᴇʀ")}
╎${toFancyFont("ᴍᴇɴᴜ")}
╎${toFancyFont("ɪɴғᴏʙᴏᴛ")}
╎${toFancyFont("ᴅᴏɴᴀᴛᴇ")}
╎${toFancyFont("sᴘᴇᴇᴅ")}
╎${toFancyFont("ʀᴜɴᴛɪᴍᴇ")}
╎${toFancyFont("sᴄ")}
╎${toFancyFont("sᴄʀɪᴘᴛ")}
╎${toFancyFont("sᴜᴘᴘᴏʀᴛ")}
╎${toFancyFont("ᴜᴘᴅᴀᴛᴇ")}
╎${toFancyFont("ғᴇᴇᴅʙᴀᴄᴋ")}
╰──────────◦•◦❥•`;
          break;

        default:
          return;
      }

      // Format the full response
      const fullResponse = `
*${menuTitle}*

${menuResponse}

*📅 Date*: ${xdate}
*⏰ Time*: ${xtime}
*⚙️ Prefix*: ${prefix}
*🌐 Mode*: ${mode}

> ︎®ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ 🌟
`;

      const backButton = {
        buttons: [
          { buttonId: `${prefix}menu`, buttonText: { displayText: `🔙 ʙᴀᴄᴋ ᴛᴏ ᴍᴀɪɴ ᴍᴇɴᴜ` }, type: 1 }
        ],
        contextInfo: {
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            serverMessageId: 143,          
          },
        },
      };

      // Send sub-menu with image
      if (menuImage) {
        await Matrix.sendMessage(m.from, { 
          image: menuImage,
          caption: fullResponse,
          ...backButton
        }, { quoted: m });
      } else {
        await Matrix.sendMessage(m.from, {
          text: fullResponse,
          ...backButton
        }, { quoted: m });
      }
    }
  } catch (error) {
    console.error(`❌ Menu error: ${error.message}`);
    await Matrix.sendMessage(m.from, {
      text: `•
• *📁 ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ* hit a snag! Error: ${error.message || "Failed to load menu"} 😡
•`,
    }, { quoted: m });
  }
};

export default menu;
