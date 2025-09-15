import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import pkg from "@whiskeysockets/baileys";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
import config from "../config.cjs";

const { generateWAMessageFromContent, proto } = pkg;

// Verified Contact
const quotedContact = {
  key: {
    fromMe: false,
    participant: `0@s.whatsapp.net`,
    remoteJid: "status@broadcast"
  },
  message: {
    contactMessage: {
      displayName: "ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴠᴇʀɪғɪᴇᴅ✅",
      vcard: `BEGIN:VCARD\nVERSION:3.0\nFN: Caseyrhodes VERIFIED ✅\nORG:CASEYRHODES-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=13135550002:+13135550002\nEND:VCARD`
    }
  }
};

const gitclone = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX; // Use prefix from config
    const body = m.body?.trim() || "";
    const lowerBody = body.toLowerCase();
    if (!lowerBody.startsWith(prefix)) return;

    const cmd = lowerBody.slice(prefix.length).split(" ")[0];
    if (!["gitclone", "git"].includes(cmd)) return;

    const args = body.slice(prefix.length + cmd.length).trim();
    const link = args;
    if (!link) {
      await Matrix.sendMessage(m.from, { text: "Please provide a GitHub link.\n\nExample:\n.gitclone https://github.com/username/repo" }, { quoted: m });
      return;
    }

    if (!/^https:\/\/github\.com\/[^\/]+\/[^\/]+/.test(link)) {
      await Matrix.sendMessage(m.from, { text: "⚠️ Invalid GitHub URL." }, { quoted: m });
      return;
    }

    const repoMatch = link.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?/i);
    if (!repoMatch) {
      await Matrix.sendMessage(m.from, { text: "❌ Couldn't extract repo data." }, { quoted: m });
      return;
    }
    const user = repoMatch[1], repo = repoMatch[2];

    const downloadURL = `https://api.github.com/repos/${user}/${repo}/zipball`;
    const headCheck = await fetch(downloadURL, { method: "HEAD" });

    if (!headCheck.ok) throw new Error("Repository not found.");

    const filenameHeader = headCheck.headers.get("content-disposition");
    const fileName = filenameHeader ? filenameHeader.match(/filename="?(.+?)"?$/)?.[1] : `${repo}.zip`;

    // Get repository info for additional details
    const repoInfoURL = `https://api.github.com/repos/${user}/${repo}`;
    const repoInfoResponse = await fetch(repoInfoURL);
    let repoInfo = {};
    
    if (repoInfoResponse.ok) {
      repoInfo = await repoInfoResponse.json();
    }

    // Status text with zip information
    const statusText = `
╭─〔 📦 *ᴄᴀsᴇʏʀʜᴏᴅᴇs ɢɪᴛ ᴄʟᴏɴᴇ* 〕─⬣
│ 👤 *ᴜꜱᴇʀ:* ${user}
│ 📁 *ʀᴇᴘᴏ:* ${repo}
│ 📝 *ꜰɪʟᴇɴᴀᴍᴇ:* ${fileName}
│ 📊 *ꜱɪᴢᴇ:* ${repoInfo.size ? (repoInfo.size / 1024).toFixed(2) + ' MB' : 'Unknown'}
│ 🌟 *ꜱᴛᴀʀꜱ:* ${repoInfo.stargazers_count || 'N/A'}
│ 🍴 *ꜰᴏʀᴋꜱ:* ${repoInfo.forks_count || 'N/A'}
│ 📋 *ᴅᴇꜱᴄʀɪᴘᴛɪᴏɴ:* ${repoInfo.description || 'No description'}
╰───⬣ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ...`;

    // Reduced to two buttons only
    const buttons = [
      { buttonId: `${prefix}repo ${user}/${repo}`, buttonText: { displayText: "📂 Repo Info" }, type: 1 },
      { buttonId: `${prefix}menu`, buttonText: { displayText: "📋 Menu" }, type: 1 }
    ];

    // Create a single message with all information and buttons
    const templateMessage = {
      text: statusText,
      footer: "> ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ",
      templateButtons: buttons,
      headerType: 1,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363420646690176@newsletter",
          newsletterName: "ɢɪᴛʜᴜʙ ᴄʟᴏɴᴇ 👻",
          serverMessageId: 143
        }
      }
    };

    // Send the single message with all information
    await Matrix.sendMessage(m.from, templateMessage, { quoted: quotedContact });

    // Send the zip file separately without any interference
    await Matrix.sendMessage(m.from, {
      document: { url: downloadURL },
      fileName: fileName,
      mimetype: 'application/zip'
    });

  } catch (e) {
    console.error("❌ GitClone Error:", e);
    await Matrix.sendMessage(m.from, { text: "❌ Failed to download repository.\nCheck the link or try later." }, { quoted: m });
  }
};

export default gitclone;
