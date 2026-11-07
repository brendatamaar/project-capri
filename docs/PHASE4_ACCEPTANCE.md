# Phase 4 usage and acceptance

Fun extras live in Assistant → Fun extras and the tray submenu. Everything new
defaults off; existing window wandering retains its own switch. Bond progress
is local: five stages at 0/100/300/550/850 XP, a maximum of 1000, and at most 30 XP
per UTC day from clicks, pets and user chat. There is no penalty for being away.
Reset bond progress asks before clearing. Progress is in userData/fun-state.json;
no personal text is stored there. Settings are in the existing companion.json.

Playful jealousy reacts to a changed active T3 provider or its preview button.
Check-ins share a 20-minute cooldown with jealousy/chaos. /chaos or Preview chaos
requires the chaos opt-in; it produces a short theatrical pose effect, with no
window manipulation, forced typing, flashing screen or spawned agent. Moods expire
without apology; Calm mood clears one immediately. They never change permissions.

Cursor riding follows near the cursor visually and overrides wandering while on.
It does not move your mouse. Reduced motion disables travel/dance/clones/chaos;
quiet and pending approvals suppress extras. Two clones are visual echoes of the
active pack, never separate agents. All extras yield to signatures and pointing.

The music mini player is inside the Assistant. Enable it to see the current Windows
media session. Dance can independently request session playback status. Metadata
stays in memory and is never sent to a model. Controls require the existing Music
confirmation. No media player is launched and no music/audio files are bundled.

## Approved mouse/navigation jobs

1. Open an installed Windows Calculator or Notepad window. Keep it unobscured.
2. In Assistant → Approved mouse and navigation jobs, review/approve listing targets.
3. Select its opaque target entry. Enter 1–20 exact steps, for example:
   `[{"tag":"Move","x":0.5,"y":0.5},{"tag":"Key","key":"Left"}]`.
4. Review the target PID/client rectangle and exact steps; Approve once or Deny.
5. Keep the Assistant open. The helper focuses the target, then revalidates it before
   every step. Control+Alt+Escape or Stop cancels; Escape is checked between steps.

Move and Click use normalized client-area coordinates [0,1]. Keys are only Left,
Right, Up, Down, Tab, Escape, Home and End. No text entry or modifier shortcuts are
supported. The helper accepts trusted Windows Calculator/Notepad binary locations
only. UWP app variants with no directly owned main window, relocated WindowsApps
paths, elevated apps and focus changes can fail closed. Refreshing the target list
invalidates old handles; running a job consumes its handle. No action is retried.
If the stop shortcut cannot register, input jobs are unavailable.

Completed moves/clicks cannot be undone. Stop cannot retract an OS down/up pair
already submitted. Inspect the target before trying again after cancellation or
an unknown outcome. Do not treat a test on a fixture as native Windows acceptance.

## Manual Windows checklist — pending

- [ ] Install/build with npm run dist and original placeholder only; verify default
  opt-ins off and successful restart/persistence/reset of bond and settings.
- [ ] Click/pet/chat progress stays bounded, no loss on restart/day change, and stages
  update correctly. Setting changes and persistence failures are understandable.
- [ ] Jealousy/check-ins/chaos expire without apology, respect cooldowns, quiet and
  reduced motion, and never interfere with either kind of pending approval.
- [ ] Cursor riding and window wandering work with multi-monitor/DPI layouts;
  30/60 fps are smooth, signatures retain priority, sleep/drag/pointing win.
- [ ] Two clones show only selected art, never intercept clicks, and disappear on
  approval/hide/fullscreen/stow/pause/reduced motion/disable. Idle resource use is acceptable.
- [ ] Mini player reads current GSMTC sessions, handles no session, renders unusual
  titles as text, and approved controls work. Dance follows Playing/Paused.
- [ ] Test Notepad and Calculator target listing; reject unsupported/elevated apps.
- [ ] Deny/timeout/hide a job proposal: no input. Approve a harmless move/navigation
  job once: only the exact selected target receives it; repeated approval is inert.
- [ ] Test Control+Alt+Escape, Escape, header Stop, hide, fullscreen, pause/stow and a
  pending T3 approval during a job. No further steps occur; no held keys remain.
- [ ] Move/resize/close/replace/cover the target or change foreground mid-job: it stops.
  Test held Ctrl/Alt/Shift/Windows/mouse buttons and mixed-DPI/negative coordinates.
- [ ] Verify refusal of focus/UIPI and unknown outcomes are reported honestly, with
  no automatic retry. Confirm shortcut conflicts disable jobs.
- [ ] Inspect installer/archive: fixed helper matches source; no personal bond state,
  credentials, transcript, private art or generated release file enters Git.

Earlier phase manual acceptance remains separate. Phase 4 implementation completion
is distinct from these native/human checks. The Later backlog is untouched.
