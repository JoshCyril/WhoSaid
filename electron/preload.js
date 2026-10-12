const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  showInFolder: (filePath) => ipcRenderer.invoke('fs:showInFolder', filePath),
  getRecentFolders: () => ipcRenderer.invoke('fs:getRecentFolders'),
  saveRecentFolder: (folderPath) => ipcRenderer.invoke('fs:saveRecentFolder', folderPath),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion')
});
