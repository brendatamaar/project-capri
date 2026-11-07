import {assistantAction} from '../../shared/assistant';import type {Action} from '../../core/assistant/model';
export function offline(text:string):{action:Action|null;reply:string}{
 const [name,...rest]=text.trim().split(' '),arg=rest.join(' ').trim();
 try{
  let value:unknown;
  switch(name.toLowerCase()){
   case '/remember':value={tag:'Remember',text:arg};break;
   case '/note':{const [title,...parts]=arg.split('|');value={tag:'Note',title:title.trim(),text:parts.join('|').trim()};break;}
   case '/remind':{const [minutes,...parts]=arg.split(' ');value={tag:'Reminder',minutes:Number(minutes),text:parts.join(' ')};break;}
   case '/cancelreminder':value={tag:'CancelReminder',id:arg};break;
   case '/find':value={tag:'SearchFiles',query:arg};break;
   case '/search':value={tag:'SearchTranscript',query:arg};break;
   case '/open':value={tag:'OpenFile',id:arg};break;
   case '/apps':value={tag:'ListApps'};break;
   case '/launch':value={tag:'LaunchApp',app:arg};break;
   case '/close':value={tag:'CloseApp',id:arg};break;
   case '/music':value={tag:'Music',operation:arg};break;
   case '/volume':value={tag:'Music',operation:'volume',value:Number(arg)};break;
   case '/point':{const [x,y,...label]=arg.split(' ');value={tag:'Point',x:Number(x),y:Number(y),label:label.join(' ')||'Look here'};break;}
   case '/action':value=JSON.parse(arg);break;
   default:return {action:null,reply:'Offline commands: /note title | text, /remember fact, /remind minutes text, /cancelreminder reminder-id, /find filename, /open result-id, /search transcript, /apps, /launch calculator|notepad, /close app-id, /music playPause|next|previous, /volume 0–100, /point x y label (normalized 0–1). /action accepts a validated JSON proposal. Every action waits for confirmation.'};
  }
  return {action:assistantAction.parse(value),reply:''};
 }catch{return {action:null,reply:'Invalid offline command. Use /help for syntax. Nothing was executed.'};}
}
