import config from '../config.cjs';

const setprefixCommand = async (m, Matrix) => {
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const isCreator = [botNumber, config.OWNER_NUMBER + '@s.whatsapp.net'].includes(m.sender);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    if (cmd === 'setprefix') {
        if (!isCreator) {
            await Matrix.sendMessage(m.from, { text: "*📛 THIS IS AN OWNER COMMAND*" }, { quoted: m });
            return;
        }

        const imageUrl = "https://i.ibb.co/fGSVG8vJ/caseyweb.jpg";
        
        if (!text) {
            const buttons = [
                {buttonId: `${prefix}setprefix .`, buttonText: {displayText: '.'}, type: 1},
                {buttonId: `${prefix}setprefix #`, buttonText: {displayText: '#'}, type: 1},
                {buttonId: `${prefix}setprefix !`, buttonText: {displayText: '!'}, type: 1},
                {buttonId: `${prefix}setprefix /`, buttonText: {displayText: '/'}, type: 1},
                {buttonId: `${prefix}setprefix -`, buttonText: {displayText: '-'}, type: 1}
            ];
            
            const buttonMessage = {
                image: { url: imageUrl },
                caption: "Please specify a new prefix or choose from the options below:",
                footer: "Prefix Settings",
                buttons: buttons,
                headerType: 4,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363302677217436@newsletter',
                        newsletterName: 'POWERED BY CASEYRHODES TECH',
                        serverMessageId: -1
                    }
                }
            };
            
            await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
            return;
        }

        // If text is provided, set the new prefix
        config.PREFIX = text;
        
        // Send confirmation with button to revert
        const buttons = [
            {buttonId: `${text}setprefix ${prefix}`, buttonText: {displayText: 'Revert to old prefix'}, type: 1}
        ];
        
        const buttonMessage = {
            image: { url: imageUrl },
            caption: `✅ Prefix has been changed to '${text}'`,
            footer: "Prefix updated successfully",
            buttons: buttons,
            headerType: 4,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363302677217436@newsletter',
                    newsletterName: 'POWERED BY CASEYRHODES TECH',
                    serverMessageId: -1
                }
            }
        };
        
        await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }
};

export default setprefixCommand;
