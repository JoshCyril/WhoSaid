const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  showInFolder: (filePath) => ipcRenderer.invoke('fs:showInFolder', filePath),
  getRecentFolders: () => ipcRenderer.invoke('fs:getRecentFolders'),
  saveRecentFolder: (folderPath) => ipcRenderer.invoke('fs:saveRecentFolder', folderPath),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  // Database file selection & configuration
  selectDbFileDialog: () => ipcRenderer.invoke('dialog:selectDbFile'),
  createDbFileDialog: () => ipcRenderer.invoke('dialog:createDbFile'),
  getConfiguredDbPath: () => ipcRenderer.invoke('config:getDbPath'),
  setConfiguredDbPath: (newDbPath, alwaysAsk) => ipcRenderer.invoke('config:setDbPath', newDbPath, alwaysAsk),
  getDefaultSampleDbPath: () => ipcRenderer.invoke('config:getDefaultSampleDbPath'),
  launchAppWithDb: (dbPath, alwaysAsk) => ipcRenderer.invoke('app:launchWithDb', dbPath, alwaysAsk),
  // Models folder & external browser links
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  openModelsFolder: () => ipcRenderer.invoke('fs:openModelsFolder'),
  getModelsDir: () => ipcRenderer.invoke('config:getModelsDir'),
  // Window controls for custom titlebar
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowStateChange: (callback) => ipcRenderer.on('window:state-changed', (_event, state) => callback(state))
});
