import {contextBridge,ipcRenderer} from 'electron';
import type {AgentHost,BoardView} from '../shared/agent';
const host:AgentHost={view:()=>ipcRenderer.invoke('agent:view'),act:action=>ipcRenderer.invoke('agent:act',action),onView:listener=>{const receive=(_event:Electron.IpcRendererEvent,view:BoardView)=>listener(view);ipcRenderer.on('agent:view',receive);return()=>ipcRenderer.removeListener('agent:view',receive);}};
contextBridge.exposeInMainWorld('agents',host);
