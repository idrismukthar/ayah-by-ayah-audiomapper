const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getAudioFiles: (dirPath) => ipcRenderer.invoke('get-audio-files', dirPath),
  saveJSON: (data) => ipcRenderer.invoke('save-json', data),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.send('store-set', key, value),
  pathJoin: (...args) => args.join('\\') // Simplified for Windows
});
