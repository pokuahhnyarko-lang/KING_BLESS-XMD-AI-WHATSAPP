# KING_BLESS-XMD-AI-WHATSAPP
Installation & Setup for Termux:

1. Install Termux from F-Droid (not Play Store)
2. Update packages:

```bash
pkg update && pkg upgrade
pkg install nodejs git
```

1. Install project:

```bash
git clone https://github.com/your-repo/whatsapp-ai-bot
cd whatsapp-ai-bot
npm init -y
npm install @whiskeysockets/baileys qrcode-terminal pino
npm install natural
npm install brain.js
npm install fs path
```

1. Create the bot file:

```bash
nano bot.js
```

Paste the code above and save (Ctrl+X, then Y, then Enter)

1. Run the bot:

```bash
node bot.js
```

🚀 Features Added:

1. Local AI without APIs - Uses Natural.js and Brain.js for NLP
2. Pairing Code Support - Login with code instead of QR
3. Smart Auto-Replies - Contextual responses with memory
4. Auto-Reactions - Reacts based on sentiment/keywords
5. Sentiment Analysis - Detects positive/negative emotions
6. Command System - Control bot features via chat
7. Typing Indicators - Better user experience
8. Active Hours - Auto-reply only during specified times
9. Context Memory - Remembers last 5 messages per user

📖 Usage:

```bash
# Normal QR login
node bot.js

# With pairing code
node bot.js 123456

# Commands in WhatsApp:
# • ai on/off - Toggle AI
# • react on/off - Toggle reactions
# • ai <question> - Ask AI anything
# • status - Bot status
# • help - Show all commands
```

The bot works entirely offline in Termux with no external API keys required! 🎯
