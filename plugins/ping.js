import config from "../config.cjs";
import pkg from "@whiskeysockets/baileys";
const { generateWAMessageFromContent, proto } = pkg;

const ping = async (m, Matrix) => {
  // ======================
  // CONFIGURATION SECTION
  // ======================
  const prefix = config.PREFIX || ".";
  
  // Command detection
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
    : "";
  
  // ======================
  // COMMAND HANDLING SECTION
  // ======================
  if (cmd === "ping") {
    // ======================
    // PERFORMANCE MEASUREMENT
    // ======================
    const start = new Date().getTime();
    await m.React("👻");
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;
    
    // ======================
    // CONTENT DEFINITION
    // ======================
    const imageUrl = "https://i.ibb.co/fGSVG8vJ/caseyweb.jpg";
    const text = `*ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴛᴇᴄʜ* : ${responseTime.toFixed(2)} s`;
    
    // ======================
    // BUTTONS DEFINITION
    // ======================
    const buttons = [
      // Download category
      {
        buttonId: `${prefix}owner`,
        buttonText: { displayText: "📥 Owner" },
        type: 1
      },
      
      // Group category
      {
        buttonId: `${prefix}system`,
        buttonText: { displayText: "System" },
        type: 1
      },
      
      // Fun category
      {
        buttonId: `${prefix}fun-menu`,
        buttonText: { displayText: "🎉 Ping" },
        type: 1
      },
      
      // Owner category
      {
        buttonId: `${prefix}alive`,
        buttonText: { displayText: "👑 Alive" },
        type: 1
      }
    ];

    // ======================
    // MESSAGE CONSTRUCTION
    // ======================
    const buttonMessage = {
      // Media content
      image: { url: imageUrl },
      
      // Text content
      caption: text,
      footer: "CASEYRHODES AI",
      
      // Interactive elements
      buttons: buttons,
      headerType: 4,
      
      // Message settings
      viewOnce: true,
      
      // Context information
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363302677217436@newsletter',
          newsletterName: 'POWERED BY CASEYRHODES TECH',
          serverMessageId: -1
        }
      }
    };

    // ======================
    // MESSAGE SENDING
    // ======================
    await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
  }
};
                             
export default ping;
