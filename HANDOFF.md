# HANDOFF.md — FableTable Solo

**Session date:** 2026-08-19 to 2026-08-20
**Status at handoff:** All 7 planned phases complete, plus a post-launch enhancement batch and a bundled portrait gallery. Pushed to GitHub, deployed to Pages, and confirmed working — including offline via the service worker — on a real phone. No open verification gaps remain.

This document is a narrative summary for picking the project back up cold. The planning docs it references (PLAN.md, ARCHITECTURE.md, DATA_MODEL.md, DECISIONS.md, STATUS.md, TEST_PLAN.md) are the detailed, living record — this file is the "read this first" orientation on top of them.

---

## 1. What this project is

**FableTable Solo** — a single-file, offline, 5E-compatible solo tabletop RPG companion. The user plays; scripted (non-LLM, fully deterministic) logic runs the bot party and, optionally, the DM. No accounts, no server, no network calls at runtime. Not affiliated with Wizards of the Coast — all content is original homebrew.

The entire shipped deliverable is **one file: `index.html`**. Open it directly (double-click, or "Open with browser" on a phone) and the whole app runs — campaigns, characters, dice, combat, maps, a scripted DM, a homebrew editor, backup/restore — all backed by IndexedDB, all client-side.

## 2. Current state — the short version

- All 7 originally-planned phases are complete and were each manually verified live in-browser before being marked done.
- After the 7 phases were reviewed as finished, the user asked for a further batch of 10 enhancements ("do it all") — also complete and verified.
- 131 automated unit tests passing (`npm test`), covering every piece of non-trivial pure logic in the app.
- The repo was pushed to `https://github.com/Lanyard81/DnD` this session (initial commit, `main` branch). **GitHub Pages is enabled and confirmed working** on a real phone.
- **The service worker is confirmed working**: tested offline (airplane mode, after a first successful load) on a real phone — the app opened and functioned with no network. This closes the one verification gap left at the end of the original build.
- A **bundled portrait gallery** was added post-handoff: 25 user-supplied fantasy bust portraits, resized/compressed and shipped under `assets/portraits/`, selectable from character sheets and map-view tokens alongside the existing custom-upload option. See STATUS.md for details.
- **Deeper combat systems (D20)**: spell-slot tracking, monster multiattack, and per-target AoE saves/resistances, plus a monster-library duplicate-row fix — see §6 item 4 and STATUS.md/DECISIONS.md D20.
- **5 new sample adventures** ("The Sunken Vault," "The Widow's Orchard," "The Masked Court," "The Cinderfall Depths," "The Kraken's Toll") were added alongside the original 3, loadable into any campaign from the DM Dashboard's "Load a Sample Adventure" button — same mechanism, no new UI. 8 total now. See STATUS.md for details.
- **Visual redesign (D21)**: `app-src/styles.css` rewritten to a slate-neutral base with user-configurable primary/accent colour theming (5 presets or two hex colour pickers in Settings), replacing the old 4-way dark/parchment/minimal theme system. Fixed a real bug caught during live testing — a pre-existing browser's leftover `localStorage` value from the old theme system would crash the app on load under the new code. See STATUS.md/DECISIONS.md D21 for details.

## 3. What's been completed

### Phase 1 — Scaffold, campaigns, characters
Single-file `index.html` (later split into `app-src/`, see §5), full IndexedDB schema (30 stores per DATA_MODEL.md), 4 themes (dark fantasy / clean modern / parchment / minimal), campaign list/wizard/detail, character creation wizard, full character sheet, campaign/character JSON export, hash-based router, phone-first bottom nav.

### Phase 2 — Rules foundation and dice
Dice/rules-core pure functions (dice rolling, modifiers, advantage/disadvantage), rules-profile (Legacy/Modern) and automation-level (Light/Medium/Heavy) selection, animated dice tray, unified session log (narration/OOC/emote/dialogue/system entry types), roll history, character-sheet quick-roll buttons at Medium+ automation, 4 pregenerated sample characters, character JSON import.

### Phase 3 — Bot party system
Bot personality generator (temperament, speaking style, quirks, goals, fears, bonds), templated dialogue banks (no LLM — weighted template selection with slot-filling), a recognized player-command grammar ("focus X," "hold position," "flee," "use X"), three combat-intelligence tiers, per-bot memory (facts + recent events, persisted).

### Phase 4 — Initiative and combat
Encounter Builder (party selection + monster quick-add), initiative tracker with round/turn tracking, manual player attacks (dice-integrated), automatic bot/monster turns, full override controls (HP, turn order, conditions — each logged distinctly), combat log, auto-detection of a full party/enemy wipe.

### Phase 5 — Map, tokens, and scripted DM
Square-grid SVG map board with pan/pinch-zoom, drag-to-move tokens with movement-range display, fog of war (DM view vs. player view), wall-based line of sight, AoE templates (circle/square/cone/line), a scripted-DM panel (narrate scene → structured "what do you do?" choices → call for a roll → resolve outcome, all templated/table-driven), deterministic NPC/quest/loot generation, campaign memory.

### Dev tooling — the `app-src/` split (between Phase 5 and 6)
`index.html` had grown to ~3,550 lines. The user was asked whether to split into modules before the large Phase 6 UI work, and chose to. `index.html` is now a **generated build artifact**: source lives in `app-src/` (HTML shell + CSS + ~40 numbered JS chunks), and `tools/build-single-file.mjs` (zero npm dependencies) concatenates it back into `index.html`. Verified via `diff` against the pre-split file (one cosmetic blank-line difference) plus a full in-browser smoke test.

### Phase 6 — DM tooling, homebrew editor, and backup
A generic schema-driven Homebrew Library (one screen handles Items/Spells/Features/Conditions/Random Tables/Loot Tables/Monsters instead of seven bespoke screens — homebrew content confirmed to actually flow into character creation and encounter building, not just sit in storage). DM Dashboard hub linking NPC Manager, Quest Tracker, Journal & Lore (with a private "DM only" hidden-screen mode), Handouts, XP & Loot, Timeline. Full campaign export/import rewritten to cover *every* store (previously just campaign+characters), with automatic id remapping so import never collides with existing data — verified with a real delete-the-IndexedDB-database-and-reimport test, which caught and fixed a real bug (see §4).

### Phase 7 — Seed content, PWA polish, final review
Real PWA icons generated from scratch via Node's built-in `zlib` (no image library dependency). A genuine cache-first service worker (replacing the Phase-1 no-op placeholder) — see the verification caveat in §2/§6. Three original sample adventures with full structured DM data (NPCs, locations, quest+objectives, monsters, loot, DM notes), loadable into any campaign. A one-tap "Try the Demo Campaign" that seeds a complete curated scenario. Final acceptance review against the brief's Definition of Done and Non-Goals — written up in STATUS.md, assessed as "ready for personal use" with the service-worker caveat flagged.

### Post-launch batch (after Phase 7, user asked for "all" of a suggested list)
1. **Rest mechanics** — per-character and party-wide short/long rest.
2. **Condition mechanical reminders** — original (non-SRD-text) one-line notes shown automatically wherever conditions appear.
3. **Encounter difficulty heuristic** — a rough, clearly-labeled estimate in the Encounter Builder.
4. **Portraits** — character and token image upload.
5. **Search** — added to NPC Manager, Quest Tracker, Journal & Lore.
6. **Content packs** — lighter-than-full-campaign homebrew-only export/import between campaigns.
7. **AoE effect application** — the map view's AoE tool can now roll and apply damage/heal/conditions to whatever's standing in the template, bridging the map and live combat state (previously two fully independent systems).
8. **Bot spellcasting** — bots with a known spell can heal without the `isHealer` flag, or (Advanced tier) cast a damage spell instead of attacking.
9. **Map travel** — `campaign.currentMapId` tracks the party's current location across multiple linked maps.
10. **Hex grid** — full pointy-top axial hex math (distance/radius/line/cone/line-of-sight), `FEATURE_FLAGS.hexGrid` flipped on, Map View branches its rendering/interaction through grid-dispatch helpers so hex and square maps share almost all UI code.

Every item above was verified live in-browser, not just unit-tested — see STATUS.md's "Post-launch additions" section for the specific verification performed on each.

## 4. Failed approaches / bugs found and fixed during the session

Worth knowing about because they represent real lessons, not just a changelog:

- **`campaignMemory.npcStanding` wasn't rekeyed on import.** The full-campaign-export id-remapping logic (`remapCampaignExportIds`) walks a fixed table of "this field references that collection" rules, but `npcStanding` is a free-form `{npcId: value}` object, not a flat field — so NPC standing survived an import but pointed at ids that no longer existed. Caught by the real delete-database-and-reimport test (not by unit tests, which is exactly why that test was worth doing manually). Fixed with a dedicated rekeying pass, and a regression test was added.
- **Search inputs lost keyboard focus on every keystroke.** The app's UI pattern throughout is "replace the whole screen's `innerHTML` on any state change." That's fine for buttons and selects, but for a live-search text input it means the DOM node gets destroyed and recreated after every character typed, kicking focus out. Fixed by explicitly re-focusing and restoring cursor position after each re-render; verified by simulating character-by-character typing and confirming focus survived.
- **A test run initially looked like it found a rest-mechanics bug** (long rest appeared to leave HP at 11/12 instead of fully healing). This turned out to be a **test-timing artifact**, not a real bug: the character sheet's HP fields save through a 400ms-debounced write, and the test's `sleep(300)` calls between actions were shorter than that debounce window, so later DB reads were catching pre-write state. Re-run with longer waits confirmed the feature was correct all along. Lesson for future testing in this codebase: always wait *longer than 400ms* after any character-sheet field edit before reading IndexedDB state directly, or trigger a page navigation/reload to force a flush.
- **Starting a combat encounter from a monster-library pick creates a duplicate `monsters` row** rather than reusing the library entry's id. Found, understood (the Encounter Builder's `startEncounter` always calls `makeMonster()` fresh from whatever draft data it has, regardless of whether that draft originated from typed-in fields or a library selection), and **left unfixed** — it's cosmetic clutter in the monster list over repeated play sessions, not a state-corruption or gameplay bug. Worth a quick fix later if it bothers you in practice.
- **Service worker registration could not be verified end-to-end.** Every single console check throughout the *entire* session (all 7 phases, from Phase 1 onward) showed one recurring message: `"An unknown error occurred when fetching the script."` For most of the session this was dismissed as unrelated harness noise. In Phase 7, it was specifically traced to `navigator.serviceWorker.register()` failing — not because of anything wrong with `sw.js` (the file is syntactically valid, served with the correct MIME type, and implements a standard cache-first strategy), but because the sandboxed browser used for all in-session testing appears to block the ServiceWorker API generally. **This is the single most important thing to verify before trusting the installed-PWA offline path** — see §6.

## 5. Where things live (repo map)

- **`index.html`** — the shipped deliverable. **Generated, do not hand-edit** — it will be silently overwritten by the next build.
- **`app-src/`** — the actual dev-time source. Edit here: `shell.head.html` / `shell.middle.html` / `shell.tail.html` (static HTML skeleton), `styles.css` (all CSS), `js/*.js` (~40 numbered chunks, concatenation order listed in `js-order.json`).
- **`tools/build-single-file.mjs`** — run `npm run build` after any `app-src/` edit to regenerate `index.html`. Zero npm dependencies.
- **`tools/gen-icons.mjs`** — regenerates `icons/icon-192.png` / `icon-512.png` from scratch (hand-rolled PNG encoding via Node's `zlib`, no image library). Only needs re-running if you want to change the icon design.
- **`src/*.mjs`** — dev-only pure-logic modules covered by Vitest (`rules-core`, `bot-ai-core`, `combat-core`, `grid-core`, `hex-core`, `encounter-core`, `backup-core`). **These are mirrored by hand into the relevant `app-src/js/*.js` chunk**, not imported at runtime — the shipped app has zero dependencies on this folder. If you change logic in one, you must copy the change into its mirror too (each mirror has a comment noting this).
- **`tests/`** — Vitest tests for everything in `src/`. Run with `npm test`. 131 tests, all passing as of this handoff.
- **Planning docs** (root): `PLAN.md` (phase plan), `ARCHITECTURE.md` (system design), `DATA_MODEL.md` (IndexedDB schema), `DECISIONS.md` (every non-obvious call made, numbered D1–D19, each with a "why" — read this if something looks like a strange choice, it's probably explained there), `STATUS.md` (living build log, most detailed of all these docs), `TEST_PLAN.md` (manual critical-path checklist with recorded results).
- **`manifest.json`, `sw.js`, `icons/`** — the PWA shell for GitHub Pages installs. Not required for standalone-file use.
- **`Prompt.docx`** — the original master prompt/spec document the user provided at project start. Included in the repo for reference.

## 6. Outstanding items / next steps

Roughly in priority order:

1. ~~Enable GitHub Pages~~ — **done.** Live and confirmed working on a real phone.
2. ~~Verify the service worker on a real device~~ — **done.** Confirmed working offline (airplane mode, after a first successful load) on a real phone. This was the last genuinely open item from the original 7-phase build; both it and Pages deployment are now closed out.
3. ~~Decide whether the monster-library-duplicate-row quirk is worth fixing~~ — **fixed.** Library-picked encounter drafts now reuse the source `monsters` row instead of duplicating it.
4. ~~Optional deeper systems~~ — **done (D20).** Spell-slot tracking (bots now consume a real slot on cast, falling back to a mundane attack when depleted), monster multiattack (`actions[].attackCount`, both bot and manual turns), and per-target saves/resistances on AoE effects (each target now rolls its own save and has its own resistance/immunity/vulnerability applied, via new Monster Library form fields) are all implemented, unit-tested (15 new tests, 131 total), and verified live. See STATUS.md and DECISIONS.md D20 for the exact scope boundaries (e.g. only damage-spell casts consume slots, not spell-triggered heals; characters have no UI to set resistances yet, only monsters do).
5. **General**: no other known bugs or half-finished work. Every phase and every post-launch item was verified live before being called done; STATUS.md's "Known risks / follow-ups" section (kept current throughout) is the authoritative list if anything above seems stale.

## 7. How to pick this back up

```bash
git clone https://github.com/Lanyard81/DnD.git
cd DnD
npm install        # only needed for tests/build tooling, not to play the app
npm test           # 131 tests should pass
npm run build       # regenerates index.html from app-src/ (no-op if app-src/ untouched)
```

To just play: open `index.html` directly in a browser, or use the phone-transfer instructions already given to the user earlier this session (cloud storage upload is easiest).

To resume development: read DECISIONS.md first for the "why" behind anything surprising, then STATUS.md for exactly where things stand, then dig into `app-src/` for the code itself.
