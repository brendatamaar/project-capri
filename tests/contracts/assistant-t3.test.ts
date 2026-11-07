import {expect,it} from 'vitest';import {operationPayload,pairOperations,assertSteeringTarget} from '../../src/main/t3/operations';
const ids={commandId:'command-test',threadId:'thread-test',messageId:'message-test'};
it('pins launch to supervised mode and encodes explicit steering targets',()=>{
 const launch=operationPayload({tag:'StartThread',projectId:'project-test',provider:'codex',model:'test-model',title:'Test',prompt:'Only a fixture'},ids);
 expect(launch.payload).toMatchObject({runtimeMode:'approval-required',workspaceStrategy:{type:'root'},modelSelection:{instanceId:'codex'},initialMessage:{text:'Only a fixture'}});
 const steer=operationPayload({tag:'SteerThread',projectId:'project-test',provider:'codex',threadId:'thread-test',runId:'run-test',text:'Only a fixture'},ids);
 expect(steer.payload).toMatchObject({type:'message.dispatch',dispatchMode:{type:'steer_active',targetRunId:'run-test'}});
 expect(()=>assertSteeringTarget({}, {tag:'SteerThread',projectId:'p',provider:'codex',threadId:'t',runId:'r',text:'x'})).toThrow();
});
it('checks version before consuming pairing credentials and requests only read/operate',async()=>{
 let calls=0;const fetcher=(async(_url:unknown,init?:RequestInit)=>{calls++;if(calls===1)return Response.json({serverVersion:'0.1.7',orchestrationProtocolVersion:2,environmentId:'test'});expect(String(init?.body)).toContain('orchestration%3Aread+orchestration%3Aoperate');return Response.json({access_token:'fixture',token_type:'Bearer',scope:'orchestration:read orchestration:operate'});}) as typeof fetch;
 expect((await pairOperations('http://127.0.0.1:3774','fixture',fetcher)).environmentId).toBe('test');expect(calls).toBe(2);
 calls=0;await expect(pairOperations('http://127.0.0.1:3774','fixture',(async()=>{calls++;return Response.json({serverVersion:'wrong',orchestrationProtocolVersion:2,environmentId:'test'});}) as typeof fetch)).rejects.toThrow();expect(calls).toBe(1);
});
