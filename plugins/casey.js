import config from '../config.cjs';
import axios from 'axios';

const casey = async (m, Matrix) => {
  try {
    const prefix = config.PREFIX;
    const body = m.body || '';
    const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    
    // Only process casey command
    if (cmd !== 'casey') return;

    const text = body.slice(prefix.length + cmd.length).trim();

    // Check if user provided a question/message
    if (!text) {
      const buttonMessage = {
        text: `*CASEY AI*\n\nPlease provide a message or question for Casey AI to respond to.\n\nUsage: ${prefix}casey Hello, how are you?`,
        footer: "Casey AI - Powered by CASEYRHODES TECH",
        buttons: [
          { buttonId: `${prefix}aimenu`, buttonText: { displayText: "AI MENU" }, type: 1 },
          { buttonId: `${prefix}menu`, buttonText: { displayText: "MAIN MENU" }, type: 1 }
        ],
        headerType: 1
      };
      return await Matrix.sendMessage(m.from, buttonMessage, { quoted: m });
    }

    // Check for custom responses before calling API
    const customResponse = getCustomResponse(text, prefix);
    if (customResponse) {
      return await Matrix.sendMessage(m.from, customResponse, { quoted: m });
    }

    // Continue with API calls for other queries
    let response;
    let apiUsed = 'primary';

    try {
      // Try primary API first
      const primaryResponse = await axios.get(`https://api.giftedtech.co.ke/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(text)}`, {
        timeout: 30000
      });

      if (primaryResponse.data && primaryResponse.data.success && primaryResponse.data.result) {
        response = primaryResponse.data.result;
      } else {
        throw new Error('Primary API response invalid');
      }
    } catch (primaryError) {
      console.log('Primary API failed, trying fallback...', primaryError.message);
      
      try {
        // Try fallback API
        const fallbackResponse = await axios.get(`https://izumiiiiiiii.dpdns.org/ai/geminiai?messages=${encodeURIComponent(text)}`, {
          timeout: 30000
        });

        if (fallbackResponse.data && fallbackResponse.data.status && fallbackResponse.data.result) {
          response = fallbackResponse.data.result;
          apiUsed = 'fallback';
        } else {
          throw new Error('Fallback API response invalid');
        }
      } catch (fallbackError) {
        console.error('Both APIs failed:', fallbackError.message);
        
        const errorButtons = {
          text: '❌ *Casey AI is currently unavailable*\n\nBoth AI services are experiencing issues. Please try again later.',
          footer: "Casey AI - Technical Issues",
          buttons: [
            { buttonId: `${prefix}aimenu`, buttonText: { displayText: "AI MENU" }, type: 1 },
            { buttonId: `${prefix}bowner`, buttonText: { displayText: "CONTACT OWNER" }, type: 1 }
          ],
          headerType: 1
        };
        
        return await Matrix.sendMessage(m.from, errorButtons, { quoted: m });
      }
    }

    // Clean up the response
    response = response.trim();

    // Send the AI response with buttons
    const aiResponse = {
      text: `${response}`,
      footer: `Casey AI - Powered by ${apiUsed === 'primary' ? 'CASEYRHODES TECH' : 'CASPER TECH'}`,
      buttons: [
        { buttonId: `${prefix}aimenu`, buttonText: { displayText: "AI MENU" }, type: 1 },
        { buttonId: `${prefix}menu`, buttonText: { displayText: "MAIN MENU" }, type: 1 },
        { buttonId: `${prefix}owner`, buttonText: { displayText: "INFO" }, type: 1 }
      ],
      headerType: 1
    };

    await Matrix.sendMessage(m.from, aiResponse, { quoted: m });
      
  } catch (error) {
    console.error('Error in casey command:', error);
    
    const errorButtons = {
      text: '❌ *An error occurred with Casey AI*\n\nPlease try again later or contact the owner for support.',
      footer: "Casey AI - Error",
      buttons: [
        { buttonId: `${prefix}aimenu`, buttonText: { displayText: "AI MENU" }, type: 1 },
        { buttonId: `${prefix}owner`, buttonText: { displayText: "CONTACT OWNER" }, type: 1 }
      ],
      headerType: 1
    };
    
    await Matrix.sendMessage(m.from, errorButtons, { quoted: m });
  }
};

// Function to handle custom responses
const getCustomResponse = (text, prefix) => {
  const lowerText = text.toLowerCase();
  
  // Check for owner/developer related queries
  if (lowerText.includes('owner') || lowerText.includes('developer') || lowerText.includes('creator') || 
      lowerText.includes('who made you') || lowerText.includes('who created you') || 
      lowerText.includes('who developed you') || lowerText.includes('who built you')) {
    
    return {
      text: `*👨‍💻 MEET THE DEVELOPERS*\n\n🇰🇪 *Primary Developer:* CaseyRhodes Tech\n• Location: Kenya\n• Specialization: AI Integration & Bot Development\n• Role: Lead Developer & Project Owner\n\n🤖 *Technical Partner:* CASPER TECH\n• Specialization: Backend Systems & API Management\n• Role: Technical Support & Infrastructure\n\n*About Our Team:*\nCasey AI is the result of a collaborative effort between CaseyRhodes Tech and CASPER TECH. Together, we bring you cutting-edge AI technology with reliable bot functionality, ensuring you get the best AI experience possible.\n\n*Proudly Made in Kenya* 🇰🇪`,
      footer: "CaseyRhodes Tech x CASPER TECH - Kenyan Innovation",
      buttons: [
        { buttonId: `${prefix}menu`, buttonText: { displayText: "MAIN MENU" }, type: 1 },
        { buttonId: `${prefix}aimenu`, buttonText: { displayText: "AI MENU" }, type: 1 },
        { buttonId: `${prefix}owner`, buttonText: { displayText: "GET SUPPORT" }, type: 1 }
      ],
      headerType: 1
    };
  }
  
  // Check for creation date/when made queries
  if (lowerText.includes('when were you made') || lowerText.includes('when were you created') || 
      lowerText.includes('when were you developed') || lowerText.includes('creation date') || 
      lowerText.includes('when did you start') || lowerText.includes('how old are you') ||
      lowerText.includes('when were you built') || lowerText.includes('release date')) {
    
    return {
      text: `*📅 CASEY AI TIMELINE*\n\n🚀 *Development Started:* December 2024\n🎯 *First Release:* January 2025\n🔄 *Current Version:* 2.0 (February 2025)\n\n*Development Journey:*\n• *Phase 1:* Core AI integration and basic functionality\n• *Phase 2:* Enhanced response system and multi-API support\n• *Phase 3:* Advanced customization and user experience improvements\n\n*What's Next:*\nWe're constantly working on updates to make Casey AI smarter, faster, and more helpful. Stay tuned for exciting new features!\n\n*Age:* Just a few months old, but getting smarter every day! 🧠✨`,
      footer: "Casey AI - Born in Kenya, Growing Worldwide",
      buttons: [
        { buttonId: `${prefix}menu`, buttonText: { displayText: "MAIN MENU" }, type: 1 },
        { buttonId: `${prefix}aimenu`, buttonText: { displayText: "AI MENU" }, type: 1 },
        { buttonId: `${prefix}bowner`, buttonText: { displayText: "MEET DEVS OF ME" }, type: 1 }
      ],
      headerType: 1
    };
  }

  // Check for AI name queries
  if (lowerText.includes('what is your name') || lowerText.includes('what\'s your name') || 
      lowerText.includes('tell me your name') || lowerText.includes('your name') || 
      lowerText.includes('name?') || lowerText.includes('called?')) {
    
    return {
      text: `*🏷️ MY NAME*\n\n👋 Hello! My name is *CASEY AI*\n\n*About My Name:*\n• Full Name: Casey AI\n• Short Name: Casey\n• You can call me: Casey, Casey AI, or just AI\n\n*Name Origin:*\nI'm named after my primary developer *CaseyRhodes Tech*, combining the personal touch of my creator with the intelligence of artificial intelligence technology.\n\n*What Casey Stands For:*\n🔹 *C* - Creative Problem Solving\n🔹 *A* - Advanced AI Technology\n🔹 *S* - Smart Assistance\n🔹 *E* - Efficient Responses\n🔹 *Y* - Your Reliable Companion\n\n*Made in Kenya* 🇰🇪 *by CaseyRhodes Tech*`,
      footer: "Casey AI - That's Me! 😊",
      buttons: [
        { buttonId: `${prefix}aimenu`, buttonText: { displayText: "AI MENU" }, type: 1 },
        { buttonId: `${prefix}bowner`, buttonText: { displayText: "MEET MY DEVS" }, type: 1 },
        { buttonId: `${prefix}menu`, buttonText: { displayText: "MAIN MENU" }, type: 1 }
      ],
      headerType: 1
    };
  }

  // Check for general info about Casey AI
  if (lowerText.includes('what are you') || lowerText.includes('tell me about yourself') || 
      lowerText.includes('who are you') || lowerText.includes('about casey')) {
    
    return {
      text: `👋 Hi! I'm *Casey AI*, your intelligent WhatsApp assistant developed by CaseyRhodes Tech in partnership with CASPER TECH.\n\n*What I Can Do:*\n• Answer questions on any topic\n• Help with problem-solving\n• Provide information and explanations\n• Assist with creative tasks\n• Engage in meaningful conversations\n\n*My Features:*\n✅ Advanced AI technology\n✅ Multi-language support\n✅ Fast response times\n✅ Reliable dual-API system\n✅ User-friendly interface\n\n*My Identity:*\n• Name: Casey AI\n• Origin: Kenya 🇰🇪\n• Purpose: Making AI accessible and helpful\n\n*Proudly Kenyan:* 🇰🇪\nBuilt with passion in Kenya, serving users worldwide with cutting-edge AI technology.\n\nHow can I assist you today?`,
      footer: "Casey AI - Your Intelligent WhatsApp Companion",
      buttons: [
        { buttonId: `${prefix}aimenu`, buttonText: { displayText: "AI MENU" }, type: 1 },
        { buttonId: `${prefix}bowner`, buttonText: { displayText: "MEET DEVS" }, type: 1 },
        { buttonId: `${prefix}menu`, buttonText: { displayText: "MAIN MENU" }, type: 1 }
      ],
      headerType: 1
    };
  }

  // Return null if no custom response matches
  return null;
};

// Handle owner command response
const handleOwnerResponse = (m, Matrix) => {
  const prefix = config.PREFIX;
  const body = m.body || '';
  const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  
  if (cmd === 'bowner') {
    const ownerInfo = {
      text: `*👨‍💻 DEVELOPMENT TEAM*\n\n🇰🇪 *Lead Developer:* CaseyRhodes Tech\n• Primary Owner & Creator\n• Location: Kenya\n• Expertise: AI Integration, Bot Development\n• Vision: Making AI accessible to everyone\n\n🤖 *Technical Partner:* CASPER TECH\n• Backend Systems Specialist\n• API Management & Infrastructure\n• Ensures reliable service delivery\n\n*Our Collaboration:*\nThis powerful partnership combines CaseyRhodes Tech's innovative vision with CASPER TECH's technical expertise, delivering you a world-class AI experience right here from Kenya.\n\n*Contact & Support:*\nFor technical support, feature requests, or collaboration inquiries, reach out through the support channels.\n\n*Made with ❤️ in Kenya* 🇰🇪`,
      footer: "CaseyRhodes Tech x CASPER TECH - Kenyan Innovation",
      buttons: [
        { buttonId: `${prefix}menu`, buttonText: { displayText: "MAIN MENU" }, type: 1 },
        { buttonId: `${prefix}owner`, buttonText: { displayText: "GET SUPPORT" }, type: 1 }
      ],
      headerType: 1
    };
    
    return Matrix.sendMessage(m.from, ownerInfo, { quoted: m });
  }
};

// Export both functions
export default casey;
export { handleOwnerResponse };
