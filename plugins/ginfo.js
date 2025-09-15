import { writeFile } from 'fs/promises';
import config from '../config.cjs';

const groupInfoCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const args = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['ginfo', 'gpinfo', 'groupinfo', 'gcinfo'];

  if (validCommands.includes(cmd)) {
    try {
      // Function to format creation date
      const formatCreationDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        });
      };

      // Function to fetch and format group info
      const getGroupInfo = async (groupId, sock) => {
        try {
          const groupMetadata = await sock.groupMetadata(groupId);
          const participants = groupMetadata.participants;
          
          // Get creator info - in latest Baileys, owner is the JID
          const creator = groupMetadata.owner || groupMetadata.ownerJid || 'Unknown';
          
          // Get admins
          const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
          
          // Prepare decorated response with emojis and single-line decoration
          let response = `┌──────────────────\n`;
          response += `│         🏷️ GROUP INFORMATION 🏷️\n`;
          response += `├────────────────────\n`;
          response += `│\n`;
          response += `│ 📛 Name: ${groupMetadata.subject}\n`;
          response += `│ 📝 Description: ${groupMetadata.desc || 'No description'}\n`;
          response += `│ 🕒 Created: ${formatCreationDate(groupMetadata.creation)}\n`;
          response += `│ 👑 Creator: ${creator.split('@')[0]}\n`;
          response += `│ 👥 Total Members: ${participants.length}\n`;
          response += `│ ⭐ Admins: ${admins.length}\n`;
          response += `│ 🔐 Restricted: ${groupMetadata.restrict ? '✅ Yes' : '❌ No'}\n`;
          response += `│ 📢 Announcement: ${groupMetadata.announce ? '✅ Yes' : '❌ No'}\n`;
          response += `│ ⏱️ Ephemeral: ${groupMetadata.ephemeralDuration ? `${groupMetadata.ephemeralDuration} seconds` : '❌ Disabled'}\n`;
          response += `│\n`;
          response += `└────────────────────`;
          
          // Try to get group picture
          try {
            const ppUrl = await sock.profilePictureUrl(groupId);
            return { response, ppUrl, groupMetadata };
          } catch (e) {
            return { response, groupMetadata };
          }
        } catch (error) {
          throw error;
        }
      };

      // Check if the message is from a group
      const isGroup = m.key.remoteJid.endsWith('@g.us');
      const groupLink = args.trim();

      if (isGroup) {
        // Fetch info for the current group
        const { response, ppUrl, groupMetadata } = await getGroupInfo(m.key.remoteJid, sock);
        
        // Create interactive buttons with proper IDs
        const buttons = [
          {
            buttonId: `${prefix}invite`,
            buttonText: { displayText: '🔗 Invite Link' },
            type: 1
          },
          {
            buttonId: `${prefix}adminslist`,
            buttonText: { displayText: '⭐ Admins List' },
            type: 1
          },
          {
            buttonId: `${prefix}memberslist`,
            buttonText: { displayText: '👥 Members List' },
            type: 1
          }
        ];
        
        // Create button message template
        const buttonMessage = {
          text: response,
          footer: `Group ID: ${m.key.remoteJid.split('@')[0]}`,
          buttons: buttons,
          headerType: 1,
          viewOnce: true
        };
        
        if (ppUrl) {
          await sock.sendMessage(m.key.remoteJid, { 
            image: { url: ppUrl },
            caption: response,
            footer: `Group ID: ${m.key.remoteJid.split('@')[0]}`,
            buttons: buttons,
            headerType: 4
          }, { quoted: m });
        } else {
          await sock.sendMessage(m.key.remoteJid, buttonMessage, { quoted: m });
        }
      } else if (groupLink) {
        // Handle group invite link
        if (!groupLink.includes('chat.whatsapp.com')) {
          await sock.sendMessage(m.key.remoteJid, { 
            text: '❌ Please provide a valid WhatsApp group invite link.' 
          }, { quoted: m });
          return;
        }
        
        // Extract group ID from link
        const groupId = groupLink.split('/').pop();
        
        try {
          // Verify the group exists and get basic info first
          const inviteInfo = await sock.groupGetInviteInfo(groupId);
          
          // Now fetch full metadata
          const { response, ppUrl, groupMetadata } = await getGroupInfo(inviteInfo.id, sock);
          
          // Create buttons for group link context
          const buttons = [
            {
              buttonId: `${prefix}join ${groupId}`,
              buttonText: { displayText: '🚪 Join Group' },
              type: 1
            },
            {
              buttonId: `${prefix}moreinfo ${groupId}`,
              buttonText: { displayText: '📊 More Info' },
              type: 1
            }
          ];
          
          if (ppUrl) {
            await sock.sendMessage(m.key.remoteJid, { 
              image: { url: ppUrl },
              caption: response,
              footer: `Group ID: ${inviteInfo.id.split('@')[0]}`,
              buttons: buttons,
              headerType: 4
            }, { quoted: m });
          } else {
            await sock.sendMessage(m.key.remoteJid, {
              text: response,
              footer: `Group ID: ${inviteInfo.id.split('@')[0]}`,
              buttons: buttons,
              headerType: 1
            }, { quoted: m });
          }
        } catch (error) {
          console.error("Error fetching group info from link:", error);
          await sock.sendMessage(m.key.remoteJid, { 
            text: '❌ Error fetching group info. Make sure:\n• The link is valid\n• You have permission to view this group\n• The group exists'
          }, { quoted: m });
        }
      } else {
        // Command used in private chat without link
        await sock.sendMessage(m.key.remoteJid, { 
          text: '🤔 Please use this command in a group or provide a group invite link.\n\nExample: .gcinfo https://chat.whatsapp.com/XXXXXXXXXXXX'
        }, { quoted: m });
      }
    } catch (error) {
      console.error("Error in group info command:", error);
      await sock.sendMessage(m.key.remoteJid, { 
        text: '❌ An error occurred while fetching group information.' 
      }, { quoted: m });
    }
  }
};

export default groupInfoCommand;
