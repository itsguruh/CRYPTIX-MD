import moment from 'moment-timezone';
import config from '../config.cjs';

const defaultProfilePictures = [
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
];

const getProfilePicture = async (conn, jid) => {
    try {
        return await conn.profilePictureUrl(jid, 'image');
    } catch (error) {
        console.error(`Failed to get profile picture for ${jid}:`, error);
        return defaultProfilePictures[Math.floor(Math.random() * defaultProfilePictures.length)];
    }
};

export default async function GroupParticipants(sock, { id, participants, action }) {
    try {
        const metadata = await sock.groupMetadata(id);

        // Process each participant
        for (const jid of participants) {
            let profile;
            try {
                profile = await getProfilePicture(sock, jid);
            } catch (error) {
                console.error(`Error getting profile picture for ${jid}:`, error);
                profile = defaultProfilePictures[Math.floor(Math.random() * defaultProfilePictures.length)];
            }

            // Handle different actions
            if (action === "add" && config.WELCOME) {
                const userName = jid.split("@")[0];
                const joinTime = moment.tz('Asia/Kolkata').format('HH:mm:ss');
                const joinDate = moment.tz('Asia/Kolkata').format('DD/MM/YYYY');
                const membersCount = metadata.participants.length;
                
                await sock.sendMessage(id, {
                    text: `> Hello @${userName}! Welcome to *${metadata.subject}*.\n> You are the ${membersCount}th member.\n> Joined at: ${joinTime} on ${joinDate}`,
                    contextInfo: {
                        mentionedJid: [jid],
                        externalAdReply: {
                            title: `Welcome`,
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true,
                            thumbnailUrl: profile,
                            sourceUrl: 'https://sid-bhai.vercel.app'
                        }
                    }
                });
            } else if (action === "remove" && config.WELCOME) {
                const userName = jid.split('@')[0];
                const leaveTime = moment.tz('Asia/Kolkata').format('HH:mm:ss');
                const leaveDate = moment.tz('Asia/Kolkata').format('DD/MM/YYYY');
                const membersCount = metadata.participants.length;
                
                await sock.sendMessage(id, {
                    text: `> Goodbye @${userName} from ${metadata.subject}.\n> We are now ${membersCount} in the group.\n> Left at: ${leaveTime} on ${leaveDate}`,
                    contextInfo: {
                        mentionedJid: [jid],
                        externalAdReply: {
                            title: `Leave`,
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true,
                            thumbnailUrl: profile,
                            sourceUrl: 'https://sid-bhai.vercel.app'
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error('Error in GroupParticipants function:', e);
        throw e;
    }
}
