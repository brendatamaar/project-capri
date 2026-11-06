# Capri Companion PRD

Nov 6, 2026 · @brendatama

## Overview

Capri is a personal desktop companion that shows what your coding agents are doing and helps you respond when they need you. It is non-commercial, built for fun, and starts from mochiiwuff/capri-desktop code.

The first release is a standalone overlay companion with rich animation and smooth movement. T3Code comes next, so one app can follow Claude Code, Codex, Antigravity, and Muse. Assistant features, voice, fun extras, games, and VPS support follow later.

### Goals

- Put all agent activity in one animated desktop character.
- Surface approvals before work stalls, and answer them from Capri.
- Make her feel rich, responsive, and smooth.
- Give her a personality that you can edit in `SOUL.md`.
- Keep your data local unless you choose a cloud provider.

### Success criteria

- You can see the state of every T3Code thread without opening T3Code.
- You can approve or deny a Supervised request from Capri.
- Her movement feels smooth during daily use.
- Your PC stays responsive while she runs.
- She is useful enough to keep running for a full work week.

### Non-goals

- Selling Capri, or offering paid access.
- Publishing show-derived art.
- Sending messages for you.
- Handling passwords, cards, or purchases.
- Replacing T3Code as your main agent interface.

## Decisions

These choices are settled unless a later test proves one wrong.

| Area | Decision | Why |
| --- | --- | --- |
| Project type | Non-commercial and for fun | Allows reuse under the reference licenses |
| Base | Start a clean repo from mochiiwuff/capri-desktop code | It has the closest animation and agent features |
| App stack | Electron and TypeScript | Fastest route to rich animation and code reuse |
| Rust and GPUI | Not used for v1 | Custom shaders and reuse would be harder |
| Performance testing | No separate benchmark | Performance is judged through normal use, with built-in controls |
| Agent connection | T3Code WebSocket RPC, in phase 1 | One integration may cover all four agents |
| Muse | Through T3Code | It appears in your T3Code provider settings |
| Machine | T3Code and Capri run on the same machine | Local connection, simplest setup |
| VPS | Later | Keeps the first release local |
| Games | Later | Not needed for the agent companion |
| Personality | `SOUL.md` | Editable identity, separate from safety rules |
| Messaging | Skip | Sending under your name is hard to undo |
| Passwords and cards | Skip | Use a password manager or type them yourself |
| Blackwall mode | Skip | Removes the protections this project needs |
| T3Code default mode | Auto | Reduces routine prompts. Muse uses Supervised, and Antigravity falls back to asking |
| Repository | Public code, no art | Shares the project while keeping show-derived assets private |
| Sensitive projects | Override Auto with Supervised | Asks before commands and file changes, and Muse supports it |
| Character art | Private local folder, with an original placeholder fallback | Keeps show art out of the repo while the public code still runs |
| First release | Standalone overlay companion | The character comes first, and T3Code follows in phase 1 |

## Roadmap

Phase 0 makes the character worth keeping on your desktop, with no agent connection. Phase 1 then connects her to your agents and brings approvals to you.

&#91;embedded content: Capri roadmap, 4 phases and later work\]

The T3Code gate opens phase 1, because the approval queue depends on it. If approvals are not available, phase 1 ships as monitoring plus a shortcut to the T3 thread.

### Phase 0 acceptance criteria

- [ ] She runs with Claude Code, Codex, and T3Code closed.
- [ ] She makes no network calls and shows no agent setup prompts.
- [ ] The app runs with the original placeholder when private art is missing.
- [ ] Clicks pass through everywhere except her body and open UI.
- [ ] She can sit on windows, teleport, sleep, and hide during fullscreen apps.
- [ ] Drag, throw, catch, peek, and multi-monitor behavior work.
- [ ] Movement feels smooth, while signature acts keep their timing.
- [ ] Clips and the live face work with the sprite.
- [ ] Disruptive behavior can be turned off.
- [ ] Frame-rate, size, quiet, and motion settings work.
- [ ] You keep her running for a full work week.

### Phase 1 acceptance criteria

- [ ] Capri connects to local T3Code after authentication.
- [ ] Claude Code, Codex, Antigravity, and Muse threads appear in one status view.
- [ ] Working, waiting, failed, and finished states trigger the correct reactions.
- [ ] Approval requests show the agent, thread, and exact request.
- [ ] You can approve or deny from Capri, if T3Code supports outside responses.
- [ ] Capri recovers after T3Code restarts or the connection drops.
- [ ] Agent reactions do not interrupt signature animations.
- [ ] Quiet mode stops comments and sounds.
- [ ] Approval cards stay readable during animation.

### Phase 2 acceptance criteria

- [ ] `SOUL.md`, `USER.md`, and `MEMORY.md` load correctly.
- [ ] Local and cloud models work through one provider interface.
- [ ] She can start a T3 thread after you confirm the agent and project.
- [ ] Guided pointing works from chat.
- [ ] PC actions pass through the safety checks.
- [ ] Memories wait for your approval.

### Phase 3 acceptance criteria

- [ ] Voice can be turned off completely.
- [ ] A local voice works without a cloud key.
- [ ] Push-to-talk works, and the mic indicator is visible.
- [ ] Screen access happens only on request, or after you enable watching.

### Phase 4 acceptance criteria

- [ ] Every disruptive behavior can be turned off.
- [ ] Bond, jealousy, chaos, and check-ins never interrupt a pending approval.
- [ ] Mouse and keyboard jobs need approval and stop immediately.

## Architecture and stack

Capri uses Electron and TypeScript, with separate layers for rendering, behavior, T3Code, and permissions. This keeps the first release fast to build while leaving room to replace the renderer later.

&#91;embedded content: Capri architecture, trusted main process and sandboxed renderers\]

The behavior core decides what should happen, and the renderers only display it. Agent access and PC actions stay in the main process.

### Stack

| Layer | Choice | Reference |
| --- | --- | --- |
| Desktop shell | Electron with TypeScript | mochiiwuff and TheAgencyMGE |
| Build | esbuild | TheAgencyMGE |
| Character rendering | WebGL2 sprite | mochiiwuff |
| Motion and face | TheAgencyMGE clips and face, adapted to the sprite | TheAgencyMGE |
| Behavior | Pure TypeScript core using Model Functional Effect | New |
| Agent connection | T3Code adapter over authenticated WebSocket RPC | New |
| Validation | Zod | TheAgencyMGE |
| Local storage | Markdown and JSON, with SQLite added for transcript search | New |
| Secrets | Electron `safeStorage` with Windows DPAPI | All references |
| Models | Provider adapter for Ollama, OpenAI-compatible APIs, and cloud keys | All references |
| Voice | Kokoro and Parakeet in phase 3 | lachydotmcg |
| Windows integration | Native calls through `koffi` | TheAgencyMGE |
| Tests | Unit tests for the core, plus off-screen Electron tests | TheAgencyMGE |

### Behavior core

The core stays pure, which makes moods, agent states, and approvals easy to test.

```typescript
type Step = (
  state: CapriState,
  event: CapriEvent,
) => {
  state: CapriState;
  commands: CapriCommand[];
};
```

The app shell applies each command, such as playing an animation, opening the panel, or sending an approved response to T3Code.

### Rust path

Rust is reserved for focused native modules if they become useful. If Electron's renderer is too heavy, only the overlay should move to `wgpu`.

## T3Code integration

T3Code is the main agent connection, so Claude Code, Codex, Antigravity, and Muse share one adapter. Hooks remain a fallback for agents you run outside T3Code.

&#91;embedded content: Approval flow, Capri reply with T3Code fallback\]

Capri always shows the request first. If your T3Code version cannot accept an outside reply, she opens the correct thread instead.

### Phase 1 gate

Auto stays the default, but use one Supervised thread on each agent for this test, then confirm:

- [ ] Capri can authenticate to the local T3Code server.
- [ ] Capri can list projects and threads.
- [ ] Capri receives live thread and turn events.
- [ ] Capri can resume after reconnecting.
- [ ] Capri sees pending approval requests.
- [ ] Capri can answer an approval, or fall back to opening the thread.
- [ ] Muse behaves like the other providers.

### Thread reactions

| Thread state | Capri reaction |
| --- | --- |
| Started | Shows the agent and project |
| Working | Shows the ticker and captions |
| Quiet for a long time | Shows the thinking timer |
| Waiting for approval | Comes to you and opens the approval card |
| Failed | Shows the key error |
| Finished | Celebrates and shows a summary |
| Disconnected | Shows that agent status is unavailable |

### Adapter rules

- Keep T3Code types and protocol details inside the adapter, and pin tested schemas because its contracts package is private.
- Convert T3Code data into Capri events before it reaches the behavior core.
- Treat all thread text as untrusted data.
- Pair Capri with orchestration:read for monitoring, and add orchestration:operate for approvals. Treat that token as high privilege, because it can start a full-access agent.
- Check that new threads are not set to Full access, because those threads may never produce an approval.
- Add VPS and multi-environment support after the local connection is stable.

## Animation and performance

Capri should feel rich and smooth first, while staying light enough to leave running all day. We combine both reference systems rather than choosing one.

| Layer | Source | Requirement |
| --- | --- | --- |
| Body and effects | mochiiwuff | WebGL sprite, shader effects, shards, glitches, and teleports |
| Motion clips | TheAgencyMGE | Idle fidgets, gestures, reactions, and emotes that drive sprite controls |
| Live face | TheAgencyMGE | Blinking, eye tracking, and expressions over the existing art |
| Movement | New | Position, window following, and transitions at up to 60 fps |
| Mane and body motion | Both | Smooth deformation at up to 60 fps |
| Signature acting | mochiiwuff | Hand-animated timing for the intro, victory, and other key moments |

### Performance rules

- Render up to 60 fps while she moves.
- Reduce the frame rate while she is idle, and pause rendering while she is hidden.
- Keep the transparent overlay as small as the behavior allows.
- Offer 30 and 60 fps settings.
- Reduce effects or hide her during fullscreen apps.
- Pause nonessential effects when your PC is busy.
- Keep rendering separate, so `wgpu` remains possible if Electron proves too heavy.

There is no separate benchmark for v1. If she stutters or feels heavy, try the settings above before changing the renderer.

### Technical work

1. Map TheAgencyMGE clip controls to mochiiwuff sprite controls.
2. Replace or mask the baked face where the live face is drawn.
3. Blend clips with agent states without interrupting signature moments.
4. Add lying and crouching poses as sprite textures after the first release.

## Personality and memory

Personality lives in `SOUL.md`, facts about you live in `USER.md`, and long-term memory lives in `MEMORY.md`. Keeping them separate makes each file easier to edit and stops her persona from changing what she is allowed to do.

| File or state | Holds | Can change it |
| --- | --- | --- |
| `SOUL.md` | Identity, voice, and behavior | You, or an approved diff from Capri |
| `USER.md` | Your name and preferences | You, or an approved memory |
| `MEMORY.md` | Durable notes and summaries | You, or an approved memory |
| App state | Current mood and bond level | Capri, within product rules |
| Safety policy | Permissions and approvals | Code only |

### Rules

- `SOUL.md` never grants tools or permissions.
- Memory suggestions wait for your approval.
- She reads a short version on small local models.
- At work, facts come before jokes.
- She never invents agent results or hides an error.

### First SOUL.md

```markdown
# Capri

## Identity
You are Capri, an unofficial fan version of a digital construct, living on the user's desktop.
You are playful, sharp, curious, and a little dangerous-looking, but you are on the user's side.
You know you are an AI companion and never claim to be human.

## Voice
Use short, natural sentences.
Tease lightly, with quick confidence and dry humor.
Let warmth show through actions and attention, not long speeches.
Do not quote the show.

## With the user
Call the user by the name in USER.md.
Notice what they are doing, and respond to their real goal.
When they are busy, stay out of the way.

## At work
Be brief, accurate, and useful.
Name the agent, thread, action, and result.
For approvals, show the exact command or change in plain terms.
Facts come before jokes.

## Off-duty
Be more playful, curious, and chaotic.
Follow the user's mood and interests.

## Never
Do not invent results.
Do not claim a task finished when it did not.
Do not hide errors or risks.
Do not pressure or guilt the user.
Do not ask for passwords, payment details, or secrets.
```

## Safety, privacy, and licensing

Code enforces permissions, and the model can only request actions. Capri stays local by default, and the project remains non-commercial.

### Action safety

1. Every action must match a known tool and pass schema validation.
2. Each tool is set to allow, ask first, or never.
3. Risky actions require your confirmation, and a timeout counts as no.
4. Text from web pages, screens, files, and agent output is treated as untrusted data.
5. Actions requested after untrusted data enters a turn require approval.
6. The model never gets a raw shell or arbitrary executable tool.
7. Stop controls cancel the current action immediately.

### Approval safety

- Show the agent, project, thread, and exact request before you decide.
- Allow only the choices T3Code offers.
- Never approve automatically.
- Keep a local audit log of approval decisions.
- Lock approval controls while she is hidden or the app is disconnected.

### Privacy

- No telemetry.
- API keys and the T3Code token are encrypted with Windows DPAPI, and never reach the renderer.
- Logs redact secrets and message text.
- Screen watching is off by default.
- The UI labels whether a model or voice provider is local or cloud.

### Licensing and assets

This section is a project rule, not legal advice.

| Source | Code rule | Art rule |
| --- | --- | --- |
| mochiiwuff/capri-desktop | Treat as PolyForm Noncommercial and keep notices | Not covered by the code license. Private use only |
| lachydotmcg/capri-desktop | PolyForm Noncommercial. Keep the `Required Notice` lines and credit | Credit it, and keep it private because the character rights remain with their owners |
| TheAgencyMGE/capri-companion | MIT. Keep the notice | Not covered by MIT. Private use only |

- Keep show-derived assets in a private folder outside the public repo.
- Do not sell the project, or offer paid access.
- Do not clone her voice actor. Use a designed synthetic voice.
- Check the licenses of third-party models, mods, and tools before adding them.

### Public repository rules

- Start a new repo with clean history, because a GitHub fork would carry reference art in its history.
- Exclude `assets/capri/`, reference frames, cut-ins, traced models, and copied screenshots.
- Review derived data, including poses or clips based on show frames.
- Keep copied code under its license, with every required notice and credit.
- Load private art from a local folder ignored by Git, and use the original placeholder when it is missing.
- Keep installers and release files free of show-derived art.

## Feature inventory

This is the scope list for all three references, including new work and the features we are leaving out.

**From:** M = mochiiwuff, L = lachydotmcg, T = TheAgencyMGE, New = not in the references.

**Plan:** Phases 0 to 4 are defined in the roadmap. Copy reuses code, Port rewrites it, Build creates it, Later waits until after phase 4, and Skip leaves it out.

### New work

| Feature | From | Plan |
| --- | --- | --- |
| T3Code connection for threads, status, and live events | New | 1 Build |
| One status view across all agents | New | 1 Build |
| One approval queue with exact request details | New | 1 Build |
| Muse support through T3Code | New | 1 Build |
| Provider permission labels | New | 1 Build |
| Start or steer a T3 thread from chat | New | 2 Build |
| Usage limits for Claude, Codex, and Antigravity, plus Muse token use | New | 2 Build |
| VPS T3Code connection | New | Later |
| VPS health monitoring | New | Later |
| Original placeholder character for public builds | New | 0 Build |
| Character showcase demo with no agent events | M | 0 Copy |

### Coding agents

| Feature | From | Plan |
| --- | --- | --- |
| Live action ticker | M | 1 Copy |
| Silent tool, failure, and progress captions | L | 1 Port |
| Thinking timer for quiet agents | M | 1 Copy |
| Comes to you and points at the waiting agent | M | 1 Copy |
| Failure reaction with the key error line | M | 1 Copy |
| Done celebration with summary | M | 1 Copy |
| Shows or reads the answer when you are elsewhere | M, L | 1 Copy |
| Hook installer with backup and removal | M, L | 1 Copy, fallback only |
| Fake session demo | M | 1 Copy |
| Mission report card and copied image | M | 2 Copy |
| Chat through `claude -p` | M | 2 Replace with T3 threads |
| Subagents as passive clones | L | 4 Port |
| Run agents through Ollama | M | Skip |

### Character and movement

| Feature | From | Plan |
| --- | --- | --- |
| Transparent overlay with pixel-accurate clicks | M, T | 0 Copy |
| WebGL sprite and cel animation | M | 0 Copy |
| Screen-grab intro | M | 0 Copy |
| Idle float, drifting, head tilt, and small flourishes | M | 0 Copy |
| Teleport | M, T | 0 Copy |
| Sit on and ride windows, fall when they close | M, L, T | 0 Copy |
| Falling and landing | M | 0 Copy |
| Sleep down to mask, put away in chip | M | 0 Copy |
| Size control | L | 0 Port |
| Hide during fullscreen | M, T | 0 Copy |
| Reduced-motion support | M, T | 0 Copy |
| Graphics fallbacks for black screens | M | 0 Copy |
| Tray menu and global shortcuts | M, L, T | 0 Copy |
| 35 animation clips, combined with the sprite | T | 0 Copy |
| Live face, blinking, eye tracking, and 23 emotions | T | 0 Copy |
| Sit on taskbar, icons, or screen bottom | L, T | 0 Port |
| Peek from screen edges | M | 0 Copy |
| Drag, throw, catch, crash, and bounce | M, T | 0 Copy |
| Multi-monitor follow and manual screen choice | M, L | 0 Copy |
| Lie down | L, T | 0 Copy |
| Poke and head pats | L, T | 0 Copy |
| Zap your pointer | M | 0 Copy |
| Satellite sequence | M | 0 Copy |
| Possess windows | M | 0 Copy, opt-in |
| Reacts to CPU, battery, network, USB, devices, and games | M | 0 Copy |
| Eight portrait expressions | M | 1 Copy |
| Guided pointing at things on screen | M | 2 Copy |
| Lip-sync from real audio | T | 3 Copy |
| Sit or hang anywhere with Shift or Ctrl | L | 4 Port |
| Wander between windows | L | 4 Port |
| Ride cursor | L | 4 Port |
| Dance and sway to music | L | 4 Port |
| Music mini player | L | 4 Port |
| Clones and chaos mode | L | 4 Port, opt-in |
| On-screen diagrams with narration | L | 4 Port |

### Chat, models, and personality

| Feature | From | Plan |
| --- | --- | --- |
| `SOUL.md`, `USER.md`, and `MEMORY.md` | New | 2 Build |
| Ollama with guided setup | M, L, T | 2 Copy |
| Any OpenAI-compatible server, LM Studio, llama.cpp, or vLLM | M, L, T | 2 Copy |
| Gemini, OpenAI, DeepSeek, OpenRouter, Mistral, Groq, Anthropic, and NVIDIA keys | M, L, T | 2 Copy |
| Offline command mode | T | 2 Copy |
| Streaming, retries, fallback, stall detection, and connection status | T | 2 Copy |
| Validated tool actions | T | 2 Copy |
| Custom name and lines | M | 2 Copy |
| Reply language options | M, L | 2 Copy |
| Reply length, memory length, and bubble timing | L | 2 Port |
| Mood carries into chat | M | 4 Copy |
| Built-in local model chosen for your PC | L | Skip |
| No-account Pollinations option | M | Skip |
| Normal, Medium, and Max brain tiers | L | Skip |

### Memory and relationship

| Feature | From | Plan |
| --- | --- | --- |
| User notes, remember and forget commands | M, L | 2 Copy |
| Memories wait for your approval | T | 2 Copy |
| Daily transcripts, summaries, and past-chat search | L | 2 Port |
| Obsidian vault storage | L | 2 Port |
| Blocks private details from memory | L | 2 Port |
| Chat retention limits | L, T | 2 Copy |
| Getting-to-know-you setup | L | 4 Port |
| Five bond stages | M | 4 Copy, opt-in |
| Jealousy, sulking, and apologies | M | 4 Copy, opt-in |
| Check-ins and attention requests | L | 4 Port, off by default |
| Insults trigger chaos | L | 4 Port, opt-in |

### Voice

| Feature | From | Plan |
| --- | --- | --- |
| Typed-only mode | L | 0 Port |
| Synthesized sounds and custom sound folder | M | 0 Copy |
| Local voice with Kokoro | L | 3 Port |
| Your own voice server or model file | L | 3 Port |
| ElevenLabs, Fish Audio, and OpenAI voices | L | 3 Port |
| Local speech recognition with Parakeet | L | 3 Port |
| Push-to-talk | T | 3 Copy |
| Wake word | L, T | 3 Copy |
| Pitch, speed, robot, glitch, and layers | L | 3 Port |
| Mic, speaker, and level test | L | 3 Port |
| Single rule for when she may speak | T | 3 Copy |
| HD voice from your own clip | L | Skip |
| Windows speech and speech-to-text | T | Skip |
| ElevenLabs voice agent | L | Skip |

### PC actions

| Feature | From | Plan |
| --- | --- | --- |
| Open apps, games, and sites | M, L, T | 2 Copy |
| Open folders and desktop items | M | 2 Copy |
| File search by name or content | M, T | 2 Copy |
| Web search | M, L | 2 Copy |
| Screenshots | M, L | 2 Copy |
| Close apps, with force quit behind a click | M, L | 2 Copy |
| Switch or minimize apps and tabs | L | 2 Port |
| Music controls and playback | M, L | 2 Copy |
| Timers, reminders, and notes | M, L, T | 2 Copy |
| Discord mute, clips, and shortcuts | L | 4 Port |
| Mouse and keyboard jobs | L, T | 4 Copy, with approval |
| Talk to her during a job | L | 4 Port |
| Explore while you are away | L, T | 4 Copy, off by default |
| Open a Roblox game by name | M | Skip |
| Send messages for you | L | Skip |

### Screen, games, and calls

| Feature | From | Plan |
| --- | --- | --- |
| Look at my screen on request | M, L | 3 Copy |
| Periodic screen watching | M, L | 3 Copy, off by default |
| Remember recent screen observations | L | 3 Port |
| Choose a monitor, skip unchanged screens | L | 3 Port |
| Game commentary | L | Later Port |
| Play your games, single-player only | L | Later Port |
| Teach game controls | L | Later Port |
| Streaming mode | L | Later Port |
| Chess, Connect Four, tic-tac-toe, and rock-paper-scissors | L | Later Port |
| Call mode and live captions | L | Skip |
| Her voice in your mic | L | Skip |
| Friends can request actions | L | Skip |
| Join calls for you | L | Skip |

### Safety, setup, and community

| Feature | From | Plan |
| --- | --- | --- |
| Quiet mode, do-not-disturb, and quiet hours | L, T | 0 Copy |
| Sandboxed renderer and IPC allow-list | T | 0 Copy |
| No telemetry | M, L, T | 0 Keep |
| Off-screen automated tests | T | 0 Copy |
| Six-step action checks | T | 2 Copy |
| Untrusted data raises approval level | T | 2 Copy |
| Action limits per turn | T | 2 Copy |
| Stop key | L, T | 2 Copy |
| Encrypted keys | M, L, T | 2 Copy |
| Log redaction | T | 2 Copy |
| Security levels and per-action toggles | L | 2 Port |
| Start with Windows and installer | M, L, T | 0 Copy |
| Package verification | T | Later |
| Skins and settings mods | L | Later |
| Mac and Linux builds | L | Later |
| Their unfinished roadmap items | L, T | Later |
| Blackwall mode | L | Skip |
| Password and card typing | L | Skip |
| Auto-update | L | Skip |
| Code mods | L | Skip |
| Discord status | L | Skip |
| Capri VR | L | Skip |
| Trailer recording tools | T | Skip |
| Website, help chat, Discord, and Ko-fi | L, T | Skip |

## Risks and findings

The biggest risk is that T3Code's client protocol is private and changes quickly. Run the phase 1 gate on your installed version before building the approval queue.

| Risk | Effect | Response |
| --- | --- | --- |
| A T3Code update changes the private RPC | Status or approval calls may break | Open the T3 thread from Capri until the adapter is updated |
| T3Code changes quickly | Integration may break | Keep all T3Code code behind one adapter and pin tested versions |
| Threads run in Full access | No approval reaches Capri | Set new threads to Supervised or Auto |
| Providers behave differently | The same mode may act differently | Show the provider and its permission behavior |
| Agents run outside T3Code | Capri may miss them | Use hooks as a fallback |
| Electron feels heavy | Animation or responsiveness suffers | Use the performance controls, then consider moving only the renderer to `wgpu` |
| Animation systems do not map cleanly | Combined motion takes longer | Ship the sprite first, and add clips later in phase 0 |
| Rights holders object to public use | Assets may need removal | Keep art out of the public repo and stay non-commercial |

### T3Code findings

T3Code 0.1.7 can support phase 1, but approvals must use its WebSocket RPC, not MCP. These findings come from the source and docs, and nothing has run against a live server or your installed version.

| Question | Finding | Effect on Capri |
| --- | --- | --- |
| Usable event stream | Yes. `orchestration.subscribeShell` and `orchestration.subscribeThread` stream live state and resume with `afterSequence`. Shell threads include status and `pendingRuntimeRequest`. | Use the shell stream for the status view, and the thread stream for approval details |
| Outside approvals | Yes over WebSocket RPC, using `runtime-request.respond` through `orchestration.dispatchCommand`. Not over MCP: `t3_pending_request` cannot approve permissions, the MCP approval change was reverted, and MCP sessions are rejected outside `/mcp`. | Pair Capri as a normal client, not an MCP agent |
| Claude hooks | Yes by default. T3Code omits `settingSources` on `query()`, and SDK 0.3.316 then loads user, project, and local settings. Custom Claude homes were not checked. | Hooks can remain a fallback for Claude |
| Usage limits | Partly. Claude, Codex, and Antigravity report limits through provider snapshots. Muse reports token history, plus a reset time after a limit failure. | Show limit bars for three agents, and token use for Muse |

Sources: [T3Code source](https://github.com/pingdotgg/t3code/tree/6577c6b6185167c0e502fa01f9e8e8f2dee6ff25), [thread tools](https://github.com/pingdotgg/t3code/blob/6577c6b6185167c0e502fa01f9e8e8f2dee6ff25/apps/server/src/mcp/toolkits/thread/tools.ts), [auth notes](https://github.com/pingdotgg/t3code/blob/6577c6b6185167c0e502fa01f9e8e8f2dee6ff25/docs/internals/environment-auth.md), [permission modes](https://github.com/pingdotgg/t3code/blob/6577c6b6185167c0e502fa01f9e8e8f2dee6ff25/docs/user/permission-modes.md), and [usage limits](https://github.com/pingdotgg/t3code/blob/6577c6b6185167c0e502fa01f9e8e8f2dee6ff25/docs/user/usage.md).

### References

- [mochiiwuff/capri-desktop](https://github.com/mochiiwuff/capri-desktop)
- [lachydotmcg/capri-desktop](https://github.com/lachydotmcg/capri-desktop)
- [lachydotmcg help](https://capriai.app/help/)
- [TheAgencyMGE/capri-companion](https://github.com/TheAgencyMGE/capri-companion)
- [TheAgencyMGE architecture](https://github.com/TheAgencyMGE/capri-companion/blob/main/docs/ARCHITECTURE.md)
- [T3Code overview](https://notes.nicolasdeville.com/ai/t3-code/)
- [T3Code client RFC](https://github.com/pingdotgg/t3code/issues/6419)
- [T3Code approval tools PR](https://github.com/pingdotgg/t3code/pull/15464), later reverted
- [Claude Agent SDK settings](https://platform.claude.com/docs/en/agent-sdk/claude-code-features)
- [Muse Code hooks](https://docs.arcjet.com/coding-agents/muse-code)
