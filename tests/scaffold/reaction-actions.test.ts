import {expect,test} from 'vitest';
// @ts-expect-error Retained exposure sheets stay JavaScript.
import {ACTS} from '../../src/renderer/js/acting.js';
import {stepReaction,type Machine} from '../../src/core/desktop';
test('every emitted machine reaction names an existing character act',()=>{
  const previous:Machine={cpu:0,battery:false,online:true,devices:0,game:false};
  for(const machine of [{...previous,cpu:90},{...previous,battery:true},{...previous,online:false}]) {
    const result=stepReaction({tag:'Watching',previous,nextAt:0},{tag:'Observed',now:100,machine,eligible:true,enabled:true,quiet:false});
    expect(result.commands).toHaveLength(1);
    for(const command of result.commands)expect(ACTS[command.action]?.keys.length).toBeGreaterThan(0);
  }
});
