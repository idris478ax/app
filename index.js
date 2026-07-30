// Re-created for Minecraft Java Edition using Standard Mineflayer
const mineflayer = require('mineflayer');
const express = require('express');

// ==========================================
// 1. CONFIGURATION (Edit these values)
// ==========================================
const CONFIG = {
  host: 'bedrockflyer.aternos.me', // Change to your Java Server IP/Address
  port: 45783,                     // Default Java Port is 25565
  username: 'Abdou-online',          // Bot's username
  version: '1.20.4',               // Specify Java version (or remove line for auto)
  offline: true,                   // Set 'true' for Cracked servers (bypasses Auth)
  
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
        <h1>Java Bot Dashboard</h1>
        <p>Status: <span class="status">Running</span></p>
        <p>Connected to: ${CONFIG.host}:${CONFIG.port}</p>
        <p>Username: ${CONFIG.username}</p>
        <p>Edition: Java Edition</p>
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
  console.log(`[Bot] Connecting to ${CONFIG.host}:${CONFIG.port} (Java Edition)...`);
  
  // Translation for Mineflayer: auth parameter sets offline/cracked mode.
  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    auth: CONFIG.offline ? 'offline' : 'microsoft' 
  });

  // Standard Mineflayer events
  bot.on('spawn', () => {
    console.log(`[Bot] ${bot.username} spawned in the world!`);
    startAntiAFK();
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    
    const lowerMsg = message.toLowerCase();
    console.log(`[CHAT] ${username}: ${message}`);

    // --- AUTO LOGIN LOGIC (No /register) ---
    // Only triggers if the server specifically asks to login
    if (lowerMsg.includes('/login') || lowerMsg.includes('please login')) {
        console.log('[Bot] Server asked to login. Sending password...');
        bot.chat(`/login ${CONFIG.autoLoginPassword}`);
    }
  });

  bot.on('error', (err) => {
    console.error('[Bot] Error:', err);
  });

  // Handle disconnection and auto-reconnect
  bot.on('end', (reason) => {
    console.log('[Bot] Disconnected:', reason);
    if (afkInterval) clearInterval(afkInterval);
    
    // Auto-reconnect after 10 seconds
    setTimeout(() => {
      console.log('[Bot] Reconnecting...');
      createBot();
    }, 10000);
  });
}

// ==========================================
// 4. ANTI-AFK FUNCTION
// ==========================================
// Preserved feature: swings arm and jumps every 3 minutes.
function startAntiAFK() {
  if (afkInterval) clearInterval(afkInterval);
  console.log('[Bot] Anti-AFK system started.');
  
  afkInterval = setInterval(() => {
    try {
      // Standard Mineflayer actions are supported
      bot.swingArm();
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    } catch (err) {
      // Ignore errors if bot is loading chunks or unavailable
    }
  }, 180000); // 3 minutes
}

// Start the sequence
createBot();
