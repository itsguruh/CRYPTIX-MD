const axios = require('axios');

module.exports = {
  name: 'pair',
  description: 'Generate WhatsApp session pairing code',
  async execute(m, client) {
    try {
      const number = m.sender.replace(/[^0-9]/g, '');

      // Change this URL to your pairing server's URL and port
      const pairingApiUrl = `http://localhost:3000/pair?number=${number}`;

      const response = await axios.get(pairingApiUrl);

      if (response.data?.code) {
        await client.sendMessage(m.chat, `🎉 *Your Pairing Code:*\n\n${response.data.code}`, { quoted: m });
      } else {
        await client.sendMessage(m.chat, '❌ Failed to get pairing code. Please try again later.', { quoted: m });
      }
    } catch (error) {
      console.error('Error in .pair command:', error);
      await client.sendMessage(m.chat, '⚠️ Error generating pairing code.', { quoted: m });
    }
  }
};
