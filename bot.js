const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

// Local AI configuration (Termux compatible)
const natural = require("natural");
const brain = require("brain.js");

// Initialize NLP and AI
const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

// Neural network for AI responses
const net = new brain.recurrent.LSTM();

// Training data for local AI
const trainingData = [
  { input: "hello", output: "greeting" },
  { input: "hi", output: "greeting" },
  { input: "hey", output: "greeting" },
  { input: "how are you", output: "greeting" },
  { input: "what's up", output: "greeting" },
  { input: "bye", output: "farewell" },
  { input: "goodbye", output: "farewell" },
  { input: "see you", output: "farewell" },
  { input: "thanks", output: "gratitude" },
  { input: "thank you", output: "gratitude" },
  { input: "help", output: "support" },
  { input: "support", output: "support" },
  { input: "problem", output: "support" },
  { input: "time", output: "time" },
  { input: "what time", output: "time" },
  { input: "date", output: "date" },
  { input: "today", output: "date" },
  { input: "joke", output: "fun" },
  { input: "funny", output: "fun" },
  { input: "laugh", output: "fun" },
  { input: "who are you", output: "identity" },
  { input: "your name", output: "identity" },
  { input: "creator", output: "identity" }
];

// Train the classifier
trainingData.forEach(item => {
  classifier.addDocument(item.input, item.output);
});
classifier.train();

// AI Response Generator
class LocalAI {
  constructor() {
    this.contextMemory = new Map();
    this.responsePatterns = {
      greeting: ["Hello! 👋", "Hi there!", "Hey! How can I help?", "Greetings! 🤖"],
      farewell: ["Goodbye! 👋", "See you later!", "Take care!", "Bye! Come back soon!"],
      gratitude: ["You're welcome! 😊", "Happy to help!", "Anytime!", "My pleasure!"],
      support: ["How can I assist you?", "I'm here to help!", "What do you need help with?", "Tell me your issue."],
      time: [`Current time: ${new Date().toLocaleTimeString()}`, `It's ${new Date().getHours()}:${new Date().getMinutes()}`],
      date: [`Today is ${new Date().toDateString()}`, `Date: ${new Date().toLocaleDateString()}`],
      fun: ["Why don't scientists trust atoms? Because they make up everything! 😄", 
            "What do you call a fake noodle? An impasta! 🍝",
            "Why did the scarecrow win an award? He was outstanding in his field! 🌾"],
      identity: ["I'm KING_BLESS XMD AI Bot! 🤖", "I'm an AI assistant created by KING_BLESS", "Call me XMD Bot!"],
      default: ["Interesting! Tell me more.", "I understand. Continue please.", "Got it. What else?", "👍"]
    };
    
    // Train LSTM with some patterns
    this.trainLSTM();
  }

  trainLSTM() {
    const lstmData = [
      { input: "hello", output: "greeting" },
      { input: "how are you", output: "greeting_response" },
      { input: "what is your name", output: "identity_response" },
      { input: "tell me a joke", output: "fun_response" },
      { input: "what time is it", output: "time_response" }
    ];
    
    net.train(lstmData, {
      iterations: 500,
      log: false,
      errorThresh: 0.011
    });
  }

  analyzeText(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const category = classifier.classify(text);
    
    // Calculate sentiment (simple)
    const positiveWords = ['good', 'great', 'awesome', 'happy', 'love', 'like', 'thanks', 'thank'];
    const negativeWords = ['bad', 'sad', 'angry', 'hate', 'worst', 'terrible'];
    
    let sentiment = 'neutral';
    let score = 0;
    
    tokens.forEach(token => {
      if (positiveWords.includes(token)) {
        score += 1;
        sentiment = 'positive';
      }
      if (negativeWords.includes(token)) {
        score -= 1;
        sentiment = 'negative';
      }
    });
    
    return {
      category,
      sentiment,
      score,
      tokens,
      intent: this.extractIntent(text)
    };
  }

  extractIntent(text) {
    const intents = {
      greeting: /hello|hi|hey|greetings/i,
      question: /what|when|where|why|how|who|which/i,
      command: /send|show|give|find|search|create/i,
      emotion: /happy|sad|angry|excited|bored/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(text)) return intent;
    }
    return 'unknown';
  }

  generateResponse(text, userId) {
    const analysis = this.analyzeText(text);
    const category = analysis.category;
    const responses = this.responsePatterns[category] || this.responsePatterns.default;
    
    // Get random response from category
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Add contextual memory
    if (!this.contextMemory.has(userId)) {
      this.contextMemory.set(userId, []);
    }
    
    const userContext = this.contextMemory.get(userId);
    userContext.push({ text, analysis });
    
    // Keep only last 5 messages in memory
    if (userContext.length > 5) userContext.shift();
    
    // Enhanced response with context
    let enhancedResponse = randomResponse;
    
    // Check if this is follow-up question
    if (userContext.length > 1) {
      const lastMessage = userContext[userContext.length - 2];
      if (text.includes('you') && lastMessage.analysis.category === 'identity') {
        enhancedResponse = "I'm still here! 😊 What else would you like to know?";
      }
    }
    
    // Add emoji based on sentiment
    if (analysis.sentiment === 'positive') {
      enhancedResponse += " 😊";
    } else if (analysis.sentiment === 'negative') {
      enhancedResponse = "I'm sorry to hear that. " + enhancedResponse + " 🤗";
    }
    
    return enhancedResponse;
  }

  getSmartReply(text) {
    text = text.toLowerCase();
    
    // Pattern matching for common questions
    const patterns = {
      '^(what|who).*your.*(name|creator)': "I'm KING_BLESS XMD AI Bot, created by KING_BLESS! 🤖",
      '^(how).*(you|are).*(you)': "I'm doing great, thanks for asking! How about you? 😊",
      '.*(joke|funny).*': this.responsePatterns.fun[Math.floor(Math.random() * this.responsePatterns.fun.length)],
      '.*(time).*': this.responsePatterns.time[0],
      '.*(date).*': this.responsePatterns.date[0],
      '.*(weather).*': "I can't check weather without internet, but you can tell me about your weather! ☀️",
      '.*(love|like).*you.*': "Aww, I like you too! 😊",
      '.*(hate|dislike).*': "I'm sorry to hear that. How can I improve?",
      '.*(thank|thanks).*': this.responsePatterns.gratitude[Math.floor(Math.random() * this.responsePatterns.gratitude.length)],
      '.*(bye|goodbye).*': this.responsePatterns.farewell[Math.floor(Math.random() * this.responsePatterns.farewell.length)]
    };
    
    for (const [pattern, response] of Object.entries(patterns)) {
      if (new RegExp(pattern).test(text)) {
        return response;
      }
    }
    
    // If no pattern matches, use AI generation
    return this.generateResponse(text, 'default');
  }
}

// Initialize AI
const ai = new LocalAI();

// Auto-reply configurations
const autoReplyConfig = {
  enabled: true,
  greetingTimeout: 30000, // 30 seconds
  activeHours: {
    start: 8, // 8 AM
    end: 22   // 10 PM
  },
  ignoredContacts: [], // Add numbers to ignore
  replyDelay: 1000 // 1 second delay
};

// Reaction configurations
const autoReactConfig = {
  enabled: true,
  reactions: {
    positive: ['👍', '❤️', '😊', '🎉'],
    neutral: ['👌', '💭', '👀'],
    negative: ['🤔', '😢', '🙏']
  },
  keywordReactions: {
    'congrat': '🎉',
    'birthday': '🎂',
    'good': '👍',
    'love': '❤️',
    'sad': '😢',
    'funny': '😂',
    'wow': '😮',
    'angry': '😠',
    'thank': '🙏',
    'welcome': '👋',
    'hi': '👋',
    'hello': '👋',
    'bye': '👋'
  }
};

async function startBot() {
  // Check for pairing code
  const pairingCode = process.argv[2] || null;
  
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false, // We'll handle QR ourselves
    generateHighQualityLink: true
  });

  // Save credentials when updated
  sock.ev.on('creds.update', saveCreds);

  // QR code, pairing code and connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr, isNewLogin } = update;

    if (qr) {
      console.log("📲 Scan this QR code using WhatsApp > Linked Devices:\n");
      qrcode.generate(qr, { small: true });
    }

    // Pairing code support
    if (isNewLogin && pairingCode) {
      console.log(`🔢 Pairing code: ${pairingCode}`);
      console.log("Enter this code in WhatsApp > Linked Devices > Link with Code");
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(() => startBot(), 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ Bot connected to WhatsApp!');
      console.log('🤖 AI Features Active:');
      console.log('   - Smart Auto Reply');
      console.log('   - Contextual Memory');
      console.log('   - Auto Reactions');
      console.log('   - Sentiment Analysis');
      
      // Send welcome message to saved contacts
      // sendBroadcastWelcome(sock);
    }
  });

  // Message handler with AI features
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const user = msg.pushName || 'User';
    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text ||
                 msg.message.imageMessage?.caption ||
                 "";

    // Auto-react to messages
    if (autoReactConfig.enabled && text) {
      await autoReact(sock, msg, text);
    }

    // Check if auto-reply is enabled and within active hours
    if (autoReplyConfig.enabled && shouldAutoReply()) {
      // Check if contact is not ignored
      if (!autoReplyConfig.ignoredContacts.includes(jid)) {
        
        // Add delay before reply
        await new Promise(resolve => setTimeout(resolve, autoReplyConfig.replyDelay));
        
        // Generate AI response
        const aiResponse = ai.getSmartReply(text);
        
        // Send response
        await sock.sendMessage(jid, { 
          text: `*${user}*, ${aiResponse}`,
          mentions: [msg.key.participant || jid]
        });
        
        // Log the interaction
        console.log(`💬 AI Reply to ${user}: ${aiResponse.substring(0, 50)}...`);
        
        return; // Skip further processing since AI replied
      }
    }

    // Manual command handling (if auto-reply is off or outside hours)
    if (text) {
      const command = text.toLowerCase().trim();
      
      switch(true) {
        case command === 'ai on':
          autoReplyConfig.enabled = true;
          await sock.sendMessage(jid, { text: "✅ AI Auto-Reply enabled!" });
          break;
          
        case command === 'ai off':
          autoReplyConfig.enabled = false;
          await sock.sendMessage(jid, { text: "❌ AI Auto-Reply disabled!" });
          break;
          
        case command === 'react on':
          autoReactConfig.enabled = true;
          await sock.sendMessage(jid, { text: "✅ Auto-Reactions enabled!" });
          break;
          
        case command === 'react off':
          autoReactConfig.enabled = false;
          await sock.sendMessage(jid, { text: "❌ Auto-Reactions disabled!" });
          break;
          
        case command.startsWith('ai '):
          const aiQuery = command.substring(3);
          const aiAnswer = ai.getSmartReply(aiQuery);
          await sock.sendMessage(jid, { text: `🤖 AI: ${aiAnswer}` });
          break;
          
        case command === 'ping':
          await sock.sendMessage(jid, { text: '🏓 Pong! Bot is active.' });
          break;
          
        case command === 'status':
          const status = `🤖 *Bot Status*
• AI Auto-Reply: ${autoReplyConfig.enabled ? '✅ On' : '❌ Off'}
• Auto-Reactions: ${autoReactConfig.enabled ? '✅ On' : '❌ Off'}
• Active Hours: ${autoReplyConfig.activeHours.start}:00 - ${autoReplyConfig.activeHours.end}:00
• Memory: ${ai.contextMemory.size} users`;
          await sock.sendMessage(jid, { text: status });
          break;
          
        case command === 'help':
          const help = `*🤖 KING_BLESS XMD AI Bot Commands:*
• \`hi/hello\` - Greet the bot
• \`ai on/off\` - Toggle AI auto-reply
• \`react on/off\` - Toggle auto-reactions
• \`ai <question>\` - Ask AI anything
• \`ping\` - Check bot status
• \`status\` - Show bot configuration
• \`bye\` - Say goodbye
• \`joke\` - Get a joke
• \`time/date\` - Current time/date
• \`help\` - Show this message`;
          await sock.sendMessage(jid, { text: help });
          break;
          
        default:
          // If auto-reply is off, only respond to direct commands
          if (!autoReplyConfig.enabled) {
            const aiResponse = ai.getSmartReply(command);
            await sock.sendMessage(jid, { text: `*${user}*, ${aiResponse}` });
          }
      }
    }
  });

  // Typing indicators for better UX
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const jid = msg.key.remoteJid;
    const text = msg.message.conversation || "";
    
    if (text && text.length > 3) {
      // Send typing indicator
      await sock.sendPresenceUpdate('composing', jid);
      
      // Stop typing after 2 seconds
      setTimeout(async () => {
        await sock.sendPresenceUpdate('paused', jid);
      }, 2000);
    }
  });
}

// Auto-reaction function
async function autoReact(sock, msg, text) {
  const jid = msg.key.remoteJid;
  const messageKey = msg.key;
  
  // Check for keyword-based reactions
  const lowerText = text.toLowerCase();
  for (const [keyword, reaction] of Object.entries(autoReactConfig.keywordReactions)) {
    if (lowerText.includes(keyword)) {
      try {
        await sock.sendMessage(jid, {
          react: {
            text: reaction,
            key: messageKey
          }
        });
        console.log(`👍 Auto-reacted with ${reaction} to keyword "${keyword}"`);
        return;
      } catch (error) {
        console.log("Failed to send reaction:", error);
      }
    }
  }
  
  // Sentiment-based reactions
  const analysis = ai.analyzeText(text);
  let reaction = '👌'; // default
  
  if (analysis.sentiment === 'positive') {
    reaction = autoReactConfig.reactions.positive[
      Math.floor(Math.random() * autoReactConfig.reactions.positive.length)
    ];
  } else if (analysis.sentiment === 'negative') {
    reaction = autoReactConfig.reactions.negative[
      Math.floor(Math.random() * autoReactConfig.reactions.negative.length)
    ];
  }
  
  try {
    await sock.sendMessage(jid, {
      react: {
        text: reaction,
        key: messageKey
      }
    });
    console.log(`👍 Auto-reacted with ${reaction} (sentiment: ${analysis.sentiment})`);
  } catch (error) {
    console.log("Failed to send reaction:", error);
  }
}

// Check if should auto-reply based on time
function shouldAutoReply() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= autoReplyConfig.activeHours.start && hour < autoReplyConfig.activeHours.end;
}

// Optional: Send welcome to saved contacts
async function sendBroadcastWelcome(sock) {
  // This is optional - use with caution to avoid spam
  console.log("Broadcast welcome disabled by default to prevent spam.");
  // Implement contact list retrieval and welcome message if needed
}

// Start bot with pairing code support
console.log(`
╔══════════════════════════════════════════╗
║   KING_BLESS XMD AI BOT v2.0             ║
║   Advanced WhatsApp Bot with Local AI    ║
║   Features:                              ║
║   • Smart Auto-Reply                     ║
║   • Contextual Memory                    ║
║   • Sentiment Analysis                   ║
║   • Auto Reactions                       ║
║   • Pairing Code Support                 ║
║   • No External API Required             ║
╚══════════════════════════════════════════╝

Usage:
• node bot.js              - Login with QR code
• node bot.js 123456      - Login with pairing code
`);

startBot().catch(console.error);