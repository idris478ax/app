const bedrockflayer = require('bedrockflayer');
const express = require('express');

// ==========================================
// 1. CONFIGURATION (Edit these values)
// ==========================================
const CONFIG = {
  host: 'bedrockflyer.aternos.me', // Aternos server IP
  port: 45783,                     // Aternos server Port
  username: 'AternosBot',          // Bot's in-game name
  version: '1.26.36.1',            // Note: Make sure this exact version is supported by the server
  offline: true                    // Bypasses Xbox Live for cracked servers
};

// ==========================================
// 2. WEB DASHBOARD SERVER (For Render)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000; // Render sets process.env.PORT automatically

// Basic web route - you can expand this later with HTML files for your dashboard
app.get('/', (req, res) => {
  res.send(`
    <h1>Bot Dashboard</h1>
    <p>Status: Running</p>
    <p>Connected to: ${CONFIG.host}:${CONFIG.port}</p>
    <p>Username: ${CONFIG.username}</p>
  `);
});

app.listen(PORT, () => {
  console.log(`[Web] Dashboard server listening on port ${PORT}`);
});

// ==========================================
// 3. MINECRAFT BOT LOGIC
// ==========================================
let bot;
let afkInterval;

function createBot() {
  console.log(`[Bot] Attempting to connect to ${CONFIG.host}:${CONFIG.port}...`);
  
  bot = bedrockflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    offline: CONFIG.offline
  });

  bot.on('spawn', () => {
    console.log(`[Bot] ${bot.username} spawned in the world!`);
    
    // Start Anti-AFK loop (runs every 3 minutes)
    startAntiAFK();
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`[CHAT] ${username}: ${message}`);
  });

  bot.on('error', (err) => {
    console.error('[Bot] Error:', err);
  });

  bot.on('end', (reason) => {
    console.log('[Bot] Disconnected:', reason);
    clearInterval(afkInterval); // Stop Anti-AFK when disconnected
    
    // Auto-reconnect after 10 seconds if kicked/disconnected
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
  // Clear any existing intervals just in case
  if (afkInterval) clearInterval(afkInterval);

  console.log('[Bot] Anti-AFK started.');
  
  // Every 3 minutes (180000 ms), the bot will swing its arm and jump
  afkInterval = setInterval(() => {
    try {
      // Swing arm
      bot.swingArm();
      
      // Jump up and down
      bot.setControlState('jump', true);
      setTimeout(() => {
        bot.setControlState('jump', false);
      }, 500); // Hold jump for half a second
      
      console.log('[Bot] Performed Anti-AFK action.');
    } catch (err) {
      console.log('[Bot] Failed to perform Anti-AFK action (might be loading).');
    }
  }, 180000); 
}

// Start the bot
createBot();
