export type Id<K extends string> = string & {readonly __brand: K};
export type ThreadId = Id<'Thread'>;
export type RunId = Id<'Run'>;
export type RequestId = Id<'Request'>;
export type Project = {id: string; title: string};
export type Thread = {
  id: ThreadId; projectId: string; title: string; provider: string; mode: string;
  phase: string; runId: RunId | null; error: string | null; summary: string | null;
  pending: {id: RequestId; kind: string; createdAt: number; blocking: boolean} | null;
};
export type Detail = {requestId: RequestId; threadId: ThreadId; text: string; reason: string; kind: string};
export type Limit = {provider: string; label: string; remaining: number | null; reset: string | null};
export type Presence = 'Hidden' | 'NeedsYou' | 'Failed' | 'Done' | 'Working' | 'Thinking' | 'Asleep' | 'Idle';
export type Connection =
  | {tag: 'Unpaired'} | {tag: 'Pairing'; attempt: number; baseUrl: string}
  | {tag: 'Connecting' | 'Syncing' | 'Live' | 'Backoff'; attempt: number; baseUrl: string; failures: number}
  | {tag: 'AuthRejected' | 'Incompatible'; reason: string};
export type State = {
  tag: 'Monitoring'; connection: Connection; generation: number; sequence: number;
  projects: readonly Project[]; threads: readonly Thread[]; details: readonly Detail[];
  limits: readonly Limit[]; focus: RequestId | null; panelVisible: boolean; hidden: boolean; quiet: boolean;
  holds: readonly {threadId: ThreadId; runId: RunId; kind: 'Done' | 'Failed'}[];
  thinking: readonly RunId[];
};
export type Input =
  | {tag: 'Started'; baseUrl: string | null}
  | {tag: 'Pair'; baseUrl: string; credential: string}
  | {tag: 'Paired'; attempt: number; baseUrl: string}
  | {tag: 'PairFailed'; attempt: number}
  | {tag: 'ServerChecked'; attempt: number; compatible: boolean}
  | {tag: 'Opened'; attempt: number}
  | {tag: 'Closed'; attempt: number; jitter: number}
  | {tag: 'AuthFailed'; attempt: number}
  | {tag: 'Retry'; attempt: number}
  | {tag: 'Snapshot'; attempt: number; sequence: number; projects: readonly Project[]; threads: readonly Thread[]}
  | {tag: 'ThreadUpdated'; attempt: number; sequence: number; thread: Thread}
  | {tag: 'ThreadRemoved'; attempt: number; sequence: number; threadId: ThreadId}
  | {tag: 'ProjectUpdated'; attempt: number; sequence: number; project: Project}
  | {tag: 'ProjectRemoved'; attempt: number; sequence: number; projectId: string}
  | {tag: 'Synchronized'; attempt: number}
  | {tag: 'DetailLoaded'; attempt: number; detail: Detail}
  | {tag: 'DetailFailed'; attempt: number; threadId: ThreadId; requestId: RequestId; retry: number}
  | {tag: 'DetailRetry'; attempt: number; threadId: ThreadId; requestId: RequestId; retry: number}
  | {tag: 'Limits'; attempt: number; limits: readonly Limit[]}
  | {tag: 'QuietDue'; attempt: number; threadId: ThreadId; runId: RunId}
  | {tag: 'ReactionEnded'; attempt: number; threadId: ThreadId; runId: RunId}
  | {tag: 'Ui'; visible: boolean; hidden: boolean; quiet: boolean}
  | {tag: 'OpenThread'; threadId: ThreadId}
  | {tag: 'Disconnect'};
export type Command =
  | {tag: 'CheckServer'; attempt: number; baseUrl: string}
  | {tag: 'Exchange'; attempt: number; baseUrl: string; credential: string}
  | {tag: 'Save'; attempt: number; baseUrl: string}
  | {tag: 'Forget'} | {tag: 'Close'}
  | {tag: 'Connect'; attempt: number; baseUrl: string; afterSequence: number}
  | {tag: 'LoadDetail'; attempt: number; threadId: ThreadId; requestId: RequestId; retry: number}
  | {tag: 'Schedule'; key: string; delay: number; input: Input}
  | {tag: 'Open'; threadId: ThreadId}
  | {tag: 'Audit'; key: string; outcome: 'detected' | 'closed' | 'opened'}
  | {tag: 'Render'}
  | {tag: 'Reaction'; threadId: ThreadId; runId: RunId; kind: 'Done' | 'Failed' | 'NeedsYou' | 'Working'; quiet: boolean};
export function initial(): State {
  return {tag:'Monitoring',connection:{tag:'Unpaired'},generation:0,sequence:-1,projects:[],threads:[],details:[],limits:[],focus:null,panelVisible:false,hidden:false,quiet:false,holds:[],thinking:[]};
}
