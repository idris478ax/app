const bedrockflayer = require('bedrockflayer');
const express = require('express');

// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
  host: 'bedrockflyer.aternos.me', // <<< EDIT THIS to your server IP
  port: 45783,                     // <<< EDIT THIS to your server port
  username: 'AternosBot',          // <<< EDIT THIS to your desired bot username
  version: '1.26.36.1',            // <<< EDIT THIS to your exact Minecraft version
  offline: true,                   // Bypasses Xbox Live for cracked servers

  // Kept just in case the server asks for /login. 
  // If the server doesn't use passwords, this will just be ignored.
  autoLoginPassword: 'MySecretPassword123' 
};

// ==========================================
// 2. WEB DASHBOARD SERVER (For Render)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Bot Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .status { font-weight: bold; color: green; }
        </style>
      </head>
      <body>
        <h1>Bedrock Bot Dashboard</h1>
        <p>Status: <span class="status">Running</span></p>
        <p>Connected to: ${CONFIG.host}:${CONFIG.port}</p>
        <p>Username: ${CONFIG.username}</p>
        <p><small>Anti-AFK is active.</small></p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`[Web] Dashboard listening on port ${PORT}`);
});

// ==========================================
// 3. MINECRAFT BOT LOGIC
// ==========================================
let bot;
let afkInterval;

function createBot() {
  console.log(`[Bot] Connecting to ${CONFIG.host}:${CONFIG.port}...`);
  
  bot = bedrockflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    offline: CONFIG.offline
  });

  bot.on('spawn', () => {
    console.log(`[Bot] ${bot.username} spawned!`);
    startAntiAFK();
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    
    const lowerMsg = message.toLowerCase();
    console.log(`[CHAT] ${username}: ${message}`);

    // --- AUTO LOGIN LOGIC ---
    // Only triggers if the server specifically asks to login
    if (lowerMsg.includes('/login') || lowerMsg.includes('please login')) {
        console.log('[Bot] Server asked to login. Sending password...');
        bot.chat(`/login ${CONFIG.autoLoginPassword}`);
    }
  });

  bot.on('error', (err) => {
    console.error('[Bot] Error:', err);
  });

  bot.on('end', (reason) => {
    console.log('[Bot] Disconnected:', reason);
    if (afkInterval) clearInterval(afkInterval);
    
    // Auto-reconnect
    setTimeout(() => {
      console.log('[Bot] Reconnecting...');
      createBot();
    }, 10000);
  });
}

// ==========================================
// 4. ANTI-AFK FUNCTION
// ==========================================
function startAntiAFK() {
  if (afkInterval) clearInterval(afkInterval);
  console.log('[Bot] Anti-AFK started.');
  
  afkInterval = setInterval(() => {
    try {
      bot.swingArm();
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    } catch (err) {
      // Ignore errors if bot is loading chunks
    }
  }, 180000); 
}

createBot();
