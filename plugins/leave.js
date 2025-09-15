import config from "../config.cjs";
import { generateWAMessageFromContent, prepareWAMessageMedia, proto } from "@whiskeysockets/baileys";

function toFancyFont(text) {
  const fonts = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ғ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    s: "s",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    x: "x",
    y: "ʏ",
    z: "ᴢ",
  };
  return text
    .toLowerCase()
    .split("")
    .map((char) => fonts[char] || char)
    .join("");
}

const leaveGroup = async (m, Matrix) => {
  try {
    const botNumber = Matrix.user.id;
    const isCreator = [botNumber, config.OWNER_NUMBER + "@s.whatsapp.net"].includes(m.sender);
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";

    if (!["leave", "exit", "left"].includes(cmd)) return;

    if (!m.isGroup) {
      const buttons = [
        {
          buttonId: `.menu`,
          buttonText: { displayText: `📃${toFancyFont("Menu")}` },
          type: 1,
        },
      ];
      const messageOptions = {
        viewOnce: true,
        buttons,
        contextInfo: {
          mentionedJid: [m.sender],
        },
      };
      return Matrix.sendMessage(m.from, {
        text: ` ${toFancyFont("yo")}, ${toFancyFont("dumbass")}, *CASEYRHODES* ${toFancyFont("only")} ${toFancyFont("ditches")} ${toFancyFont("groups")}! ${toFancyFont("this")} ${toFancyFont("ain't")} ${toFancyFont("one")}! 😤🏠`,
        ...messageOptions,
      }, { quoted: m });
    }

    if (!isCreator) {
      const buttons = [
        {
          buttonId: `.owner`,
          buttonText: { displayText: `👤${toFancyFont("Owner")}` },
          type: 1,
        },
      ];
      const messageOptions = {
        viewOnce: true,
        buttons,
        contextInfo: {
          mentionedJid: [m.sender],
        },
      };
      return Matrix.sendMessage(m.from, {
        text: `${toFancyFont("fuck")} ${toFancyFont("off")}, ${toFancyFont("poser")}! ${toFancyFont("only")} *Caseyrhodes*'s ${toFancyFont("boss")} ${toFancyFont("can")} ${toFancyFont("tell")} ${toFancyFont("me")} ${toFancyFont("to")} ${toFancyFont("bounce")}!`,
        ...messageOptions,
      }, { quoted: m });
    }

    await Matrix.sendMessage(m.from, {
      text: ` *Caseyrhodes*'s ${toFancyFont("out")} ${toFancyFont("this")} ${toFancyFont("bitch")}! ${toFancyFont("peace")}, ${toFancyFont("losers")}!`,
      viewOnce: true,
    }, { quoted: m });

    await Matrix.groupLeave(m.from);
  } catch (error) {
    console.error(`❌ Leave error: ${error.message}`);
    const buttons = [
      {
        buttonId: `.support`,
        buttonText: { displayText: `${toFancyFont("Support")}` },
        type: 1,
      },
    ];
    const messageOptions = {
      viewOnce: true,
      buttons,
      contextInfo: {
        mentionedJid: [m.sender],
      },
    };
    await Matrix.sendMessage(m.from, {
      text: `*Njabulo Jb* ${toFancyFont("fucked")} ${toFancyFont("up")} ${toFancyFont("tryin'")} ${toFancyFont("to")} ${toFancyFont("ditch")}, ${toFancyFont("fam")}! ${toFancyFont("somethin'")} ${toFancyFont("busted")}!`,
      ...messageOptions,
    }, { quoted: m });
  }
};

export default leaveGroup;
