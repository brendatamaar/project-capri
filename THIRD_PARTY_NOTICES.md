# Third-party notices

This is a non-commercial project. No reference artwork or Git history is included.

## mochiiwuff/capri-desktop

https://github.com/mochiiwuff/capri-desktop at cb33e87dfaee79cec8b4b0f737ca89e07b87ba4b (0.5.1).
Code from src/, hooks/, scripts/, tests/ was imported unchanged in M0. M1 adapts renderer app.js, panel.js, and index.html for art packs. M3–M5 adapt capri.js for frame scheduling, springs, clip hooks, and behavior toggles. The new read-only Windows helper adapts upstream frame enumeration, excluding native input and window mutation. M18 adds a cancellation guard to capri.js pointing and reuses the upstream pointing mechanics. The fixed assistant-controls.ps1 helper adapts only system.js Core Audio declarations; the original system.js remains dormant. Exposure sheets (acting.js), shader, FX, and line files remain unchanged. The PolyForm Noncommercial 1.0.0 terms and earlier MIT notice are reproduced in LICENSE.

Required Notice: Copyright (c) 2026 mochiiwuff (https://github.com/mochiiwuff/capri-desktop)

## lachydotmcg/capri-desktop

Credit: https://github.com/lachydotmcg/capri-desktop (Lachy and the private artist).
No files were directly ported from this repository in M0. Required notices are preserved conservatively for future reuse and upstream provenance.
License retrieved at ac2735e54e365f6dbadeb9cbc7d9b583506b8dfc; full text in licenses/lachydotmcg-PolyForm.txt.

Required Notice: Copyright 2026 Lachy (https://github.com/lachydotmcg)
Required Notice: Anyone who uses Capri's code, art, animations or any of its other assets must credit the Capri project (https://github.com/lachydotmcg/capri-desktop). Capri's art and animations are by her artist, who prefers to stay private. Parts made by others keep their own licences, listed in its README.

## TheAgencyMGE/capri-companion

https://github.com/TheAgencyMGE/capri-companion at c094ec1e74941c075cf0a2ce5ab340a58a3c6344 (0.2.0).
Copyright (c) 2026 Capri Companion contributors. MIT license: licenses/TheAgencyMGE-MIT.txt.
Copied params.ts and adapted clips.ts under src/renderer/overlay/motion/ for later M4 integration.
Removed all frame# and clip: pose records and restricted the provenance union to interpretation.
Omitted face.ts because it embeds traced, show-derived geometry; omitted model.json, palette, reference images, and all assets.
M4 integrates the authored interpretation clips with pure sampling/mapping/mixing and a fenced scheduler. The exact spring equation is adapted from Animator under MIT. Live-face drawing is new generic geometry, with no traced face data.

## T3Code

https://github.com/pingdotgg/t3code at 6577c6b6185167c0e502fa01f9e8e8f2dee6ff25.
Copyright (c) 2026 T3 Tools Inc. MIT license: licenses/T3Code-MIT.txt.
M7 copies unchanged orchestrationV2.ts and its transitive contract imports into spikes/t3-probe/contracts/. The exact source pin and SHA-256 manifest are recorded beside the probe. The monitoring adapter additionally imports unchanged pinned contracts from vendor/t3-contracts with independent hashes. No reference artwork was imported.

## Dependencies

Runtime: Electron (MIT, with Chromium/Node notices supplied by Electron), Zod (MIT), Effect (MIT).
Build/test: TypeScript (Apache-2.0), esbuild (MIT), Vitest (MIT), fast-check (MIT), electron-builder (MIT), @electron/asar (MIT, archive verification), @types/node (MIT).
Dependency versions are locked in package-lock.json; dependency license files stay with their packages.

## Optional Phase 3 external services (not bundled)

Capri's new HTTP adapters are original implementation; no server code or model
weights were copied. Kokoro-FastAPI (https://github.com/remsky/Kokoro-FastAPI,
Apache-2.0) and achetronic/parakeet (https://github.com/achetronic/parakeet,
Apache-2.0) are independently installed optional services. Users retain their notices
when installing them. Model cards checked 2026-11-07: hexgrad/Kokoro-82M
(https://huggingface.co/hexgrad/Kokoro-82M) declares Apache-2.0; NVIDIA
parakeet-tdt-0.6b-v3 (https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3)
declares CC-BY-4.0. Model attribution: NVIDIA, Parakeet TDT 0.6B v3, unchanged
external model; hexgrad, Kokoro-82M, unchanged external model. No model, custom
voice, copied voice, or show-derived asset is distributed with Capri. Verify terms
for the exact externally installed version and any additional voice assets.
