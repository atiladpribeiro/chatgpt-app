const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quickAccessApi', {
  close: () => ipcRenderer.invoke('quickAccess:close'),
  showMini: () => ipcRenderer.invoke('quickAccess:showMini'),
  openSettings: () => ipcRenderer.invoke('quickAccess:openSettings'),
  openKdeShortcuts: () => ipcRenderer.invoke('quickAccess:openKdeShortcuts'),
});
