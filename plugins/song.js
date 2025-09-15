import axios from "axios";
import yts from "yt-search";
import config from '../config.cjs';

const song = async (m, gss) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
  const args = m.body.slice(prefix.length + cmd.length).trim().split(" ");

  if (cmd === "song") {
    if (args.length === 0 || !args.join(" ").trim()) {
      return m.reply("*Please provide a song name or keywords to search for.*");
    }

    const searchQuery = args.join(" ");
    await m.reply("> *🎥 Searching for the video...*");

    try {
      const searchResults = await yts(searchQuery);
      if (!searchResults.videos || searchResults.videos.length === 0) {
        return m.reply(`❌ No results found for "${searchQuery}".`);
      }

      const firstResult = searchResults.videos[0];
      const videoUrl = firstResult.url;

      // Fetch video using API
      const apiUrl = `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
      const response = await axios.get(apiUrl, {
        timeout: 30000 // 30 second timeout
      });

      if (!response.data || !response.data.success) {
        return m.reply(`❌ Failed to fetch video for "${searchQuery}".`);
      }

      const { title, download_url } = response.data.result;

      if (!download_url) {
        return m.reply("❌ Download URL not found in the response.");
      }

      // Send the video file
      await gss.sendMessage(
        m.from,
        {
          video: { url: download_url },
          mimetype: "video/mp4",
          caption: `> *${title}*\n\nPowered By Caseyrhodes 💜`,
        },
        { quoted: m }
      );

    } catch (error) {
      console.error("Error in song command:", error);
      
      if (error.code === 'ECONNABORTED') {
        return m.reply("❌ Request timeout. Please try again later.");
      }
      
      if (error.response) {
        return m.reply(`❌ API error: ${error.response.status}`);
      }
      
      m.reply("❌ An error occurred while processing your request.");
    }
  }
};

export default song;
