import {DatabaseSync} from 'node:sqlite';
import {lstat,mkdir,readFile,rename,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';import {randomUUID} from 'node:crypto';import {z} from 'zod';
import {parseContext} from './context';import type {Reminder} from '../../core/assistant/reminders';
export async function privateDirectory(directory:string){await mkdir(directory,{recursive:true,mode:0o700});const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink())throw Error('Invalid assistant directory');}
async function atomic(file:string,text:string,signal:AbortSignal){const temp=file+'.'+randomUUID()+'.tmp';try{await writeFile(temp,text,{flag:'wx',mode:0o600,signal});signal.throwIfAborted();await rename(temp,file);}finally{await rm(temp,{force:true});}}
export function sensitiveMemory(text:string){return /(?:password|passwd|api[_ -]?key|access[_ -]?token|secret|private[_ -]?key|credit[_ -]?card|\bsk-[a-z0-9]|-----BEGIN|\b\d[\d -]{11,18}\d\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:bearer)\s+\S+)/i.test(text);}
export async function assistantData(directory:string){
 await privateDirectory(directory);const database=path.join(directory,'assistant.sqlite');
 try{const info=await lstat(database);if(info.isSymbolicLink()||!info.isFile())throw Error('Invalid assistant database');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const db=new DatabaseSync(database,{allowExtension:false});db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS transcript(id TEXT PRIMARY KEY, user TEXT NOT NULL, assistant TEXT NOT NULL); CREATE TABLE IF NOT EXISTS reminders(id TEXT PRIMARY KEY,text TEXT NOT NULL,due INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS action_audit(id TEXT PRIMARY KEY, approved INTEGER NOT NULL);');
 return {
  saveExchange(id:string,user:string,assistant:string){db.prepare('INSERT INTO transcript VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET assistant=excluded.assistant').run(id,user.slice(0,16000),assistant.slice(0,16000));db.exec('DELETE FROM transcript WHERE rowid NOT IN (SELECT rowid FROM transcript ORDER BY rowid DESC LIMIT 5000)');},
  search(query:string){const escaped=query.replace(/[!%_]/g,'!$&');return db.prepare("SELECT user,assistant FROM transcript WHERE user LIKE ? ESCAPE '!' OR assistant LIKE ? ESCAPE '!' ORDER BY rowid DESC LIMIT 10").all('%'+escaped+'%','%'+escaped+'%').map(r=>({user:String(r.user).slice(0,1500),assistant:String(r.assistant).slice(0,1500)}));},
  audit(id:string,approve:boolean){db.prepare('INSERT OR IGNORE INTO action_audit VALUES(?,?)').run(id,approve?1:0);},
  clear(){db.exec('DELETE FROM transcript; PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');},
  reminders():Reminder[]{return z.array(z.object({id:z.string(),text:z.string().max(200),due:z.number().int().safe()})).max(100).parse(db.prepare('SELECT id,text,due FROM reminders').all());},
  addReminder(reminder:Reminder){if(Number(db.prepare('SELECT COUNT(*) AS n FROM reminders').get()?.n)>=100)throw Error('Reminder limit reached');db.prepare('INSERT INTO reminders VALUES(?,?,?)').run(reminder.id,reminder.text,reminder.due);},
  finishReminder(id:string){db.prepare('DELETE FROM reminders WHERE id=?').run(id);},
  async note(id:string,title:string,text:string,signal:AbortSignal){if(!/^[a-zA-Z0-9-]{1,64}$/.test(id))throw Error('Invalid note ID');signal.throwIfAborted();const notes=path.join(directory,'notes');await privateDirectory(notes);signal.throwIfAborted();const file=path.join(notes,id+'.md');await writeFile(file,`# ${title}\n\n${text}\n`,{flag:'wx',mode:0o600,signal});return file;},
  async remember(text:string,signal:AbortSignal){
   if(sensitiveMemory(text))throw Error('Sensitive details cannot be stored as memory');
   const file=path.join(directory,'MEMORY.md');let previous='# Memory\n';
   try{const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>65536)throw Error('Invalid memory file');previous=parseContext(await readFile(file));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
   const next=previous+'\n\n'+text+'\n';parseContext(Buffer.from(next));signal.throwIfAborted();await atomic(file,next,signal);
  },
  close(){db.close();},
 };
}
