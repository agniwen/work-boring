import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';

import { ORPC_CLIENT_BOOTSTRAP_EVENT, ORPC_SERVER_CHANNEL } from '../orpc/channel';

// Custom APIs for renderer
const api = {};

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data !== ORPC_CLIENT_BOOTSTRAP_EVENT) {
    return;
  }

  const [serverPort] = event.ports;

  if (!serverPort) {
    return;
  }

  ipcRenderer.postMessage(ORPC_SERVER_CHANNEL, null, [serverPort]);
});

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
