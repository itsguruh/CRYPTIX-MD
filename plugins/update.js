import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import AdmZip from "adm-zip";
import { createRequire } from 'module';

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import config using require for CommonJS files
const require = createRequire(import.meta.url);
const configPath = path.join(__dirname, '../config.cjs');
const config = require(configPath);

// Simple database for commit hash (replace with your actual DB if available)
let commitHashDB = {};
const commitHashPath = path.join(__dirname, '../data/commitHash.json');

// Load commit hash from file
try {
    if (fs.existsSync(commitHashPath)) {
        commitHashDB = JSON.parse(fs.readFileSync(commitHashPath, 'utf8'));
    }
} catch (e) {
    console.log('No existing commit hash found');
}

const update = async (m, Matrix) => {
    const prefix = config.PREFIX || '.'; // Default prefix if not in config
    const body = m.body || "";
    const cmd = body.startsWith(prefix)
        ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
        : "";

    // Helper function to reply to messages
    const reply = (text) => Matrix.sendMessage(m.from, { text }, { quoted: m });

    if (cmd === "update") {
        // Get owner ID from Matrix user
        const ownerId = Matrix.user?.id;
        
        if (!ownerId) {
            return reply("❌ Unable to verify bot owner.");
        }
        
        // Check if sender is the bot owner
        const isOwner = m.sender === ownerId;
        
        if (!isOwner) return reply("❌ This command is only for the bot owner.");

        try {
            // Newsletter configuration
            const newsletterConfig = {
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363302677217436@newsletter',
                        newsletterName: '𝐂𝐀𝐒𝐄𝐘𝐑𝐇𝐎𝐃𝐄𝐒 𝐔𝐏𝐃𝐀𝐓𝐄𝐒',
                        serverMessageId: 143
                    }
                }
            };

            // Add reaction if available
            if (m.React) await m.React("⏳");
            
            console.log("🔄 Checking for updates...");
            const msg = await Matrix.sendMessage(m.from, { 
                text: "```🔍 Checking for CASEYRHODES updates...```",
                ...newsletterConfig
            }, { quoted: m });

            const sendUpdateMessage = async (text) => {
                return await Matrix.sendMessage(m.from, { 
                    text, 
                    ...newsletterConfig 
                }, { quoted: m });
            };

            // Fetch latest commit hash
            const { data: commitData } = await axios.get(
                "https://api.github.com/repos/caseytech001/CASEYRHODES-AI/commits/main",
                {
                    headers: {
                        'User-Agent': 'CASEYRHODES-AI-Bot'
                    }
                }
            );
            const latestCommitHash = commitData.sha;
            const currentHash = commitHashDB.currentHash || "unknown";

            if (latestCommitHash === currentHash) {
                if (m.React) await m.React("✅");
                await sendUpdateMessage("✅ *Your CASEYRHODES-AI bot is already up-to-date!*");
                return;
            }

            await sendUpdateMessage("🚀 *New update found! Downloading CASEYRHODES-AI...*\n\n_This may take a few moments..._");

            // Download latest ZIP
            const zipPath = path.join(process.cwd(), "latest.zip");
            const writer = fs.createWriteStream(zipPath);
            
            const response = await axios({
                method: 'get',
                url: "https://github.com/caseytech001/CASEYRHODES-AI/archive/main.zip",
                responseType: 'stream',
                headers: {
                    'User-Agent': 'CASEYRHODES-AI-Bot'
                }
            });

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await sendUpdateMessage("📦 *Extracting the latest code...*");

            // Extract ZIP
            const extractPath = path.join(process.cwd(), "latest");
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);

            await sendUpdateMessage("🔄 *Replacing files while preserving your config...*");

            // Replace files while skipping important configs
            const sourcePath = path.join(extractPath, "CASEYRHODES-AI-main");
            await copyFolderSync(sourcePath, process.cwd());

            // Update commit hash in database
            commitHashDB.currentHash = latestCommitHash;
            fs.writeFileSync(commitHashPath, JSON.stringify(commitHashDB, null, 2));

            // Cleanup
            fs.unlinkSync(zipPath);
            fs.rmSync(extractPath, { recursive: true, force: true });

            // Final success message with image if available
            try {
                await Matrix.sendMessage(m.from, {
                    image: { 
                        url: "https://i.ibb.co/wN6Gw0ZF/lordcasey.jpg",
                        mimetype: "image/jpeg"
                    },
                    caption: "✅ *Update complete!*\n\n_Restarting the bot to apply changes..._\n\n⚡ Powered by CASEYRHODES-TECH",
                    ...newsletterConfig
                }, { quoted: m });
            } catch (imageError) {
                // Fallback to text if image fails
                await sendUpdateMessage("✅ *Update complete!*\n\n_Restarting the bot to apply changes..._\n\n⚡ Powered by CASEYRHODES-TECH");
            }

            if (m.React) await m.React("✅");
            setTimeout(() => process.exit(0), 2000);

        } catch (error) {
            console.error("❌ Update error:", error);
            if (m.React) await m.React("❌");
            await reply(`❌ *Update failed!*\n\nError: ${error.message}\n\nPlease try manually or contact support.`);
        }
    }
};

async function copyFolderSync(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const items = fs.readdirSync(source);
    // Files to preserve (don't overwrite)
    const preservedFiles = ["config.cjs", "app.json", "credentials.json", "data", ".env", "package.json", "node_modules"];
    
    for (const item of items) {
        const srcPath = path.join(source, item);
        const destPath = path.join(target, item);

        // Skip preserved files and directories
        if (preservedFiles.includes(item)) {
            console.log(`⚠️ Preserving existing: ${item}`);
            continue;
        }

        try {
            const stat = fs.lstatSync(srcPath);
            if (stat.isDirectory()) {
                await copyFolderSync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        } catch (copyError) {
            console.error(`Failed to copy ${item}:`, copyError);
        }
    }
}

export default update;
