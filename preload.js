const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const { desktopCapturer } = require('electron');

contextBridge.exposeInMainWorld(
  'electron',
  {
    // Expose desktop source picker for screen/window capture
    getDesktopSources: async (types = ['screen', 'window']) => {
      return await desktopCapturer.getSources({ types });
    },
    // File system operations
    selectSaveDirectory: () => ipcRenderer.invoke('select-save-directory'),
    saveRecording: (buffer, filename) => ipcRenderer.invoke('save-recording', buffer, filename),
    
    // Event handlers
    onSavePathSelected: (callback) => ipcRenderer.on('save-path-selected', (_, path) => callback(path)),
    onApplyPreset: (callback) => ipcRenderer.on('apply-preset', (_, preset) => callback(preset)),
    
    // System info
    getSystemInfo: () => ({
      platform: process.platform,
      arch: process.arch,
      cpuCount: navigator.hardwareConcurrency || 1,
      memoryGB: Math.round(((navigator.deviceMemory || 4) + Number.EPSILON) * 100) / 100,
      isLowEndDevice: (navigator.deviceMemory || 4) <= 4 || (navigator.hardwareConcurrency || 4) <= 4
    })
  }
);
