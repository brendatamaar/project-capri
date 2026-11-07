import {expect,it} from 'vitest';import fc from 'fast-check';import {stepReminders,type ReminderState} from '../reminders';
it('notifies due reminders once and ignores stale timer generations',()=>{
 fc.assert(fc.property(fc.integer({min:0,max:100000}),now=>{const s:ReminderState={tag:'Reminders',runId:'current',items:[{id:'a',text:'Reminder',due:now}]};expect(stepReminders(s,{tag:'Tick',runId:'old',now}).commands).toEqual([]);const due=stepReminders(s,{tag:'Tick',runId:'current',now});expect(due.commands).toHaveLength(1);expect(stepReminders(due.state,{tag:'Tick',runId:'current',now}).commands).toEqual([]);}));
});
