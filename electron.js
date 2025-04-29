const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Default save path
const defaultSavePath = path.join(os.homedir(), 'Videos', 'LiteCapture');

// Create the application window
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'LiteCapture',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable hardware acceleration when available, but allow disabling
      // for compatibility with very old hardware
      enableHardwareAcceleration: !process.argv.includes('--disable-gpu')
    }
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Create save directory if it doesn't exist
  if (!fs.existsSync(defaultSavePath)) {
    try {
      fs.mkdirSync(defaultSavePath, { recursive: true });
    } catch (err) {
      console.error('Failed to create default save directory:', err);
    }
  }

  // Set up application menu
  createAppMenu();

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create application menu
function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Change Save Location',
          click: () => selectSaveDirectory()
        },
        { type: 'separator' },
        {
          label: 'Open Recordings Folder',
          click: () => shell.openPath(defaultSavePath)
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Performance',
      submenu: [
        {
          label: 'Ultra Light Mode',
          click: () => mainWindow.webContents.send('apply-preset', 'ultraLight')
        },
        {
          label: 'Light Mode',
          click: () => mainWindow.webContents.send('apply-preset', 'light')
        },
        {
          label: 'Balanced Mode',
          click: () => mainWindow.webContents.send('apply-preset', 'balanced')
        },
        {
          label: 'Quality Mode',
          click: () => mainWindow.webContents.send('apply-preset', 'quality')
        },
        { type: 'separator' },
        {
          label: 'Disable Hardware Acceleration',
          type: 'checkbox',
          checked: process.argv.includes('--disable-gpu'),
          click: (menuItem) => {
            dialog.showMessageBox({
              type: 'info',
              title: 'Restart Required',
              message: 'Please restart the application for this change to take effect.',
              buttons: ['OK']
            });
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About LiteCapture',
          click: () => showAboutDialog()
        },
        {
          label: 'Optimization Tips',
          click: () => showOptimizationTips()
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Show about dialog
function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    title: 'About LiteCapture',
    message: 'LiteCapture',
    detail: 'A lightweight screen recording application optimized for low-end PCs.\n\nVersion: 1.0.0',
    buttons: ['OK'],
    icon: path.join(__dirname, 'icon.png')
  });
}

// Show optimization tips
function showOptimizationTips() {
  dialog.showMessageBox(mainWindow, {
    title: 'Optimization Tips',
    message: 'Tips for Better Performance on Low-End PCs',
    detail: 
      '1. Use the "Ultra Light" or "Light" preset for very old computers\n' +
      '2. Lower resolution and frame rate for smoother recording\n' +
      '3. Disable preview during recording to save resources\n' +
      '4. Close other applications while recording\n' +
      '5. Use WebM format with VP8 codec for best compatibility\n' +
      '6. Record shorter clips and combine them later if needed\n' +
      '7. If you experience crashes, try disabling hardware acceleration',
    buttons: ['OK']
  });
}

// Select save directory
async function selectSaveDirectory() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Save Location'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    mainWindow.webContents.send('save-path-selected', selectedPath);
  }
}

// Save recording to file
async function saveRecording(event, buffer, filename) {
  try {
    const filePath = path.join(defaultSavePath, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (err) {
    console.error('Failed to save recording:', err);
    return { success: false, error: err.message };
  }
}

// Initialize the app
app.whenReady().then(() => {
  createWindow();

  // On macOS, recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Set up IPC handlers
  ipcMain.handle('select-save-directory', selectSaveDirectory);
  ipcMain.handle('save-recording', saveRecording);
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Show error dialog if window is available
  if (mainWindow) {
    dialog.showErrorBox(
      'Error',
      `An unexpected error occurred:\n${error.message}\n\nThe application will now restart.`
    );
  }
  
  // Restart the app
  app.relaunch();
  app.exit(1);
});
