import fs from 'fs';
import acrcloud from 'acrcloud';
import config from '../config.cjs';

const acr = new acrcloud({
  host: 'identify-eu-west-1.acrcloud.com',
  access_key: '2631ab98e77b49509e3edcf493757300',
  access_secret: 'KKbVWlTNCL3JjxjrWnywMdvQGanyhKRN0fpQxyUo'
});

const shazam = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['shazam', 'find', 'whatmusic'];
    if (!validCommands.includes(cmd)) return;
    
    const quoted = m.quoted || {}; 

    if (!quoted || (quoted.mtype !== 'audioMessage' && quoted.mtype !== 'videoMessage')) {
      // Add button to the initial message
      const buttonMessage = {
        text: 'You asked about music. Please provide a quoted audio or video message for identification.',
        footer: 'Or use the button below to go back to main menu',
        buttons: [
          {buttonId: `${prefix}menu`, buttonText: {displayText: 'Back to Menu'}, type: 1}
        ],
        headerType: 1
      };
      return gss.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    const mime = m.quoted.mimetype;
    try {
      const media = await m.quoted.download();
      const filePath = `./${Date.now()}.mp3`;
      fs.writeFileSync(filePath, media);

      m.reply('Identifying the music, please wait...');

      const res = await acr.identify(fs.readFileSync(filePath));
      const { code, msg } = res.status;

      if (code !== 0) {
        throw new Error(msg);
      }

      const { title, artists, album, genres, release_date } = res.metadata.music[0];
      const txt = `𝚁𝙴𝚂𝚄𝙻𝚃 
      • 📌 *TITLE*: ${title}
      • 👨‍🎤 𝙰𝚁𝚃𝙸𝚂𝚃: ${artists ? artists.map(v => v.name).join(', ') : 'NOT FOUND'}
      • 💾 𝙰𝙻𝙱𝚄𝙼: ${album ? album.name : 'NOT FOUND'}
      • 🌐 𝙶𝙴𝙽𝚁𝙴: ${genres ? genres.map(v => v.name).join(', ') : 'NOT FOUND'}
      • 📆 RELEASE DATE: ${release_date || 'NOT FOUND'}
      `.trim();

      fs.unlinkSync(filePath);
      
      // Add button to the result message
      const resultMessage = {
        text: txt,
        footer: 'Want to identify another song?',
        buttons: [
          {buttonId: `${prefix}menu`, buttonText: {displayText: 'Back to Menu'}, type: 1},
          {buttonId: `${prefix}shazam`, buttonText: {displayText: 'Identify Another'}, type: 1}
        ],
        headerType: 1
      };
      
      gss.sendMessage(m.from, resultMessage, { quoted: m });
    } catch (error) {
      console.error(error);
      // Add button to error message
      const errorMessage = {
        text: 'An error occurred during music identification.',
        footer: 'Try again or go back to menu',
        buttons: [
          {buttonId: `${prefix}menu`, buttonText: {displayText: 'Back to Menu'}, type: 1},
          {buttonId: `${prefix}shazam`, buttonText: {displayText: 'Try Again'}, type: 1}
        ],
        headerType: 1
      };
      gss.sendMessage(m.from, errorMessage, { quoted: m });
    }
  } catch (error) {
    console.error('Error:', error);
    // Add button to general error message
    const errorMessage = {
      text: 'An Error Occurred While Processing The Command.',
      footer: 'Try again or go back to menu',
      buttons: [
        {buttonId: `${prefix}menu`, buttonText: {displayText: 'Back to Menu'}, type: 1},
        {buttonId: `${prefix}shazam`, buttonText: {displayText: 'Try Again'}, type: 1}
      ],
      headerType: 1
    };
    gss.sendMessage(m.from, errorMessage, { quoted: m });
  }
};

export default shazam;
