import axios from 'axios';
import config from '../config.cjs';

const imageCommand = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  let query = m.body.slice(prefix.length + cmd.length).trim();

  const validCommands = ['image', 'img', 'gimage'];

  if (validCommands.includes(cmd)) {
    if (!query && !(m.quoted && m.quoted.text)) {
      return sock.sendMessage(m.from, { text: `❌ Please provide a search query\nExample: ${prefix + cmd} cute cats` });
    }

    if (!query && m.quoted && m.quoted.text) {
      query = m.quoted.text;
    }

    try {
      await sock.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
      await sock.sendMessage(m.from, { text: `🔍 Searching for *${query}*...` });

      // Try multiple API endpoints as fallback
      const apiEndpoints = [
        `https://api.princetechn.com/api/search/unsplash?apikey=prince&query=${encodeURIComponent(query)}`,
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5`,
        `https://pixabay.com/api/?key=your-pixabay-key&q=${encodeURIComponent(query)}&image_type=photo&per_page=5`
      ];

      let response = null;
      let images = [];
      let apiIndex = 0;

      // Try each API endpoint until one works
      while (apiIndex < apiEndpoints.length && images.length === 0) {
        try {
          const currentEndpoint = apiEndpoints[apiIndex];
          console.log(`Trying API endpoint: ${currentEndpoint}`);
          
          const config = {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          };
          
          // Add API key for Pexels if needed
          if (currentEndpoint.includes('api.pexels.com')) {
            config.headers['Authorization'] = 'your-pexels-api-key'; // Replace with actual key
          }
          
          response = await axios.get(currentEndpoint, config);
          
          // Parse response based on API endpoint
          if (currentEndpoint.includes('api.princetechn.com')) {
            if (response.data && Array.isArray(response.data)) {
              images = response.data;
            } else if (response.data && response.data.images && Array.isArray(response.data.images)) {
              images = response.data.images;
            } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
              images = response.data.results;
            }
          } 
          else if (currentEndpoint.includes('api.pexels.com')) {
            if (response.data && response.data.photos && Array.isArray(response.data.photos)) {
              images = response.data.photos.map(photo => ({
                url: photo.src.original,
                alt: photo.photographer
              }));
            }
          }
          else if (currentEndpoint.includes('pixabay.com')) {
            if (response.data && response.data.hits && Array.isArray(response.data.hits)) {
              images = response.data.hits.map(hit => ({
                url: hit.largeImageURL || hit.webformatURL,
                alt: hit.tags
              }));
            }
          }
          
          console.log(`API ${apiIndex + 1} returned ${images.length} images`);
        } catch (apiError) {
          console.warn(`API endpoint ${apiIndex + 1} failed:`, apiError.message);
          // Continue to next API
        }
        
        apiIndex++;
      }

      // If all APIs failed
      if (images.length === 0) {
        throw new Error('All image APIs failed or returned no results');
      }

      const maxImages = Math.min(images.length, 5);
      await sock.sendMessage(m.from, { text: `✅ Found ${images.length} images for *${query}*\nSending top ${maxImages}...` });

      let sentCount = 0;
      for (const [index, image] of images.slice(0, maxImages).entries()) {
        try {
          const imageUrl = image.url || image.imageUrl || image.link || image.src || image.largeImageURL || image.webformatURL;
          
          if (!imageUrl) {
            console.warn(`Image missing URL:`, image);
            continue;
          }

          const caption = `
╭───[ *ɪᴍᴀɢᴇ sᴇᴀʀᴄʜ* ]───
├ *ǫᴜᴇʀʏ*: ${query} 🔍
├ *ʀᴇsᴜʟᴛ*: ${index + 1} of ${maxImages} 🖼️
╰───[ *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴄᴀsᴇʏʀʜᴏᴅᴇs* ]───`.trim();

          await sock.sendMessage(
            m.from,
            {
              image: { url: imageUrl },
              caption: caption,
              contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 1,
                isForwarded: true
              }
            },
            { quoted: m }
          );
          
          sentCount++;
          
          // Add delay between sending images
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.warn(`Failed to send image ${index + 1}:`, err.message);
          continue;
        }
      }

      if (sentCount > 0) {
        await sock.sendMessage(m.from, { react: { text: '✅', key: m.key } });
      } else {
        throw new Error('All image sending attempts failed');
      }

    } catch (error) {
      console.error('Image search error:', error);
      let errorMsg = '❌ Failed to fetch images 😞';
      
      if (error.message.includes('timeout')) {
        errorMsg = '❌ Request timed out ⏰';
      } else if (error.message.includes('All image APIs failed')) {
        errorMsg = '❌ All image services are currently unavailable';
      } else if (error.response && error.response.status === 404) {
        errorMsg = '❌ Image search service unavailable';
      } else if (error.response && error.response.status) {
        errorMsg = `❌ API error: ${error.response.status}`;
      }
      
      await sock.sendMessage(m.from, { text: errorMsg });
      await sock.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }
  }
};

export default imageCommand;
