import {lstat,opendir,realpath} from 'node:fs/promises';import path from 'node:path';import {randomUUID} from 'node:crypto';
export function fileSearch(reveal:(file:string)=>void){
 let root:string|null=null;const found=new Map<string,string>();
 return {
  root:()=>root,
  async choose(directory:string){const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink())throw Error('Choose a real folder');root=await realpath(directory);found.clear();},
  describe(id:string){return found.get(id)??null;},
  async search(query:string,signal:AbortSignal){
   if(!root)throw Error('Choose a search folder first');const base=root;found.clear();const queue=[{directory:base,depth:0}],result:{id:string;name:string;path:string}[]=[];let seen=0;
   while(queue.length&&seen<5000&&result.length<20){
    signal.throwIfAborted();const {directory,depth}=queue.shift()!;let handle;
    try{const resolved=await realpath(directory);if(resolved!==directory||(resolved!==base&&!resolved.startsWith(base+path.sep)))continue;handle=await opendir(directory);}catch{continue;}
    for await(const entry of handle){
     signal.throwIfAborted();if(++seen>5000)break;
     if(entry.name.startsWith('.')||['node_modules','AppData'].includes(entry.name)||entry.isSymbolicLink())continue;
     const file=path.join(directory,entry.name);
     if(entry.isDirectory()&&depth<4)queue.push({directory:file,depth:depth+1});
     if(entry.isFile()&&entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())){const id=randomUUID();found.set(id,file);result.push({id,name:entry.name,path:file});if(result.length===20)break;}
    }
   }return result;
  },
  async open(id:string,signal:AbortSignal){const file=found.get(id);if(!file||!root)throw Error('Unknown search result');const info=await lstat(file),resolved=await realpath(file);if(!info.isFile()||info.isSymbolicLink()||resolved!==file||!resolved.startsWith(root+path.sep))throw Error('Search result changed');signal.throwIfAborted();reveal(file);},
 };
}
