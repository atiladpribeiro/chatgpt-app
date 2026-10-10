const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsApi', {
  get: () => ipcRenderer.invoke('settings:get'),
  save: (settings) => ipcRenderer.invoke('settings:save', settings),
  openKdeShortcuts: () => ipcRenderer.invoke('settings:openKdeShortcuts'),
  installKdeShortcut: () => ipcRenderer.invoke('settings:installKdeShortcut'),
  applyAutostart: () => ipcRenderer.invoke('settings:applyAutostart'),
  importBrowserSession: () => ipcRenderer.invoke('settings:importBrowserSession'),
  getSessionStatus: () => ipcRenderer.invoke('settings:getSessionStatus'),
  getDiagnostics: () => ipcRenderer.invoke('settings:getDiagnostics'),
  clearCache: () => ipcRenderer.invoke('settings:clearCache'),
  clearSession: () => ipcRenderer.invoke('settings:clearSession'),
  beginExternalLogin: () => ipcRenderer.invoke('settings:beginExternalLogin'),
  setZoom: (zoomFactor) => ipcRenderer.invoke('settings:setZoom', zoomFactor),
  adjustZoom: (delta) => ipcRenderer.invoke('settings:adjustZoom', delta),
  resetZoom: () => ipcRenderer.invoke('settings:resetZoom'),
});
