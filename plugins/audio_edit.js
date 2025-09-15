import { exec } from 'child_process';
import fs from 'fs';
import { getRandom } from '../lib/myfunc.cjs'; 
import config from '../config.cjs';

const audioEffects = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['bass', 'blown', 'deep', 'earrape', 'fast', 'fat', 'nightcore', 'reverse', 'robot', 'slow', 'smooth', 'tupai'];
    if (!validCommands.includes(cmd)) return;

    let set;
    if (cmd === 'bass') {
      set = '-af equalizer=f=54:width_type=o:width=2:g=20';
    } else if (cmd === 'blown') {
      set = '-af acrusher=.1:1:64:0:log';
    } else if (cmd === 'deep') {
      set = '-af atempo=4/4,asetrate=44500*2/3';
    } else if (cmd === 'earrape') {
      set = '-af volume=12';
    } else if (cmd === 'fast') {
      set = '-filter:a "atempo=1.63,asetrate=44100"';
    } else if (cmd === 'fat') {
      set = '-filter:a "atempo=1.6,asetrate=22100"';
    } else if (cmd === 'nightcore') {
      set = '-filter:a atempo=1.06,asetrate=44100*1.25';
    } else if (cmd === 'reverse') {
      set = '-filter_complex "areverse"';
    } else if (cmd === 'robot') {
      set = '-filter_complex "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"';
    } else if (cmd === 'slow') {
      set = '-filter:a "atempo=0.7,asetrate=44100"';
    } else if (cmd === 'smooth') {
      set = '-filter:v "minterpolate=\'mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120\'"';
    } else if (cmd === 'tupai') {
      set = '-filter:a "atempo=0.5,asetrate=65100"';
    }

    // Check if message is quoted and contains audio
    if (!m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage) {
      return m.reply(`Reply to the audio you want to change with a caption *${prefix + cmd}*`);
    }

    const quoted = m.message.extendedTextMessage.contextInfo;
    
    // Create buttons for all valid commands
    const effectButtons = validCommands.map(command => ({
      buttonId: `${prefix}${command}`,
      buttonText: { displayText: command.toUpperCase() },
      type: 1
    }));
    
    // Split buttons into rows of 3 for better organization
    const buttonRows = [];
    for (let i = 0; i < effectButtons.length; i += 3) {
      buttonRows.push(effectButtons.slice(i, i + 3));
    }
    
    // Send wait message with buttons
    const waitMessage = await m.reply('Please wait...', {
      buttons: buttonRows,
      headerType: 1
    });
    
    // Download the quoted audio message
    const buffer = await gss.downloadAndSaveMediaMessage(quoted.quotedMessage.audioMessage);
    const mediaPath = `./${getRandom('.webm')}`;
    fs.renameSync(buffer, mediaPath);
    const outputPath = `./${getRandom('.mp3')}`;

    exec(`ffmpeg -i ${mediaPath} ${set} ${outputPath}`, (err, stderr, stdout) => {
      fs.unlinkSync(mediaPath);
      if (err) {
        console.error('Error:', err);
        return m.reply('An error occurred while processing the audio.');
      }
      
      const buff = fs.readFileSync(outputPath);
      
      // Send the processed audio with buttons
      gss.sendMessage(m.key.remoteJid, { 
        audio: buff, 
        mimetype: 'audio/mpeg',
        ptt: false,
        caption: `Audio processed with *${prefix + cmd}* effect\n\nTry other effects:`,
        buttons: buttonRows,
        headerType: 1
      }, { quoted: m });
      
      // Delete the wait message
      gss.sendMessage(m.key.remoteJid, { 
        delete: waitMessage.key 
      });
      
      fs.unlinkSync(outputPath);
    });
  } catch (e) {
    console.error('Error:', e);
    m.reply('An error occurred while processing the command.');
  }
};

export default audioEffects;
