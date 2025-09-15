import axios from 'axios';
import pkg, { prepareWAMessageMedia } from '@whiskeysockets/baileys';
const { generateWAMessageFromContent, proto } = pkg;
import config from '../config.cjs';

const Lyrics = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['lyrics', 'lyric'];

  if (validCommands.includes(cmd)) {
    if (!text) return m.reply(`Hello *_${m.pushName}_,*\n Here's Example Usage: _.lyrics Spectre|Alan Walker._`);

    try {
      await m.React('🕘');
      await m.reply('A moment, *Caseyrhodes* is generating your lyrics request...');

      if (!text.includes('|')) {
        return m.reply('Please provide the song name and artist name separated by a "|", for example: Spectre|Alan Walker.');
      }

      const [title, artist] = text.split('|').map(part => part.trim());

      if (!title || !artist) {
        return m.reply('Both song name and artist name are required. Please provide them in the format: song name|artist name.');
      }

      // Kaiz-API configuration - Fixed URL construction
      const KAIZ_API_KEY = '9ebc7b46-aae9-40cf-a5b2-56ef4d22effd';
      const KAIZ_API_URL = `https://kaiz-apis.gleeze.com/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
      
      // Add authorization header
      const response = await axios.get(KAIZ_API_URL, {
        headers: {
          'Authorization': `Bearer ${KAIZ_API_KEY}`
        }
      });
      
      const result = response.data;

      if (result && result.lyrics) {
        const lyrics = result.lyrics;

        // Limit lyrics length to avoid WhatsApp message limits
        const truncatedLyrics = lyrics.length > 4000 ? lyrics.substring(0, 4000) + "..." : lyrics;
        
        let buttons = [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 ᴄᴏᴘʏ ʟʏʀɪᴄs",
              id: "copy_code",
              copy_code: lyrics
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🏠 ʀᴇᴛᴜʀɴ ᴛᴏ ᴍᴇɴᴜ",
              id: ".menu"
            })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "sʜᴏᴡ 💜 ғᴏʀ ᴋʜᴀɴ-ᴍᴅ",
              url: `https://whatsapp.com/channel/0029Vaj1hl1Lo4hksSXY0U2t`
            })
          }
        ];

        let msg = generateWAMessageFromContent(m.from, {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: truncatedLyrics
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                  text: "> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs ᴀɪ*"
                }),
                header: proto.Message.InteractiveMessage.Header.create({
                  title: `${title} - ${artist}`,
                  subtitle: "",
                  hasMediaAttachment: false
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons: buttons
                })
              })
            }
          }
        }, {});

        await Matrix.relayMessage(msg.key.remoteJid, msg.message, {
          messageId: msg.key.id
        });

        await m.React('✅');
      } else {
        throw new Error('Invalid response from the Lyrics API.');
      }
    } catch (error) {
      console.error('Error getting lyrics:', error.message);
      m.reply('Error getting lyrics. Please try again with a different song or check the format (song|artist).');
      await m.React('❌');
    }
  }
};

export default Lyrics;
