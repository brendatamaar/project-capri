import {expect,it} from 'vitest';import {mkdtemp,readFile,rm,symlink,writeFile} from 'node:fs/promises';import path from 'node:path';import {tmpdir} from 'node:os';
import {assistantData,sensitiveMemory} from '../../src/main/assistant/data';
it('persists bounded parameterized transcripts/reminders and writes only approved memory/notes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'capri-data-'));const data=await assistantData(dir),signal=new AbortController().signal;
 try{
  data.saveExchange('id','hello','world');data.saveExchange('id','hello','updated');expect(data.search('hello')).toEqual([{user:'hello',assistant:'updated'}]);expect(data.search("' OR 1=1 --")).toEqual([]);expect(data.search('%')).toEqual([]);
  data.addReminder({id:'r',text:'Take a break',due:123});expect(data.reminders()).toHaveLength(1);data.finishReminder('r');expect(data.reminders()).toEqual([]);
  await data.remember('Prefers short summaries.',signal);expect(await readFile(path.join(dir,'MEMORY.md'),'utf8')).toContain('Prefers short summaries.');
  await expect(data.remember('api key sk-private',signal)).rejects.toThrow();expect(sensitiveMemory('a@example.com')).toBe(true);
  const file=await data.note('test','Title','body',signal);expect(await readFile(file,'utf8')).toBe('# Title\n\nbody\n');
  const cancelled=new AbortController();cancelled.abort();await expect(data.remember('not added',cancelled.signal)).rejects.toThrow();
  data.clear();expect(data.search('hello')).toEqual([]);
 }finally{data.close();await rm(dir,{recursive:true,force:true});}
});
it('rejects linked or oversized memory instead of overwriting it',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'capri-data-'));const data=await assistantData(dir);
 try{const outside=path.join(dir,'outside');await writeFile(outside,'original');await symlink(outside,path.join(dir,'MEMORY.md'),'file');await expect(data.remember('new',new AbortController().signal)).rejects.toThrow();expect(await readFile(outside,'utf8')).toBe('original');}finally{data.close();await rm(dir,{recursive:true,force:true});}
});
