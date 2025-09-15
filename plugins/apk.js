import axios from "axios";
import config from "../config.cjs";

function toFancyFont(text, isUpperCase = false) {
  const fonts = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ",
    h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ",
    o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ",
    v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
  };
  
  const formattedText = isUpperCase ? text.toUpperCase() : text.toLowerCase();
  return formattedText.replace(/[a-z]/g, char => fonts[char] || char);
}

const apkDownloader = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const body = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
  const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const query = body.slice(prefix.length + cmd.length).trim();

  if (!["apk", "app", "application"].includes(cmd)) return;
  
  if (!query) {
    const buttonMessage = {
      text: "❌ *Usage:* `.apk <App Name>`",
      footer: "APK Downloader",
      buttons: [{
        buttonId: `${prefix}menu`,
        buttonText: { displayText: `${toFancyFont("Menu")}` },
        type: 1
      }],
      headerType: 1,
      mentions: [m.sender]
    };
    
    return await Matrix.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
  }

  try {
    // Send loading reaction immediately
    await Matrix.sendMessage(m.key.remoteJid, { react: { text: "⏳", key: m.key } });
    
    // Use Aptoide API directly
    const apiUrl = `https://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(query)}/limit=1`;
    
    // Set timeout to prevent hanging requests
    const response = await axios.get(apiUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = response.data;

    if (!data?.datalist?.list?.length) {
      await Matrix.sendMessage(m.key.remoteJid, { react: { text: "❌", key: m.key } });
      
      const buttonMessage = {
        text: "⚠️ *No results found for the given app name.*",
        footer: "APK Downloader",
        buttons: [
          {
            buttonId: `${prefix}menu`,
            buttonText: { displayText: `${toFancyFont("Menu")}` },
            type: 1
          },
          {
            buttonId: `${prefix}apk ${query}`,
            buttonText: { displayText: `${toFancyFont("Search Again")}` },
            type: 1
          }
        ],
        headerType: 1,
        mentions: [m.sender]
      };
      
      return await Matrix.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
    }

    const app = data.datalist.list[0];
    const appSize = (app.size / 1048576).toFixed(2);

    // Check if file exists and is accessible
    if (!app.file?.path_alt) {
      throw new Error("APK download link not available");
    }

    const caption = `╭━━━〔 *ᴀᴘᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 〕━━━┈⊷
┃  *Name:* ${app.name}
┃  *Size:* ${appSize} MB
┃  *Package:* ${app.package}
┃  *Updated On:* ${app.updated}
┃  *Developer:* ${app.developer?.name || 'Unknown'}
╰━━━━━━━━━━━━━━━┈⊷
> *ᴍᴀᴅᴇ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ*`;

    // Send success reaction
    await Matrix.sendMessage(m.key.remoteJid, { react: { text: "⬆️", key: m.key } });

    // Prepare the APK icon if available
    let imageMessage = null;
    if (app.icon || app.graphic) {
      try {
        const iconUrl = app.icon || app.graphic;
        imageMessage = {
          image: { url: iconUrl },
          caption: `📱 *${app.name}* - App Icon`,
          headerType: 4,
          mentions: [m.sender]
        };
      } catch (iconError) {
        console.log("Could not load app icon:", iconError);
      }
    }

    // Send app icon first if available
    if (imageMessage) {
      await Matrix.sendMessage(m.key.remoteJid, imageMessage, { quoted: m });
    }

    // Send document with APK
    await Matrix.sendMessage(m.key.remoteJid, {
      document: { url: app.file.path_alt },
      fileName: `${app.name.replace(/[^\w\s]/gi, '')}.apk`,
      mimetype: "application/vnd.android.package-archive",
      caption: caption,
      footer: "APK Downloader",
      buttons: [
        {
          buttonId: `${prefix}menu`,
          buttonText: { displayText: `${toFancyFont("Menu")}` },
          type: 1
        },
        {
          buttonId: `${prefix}apk ${query}`,
          buttonText: { displayText: `${toFancyFont("Search Again")}` },
          type: 1
        }
      ],
      headerType: 4,
      mentions: [m.sender]
    }, { quoted: m });

    // Send final success reaction
    await Matrix.sendMessage(m.key.remoteJid, { react: { text: "✅", key: m.key } });

  } catch (error) {
    console.error("APK Downloader Error:", error);
    
    // Remove loading reaction
    await Matrix.sendMessage(m.key.remoteJid, { react: { text: "❌", key: m.key } });
    
    const errorMessage = {
      text: "❌ *An error occurred while fetching the APK. Please try again.*",
      footer: "APK Downloader",
      buttons: [{
        buttonId: `${prefix}menu`,
        buttonText: { displayText: `${toFancyFont("Menu")}` },
        type: 1
      }],
      headerType: 1,
      mentions: [m.sender]
    };
    
    await Matrix.sendMessage(m.key.remoteJid, errorMessage, { quoted: m });
  }
};

export default apkDownloader;
