import {contextBridge,ipcRenderer} from 'electron';import type {AssistantHost,AssistantView} from '../shared/assistant';
const host:AssistantHost={view:()=>ipcRenderer.invoke('assistant:view'),act:value=>ipcRenderer.invoke('assistant:act',value),onView:listener=>{const receive=(_event:Electron.IpcRendererEvent,view:AssistantView)=>listener(view);ipcRenderer.on('assistant:view',receive);return()=>ipcRenderer.removeListener('assistant:view',receive);}};
contextBridge.exposeInMainWorld('assistant',host);
