# Phase 3 usage and acceptance

Open Assistant → Voice and screen. Defaults are typed-only with watching off.
Install/run compatible services separately using their own instructions:

- Kokoro-FastAPI: https://github.com/remsky/Kokoro-FastAPI — speech base typically
  http://127.0.0.1:8880/v1, model kokoro, designed voice af_heart.
- Parakeet: https://github.com/achetronic/parakeet — configure its loopback port
  as the transcription base ending in /v1 and the model ID accepted by that server.
  The default Capri port is 8000; match it to your server configuration.

Select Local, enter endpoint/model IDs, and Save. No cloud key is necessary for
keyless local servers. Custom/cloud accepts compatible APIs, not arbitrary vendor
protocols. Remote audio requires the explicit consent checkbox. The same voice
key is sent to BOTH configured voice endpoints. Blank key replaces the previous
key. Typed mode plus a blank key disables voice and removes the prior stored key
on a successful encrypted save. Restart should retain settings but never resume
listening/watching. Encryption failure is reported; settings then last only until exit.

Hold Talk (mouse or Space/Enter) and release, or use Finish recording. Review the
transcript and choose Use transcript in message draft, then Send separately.
Recording has a 30-second limit. Optional wake listening must be explicitly enabled
in settings and then started with Talk; it transcribes four-second chunks until
Stop. All chunks reach the transcription endpoint. Wake phrases crossing chunk
boundaries may be missed. Transcripts never automatically send chat or actions.

Read last answer plays only on request, with a decoded-audio level meter. The optional
faceAnchor live face opens its mouth from real audio; Pip has no faceAnchor and keeps
its original art. Quiet prevents playback. OS audio output selection is used.

Choose a display, Save, then Look. Electron transiently obtains thumbnails of all
displays; only the selected display is retained or eligible for upload. Watch refreshes its preview every 30 seconds
only while the assistant remains visible and eligible. Stop turns it off. Sending
an image to a vision model is a separate explicit button; configure a vision-capable
Ollama/compatible assistant model first. Cloud model consent exposes the current
preview to that provider. Screens/descriptions are untrusted; no screen-derived
action is executed. Images, raw audio and descriptions are not persisted by Capri.
External services may have their own retention policies.

## Manual Windows checks — not yet run

- [ ] Install using npm run dist on Windows; launch with only original placeholder art.
- [ ] Typed mode makes no audio request, cannot record, and never asks for microphone.
- [ ] Keyless Kokoro plays a designed synthetic voice; quiet/Stop/hide stop it promptly.
- [ ] Parakeet receives a valid 16 kHz WAV; mouse and keyboard push-to-talk release
  ends recording; mic indicator, OS denial, no device and service failure work.
- [ ] Wake mode stays visibly active until Stop; only matching chunks fill review;
  nonmatching/empty chunks do not submit chat. Test phrase/chunk-boundary limitations.
- [ ] Camera permission is denied; overlay and board cannot request microphone.
- [ ] Custom/cloud endpoints require consent; verify each configured endpoint/key.
- [ ] 30/60 fps and optional original test face show audio lip movement without
  interrupting signatures. Pip retains its artwork; audio meter follows playback.
- [ ] Capture chosen monitor, including mixed DPI and unplugged-display failure.
- [ ] Watching defaults off after restart; toggle/Stop/hide/fullscreen/pause/stow and
  pending agent approval stop capture and active microphone/playback.
- [ ] Vision sends only on click, describes the chosen preview, and treats visible
  prompt injection as data. No action or approval runs from screen/model output.
- [ ] DPAPI settings persist without plaintext keys; successful blank-key save removes
  the old voice key. Archive excludes media-provider.bin and all personal data.

Automated verification and limitations are recorded in PLAN.md. Linux tests and a
Windows cross-build do not establish native Windows or real-model acceptance.
