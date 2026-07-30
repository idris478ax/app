const mineflayer = require('mineflayer');
const express = require('express');
const path = require('path');

// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONFIG = {
  host: 'bedrockflyer.aternos.me', // Your Aternos Server IP
  port: 45783,                     // WARNING: If this is a Bedrock port, a Java bot will fail!
  offline: true                    // Bypasses authentication for cracked servers
};

// ==========================================
// 2. STATE & LOG MANAGEMENT
// ==========================================
let bot = null;
let afkInterval = null;
let reconnectTimeout = null;

const state = {
  status: 'Disconnected',
  uptime: 0,
  playersOnline: 0,
  coords: { x: 0, y: 0, z: 0 },
  afkEnabled: false,
  logs: []
};

// Start Uptime Tracker
setInterval(() => {
  if (state.status === 'Connected' && bot) {
    state.uptime++;
    if (bot.entity) {
      state.coords = {
        x: Math.floor(bot.entity.position.x),
        y: Math.floor(bot.entity.position.y),
        z: Math.floor(bot.entity.position.z)
      };
    }
    state.playersOnline = Object.keys(bot.players).length;
  }
}, 1000);

function addLog(msg) {
  const time = new Date().toLocaleTimeString();
  const logEntry = `[${time}] ${msg}`;
  console.log(logEntry);
  state.logs.push(logEntry);
  if (state.logs.length > 50) state.logs.shift(); // Keep only last 50 logs
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

// ==========================================
// 3. MINECRAFT BOT LOGIC
// ==========================================
function startBot() {
  if (bot) return addLog('Bot is already running or connecting.');
  
  state.status = 'Connecting...';
  addLog(`Attempting connection to ${CONFIG.host}:${CONFIG.port}...`);
  
  // Notice we completely removed the "version" parameter. 
  // Without it, Mineflayer auto-detects the version automatically.
  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    auth: CONFIG.offline ? 'offline' : 'microsoft'
  });

  bot.on('spawn', () => {
    state.status = 'Connected';
    state.uptime = 0; // Reset uptime on fresh connection
    addLog(`Successfully spawned in world!`);
    if (state.afkEnabled) startAntiAFK();
  });

  bot.on('error', (err) => {
    addLog(`Error: ${err.message}`);
  });

  bot.on('end', (reason) => {
    addLog(`Disconnected: ${reason}`);
    state.status = 'Disconnected';
    state.playersOnline = 0;
    
    stopBot(); // Cleanup
    
    // Auto-Reconnect Logic
    addLog('Auto-reconnecting in 10 seconds...');
    reconnectTimeout = setTimeout(() => {
      startBot();
    }, 10000);
  });
}

function stopBot() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (afkInterval) clearInterval(afkInterval);
  if (bot) {
    try { bot.quit(); } catch(e) {}
    bot = null;
  }
  state.status = 'Disconnected';
  addLog('Bot manually stopped.');
}

// ==========================================
// 4. ANTI-AFK LOGIC (Walk 5 Blocks)
// ==========================================
function startAntiAFK() {
  if (afkInterval) clearInterval(afkInterval);
  addLog('Anti-AFK system activated.');
  
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    
    try {
      addLog('Anti-AFK: Walking 5 blocks randomly...');
      // Look in a random direction (0 to 360 degrees in radians)
      const randomYaw = Math.random() * Math.PI * 2;
      bot.look(randomYaw, 0, true, () => {
        // Start walking forward
        bot.setControlState('forward', true);
        
        // At normal walk speed (4.3 blocks/sec), 1.2 seconds is ~5 blocks
        setTimeout(() => {
          bot.clearControlStates(); // Stops all movement
        }, 1200);
      });
    } catch (err) {
      addLog('Anti-AFK Failed: ' + err.message);
    }
  }, 180000); // 3 minutes
}

function stopAntiAFK() {
  if (afkInterval) clearInterval(afkInterval);
  if (bot) bot.clearControlStates();
  addLog('Anti-AFK system disabled.');
}

// ==========================================
// 5. WEB DASHBOARD (Express + HTML/JS)
// ==========================================
const app = express();
app.use(express.json());

// 5a. API Endpoints
app.get('/api/state', (req, res) => {
  res.json({
    ...state,
    uptimeFormatted: formatUptime(state.uptime)
  });
});

app.post('/api/action', (req, res) => {
  const { action, payload } = req.body;
  
  if (action === 'connect') startBot();
  if (action === 'disconnect') stopBot();
  
  if (action === 'toggleAfk') {
    state.afkEnabled = !state.afkEnabled;
    if (state.status === 'Connected') {
      state.afkEnabled ? startAntiAFK() : stopAntiAFK();
    } else {
      addLog(`Anti-AFK toggled to ${state.afkEnabled} (Will apply on join).`);
    }
  }

  if (action === 'command' && bot && state.status === 'Connected') {
    addLog(`Sent command: ${payload}`);
    bot.chat(payload);
  }

  res.json({ success: true });
});

// 5b. Web Frontend (HTML UI)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bot Dashboard</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #121212; color: #fff; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: auto; }
        .card { background: #1e1e1e; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #333; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        button { padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; }
        .btn-green { background: #4caf50; color: white; }
        .btn-red { background: #f44336; color: white; }
        .btn-blue { background: #2196f3; color: white; }
        .log-box { background: #000; font-family: monospace; padding: 15px; height: 250px; overflow-y: auto; font-size: 12px; border-radius: 5px;}
        input[type="text"] { padding: 10px; width: 70%; border-radius: 4px; border: 1px solid #555; background: #2a2a2a; color: white; }
        
        /* Tabs */
        .tabs { display: flex; border-bottom: 1px solid #333; margin-bottom: 20px; }
        .tab { padding: 10px 20px; cursor: pointer; color: #aaa; }
        .tab.active { border-bottom: 2px solid #2196f3; color: white; font-weight: bold; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎮 Dashboard</h1>
        
        <div class="tabs">
          <div class="tab active" onclick="switchTab('main')">Main Control</div>
          <div class="tab" onclick="switchTab('commands')">Custom Commands</div>
        </div>

        <div id="main" class="tab-content active">
          <div class="card grid">
            <div>
              <p><strong>Status:</strong> <span id="statusTxt">Offline</span></p>
              <p><strong>Server:</strong> ${CONFIG.host}:${CONFIG.port}</p>
              <p><strong>Uptime:</strong> <span id="uptimeTxt">0h 0m 0s</span></p>
            </div>
            <div>
              <p><strong>Players Online:</strong> <span id="playersTxt">0</span></p>
              <p><strong>Coordinates:</strong> <span id="coordsTxt">X:0 Y:0 Z:0</span></p>
              <p><strong>Anti-AFK:</strong> <span id="afkTxt">Off</span></p>
            </div>
          </div>

          <div class="card" style="display:flex; gap:10px;">
            <button id="btnConnect" class="btn-green" onclick="sendAction('connect')">Connect Bot</button>
            <button id="btnDisconnect" class="btn-red" onclick="sendAction('disconnect')">Disconnect Bot</button>
            <button id="btnAfk" class="btn-blue" onclick="sendAction('toggleAfk')">Toggle Anti-AFK</button>
          </div>
        </div>

        <div id="commands" class="tab-content card">
          <h3>Send Custom Command</h3>
          <p>Requires bot to be connected. E.g., <i>/help</i> or <i>Hello everyone!</i></p>
          <input type="text" id="cmdInput" placeholder="Enter command or message...">
          <button class="btn-blue" onclick="sendCommand()">Send</button>
        </div>

        <div class="card">
          <h3>Bot Logs</h3>
          <div class="log-box" id="logBox"></div>
        </div>
      </div>

      <script>
        // Tab logic
        function switchTab(tabId) {
          document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
          document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
          document.getElementById(tabId).classList.add('active');
          event.target.classList.add('active');
        }

        // Action API
        async function sendAction(action, payload = null) {
          await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
          });
          pollState(); // Force instant update
        }

        function sendCommand() {
          const input = document.getElementById('cmdInput');
          if (input.value) {
            sendAction('command', input.value);
            input.value = ''; // clear
          }
        }

        // Auto-refresh data
        async function pollState() {
          try {
            const res = await fetch('/api/state');
            const data = await res.json();
            
            document.getElementById('statusTxt').innerText = data.status;
            document.getElementById('uptimeTxt').innerText = data.uptimeFormatted;
            document.getElementById('playersTxt').innerText = data.playersOnline;
            document.getElementById('coordsTxt').innerText = \`X:\${data.coords.x} Y:\${data.coords.y} Z:\${data.coords.z}\`;
            document.getElementById('afkTxt').innerText = data.afkEnabled ? 'Enabled' : 'Disabled';
            
            // Buttons logic
            document.getElementById('btnConnect').disabled = (data.status === 'Connected' || data.status === 'Connecting...');
            document.getElementById('btnDisconnect').disabled = (data.status === 'Disconnected');

            // Log rendering
            const logBox = document.getElementById('logBox');
            logBox.innerHTML = data.logs.join('<br>');
            logBox.scrollTop = logBox.scrollHeight;
          } catch (e) {}
        }

        setInterval(pollState, 1000);
        pollState(); // initial load
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  addLog(`Dashboard listening on port ${PORT}`);
});
