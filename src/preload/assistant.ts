import {contextBridge,ipcRenderer} from 'electron';import type {AssistantHost,AssistantView} from '../shared/assistant';
const host:AssistantHost={view:()=>ipcRenderer.invoke('assistant:view'),act:value=>ipcRenderer.invoke('assistant:act',value),onView:listener=>{const receive=(_event:Electron.IpcRendererEvent,view:AssistantView)=>listener(view);ipcRenderer.on('assistant:view',receive);return()=>ipcRenderer.removeListener('assistant:view',receive);}};
contextBridge.exposeInMainWorld('assistant',host);

import type {MediaHost,MediaView,MediaEvent} from '../shared/media';
const media:MediaHost={view:()=>ipcRenderer.invoke('media:view'),act:value=>ipcRenderer.invoke('media:act',value),onView:fn=>{const listener=(_e:Electron.IpcRendererEvent,v:MediaView)=>fn(v);ipcRenderer.on('media:view',listener);return()=>ipcRenderer.removeListener('media:view',listener);},onEvent:fn=>{const listener=(_e:Electron.IpcRendererEvent,v:MediaEvent)=>fn(v);ipcRenderer.on('media:event',listener);return()=>ipcRenderer.removeListener('media:event',listener);}};
contextBridge.exposeInMainWorld('media',media);
