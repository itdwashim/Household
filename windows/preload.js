const { contextBridge, ipcRenderer } = require('electron');

// Exposes Windows Hello (PIN / fingerprint / face) to the app's lock screen.
contextBridge.exposeInMainWorld('NativeAuth', {
  label: 'Windows PIN',
  // Resolves true when verified, otherwise a short message ('' if cancelled).
  verify: () => ipcRenderer.invoke('auth:verify'),
  // Called when Windows itself is locked, so the app locks too.
  onLock: (cb) => ipcRenderer.on('app:lock', () => cb())
});
