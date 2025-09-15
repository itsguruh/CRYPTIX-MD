import fetch from 'node-fetch';
import config from '../config.cjs';

const fetchData = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const conversation = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
  
  const cmd = conversation.startsWith(prefix) 
    ? conversation.slice(prefix.length).split(' ')[0].toLowerCase() 
    : '';
  
  const text = conversation.startsWith(prefix)
    ? conversation.slice(prefix.length + cmd.length).trim()
    : '';

  const validCommands = ['fetch', 'get', 'api'];

  if (!validCommands.includes(cmd)) return;

  if (!text) {
    return await Matrix.sendMessage(m.key.remoteJid, { 
      text: 'Please provide a URL. Example: .fetch https://api.example.com/data' 
    }, { quoted: m });
  }

  if (!/^https?:\/\//.test(text)) {
    return await Matrix.sendMessage(m.key.remoteJid, { 
      text: 'URL must start with http:// or https://' 
    }, { quoted: m });
  }

  try {
    const _url = new URL(text);
    const url = `${_url.origin}${_url.pathname}${_url.search}`;
    
    // Add timeout to fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeout);

    // Check if response is successful
    if (!res.ok) {
      return await Matrix.sendMessage(m.key.remoteJid, {
        text: `Request failed with status: ${res.status} ${res.statusText}`
      }, { quoted: m });
    }

    const contentLength = res.headers.get('content-length');
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return await Matrix.sendMessage(m.key.remoteJid, {
        text: `Content too large: ${(contentLength / 1024 / 1024).toFixed(2)}MB exceeds limit of ${maxSize / 1024 / 1024}MB`
      }, { quoted: m });
    }

    const contentType = res.headers.get('content-type') || '';
    
    // Handle non-text content types by sending as media
    if (contentType.includes('image/') || 
        contentType.includes('video/') || 
        contentType.includes('audio/') ||
        contentType.includes('application/octet-stream')) {
      
      let messageType = 'document';
      if (contentType.includes('image/')) messageType = 'image';
      if (contentType.includes('video/')) messageType = 'video';
      if (contentType.includes('audio/')) messageType = 'audio';
      
      const mediaMessage = {
        [messageType]: {
          url: url
        },
        caption: 'Fetched from URL',
        mimetype: contentType
      };
      
      return await Matrix.sendMessage(m.key.remoteJid, mediaMessage, { quoted: m });
    }

    // Handle text-based responses
    const buffer = await res.arrayBuffer();
    let content = Buffer.from(buffer).toString('utf8');
    
    // Try to parse and format if it's JSON
    if (contentType.includes('application/json') || 
        (content.trim().startsWith('{') || content.trim().startsWith('['))) {
      try {
        const parsedJson = JSON.parse(content);
        content = JSON.stringify(parsedJson, null, 2);
      } catch (e) {
        // Not valid JSON, keep as is
      }
    }
    
    // Split large content into multiple messages if needed
    const maxLength = 4096; // WhatsApp message limit
    if (content.length <= maxLength) {
      return await Matrix.sendMessage(m.key.remoteJid, {
        text: `*Fetched Data:*\n\n${content}`
      }, { quoted: m });
    }
    
    // For large content, split into multiple messages
    await Matrix.sendMessage(m.key.remoteJid, {
      text: `*Fetched Data (${content.length} characters):*`
    }, { quoted: m });
    
    for (let i = 0; i < content.length; i += maxLength) {
      await Matrix.sendMessage(m.key.remoteJid, {
        text: content.slice(i, i + maxLength)
      });
    }
    
  } catch (error) {
    console.error('Error fetching data:', error);
    
    let errorMessage = 'Error fetching data';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out after 30 seconds';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Could not resolve hostname';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused by server';
    } else {
      errorMessage = error.message;
    }
    
    await Matrix.sendMessage(m.key.remoteJid, {
      text: errorMessage
    }, { quoted: m });
  }
};

export default fetchData;
