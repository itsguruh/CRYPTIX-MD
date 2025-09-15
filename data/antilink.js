import { serialize } from '../lib/Serializer.js';

const antilinkSettings = {}; // In-memory database to store antilink settings for each chat

export const handleAntilink = async (m, sock, logger, isBotAdmins, isAdmins, isCreator) => {
    try {
        const PREFIX = /^[\\/!#.]/;
        const isCOMMAND = (body) => PREFIX.test(body);
        const prefixMatch = isCOMMAND(m.body) ? m.body.match(PREFIX) : null;
        const prefix = prefixMatch ? prefixMatch[0] : '/';
        const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

        // Handle antilink command
        if (cmd === 'antilink') {
            const args = m.body.slice(prefix.length + cmd.length).trim().split(/\s+/);
            const action = args[0] ? args[0].toLowerCase() : '';

            if (!m.isGroup) {
                await sock.sendMessage(m.key.remoteJid, { 
                    text: 'This command can only be used in groups.' 
                }, { quoted: m });
                return;
            }

            if (!isBotAdmins) {
                await sock.sendMessage(m.key.remoteJid, { 
                    text: 'The bot needs to be an admin to manage the antilink feature.' 
                }, { quoted: m });
                return;
            }

            if (action === 'on') {
                if (isAdmins) {
                    antilinkSettings[m.key.remoteJid] = true;
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: 'Antilink feature has been enabled for this chat.' 
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: 'Only admins can enable the antilink feature.' 
                    }, { quoted: m });
                }
                return;
            }

            if (action === 'off') {
                if (isAdmins) {
                    antilinkSettings[m.key.remoteJid] = false;
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: 'Antilink feature has been disabled for this chat.' 
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: 'Only admins can disable the antilink feature.' 
                    }, { quoted: m });
                }
                return;
            }

            await sock.sendMessage(m.key.remoteJid, { 
                text: `Usage: ${prefix + cmd} on\n ${prefix + cmd} off` 
            }, { quoted: m });
            return;
        }

        // Handle link detection
        if (antilinkSettings[m.key.remoteJid]) {
            if (m.body && m.body.match(/(chat\.whatsapp\.com\/|https?:\/\/)/gi)) {
                if (!isBotAdmins) {
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: `The bot needs to be an admin to remove links.` 
                    });
                    return;
                }

                // Get group invite code
                let groupInviteCode;
                try {
                    groupInviteCode = await sock.groupInviteCode(m.key.remoteJid);
                    const gclink = `https://chat.whatsapp.com/${groupInviteCode}`;
                    const isLinkThisGc = new RegExp(gclink, 'i');
                    const isgclink = isLinkThisGc.test(m.body);

                    if (isgclink) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `The link you shared is for this group, so you won't be removed.` 
                        });
                        return;
                    }
                } catch (error) {
                    logger.error('Error getting group invite code:', error);
                    // Continue with link removal even if we can't get invite code
                }

                if (isAdmins) {
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: `Admins are allowed to share links.` 
                    });
                    return;
                }

                if (isCreator) {
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: `The owner is allowed to share links.` 
                    });
                    return;
                }

                // Send warning message first
                await sock.sendMessage(m.key.remoteJid, {
                    text: `\`\`\`「 Group Link Detected 」\`\`\`\n\n@${m.key.participant.split("@")[0]}, please do not share group links in this group.`,
                    mentions: [m.key.participant]
                }, { quoted: m });

                // Delete the link message
                try {
                    await sock.sendMessage(m.key.remoteJid, {
                        delete: m.key
                    });
                } catch (deleteError) {
                    logger.error('Error deleting message:', deleteError);
                }

                // Wait for a short duration before kicking
                setTimeout(async () => {
                    try {
                        await sock.groupParticipantsUpdate(
                            m.key.remoteJid, 
                            [m.key.participant], 
                            'remove'
                        );
                    } catch (kickError) {
                        logger.error('Error removing participant:', kickError);
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `Failed to remove user: ${kickError.message}` 
                        });
                    }
                }, 5000); // 5 seconds delay before kick
            }
        }
    } catch (error) {
        logger.error('Error in antilink handler:', error);
        
        // Send error message if it's a command
        if (m.body && m.body.startsWith(prefix)) {
            await sock.sendMessage(m.key.remoteJid, { 
                text: `An error occurred: ${error.message}` 
            }, { quoted: m });
        }
    }
};
