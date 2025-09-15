const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { spawn } = require('child_process');

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    let tmp, out;
    try {
      tmp = path.join(__dirname, '../src', + new Date() + '.' + ext);
      out = tmp + '.' + ext2;
      
      await fs.promises.writeFile(tmp, buffer);
      
      // Fixed: Properly handle the spawn process with error events
      const ffmpegProcess = spawn(ffmpegPath, [
        '-y',
        '-i', tmp,
        ...args,
        out
      ]);
      
      // Capture stderr for debugging
      let stderr = '';
      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpegProcess.on('error', (err) => {
        reject(new Error(`FFmpeg process error: ${err.message}`));
      });
      
      ffmpegProcess.on('close', async (code) => {
        try {
          // Clean up input file
          if (fs.existsSync(tmp)) {
            await fs.promises.unlink(tmp);
          }
          
          if (code !== 0) {
            // Clean up output file if it was created
            if (fs.existsSync(out)) {
              await fs.promises.unlink(out);
            }
            return reject(new Error(`FFmpeg process exited with code ${code}. Error: ${stderr}`));
          }
          
          if (!fs.existsSync(out)) {
            return reject(new Error('Output file was not created'));
          }
          
          const resultBuffer = await fs.promises.readFile(out);
          await fs.promises.unlink(out);
          resolve(resultBuffer);
        } catch (e) {
          reject(e);
        }
      });
      
    } catch (e) {
      // Clean up any created files on error
      try {
        if (tmp && fs.existsSync(tmp)) await fs.promises.unlink(tmp);
        if (out && fs.existsSync(out)) await fs.promises.unlink(out);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      reject(e);
    }
  });
}

/**
 * Convert Audio to Playable WhatsApp Audio
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension 
 */
function toAudio(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-ac', '2',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'mp3'
  ], ext, 'mp3');
}

/**
 * Convert Audio to Playable WhatsApp PTT
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension 
 */
function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10',
    '-f', 'opus'
  ], ext, 'opus');
}

/**
 * Convert Video to Playable WhatsApp Video
 * @param {Buffer} buffer Video Buffer
 * @param {String} ext File Extension 
 */
function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ab', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow',
    '-f', 'mp4'
  ], ext, 'mp4');
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg,
};
