import config from '../config.cjs';

const report = async (m, gss) => {
  try {
    const prefix = config.PREFIX;
    const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['cal', 'calculater', 'calc'];
    
    if (validCommands.includes(cmd)) {
      let id = m.key.remoteJid;
      gss.math = gss.math ? gss.math : {};

      if (id in gss.math) {
        clearTimeout(gss.math[id][3]);
        delete gss.math[id];
        return await m.reply('...');
      }

      let val = text
        .replace(/[^0-9\-\/+*×÷πEe()piPI.]/g, '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π|pi/gi, 'Math.PI')
        .replace(/e/gi, 'Math.E')
        .replace(/\/+/g, '/')
        .replace(/\++/g, '+')
        .replace(/-+/g, '-');

      let format = val
        .replace(/Math\.PI/g, 'π')
        .replace(/Math\.E/g, 'e')
        .replace(/\//g, '÷')
        .replace(/\*/g, '×');

      let result = (new Function('return ' + val))();

      if (isNaN(result)) throw new Error('example: 17+19');

      // Create message with menu and alive buttons
      const message = {
        text: `*Calculation Result*\n\n*${format}* = _${result}_`,
        footer: 'Bot Options',
        buttons: [
          {
            buttonId: `${prefix}menu`,
            buttonText: { displayText: '📋 Menu' },
            type: 1
          },
          {
            buttonId: `${prefix}alive`, 
            buttonText: { displayText: '🤖 Alive' },
            type: 1
          }
        ],
        headerType: 1
      };

      // Send message with buttons
      await gss.sendMessage(m.key.remoteJid, message, { quoted: m });
    }
  } catch (error) {
    // Handle specific error messages
    if (error instanceof SyntaxError) {
      return await m.reply('Invalid syntax. Please check your expression.');
    } else if (error instanceof Error) {
      return await m.reply(error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
};

export default report;
