'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Jembatan minimal. Halaman situs hanya memakai `retry`; palette memakai
// `tools`/`open`/`close`. Tidak ada ipcRenderer mentah yang dibuka.
contextBridge.exposeInMainWorld('reyna', {
  retry: () => ipcRenderer.invoke('reyna:retry'),
  tools: () => ipcRenderer.invoke('reyna:tools'),
  open: (hash) => ipcRenderer.invoke('reyna:open', hash),
  close: () => ipcRenderer.send('reyna:close')
});
