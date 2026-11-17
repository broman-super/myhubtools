'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Satu-satunya API yang dibuka ke halaman: tombol "Coba lagi" di layar offline.
// Halaman situs sendiri tidak memakai ini.
contextBridge.exposeInMainWorld('reyna', {
  retry: () => ipcRenderer.invoke('reyna:retry')
});
