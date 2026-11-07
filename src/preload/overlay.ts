import { contextBridge, ipcRenderer } from 'electron';
import type { OverlayHost, OverlayEvent } from '../shared/overlay';
const host: OverlayHost = {
  fun:value=>ipcRenderer.send('companion:fun',value),
  settings: () => ipcRenderer.invoke('companion:settings'),
  update: patch => ipcRenderer.invoke('companion:update', patch),
  interactive: on => ipcRenderer.send('companion:interactive', on),
  menu: () => ipcRenderer.send('companion:menu'),
  cursor: () => ipcRenderer.invoke('companion:cursor'),
  sounds: () => ipcRenderer.invoke('companion:sounds'),
  desktop: () => ipcRenderer.invoke('companion:desktop'),
  screens:()=>ipcRenderer.invoke('companion:screens'),moveScreen:id=>ipcRenderer.invoke('companion:move-screen',id),
  onEvent: listener => {
    const receive = (_event: Electron.IpcRendererEvent, payload: OverlayEvent) => listener(payload);
    ipcRenderer.on('companion:event', receive);
    return () => ipcRenderer.removeListener('companion:event', receive);
  },
};
contextBridge.exposeInMainWorld('companion', host);
