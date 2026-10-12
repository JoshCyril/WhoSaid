const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, exec } = require('child_process');

let mainWindow = null;
let pythonProcess = null;
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const PROJECT_ROOT = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');

// Path for storing recent folders configuration
function getRecentFoldersFilePath() {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'recent-folders.json');
}

function loadRecentFolders() {
  try {
    const filePath = getRecentFoldersFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data)) return data.filter(p => fs.existsSync(p));
    }
  } catch (err) {
    console.warn('[RecentFolders] Error reading:', err);
  }
  return [];
}

function saveRecentFolder(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return;
  try {
    const list = loadRecentFolders().filter(p => p !== folderPath);
    list.unshift(folderPath);
    const trimmed = list.slice(0, 10);
    fs.writeFileSync(getRecentFoldersFilePath(), JSON.stringify(trimmed, null, 2), 'utf-8');
    return trimmed;
  } catch (err) {
    console.warn('[RecentFolders] Error saving:', err);
    return [];
  }
}

// Path for storing custom SQLite Database file location configuration
function getDbConfigFilePath() {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'db-config.json');
}

function loadDbConfig() {
  try {
    const filePath = getDbConfigFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data && typeof data === 'object') {
        return {
          dbPath: data.dbPath || null,
          alwaysAsk: Boolean(data.alwaysAsk)
        };
      }
    }
  } catch (err) {
    console.warn('[DbConfig] Error reading:', err);
  }
  return { dbPath: null, alwaysAsk: false };
}

function saveDbConfig(dbPath, alwaysAsk = false) {
  try {
    const filePath = getDbConfigFilePath();
    const cleanPath = (dbPath && typeof dbPath === 'string' && dbPath.trim()) ? dbPath.trim() : null;
    const data = {
      dbPath: cleanPath,
      alwaysAsk: Boolean(alwaysAsk)
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[DbConfig] Saved database path configuration:', data);
    return data;
  } catch (err) {
    console.warn('[DbConfig] Error saving:', err);
    return { dbPath: null, alwaysAsk: false };
  }
}

// Locate or provide path to bundled sample / starter SQLite DB
function getDefaultSampleDbPath() {
  const candidates = [
    path.join(PROJECT_ROOT, 'sample_whosaid.db'),
    path.join(PROJECT_ROOT, 'storage', 'whosaid.db'),
    path.join(PROJECT_ROOT, 'sample_data', 'sample_whosaid.db'),
    path.join(app.getPath('userData'), 'sample_whosaid.db'),
    path.join(app.getPath('userData'), 'storage', 'whosaid.db')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(app.getPath('userData'), 'storage', 'whosaid.db');
}

// Dynamically notify running backend to switch DB connection via API
function switchBackendDb(dbPath) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ db_path: dbPath });
    const req = http.request({
      hostname: '127.0.0.1',
      port: BACKEND_PORT,
      path: '/api/backend/db-config',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000
    }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(postData);
    req.end();
  });
}

// Check if Python backend is alive
function checkBackendHealthy() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/history`, { timeout: 1500 }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Launch backend server (bundled binary or python script) and connect DB
async function ensureBackendRunning(customDbPath) {
  const isHealthy = await checkBackendHealthy();
  if (isHealthy) {
    console.log('[Backend] Local server already active on port 8000.');
    if (customDbPath) {
      await switchBackendDb(customDbPath);
    }
    return true;
  }

  const storageDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'storage')
    : path.join(PROJECT_ROOT, 'storage');

  fs.mkdirSync(storageDir, { recursive: true });
  fs.mkdirSync(path.join(storageDir, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(storageDir, 'audio'), { recursive: true });

  const dbConfig = loadDbConfig();
  const configuredDbPath = customDbPath || dbConfig.dbPath || null;

  // Use configured DB path if specified, otherwise default to storage/whosaid.db
  const targetDbPath = configuredDbPath || path.join(storageDir, 'whosaid.db');
  const targetDbDir = path.dirname(targetDbPath);
  if (!fs.existsSync(targetDbDir)) {
    fs.mkdirSync(targetDbDir, { recursive: true });
  }

  const bundledDbCandidates = [
    path.join(PROJECT_ROOT, 'sample_whosaid.db'),
    path.join(PROJECT_ROOT, 'storage', 'whosaid.db'),
    path.join(PROJECT_ROOT, 'whosaid-backend', 'storage', 'whosaid.db'),
    path.join(PROJECT_ROOT, 'dist_backend', 'whosaid-backend', 'storage', 'whosaid.db'),
    path.join(__dirname, '..', 'storage', 'whosaid.db')
  ];

  if (!fs.existsSync(targetDbPath)) {
    for (const bDb of bundledDbCandidates) {
      if (fs.existsSync(bDb)) {
        try {
          fs.copyFileSync(bDb, targetDbPath);
          console.log(`[Storage] Initialized persistent SQLite DB from ${bDb} to ${targetDbPath}`);
          break;
        } catch (e) {
          console.warn('[Storage] Copy DB warning:', e);
        }
      }
    }
  }

  // Check candidate paths for standalone backend executable
  const backendCandidates = [
    path.join(PROJECT_ROOT, 'whosaid-backend', 'whosaid-backend.exe'),
    path.join(PROJECT_ROOT, 'whosaid-backend.exe'),
    path.join(PROJECT_ROOT, 'dist_backend', 'whosaid-backend', 'whosaid-backend.exe'),
    path.join(__dirname, '..', 'dist_backend', 'whosaid-backend', 'whosaid-backend.exe'),
    path.join(path.dirname(app.getPath('exe')), 'resources', 'whosaid-backend', 'whosaid-backend.exe'),
    path.join(path.dirname(app.getPath('exe')), 'whosaid-backend', 'whosaid-backend.exe'),
    path.join(process.resourcesPath || '', 'whosaid-backend', 'whosaid-backend.exe')
  ];

  const backendExe = backendCandidates.find((cand) => fs.existsSync(cand));

  const modelsDir = path.join(PROJECT_ROOT, 'models');
  const staticDir = path.join(PROJECT_ROOT, 'static');

  const env = Object.assign({}, process.env, {
    WHOSAID_STORAGE_DIR: storageDir,
    WHOSAID_DB_PATH: configuredDbPath || undefined,
    WHOSAID_MODELS_DIR: fs.existsSync(modelsDir) ? modelsDir : undefined,
    WHOSAID_STATIC_DIR: fs.existsSync(staticDir) ? staticDir : undefined,
    PYTHONUNBUFFERED: '1'
  });

  const logFilePath = path.join(app.getPath('userData'), 'backend.log');
  let logStream = null;
  try {
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    logStream.write(`\n--- Launching backend at ${new Date().toISOString()} ---\n`);
    logStream.write(`Configured DB: ${configuredDbPath || '(default)'}\n`);
  } catch (err) {
    console.warn('[Backend] Could not open log file:', err);
  }

  if (backendExe) {
    console.log(`[Backend] Launching bundled backend executable: ${backendExe}`);
    pythonProcess = spawn(backendExe, [], {
      cwd: path.dirname(backendExe),
      env: env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } else {
    console.log(`[Backend] Starting Python backend from ${PROJECT_ROOT}/run.py...`);
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    pythonProcess = spawn(pythonCmd, ['run.py'], {
      cwd: PROJECT_ROOT,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });
  }

  pythonProcess.stdout.on('data', (chunk) => {
    const msg = chunk.toString();
    console.log(`[Backend stdout] ${msg.trim()}`);
    if (logStream) logStream.write(`[stdout] ${msg}`);
  });

  pythonProcess.stderr.on('data', (chunk) => {
    const msg = chunk.toString();
    console.log(`[Backend stderr] ${msg.trim()}`);
    if (logStream) logStream.write(`[stderr] ${msg}`);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[Backend] Process terminated (code ${code}, signal ${signal})`);
    if (logStream) logStream.write(`[exit] code ${code}, signal ${signal}\n`);
    pythonProcess = null;
  });

  // Poll for readiness
  const start = Date.now();
  const maxWaitMs = 60000;
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 600));
    const healthy = await checkBackendHealthy();
    if (healthy) {
      console.log('[Backend] Local backend server ready and healthy on port 8000!');
      if (configuredDbPath) {
        await switchBackendDb(configuredDbPath);
      }
      return true;
    }
  }

  console.warn('[Backend] Timed out waiting for backend server to respond.');
  return false;
}

// Kill spawned python process cleanly on shutdown
function killPythonProcess() {
  if (pythonProcess && pythonProcess.pid) {
    const pid = pythonProcess.pid;
    console.log(`[Backend] Terminating Python process (PID: ${pid})...`);
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) console.warn('[Backend] taskkill error:', err);
      });
    } else {
      try {
        process.kill(-pid);
      } catch (e) {
        pythonProcess.kill();
      }
    }
    pythonProcess = null;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: '#2e2e2e',
    title: 'Who Said — Local Video Transcriber & Speaker Captions',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Desktop App Menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:open-folder');
            }
          }
        },
        {
          label: 'Open Sample Data',
          click: async () => {
            if (mainWindow) {
              const samplePath = path.join(PROJECT_ROOT, 'sample_data');
              mainWindow.webContents.send('menu:select-folder-path', samplePath);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Folder Explorer',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:toggle-explorer');
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Who Said',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Who Said Desktop',
              message: 'Who Said — Local Video Transcriber & Speaker Captions',
              detail: 'Version 1.0.0 (Desktop MVP)\n100% Offline Speech Diarization & Transcription on CPU.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Recovery hook: if loading localhost URL ever fails, fallback to local setup.html
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Window] did-fail-load on ${validatedURL}: ${errorDescription} (${errorCode})`);
    if (mainWindow && validatedURL && (validatedURL.includes('127.0.0.1') || validatedURL.includes('localhost'))) {
      mainWindow.loadFile(path.join(__dirname, 'setup.html'), { query: { error: 'backend_timeout' } });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('dialog:openFolder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder with Video or Audio Files'
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  const chosenPath = result.filePaths[0];
  saveRecentFolder(chosenPath);
  return chosenPath;
});

ipcMain.handle('fs:showInFolder', async (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('fs:getRecentFolders', async () => {
  return loadRecentFolders();
});

ipcMain.handle('fs:saveRecentFolder', async (_event, folderPath) => {
  return saveRecentFolder(folderPath);
});

ipcMain.handle('app:getVersion', () => '1.0.0');

// Database File Picker & Configuration IPCs
ipcMain.handle('dialog:selectDbFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select SQLite Database File',
    properties: ['openFile'],
    filters: [
      { name: 'SQLite Database (*.db, *.sqlite)', extensions: ['db', 'sqlite', 'sqlite3'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('dialog:createDbFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Create or Choose New SQLite Database Location',
    defaultPath: 'whosaid.db',
    filters: [
      { name: 'SQLite Database (*.db)', extensions: ['db', 'sqlite', 'sqlite3'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
});

ipcMain.handle('config:getDefaultSampleDbPath', () => {
  return getDefaultSampleDbPath();
});

ipcMain.handle('config:getDbPath', () => {
  return loadDbConfig();
});

ipcMain.handle('config:setDbPath', async (_event, newDbPath, alwaysAsk) => {
  return saveDbConfig(newDbPath, alwaysAsk);
});

// Launch app with user-chosen database
ipcMain.handle('app:launchWithDb', async (_event, dbPath, alwaysAsk) => {
  try {
    saveDbConfig(dbPath, alwaysAsk);

    // Ensure target folder exists
    const targetDir = path.dirname(dbPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // If new DB doesn't exist, seed it with sample tables
    if (!fs.existsSync(dbPath)) {
      const sample = getDefaultSampleDbPath();
      if (fs.existsSync(sample)) {
        try {
          fs.copyFileSync(sample, dbPath);
          console.log(`[Launch] Initialized DB from sample: ${sample} -> ${dbPath}`);
        } catch (copyErr) {
          console.warn('[Launch] Copy sample DB warning:', copyErr);
        }
      }
    }

    const ready = await ensureBackendRunning(dbPath);
    if (!ready) {
      let logSnippet = '';
      try {
        const logFilePath = path.join(app.getPath('userData'), 'backend.log');
        if (fs.existsSync(logFilePath)) {
          const content = fs.readFileSync(logFilePath, 'utf-8');
          logSnippet = content.split('\n').slice(-25).join('\n');
        }
      } catch (_) {}
      return {
        success: false,
        error: 'Backend server failed to respond on port 8000. Please check the log below.',
        log: logSnippet
      };
    }

    if (mainWindow) {
      mainWindow.loadURL(BACKEND_URL);
    }
    return { success: true };
  } catch (err) {
    console.error('[Launch] Error:', err);
    return { success: false, error: err.message };
  }
});

// App Lifecycle
app.whenReady().then(async () => {
  createMainWindow();

  const dbConfig = loadDbConfig();
  // Prompt user on startup if no DB is configured, or if alwaysAsk is enabled, or if target DB doesn't exist
  if (!dbConfig.dbPath || dbConfig.alwaysAsk || !fs.existsSync(dbConfig.dbPath)) {
    console.log('[App] Showing database selection screen on startup...');
    mainWindow.loadFile(path.join(__dirname, 'setup.html'));
  } else {
    // Show smooth connecting screen and spin up backend
    mainWindow.loadFile(path.join(__dirname, 'setup.html'), { query: { mode: 'connecting' } });
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('window-all-closed', () => {
  killPythonProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killPythonProcess();
});
