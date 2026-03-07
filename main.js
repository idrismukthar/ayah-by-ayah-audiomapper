const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const Store = require('electron-store');

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0b0b0b',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0b0b0b',
      symbolColor: '#c5a059',
      height: 30
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('mapper.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('get-audio-files', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter(f => f.toLowerCase().endsWith('.mp3') || f.toLowerCase().endsWith('.wav'));
  } catch (err) {
    console.error(err);
    return [];
  }
});

ipcMain.handle('save-json', async (event, { filePath, content }) => {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

ipcMain.on('store-set', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});
