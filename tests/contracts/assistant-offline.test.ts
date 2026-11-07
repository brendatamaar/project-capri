import {expect,it} from 'vitest';import fc from 'fast-check';import {offline} from '../../src/main/assistant/offline';import {assistantAction,assistantUi} from '../../src/shared/assistant';
it('parses offline commands into proposals, never executions',()=>{
 expect(offline('/remember hello').action).toEqual({tag:'Remember',text:'hello'});
 expect(offline('/note Work | Finish tests').action).toEqual({tag:'Note',title:'Work',text:'Finish tests'});
 expect(offline('/point 0.5 0.2 Settings').action?.tag).toBe('Point');expect(offline('/remind -1 nope').action).toBeNull();
 expect(offline('/action {"tag":"Shell","command":"x"}').action).toBeNull();
 expect(assistantUi.safeParse({tag:'Decide',runId:1,approve:true,action:{tag:'Shell'}}).success).toBe(false);
});
it('arbitrary offline text either returns a validated proposal or harmless help',()=>{
 fc.assert(fc.property(fc.string({maxLength:2000}),text=>{const result=offline(text);if(result.action)expect(assistantAction.safeParse(result.action).success).toBe(true);else expect(typeof result.reply).toBe('string');}));
});
it('reminder cancellation is a proposal requiring the same decision flow',()=>{
 expect(offline('/cancelreminder fixture').action).toEqual({tag:'CancelReminder',id:'fixture'});
});
