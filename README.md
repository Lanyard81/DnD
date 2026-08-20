# FableTable Solo

A single-file, offline, 5E-compatible solo tabletop RPG companion. You play; scripted (non-LLM) logic runs the rest of the party and, optionally, the DM. No accounts, no server, no network calls at runtime.

> FableTable Solo is an independent, unofficial fan-made project. It is not affiliated with, endorsed by, or sponsored by Wizards of the Coast. All content is original/homebrew.

## Status

All 7 planned phases are complete. See [STATUS.md](STATUS.md) for the full build log and [TEST_PLAN.md](TEST_PLAN.md) for manual test results, including one known limitation worth reading before relying on installed-PWA offline use (service worker registration couldn't be verified in this project's sandboxed test browser — see below).

## Quick start: try the demo

Open `index.html` and tap **🎲 Try the Demo Campaign** on the landing screen. It creates a fully-populated campaign in one tap: a player character, a 3-bot party with distinct personalities, an NPC-and-quest-driven tutorial adventure ("The Lantern Road"), and a ready-to-run combat encounter — nothing to set up first.

Two more original sample adventures ("The Ashwake Reaches," a wilderness trek, and "The Hollow Ledger," an urban mystery) are loadable into any campaign from the DM Dashboard → **📥 Load a Sample Adventure**.

## Running it — the simple way

There is no build step to *use* the app. `index.html` is the entire thing.

1. Download `index.html` (and optionally `manifest.json`, `sw.js`, and `icons/` if you want installable-PWA offline support via GitHub Pages — see below).
2. Double-click it, or on your phone use "Open with → Browser" from your file manager or a cloud-storage app.
3. That's it — the app runs entirely from that one file. All data is stored on-device in IndexedDB.

No `npm install`, no dev server, no internet connection required after the file is on your device.

## Deploying to GitHub Pages (optional, for installable-PWA convenience)

1. Push this repository to GitHub (commit `index.html`, `manifest.json`, `sw.js`, and `icons/`).
2. In the repo settings, enable **Pages** → deploy from the `main` branch (root).
3. Once published, visiting the Pages URL on a phone should offer "Add to Home Screen" — this uses `manifest.json` and `sw.js` to cache the app shell for offline use.
4. The plain `index.html` file continues to work standalone regardless of whether you also deploy it to Pages.

**Known limitation**: `sw.js` was written and reviewed for correctness (a standard cache-first install/activate/fetch strategy, `node --check`-clean) but service-worker *registration* could not be verified end-to-end in this project's development environment (a sandboxed browser that appears to block the ServiceWorker API generally). Before relying on installed-PWA offline behavior, open your deployed Pages URL in a real browser, check DevTools → Application → Service Workers shows it as "activated," then test with the network disabled. If it doesn't register, that's a real bug to report/fix — the standalone `index.html` file is unaffected either way since it never depends on the service worker.

## Backing up your data

Everything lives in your browser's IndexedDB storage for this page/origin only. Browsers can clear this under storage pressure, and it does **not** sync across devices or survive clearing site data.

**Back up regularly** from Settings:
- **Export All Campaigns** — a full backup of every campaign (characters, bots, NPCs, encounters, maps, tokens, fog of war, quests, journal, handouts, lore, logs, dice history, homebrew content — everything).
- **Import Campaign (JSON)** — restores a campaign from a backup file. Always creates a *new* campaign with fresh ids, so importing the same file twice (or importing on a different device) never overwrites or collides with existing data. This is the "move to a new phone" path.

Per-campaign export is also available from that campaign's detail screen.

## Project structure

- `index.html` — the entire application (styles, data layer, screens, logic). **This is a generated file** — see "Editing the app" below.
- `app-src/` — the actual dev-time source (HTML shell, CSS, ~39 numbered JS chunks). Edit here, not `index.html` directly.
- `tools/build-single-file.mjs` — concatenates `app-src/` into `index.html`. Zero npm dependencies (just Node's `fs`).
- `tools/gen-icons.mjs` — generates `icons/icon-192.png` / `icon-512.png` from scratch using Node's built-in `zlib` (no image library dependency). Re-run only if you want to change the icon design.
- `manifest.json`, `sw.js`, `icons/` — the PWA shell for GitHub Pages installs. Not required for standalone file use.
- `PLAN.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `DECISIONS.md`, `STATUS.md`, `TEST_PLAN.md` — planning/design docs for this build.
- `src/*.mjs`, `tests/`, `package.json` — a **dev-only** test harness (Vitest) for pure dice/rules/bot-AI/combat/grid/backup-import math. These functions are mirrored by hand into the relevant `app-src/js/*.js` chunk so the shipped app never imports this folder or depends on Node — see [DECISIONS.md](DECISIONS.md) D10.

## Editing the app

`index.html` is built from `app-src/`, not hand-edited:

1. Edit the relevant file(s) under `app-src/` (HTML shell in `shell.*.html`, styles in `styles.css`, logic/screens in `js/*.js`, listed in build order in `app-src/js-order.json`).
2. Rebuild:
   ```bash
   npm run build
   ```
3. Open the regenerated `index.html` to check your change.

If you only need to *play*, none of this matters — just open the already-built `index.html` per "Running it — the simple way" above.

## Running the dev tests (optional)

Only needed if you're modifying the dice/rules/bot-AI/combat/grid/backup math and want to verify it. Not required to play the game.

```bash
npm install
npm test
```

81 tests across 5 files as of the last update.

## What's in the app

- **Campaigns & characters**: multiple campaigns per device, full character sheets with portrait upload, short/long rest (per-character and party-wide), 4 pregenerated sample characters, JSON import/export per character.
- **Dice & log**: animated dice tray (d4–d100, custom formulas, advantage/disadvantage), a unified session log (narration/OOC/emote/dialogue/system), Markdown log export.
- **Bot party**: generate a distinctly-personalitied 3–4-bot party in one tap, templated in-character dialogue, a small recognized command grammar ("focus X," "hold position," "flee," "use X"), three combat-intelligence tiers (including spellcasting at Advanced tier for bots with a known spell), per-bot memory of facts and recent events.
- **Combat**: initiative tracker, manual player attacks, automatic bot/monster turns (attack, cast, heal, or hold), full override controls (HP, turn order, conditions), condition mechanical reminders, combat log, a rough encounter-difficulty estimate while building an encounter.
- **Maps**: square or hex grid board with pan/pinch-zoom, drag-to-move tokens (with optional custom images) and movement-range display, fog of war (DM view vs. player view), wall-based line of sight, AoE templates (circle/square/cone/line) that can apply damage/heal/conditions to whatever's standing in them, travel between multiple linked maps.
- **Scripted DM**: templated scene narration, NPC introduction, structured "what do you do?" choices with a free-text fallback, roll requests with outcome resolution, deterministic NPC/quest/loot generation — no LLM anywhere.
- **DM tooling**: NPC manager, quest tracker, journal (with a private "DM only" hidden-screen mode), lore pages, handouts, XP/loot awarding, a campaign timeline — with search on the larger lists.
- **Homebrew editor**: schema-driven forms for items, spells (with optional combat damage/heal formulas), species/class/background/feat features, conditions, random tables, loot tables, and a monster library — all immediately usable in character creation and encounters, not just stored. Content packs let you export/import just the homebrew, separate from a full campaign.
- **Backup**: full campaign JSON export/import with automatic id remapping, verified via a real delete-the-database-and-reimport test.

## Content & safety

All species, classes, spells, monsters, NPCs, and setting content are original homebrew — no copyrighted or trademarked material is included. Bot party members and the scripted DM use deterministic decision trees, weighted random tables, and templated/slot-filled text, not a language model — nothing about this app requires or uses any AI service, and it makes zero network calls at runtime.
