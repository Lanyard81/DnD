# TEST_PLAN.md — FableTable Solo

## Automated (dev-only, not shipped in index.html)
Vitest unit tests for pure logic extracted into `src/*.mjs` and mirrored inline into the shipped app (see DECISIONS.md D10): dice/rules math, bot dialogue/command-parsing/combat-target-selection, combat turn progression, grid/AoE/line-of-sight geometry, and campaign export/import id-remapping. Run via `npm test`; never affects the shipped single file. **81/81 tests passing** as of Phase 7 across `tests/rules-core.test.mjs`, `tests/bot-ai-core.test.mjs`, `tests/combat-core.test.mjs`, `tests/grid-core.test.mjs`, `tests/backup-core.test.mjs`.

No separate lint step was added — the codebase stayed small enough per-file (after the D18 `app-src/` split) that informal review substituted adequately throughout.

## Manual critical-path checklist — results (run 2026-08-20, Phase 7)

Run on a local static server (`python -m http.server`) driving a sandboxed Chromium instance via scripted DOM/pointer-event interaction, cross-checked against IndexedDB state directly. A real-device pass (physical phone, real Chrome/Safari) has **not** been done and is called out explicitly below where it matters — see "Known limitation" notes.

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | New campaign + character via wizard | ✅ Pass | Verified every rules profile / automation level combination is selectable and persists; ability-score-driven derived stats (modifiers, proficiency bonus, initiative) compute correctly. |
| 2 | Rules profile / automation level selection persists | ✅ Pass | Confirmed across reloads throughout Phases 1–2. Medium+ automation correctly gates the character sheet's quick-roll buttons (see D-notes: Legacy/Modern remain label-only, no deeper mechanical branching — by design, not a gap). |
| 3 | Solo session starts with bots filling the party | ✅ Pass | "Fill Party with Bots" and the demo campaign both produce distinct, immediately visible personalities (temperament badges on cards). |
| 4 | Log/narration incl. bot dialogue | ✅ Pass | Narration/OOC/Emote composer, bot dialogue (scene-arrival, low-HP, command-ack), and scripted-DM narration all render with correct type-based styling and speaker attribution. |
| 5 | Dice rolling appears in log/history | ✅ Pass | Quick dice, custom formulas, advantage/disadvantage (confirmed picks correct of two rolls) all persist to `dice_rolls` and the log, survive navigation and reload; Roll History modal confirmed. |
| 6 | DM starts an encounter; initiative tracker works | ✅ Pass | Round counter, turn-order strip, active-combatant highlighting, and round rollover all confirmed live, including the demo campaign's seeded tutorial encounter. |
| 7 | Bots take at least one combat action automatically | ✅ Pass | "Run Turn" resolves `chooseBotAction` against live encounter state; verified correct target selection, correct auto-skip of a combatant that died mid-round, and correct auto-advance. (Automation is manually triggered per-turn via a button rather than a background auto-advance timer — a deliberate UX choice so a phone player always sees what happened before the turn moves on, not a missing feature.) |
| 8 | Token moves on the map | ✅ Pass | Verified via simulated `PointerEvent` drag: position snaps to grid and persists to IndexedDB; tap-to-select shows a movement-range highlight sized from the character's speed. |
| 9 | Persistence survives reload | ✅ Pass | Re-verified this phase specifically for the demo campaign (party, quest, monsters, log) and previously for combat state (HP/conditions/turn/round) and map state (tokens/walls/fog) in Phases 4–5. |
| 10 | Export/import round-trip | ✅ Pass | The strongest test performed this project: exported a campaign with homebrew content, an NPC with standing, a quest, and a private journal entry, **deleted the entire IndexedDB database** (simulating a new device), and re-imported — every value matched, with fresh non-colliding ids and all cross-references intact. Caught and fixed one real bug in the process (`campaignMemory.npcStanding` wasn't being rekeyed on import — see DECISIONS.md/STATUS.md). |
| 11 | Fully offline after first load | ⚠️ Partially verified | The standalone-file path is offline by construction (zero runtime network calls, verified across every phase — the one console message seen every session, "unknown error fetching script," was tracked down this phase and traced to service-worker registration, not app functionality). The GitHub-Pages/installed-PWA path's service worker (`sw.js`) was reviewed for correctness (proper install/activate/fetch cache-first handlers, `node --check`-clean syntax) and its file confirmed served correctly (200, correct MIME type), but **registration itself could not be completed inside this sandboxed test browser** — it appears to block ServiceWorker APIs generally, independent of `sw.js`'s content. **This needs a real-browser check before trusting installed-PWA offline behavior.** |
| 12 | One-handed phone usability of core loop | ✅ Pass | At a 375px viewport: no horizontal overflow, dice-tray buttons measure 73×73px (well above the 44px touch-target minimum), bottom nav buttons are 52px tall. Full core loop (log → dice → sheet → initiative) reachable via the 3-tab bottom nav + topbar back button. |

## Phase-specific spot checks
Each phase's PLAN.md "Demo" line was manually run and confirmed working at the time that phase was marked Completed in STATUS.md — see STATUS.md's per-phase entries for the specific scenarios exercised (they're more detailed than this table and aren't repeated here).

## Data integrity checks — results
- **Manual overrides are distinctly logged**: confirmed for HP, initiative, and turn-order overrides in combat (Phase 4) — each produces an `override`-type log entry naming what changed. Condition add/remove is logged as a normal state change (not flagged `override`) since there's no "system-proposed" condition to override in the current build — acceptable given no automated condition-application exists yet (Heavy-automation Effect DSL scope).
- **Scripted DM actions never bypass validation**: the DM never writes to IndexedDB directly — every DM action (narration/add_npc/give_loot/update_quest/ask_player_choice/request_roll) funnels through one `applyDmAction` dispatcher, structurally identical to how manual play writes the same stores. There is no separate "illegal action" path to test against because there's no privileged write path to begin with — this was a design constraint, not a runtime check.
- **Malformed import is rejected cleanly**: confirmed `validateExportPayload` rejects non-objects, missing/malformed campaign data, and non-array collections with a toast, before any `DB.put` call executes — writes are all-or-nothing after validation passes, never partial.

## Known limitations (see STATUS.md for full detail)
- Service worker registration unverified in a real browser (item 11 above) — highest-priority follow-up if actually deploying to GitHub Pages for installed-PWA use.
- Starting an encounter from a monster-library pick creates a fresh duplicate `monsters` row rather than reusing the library entry's id — harmless (no state corruption, no gameplay impact) but slightly wasteful; not fixed given it's cosmetic library-list clutter, not a correctness issue.

## Non-goals for testing
No load/performance testing (single local user), no cross-browser matrix beyond the one sandboxed Chromium instance used throughout (a real-device pass is recommended before extended use, per item 11's limitation), no accessibility audit beyond semantic-HTML/contrast sanity (per brief, not MVP focus), no security testing (no network surface to attack).
