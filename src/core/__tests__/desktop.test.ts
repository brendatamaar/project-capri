import {expect,test} from 'vitest';import fc from 'fast-check';
import {stepFollow,neighbor,stepReaction,type Machine} from '../desktop';
test('following requires two stable eligible observations',()=>{
  const input={tag:'Pointer' as const,current:1,display:2,enabled:true,eligible:true};
  const first=stepFollow({tag:'Here'},input);expect(first.commands).toEqual([]);
  expect(stepFollow(first.state,input).commands).toEqual([{tag:'FollowDisplay',display:2}]);
  expect(stepFollow(first.state,{...input,display:3}).commands).toEqual([]);
});
test('disabled or busy following emits no move',()=>fc.assert(fc.property(fc.integer(),id=>{
  for(const input of [{enabled:false,eligible:true},{enabled:true,eligible:false}])expect(stepFollow({tag:'Elsewhere',display:id,count:1},{tag:'Pointer',current:id+1,display:id,...input}).commands).toEqual([]);
})));
test('monitor adjacency respects negative coordinates and vertical layouts',()=>{
  const displays=[{id:1,x:0,y:0,w:1920,h:1080},{id:2,x:-1280,y:0,w:1280,h:1024},{id:3,x:0,y:-1080,w:1920,h:1080}];
  expect(neighbor(displays,1,-1,400)?.id).toBe(2);expect(neighbor(displays,1,-1,1050)).toBeUndefined();expect(neighbor(displays,1,1,400)).toBeUndefined();
});
const machine:Machine={cpu:1,battery:false,online:true,devices:0,game:false};
test('quiet and disabled machine reactions cannot emit actions',()=>fc.assert(fc.property(fc.double({min:0,max:100,noNaN:true}),cpu=>{
  for(const flags of [{enabled:false,quiet:false},{enabled:true,quiet:true}])expect(stepReaction({tag:'Watching',previous:machine,nextAt:0},{tag:'Observed',now:100,machine:{...machine,cpu},eligible:true,...flags}).commands).toEqual([]);
})));
test('PC reactions have a cooldown and do not replay the startup snapshot',()=>{
  const input={tag:'Observed' as const,now:100,machine:{...machine,battery:true},enabled:true,quiet:false,eligible:true};
  expect(stepReaction({tag:'Watching',previous:null,nextAt:0},input).commands).toEqual([]);
  const reacted=stepReaction({tag:'Watching',previous:machine,nextAt:0},input);expect(reacted.commands).toHaveLength(1);
  expect(stepReaction(reacted.state,{...input,now:200,machine:{...machine,online:false}}).commands).toEqual([]);
});
