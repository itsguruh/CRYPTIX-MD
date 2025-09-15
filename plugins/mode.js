import config from '../config.cjs';

const modeCommand = async (m, Matrix) => {
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim().toLowerCase();

    if (cmd === 'mode') {
        if (!isCreator) {
            await Matrix.sendMessage(m.from, { text: "*📛 THIS IS AN OWNER COMMAND*" }, { quoted: m });
            return;
        }

        // If no specific mode is provided, show the button interface
        if (!text) {
            const currentMode = Matrix.public ? 'public' : 'private';
            const otherStatus = Matrix.otherMode ? 'enabled' : 'disabled';
            
            const buttonMessage = {
                text: `*🤖 BOT MODE SETTINGS*\n\nCurrent Mode: ${currentMode.toUpperCase()}\nOther Mode: ${otherStatus.toUpperCase()}\n\nSelect an option:`,
                footer: config.BOT_NAME,
                buttons: [
                    { buttonId: `${prefix}mode public`, buttonText: { displayText: '🌐 PUBLIC' }, type: 1 },
                    { buttonId: `${prefix}mode private`, buttonText: { displayText: '🔒 PRIVATE' }, type: 1 },
                    { buttonId: `${prefix}mode other`, buttonText: { displayText: Matrix.otherMode ? '❌ DISABLE OTHER' : '✅ ENABLE OTHER' }, type: 1 }
                ],
                headerType: 1
            };
            
            await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
            return;
        }

        if (['public', 'private', 'other'].includes(text)) {
            if (text === 'public') {
                Matrix.public = true;
                Matrix.otherMode = false; // Turn off other mode when switching
                config.MODE = "public";
                
                // Send confirmation with buttons
                const buttonMessage = {
                    text: '✅ Mode has been changed to PUBLIC.',
                    footer: config.BOT_NAME,
                    buttons: [
                        { buttonId: `${prefix}mode private`, buttonText: { displayText: '🔒 SWITCH TO PRIVATE' }, type: 1 },
                        { buttonId: `${prefix}mode`, buttonText: { displayText: '⚙️ SETTINGS' }, type: 1 }
                    ],
                    headerType: 1
                };
                
                await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
            } else if (text === 'private') {
                Matrix.public = false;
                Matrix.otherMode = false; // Turn off other mode when switching
                config.MODE = "private";
                
                // Send confirmation with buttons
                const buttonMessage = {
                    text: '✅ Mode has been changed to PRIVATE.',
                    footer: config.BOT_NAME,
                    buttons: [
                        { buttonId: `${prefix}mode public`, buttonText: { displayText: '🌐 SWITCH TO PUBLIC' }, type: 1 },
                        { buttonId: `${prefix}mode`, buttonText: { displayText: '⚙️ SETTINGS' }, type: 1 }
                    ],
                    headerType: 1
                };
                
                await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
            } else if (text === 'other') {
                // Toggle other mode
                Matrix.otherMode = !Matrix.otherMode;
                const status = Matrix.otherMode ? 'enabled' : 'disabled';
                
                // Send confirmation with buttons
                const buttonMessage = {
                    text: `✅ Other mode has been ${status.toUpperCase()}.`,
                    footer: config.BOT_NAME,
                    buttons: [
                        { buttonId: `${prefix}mode public`, buttonText: { displayText: '🌐 PUBLIC' }, type: 1 },
                        { buttonId: `${prefix}mode private`, buttonText: { displayText: '🔒 PRIVATE' }, type: 1 },
                        { buttonId: `${prefix}mode`, buttonText: { displayText: '⚙️ SETTINGS' }, type: 1 }
                    ],
                    headerType: 1
                };
                
                await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
            }
        } else {
            // Invalid mode provided
            const buttonMessage = {
                text: "❌ Invalid mode. Please select a valid option:",
                footer: config.BOT_NAME,
                buttons: [
                    { buttonId: `${prefix}mode public`, buttonText: { displayText: '🌐 PUBLIC' }, type: 1 },
                    { buttonId: `${prefix}mode private`, buttonText: { displayText: '🔒 PRIVATE' }, type: 1 },
                    { buttonId: `${prefix}mode other`, buttonText: { displayText: '🔧 OTHER' }, type: 1 }
                ],
                headerType: 1
            };
            
            await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
        }
    }
};

export default modeCommand;
