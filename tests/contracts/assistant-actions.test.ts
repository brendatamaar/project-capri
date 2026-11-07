import {expect,it} from 'vitest';import {mkdtemp,mkdir,rm,symlink,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {fileSearch} from '../../src/main/assistant/files';import {nativeRequest} from '../../src/main/assistant/native';
it('searches selected names only, rejects links/unknown results and only reveals known files',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'capri-files-'));let revealed='';const files=fileSearch(file=>{revealed=file;});const signal=new AbortController().signal;
 try{
  await writeFile(path.join(root,'report.txt'),'never read');await mkdir(path.join(root,'.hidden'));await writeFile(path.join(root,'.hidden','report-secret.txt'),'private');await symlink(path.join(root,'report.txt'),path.join(root,'report-link.txt'),'file');
  await files.choose(root);const result=await files.search('report',signal);expect(result).toHaveLength(1);await files.open(result[0].id,signal);expect(revealed).toBe(path.join(root,'report.txt'));await expect(files.open('unknown',signal)).rejects.toThrow();
  await files.search('other',signal);await expect(files.open(result[0].id,signal)).rejects.toThrow();
 }finally{await rm(root,{recursive:true,force:true});}
});
it('native parser never accepts executable paths, shell text or force-close',()=>{
 for(const value of [{op:'shell',command:'x'},{op:'launch',app:'anything.exe'},{op:'close',pid:123,stamp:'1',force:true},{op:'music',operation:'typeKeys'},{op:'music',operation:'volume',value:101}])expect(nativeRequest.safeParse(value).success).toBe(false);
});
it('rechecks T3 and file policy at execution and never auto-runs proposed actions',async()=>{
 const {actionExecutor}=await import('../../src/main/assistant/actions');let sent=0;
 const targets={live:true,server:'http://127.0.0.1:3774',projects:[{id:'p',title:'Project'}],threads:[]};
 const executor=actionExecutor({data:{} as never,files:fileSearch(()=>{}),targets:()=>targets,auth:()=>({baseUrl:'http://127.0.0.1:3774',environmentId:'test',token:'fixture'}),point:()=>{},remindersChanged:()=>{},t3:async()=>{sent++;return 'test';}});
 const action={tag:'StartThread' as const,projectId:'p',provider:'codex',model:'fixture',title:'Test',prompt:'Only a fixture'};
 expect(executor.policy(action)).toBeNull();expect(sent).toBe(0);targets.live=false;
 expect(await executor.execute(action,1,new AbortController().signal)).toContain('blocked');expect(sent).toBe(0);
 expect(executor.policy({tag:'Remember',text:'password: private'})).not.toBeNull();
});
