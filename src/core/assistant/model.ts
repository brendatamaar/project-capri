export type JobStep={tag:'Move'|'Click';x:number;y:number}|{tag:'Key';key:'Left'|'Right'|'Up'|'Down'|'Tab'|'Escape'|'Home'|'End'};
export type Action =
 | {tag:'Note';title:string;text:string}
 | {tag:'Remember';text:string}
 | {tag:'Reminder';text:string;minutes:number}
 | {tag:'CancelReminder';id:string}
 | {tag:'SearchFiles';query:string}
 | {tag:'OpenFile';id:string}
 | {tag:'SearchTranscript';query:string}
 | {tag:'LaunchApp';app:'calculator'|'notepad'}
 | {tag:'CloseApp';id:string}
 | {tag:'ListApps'}
 | {tag:'ListInputTargets'}
 | {tag:'InputJob';id:string;steps:readonly JobStep[]}
 | {tag:'Music';operation:'playPause'|'next'|'previous'|'volume';value?:number}
 | {tag:'Point';x:number;y:number;label:string}
 | {tag:'StartThread';projectId:string;provider:string;model:string;title:string;prompt:string}
 | {tag:'SteerThread';threadId:string;runId:string;provider:string;projectId:string;text:string};
export type Message = {role:'user'|'assistant';text:string};
export type Phase = 'Idle'|'Generating'|'RetryWait'|'AwaitingDecision'|'Executing';
export type State={tag:'Assistant';phase:Phase;runId:number;attempt:number;revision:number;visible:boolean;blocked:boolean;thinking:boolean;messages:readonly Message[];draft:string;pending:Action|null;result:string};
export type Input=
 |{tag:'Submit';runId:number;text:string}
 |{tag:'Offline';runId:number;text:string;action:Action|null;reply:string}
 |{tag:'Chunk';runId:number;attempt:number;text:string}
 |{tag:'Completed';runId:number;attempt:number;action:Action|null}
 |{tag:'Failed';runId:number;attempt:number;transient:boolean}
 |{tag:'RetryDue';runId:number;attempt:number}
 |{tag:'StallDue';runId:number;attempt:number;revision:number}
 |{tag:'Deadline';runId:number;attempt:number}
 |{tag:'DecisionExpired';runId:number}
 |{tag:'ActionDeadline';runId:number}
 |{tag:'Decide';runId:number;approve:boolean}
 |{tag:'ActionFinished';runId:number;text:string}
 |{tag:'Ui';visible:boolean;blocked:boolean}
 |{tag:'Stop'}|{tag:'Clear'};
export type Command=
 |{tag:'Generate';runId:number;attempt:number;messages:readonly Message[]}
 |{tag:'Abort'}
 |{tag:'Schedule';key:'retry'|'stall'|'deadline'|'decision'|'action';delay:number;input:Input}
 |{tag:'Execute';runId:number;action:Action}
 |{tag:'AuditDecision';runId:number;approve:boolean}
 |{tag:'SaveExchange';runId:number;user:string;assistant:string};
export function initial():State{return {tag:'Assistant',phase:'Idle',runId:0,attempt:0,revision:0,visible:false,blocked:false,thinking:false,messages:[],draft:'',pending:null,result:''};}
