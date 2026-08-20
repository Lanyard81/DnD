# STATUS.md — FableTable Solo

Last updated: 2026-08-20

## Completed
- Planning documents: PLAN.md, ARCHITECTURE.md, DATA_MODEL.md, DECISIONS.md, TEST_PLAN.md, STATUS.md.
- **Phase 1 — Scaffold, campaigns, characters.**
- **Phase 2 — Rules foundation and dice.**
- **Phase 3 — Bot party system.**
- **Phase 4 — Initiative and combat.**
- **Phase 5 — Map, tokens, and scripted DM.**
- **Dev tooling — file split** (post-Phase 5, D18): `index.html` built from `app-src/` via `npm run build`.
- **Phase 6 — DM tooling, homebrew editor, and backup.**
- **Phase 7 — Seed content, PWA polish, final acceptance review:**
  - **Real PWA icons**: `tools/gen-icons.mjs` (new) generates `icons/icon-192.png` and `icons/icon-512.png` from scratch using only Node's built-in `zlib` — no image library dependency — drawing a simple flat lantern-ring glyph in the app's accent color. Verified as valid PNGs (`file` confirms correct dimensions/format) and visually reviewed.
  - **Real service worker**: `sw.js` rewritten from the Phase-1 no-op placeholder into a genuine cache-first app-shell strategy (install caches `index.html`/`manifest.json`/both icons, fetch serves cache-first with network fallback and opportunistic same-origin caching, activate clears stale cache versions). Syntax verified (`node --check`), the file confirmed served correctly (200, correct MIME type) — **but registration itself could not be completed inside this project's sandboxed test browser**, which appears to block the ServiceWorker API generally. This is flagged prominently in README.md and TEST_PLAN.md as a required real-browser check before trusting installed-PWA offline behavior; the standalone `index.html` file is completely unaffected (it never depends on the service worker, and registration is skipped entirely under `file://`).
  - **3 original sample adventures** (`SAMPLE_ADVENTURES` in `app-src/js/03l-sample-adventures.js`): "The Lantern Road" (tutorial), "The Ashwake Reaches" (wilderness), "The Hollow Ledger" (urban mystery) — each with a premise, NPCs, locations, a quest with objectives, monsters for its encounter, loot, and DM notes (written as a private journal entry, not prose guidance bolted onto the UI). `loadSampleAdventure(campaignId, id)` writes all of it into a campaign's real stores (npcs/lore_pages/quests/quest_objectives/monsters/journal_entries) — reachable from the DM Dashboard → "📥 Load a Sample Adventure," loadable into any campaign, not just the demo.
  - **6 original monsters** total across the three adventures (2 each) — satisfies the 6+ monster seed requirement without a separate disconnected monster list, since they're the actual encounter content for playable adventures.
  - **Demo campaign**: "🎲 Try the Demo Campaign" on the landing screen (`createDemoCampaign()`) creates, in one tap: a campaign with AI DM enabled, a player character (pregen), a **curated, fixed** 3-bot party (deterministic, unlike the random "Fill Party" generator, so the demo is the same every time) with distinct temperaments/combat styles, and the full tutorial adventure loaded (2 NPCs, 1 location, a 3-objective quest, 2 monsters, opening narration). Verified live: the demo campaign renders correctly on campaign detail, and its seeded monster can be pulled straight into a real, playable combat encounter via the existing Encounter Builder.
  - **4 pregenerated characters** — already existed from Phase 2 (Kessa Ironvale, Orin Vasker, Tamsin Reyet, Brother Halden); confirmed still selectable and correctly populated.
  - **README.md finalized**: demo/sample-adventure quick start, full feature list, GitHub Pages deployment steps with the service-worker caveat called out explicitly, backup instructions, dev/build/test workflow.
  - **TEST_PLAN.md**: the 12-item manual critical-path checklist was actually run (not just written) and recorded as a results table — 11 of 12 items pass outright; item 11 (fully offline) is marked partially verified with the service-worker caveat explained above.
  - **Mobile usability spot check**: at a 375px viewport, confirmed no horizontal overflow anywhere, dice-tray touch targets measure 73×73px (well above the 44px minimum), bottom-nav buttons are 52px tall.
  - **Full regression**: **81/81 automated tests passing**, full rebuild (`npm run build`) verified clean.
  - One minor, non-blocking issue found and documented (not fixed, given low severity): starting a combat encounter from a monster-library pick creates a fresh duplicate `monsters` row rather than reusing the library entry's id — harmless (no state corruption, no gameplay impact), just mild library-list clutter over time.

## Post-launch additions (after Phase 7, on request — see DECISIONS.md D19)
User asked for a further batch of enhancements after the 7-phase build was reviewed as complete. All delivered and verified:
- **Rest mechanics**: per-character short/long rest buttons on the character sheet, plus a party-wide short/long rest on the Table screen. Long rest fully restores HP/spell slots/clears conditions; short rest heals a rolled `1d8+CON`. Verified live: damage → short rest (partial heal) → long rest (full heal), all correctly persisted (an initial test read looked wrong purely due to the save debounce timing in the test itself, not the feature — re-verified cleanly with longer waits).
- **Condition mechanical reminders**: original (non-SRD) one-line notes surfaced automatically on the character sheet and combat cards wherever a known condition is present.
- **Encounter difficulty heuristic**: a rough, clearly-labeled "Easy/Moderate/Hard/Deadly" estimate shown in the Encounter Builder as monsters are added.
- **Portraits**: character sheets and map tokens both gained optional image upload; tokens render the image circle-clipped on the map.
- **Search**: added to NPC Manager, Quest Tracker, and Journal & Lore (appears once a list exceeds 4 items). Caught and fixed a real focus-loss bug during testing — the app's full-re-render pattern was kicking the cursor out of the search box on every keystroke; fixed with explicit focus/caret restoration, verified by simulating character-by-character typing and confirming the input stayed focused throughout.
- **Content packs**: lighter-than-full-campaign export/import for homebrew content only (items/spells/features/conditions/tables/monsters), for sharing between campaigns. Verified with a clean isolated export→import round-trip into a fresh campaign.
- **AoE effect application (the map/combat bridge)**: the map view's AoE tool can now apply a rolled damage/heal formula plus an optional condition to whatever's standing in the highlighted cells, resolving through an active encounter's live combatant when one exists. This is the piece that connects Map View and Combat, which were previously fully independent systems. Verified live end-to-end: placed a token for an active encounter's monster, targeted it with a circle AoE, applied 4d6 damage + Prone, confirmed the encounter's actual combatant HP and conditions updated.
- **Bot spellcasting**: bots with a known spell (from the character's `spellsKnown` matched against a homebrew spell with a combat-usable damage/heal formula) can heal without the `isHealer` flag, or — at Advanced tier — cast a damage spell instead of attacking. Verified live: gave a bot a fire spell, set her to Advanced, ran her turn in combat, confirmed the log shows "casts Ember Lash... for 5" with correct HP reduction.
- **Map travel**: `campaign.currentMapId` tracks the party's current location across multiple linked maps; "🧭 Travel Here" on the Map List switches it and logs the journey; the current location shows as a badge on campaign detail.
- **Hex grid**: `FEATURE_FLAGS.hexGrid` flipped on. New `src/hex-core.mjs` (pointy-top axial coordinates) provides distance/radius/line/cone/line-of-sight math with 17 unit tests. Map View now branches its cell rendering, tap-to-cell conversion, movement range, AoE shapes, and line-of-sight through grid-type-dispatch helpers so hex and square maps share almost all the surrounding UI code. Verified live: created a hex map (confirmed `<polygon>` cells render, not `<rect>`), dragged a token to a specific predicted hex cell and confirmed it landed exactly there, confirmed AoE circle highlighting and wall-blocked line-of-sight (correctly red) both work on the hex grid.
- Dev test harness grew to **116/116 tests passing** across 7 files (added `tests/encounter-core.test.mjs` and `tests/hex-core.test.mjs`, extended `tests/bot-ai-core.test.mjs` for spellcasting).

## In progress
- Nothing. All 7 planned phases plus the post-launch addition batch are complete.

## Blocked
- None.

## Final acceptance review (against the master brief's Definition of Done and Non-Goals)

**Definition of Done — all items met**, with one explicit caveat:
1. Create a campaign and character on a phone. ✅
2. Bots fill the rest of the party automatically with distinct personalities. ✅
3. Chat/narrate in the log and roll dice. ✅
4. Run a simple encounter with initiative tracking. ✅
5. Bots participate in conversation (templated) and combat automatically. ✅
6. App saves data locally and survives closing/reopening. ✅
7. App works without any official D&D content. ✅ (all names/content are original homebrew — see D11/D12)
8. App works fully offline with zero external API calls. ✅ for the standalone-file path (verified every phase; zero runtime `fetch`/XHR to any external host anywhere in the codebase). **⚠️ Caveat**: the installed-PWA path's offline behavior depends on service-worker registration, which could not be end-to-end verified in this project's sandboxed test browser — see the README/TEST_PLAN caveat. This is the single open item before calling the *installed-PWA* deployment path fully verified; the core deliverable (the standalone file) is unaffected.
9. Campaign/character export and import both work. ✅ — verified with a real delete-the-database-and-reimport test, not just a code read-through.
10. The core play loop (log, dice, character sheet, initiative) is comfortable to use one-handed on a phone. ✅ — confirmed via viewport/touch-target measurement.

**Non-goals — none violated**: no voice/video chat, no multiplayer, no accounts/auth, no payments/subscriptions, no official D&D/WotC content, no D&D Beyond integration, no LLM/cloud AI of any kind (every "AI" behavior in this app — bot dialogue, bot combat, the scripted DM, content generation — is a deterministic decision tree, weighted random table, or template with slot-filling), no native mobile app (PWA only), no complex 3D (a simple 2D SVG grid), no accessibility certification attempted (semantic HTML and reasonable contrast only, per brief), no public social features, no marketplace, no monetization, no server-side code of any kind.

**Overall assessment: ready for personal use.** The one thing worth doing before relying on the installed-PWA (GitHub Pages) deployment specifically is a two-minute real-browser check — deploy, open DevTools → Application → Service Workers, confirm "activated," then test with the network disabled. The standalone `index.html` file (the primary, always-works deliverable per the brief) needs no such check and has been exercised extensively throughout all 7 phases.

## Known risks / follow-ups
- **Service worker registration unverified in a real browser** (see above) — the single most important thing to check before depending on offline PWA install.
- Monster-library duplicate-row-on-encounter-start (see Phase 7 notes above) — cosmetic, not urgent.
- Bot/monster combat behavior is now attack/cast/heal/hold (spellcasting added post-launch, D19) but still has no multi-attack or spell-slot resource tracking, and combat automation always auto-applies regardless of automation level (D14/D15) — deliberate scope decisions, would be natural targets for a future session if ever revisited.
- AoE templates can now apply damage/heal/conditions via the map view's "Apply Effect" action (D19), closing most of D17's original gap — it's still a manual DM-driven step (roll once, apply to whoever's standing there), not a full Effect DSL with per-target saves/resistances, which remains out of scope.
- `maps.blockedCells`, `encounters.combatants`, and `campaign.currentMapId` extend DATA_MODEL.md's originally-specified shapes (D16/D13/D19) — documented, intentional, not drift.
- Hex maps use a rectangular `{q,r}` loop rather than an offset-coordinate correction, so the grid's visible outline is a parallelogram rather than a true rectangle (D19) — the underlying hex math is fully correct regardless; this only affects the shape of the playable area at the map's edges.
