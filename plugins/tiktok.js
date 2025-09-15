import axios from "axios";
import config from "../config.cjs";

const tiktok = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const text = m.body.slice(prefix.length + cmd.length).trim();
  const query = text.split(" ")[0]; // Get the first word as search query

  // Menu button handler
  if (cmd === "tiktok" && (text === "menu" || text === "")) {
    const buttonMessage = {
      text: `🎵 *TikTok Search & Downloader Menu*\n\nSend *${prefix}tiktok <username>* to search and download TikTok videos\n\nExample: *${prefix}tiktok caseyrhodes01*`,
      footer: "CASEYRHODES-XMD 👻 TikTok Downloader",
      buttons: [
        { buttonId: `${prefix}help`, buttonText: { displayText: "Help" }, type: 1 },
        { buttonId: `${prefix}tiktok caseyrhodes01`, buttonText: { displayText: "Example" }, type: 1 }
      ],
      headerType: 1
    };
    return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }

  if (!["tiktok", "tt"].includes(cmd)) return;

  if (!query) {
    const buttonMessage = {
      text: "❌ *Invalid Search Query*\n\nPlease provide a TikTok username to search",
      footer: "Type '.tiktok menu' to see usage examples",
      buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Show Menu" }, type: 1 }],
      headerType: 1
    };
    return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }

  try {
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    // API configuration
    const API_KEY = "9ebc7b46-aae9-40cf-a5b2-56ef4d22effd";
    const API_URL = "https://kaiz-apis.gleeze.com/api/tiksearch";
    
    // Use the new API endpoint with API key
    const { data } = await axios.get(`${API_URL}?search=${encodeURIComponent(query)}&apikey=${API_KEY}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000 // 30 seconds timeout
    });

    if (!data.status || !data.result || data.result.length === 0) {
      const buttonMessage = {
        text: "⚠️ *No TikTok videos found.*\n\nThe username might be invalid or has no public videos.",
        footer: "Please try again with a different username",
        buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Show Menu" }, type: 1 }],
        headerType: 1
      };
      return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    // Get the first video from search results
    const videoData = data.result[0];
    
    // Check if video data is available
    if (!videoData.video || !videoData.video.playAddr) {
      const buttonMessage = {
        text: "⚠️ *Video not available for download.*\n\nThe video might be private or restricted.",
        footer: "Please try again with a different username",
        buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Show Menu" }, type: 1 }],
        headerType: 1
      };
      return Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const { video, description, author, statistics, music } = videoData;

    const caption = `🎵 *TikTok Video*\n\n💬 *${description || "No description"}*\n👤 *By:* ${author.nickname || "Unknown"}\n❤️ *Likes:* ${statistics?.diggCount || "N/A"}\n💬 *Comments:* ${statistics?.commentCount || "N/A"}\n🔄 *Shares:* ${statistics?.shareCount || "N/A"}\n\n📥 *Powered By CASEYRHODES-XMD 👻✅*`;

    // Send video
    await Matrix.sendMessage(m.from, {
      video: { url: video.playAddr },
      mimetype: "video/mp4",
      caption,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363302677217436@newsletter",
          newsletterName: "CASEYRHODES-XMD 👻",
          serverMessageId: 143,
        },
      },
    }, { quoted: m });

    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

    // Send the TikTok music separately with a menu button if available
    if (music && music.playUrl) {
      const audioMessage = {
        audio: { url: music.playUrl },
        mimetype: "audio/mpeg",
        fileName: "TikTok_Audio.mp3",
        caption: "🎶 *TikTok Audio Downloaded*",
        footer: "CASEYRHODES-XMD 👻 TikTok Downloader",
        buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Download Another" }, type: 1 }]
      };
      
      await Matrix.sendMessage(m.from, audioMessage, { quoted: m });
    }

  } catch (error) {
    console.error("TikTok Downloader Error:", error);
    
    let errorMessage = "❌ *An error occurred while processing your request.*\n\nPlease try again later or with a different username.";
    
    if (error.response) {
      // API returned an error response
      if (error.response.status === 401) {
        errorMessage = "❌ *API Authentication Failed.*\n\nThe API key might be invalid or expired.";
      } else if (error.response.status === 429) {
        errorMessage = "❌ *Rate Limit Exceeded.*\n\nPlease try again in a few minutes.";
      } else if (error.response.status >= 500) {
        errorMessage = "❌ *Server Error.*\n\nThe TikTok API server is currently unavailable.";
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = "❌ *Request Timeout.*\n\nThe server took too long to respond. Please try again.";
    }
    
    const buttonMessage = {
      text: errorMessage,
      footer: "Server might be busy or username is invalid",
      buttons: [{ buttonId: `${prefix}tiktok menu`, buttonText: { displayText: "Show Menu" }, type: 1 }],
      headerType: 1
    };
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
};

export default tiktok;
