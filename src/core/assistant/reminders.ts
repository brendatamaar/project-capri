export type Reminder={id:string;text:string;due:number};
export type ReminderState={tag:'Reminders';runId:string;items:readonly Reminder[]};
export type ReminderInput={tag:'Loaded';runId:string;items:readonly Reminder[]}|{tag:'Tick';runId:string;now:number};
export type ReminderCommand={tag:'Notify';runId:string;reminder:Reminder};
export function stepReminders(state:ReminderState,input:ReminderInput):{state:ReminderState;commands:readonly ReminderCommand[]}{
 switch(input.tag){
  case 'Loaded':return {state:{tag:'Reminders',runId:input.runId,items:input.items},commands:[]};
  case 'Tick':if(input.runId!==state.runId)return {state,commands:[]};return {state:{...state,items:state.items.filter(r=>r.due>input.now)},commands:state.items.filter(r=>r.due<=input.now).map(reminder=>({tag:'Notify',runId:state.runId,reminder}))};
  default:{const exhaustive:never=input;return exhaustive;}
 }
}
