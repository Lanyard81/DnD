# ARCHITECTURE.md — FableTable Solo

## 1. Guiding principle

**One authoritative rules engine. Everything else proposes; nothing else mutates.**

The player, the bot party AI, and the scripted DM are three *callers* that all go through the same narrow gate: a set of `Action` objects validated and applied by the Rules Engine. This is what keeps bot logic and player overrides from corrupting state, and it's what would let a future real LLM be swapped in as a fourth caller without any rewrite — it would just be another thing that proposes `Action` objects.

```
 ┌────────────┐   ┌────────────────┐   ┌──────────────────┐
 │   Player    │   │  Bot Party AI   │   │  Scripted DM AI   │
 │  (UI input) │   │ (deterministic) │   │  (deterministic)  │
 └──────┬─────┘   └───────┬────────┘   └─────────┬─────────┘
        │  propose Action  │  propose Action        │ propose Action
        ▼                  ▼                        ▼
              ┌────────────────────────────┐
              │        RULES ENGINE         │  ← single source of truth
              │  validate → resolve → apply │
              └──────────────┬──────────────┘
                              │ emits Events
                              ▼
              ┌────────────────────────────┐
              │      EVENT / LOG BUS        │
              └──────┬───────────┬─────────┘
                      ▼           ▼
              ┌───────────┐ ┌───────────────┐
              │  UI Layer  │ │ Memory Store   │
              │ (re-render)│ │ (facts/recall) │
              └───────────┘ └───────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  Persistence   │
              │  (IndexedDB)   │
              └───────────────┘
```

## 2. Layers

### 2.1 Rules Engine (`RulesEngine` module)
Pure-function core plus a thin apply/persist shell. Given the current `GameState` (in-memory, hydrated from IndexedDB) and an `Action`, it:
1. **Validates** — is this action legal given current state (turn order, resources, targeting, action economy)?
2. **Resolves** — rolls dice as needed (via the seeded RNG or the visible dice tray, depending on `automationLevel`), computes results.
3. **Applies** — produces a state diff, applies it to `GameState`.
4. **Emits** — one or more `Event` objects describing what happened, in a structured shape the log/UI/memory can all consume without re-deriving meaning from prose.

Action types (from the brief): `narration`, `request_roll`, `start_combat`, `add_npc`, `update_quest`, `give_loot`, `change_scene`, `ask_player_choice`, `set_condition`, `damage_character`, `heal_character`, plus combat-specific ones: `move_token`, `attack`, `cast_spell`, `use_item`, `end_turn`, `end_combat`.

Rules Engine is automation-level aware: at **Light**, most actions are logged as proposals requiring manual confirmation/resolution; at **Medium**, checks/attacks/damage/saves auto-resolve; at **Heavy**, the Effect DSL (below) additionally drives AoE, conditions, opportunity attacks, movement legality.

Rules Engine has **zero DOM dependencies** — it is directly unit-testable (see D10, TEST_PLAN.md).

### 2.2 Effect DSL (Heavy automation)
A small data-driven interpreter, not a hardcoded rules list. An `Effect` is a JSON-like object tree: trigger (`on_hit`, `on_cast`, `start_of_turn`, `end_of_turn`, `on_enter_area`), target selector (`self`, `single_target`, `area:circle|cube|cone|line`), and a list of operations (`damage`, `heal`, `apply_condition`, `remove_condition`, `modify_stat`, `move`, `grant_temp_hp`). Spells, items, and monster abilities reference Effects by id. This satisfies "extensible effect DSL with sample effects rather than trying to automate every rule."

### 2.3 Bot Party AI (`BotAI` module)
Deterministic decision trees, no network/LLM calls. Given a bot's `CombatStyle` (Simple/Moderate/Advanced) and the current `GameState`, produces a proposed `Action` (attack, move, cast, use item, hold). Out of combat, produces dialogue by selecting from the bot's phrase bank (see 2.5) keyed by trigger events (party wipes, level up, entering new location, player command). Recognises a small command grammar from the player ("focus caster", "hold position", "flee", "use potion") mapped to a fixed verb/target enum — no free-text NLP.

### 2.4 Scripted DM AI (`ScriptedDM` module)
Also deterministic. Consumes structured **Encounter/Location/Quest data** (see DATA_MODEL.md) and the shared **Memory Store**, and *proposes* Actions exactly like the player and bots do — it never writes directly to `GameState`. Narration text is template + slot-fill (`"{npc} eyes you warily near {location}."`), not generative prose. Presents player choices as structured option lists; free-text fallback maps against a small recognized verb set (`move|attack|talk|use|cast|rest|investigate` + target) via simple keyword matching, not parsing.

### 2.5 Content & Dialogue Generation (`ContentGen` module)
Weighted random tables + template slot-filling, driven by the seeded RNG (D6) so a given seed reproduces the same output. Powers: NPC generation, quest generation, loot generation, wilderness/random-event tables, name generation, and bot/NPC dialogue line selection (phrase banks keyed by trait tags: temperament, speaking style, combat style, current HP threshold, etc.).

### 2.6 Memory Store (`Memory` module)
Plain structured data, two scopes:
- **Campaign memory**: recent event log (ring buffer, last N=50 notable events, importance-weighted trim), tagged facts (key/value + tags), NPC standing (simple -100..+100 sentiment per NPC), quest state, party bonds.
- **Bot memory**: subset of campaign memory flagged relevant to that bot (via tags), plus bot-private facts (e.g., "player told me to hold position last combat").

No embeddings, no summarization model — pure structured reads/writes, exposed to `BotAI`, `ScriptedDM`, and `ContentGen` as plain query functions (`getFactsAboutNPC(id)`, `getRecentEvents(n)`, `getBondsFor(botId)`).

### 2.7 Event / Log Bus
Every Rules Engine action emits one or more `Event`s. The Log Bus is a simple pub/sub: UI subscribes to render the unified session log, Memory subscribes to record notable events, Persistence subscribes to append to the `log_entries`/`combat_logs`/`dice_rolls` stores. This decoupling means the rules engine never needs to know about the DOM or IndexedDB directly.

### 2.8 UI Layer
Screen components (see UI list in brief) are render functions over `GameState` + view-local state, using event delegation and the theming CSS-variable system (D2/D3). Table/session view is the primary phone-first screen: log panel, dice tray, quick character sheet drawer, and (when in combat) initiative tracker, all reachable via a bottom tab bar sized for one-handed thumb reach.

### 2.9 Persistence Layer (`DB` module)
Thin promise-based IndexedDB wrapper (D4) exposing `get/put/delete/query` per object store, plus `localStorage` helpers for small settings (theme, last-open campaign id). A `Backup` module builds/consumes the full campaign JSON export using the same validation functions as live import, so export/import round-trips are guaranteed structurally consistent.

### 2.10 PWA shell (GitHub Pages deployment only)
`manifest.json` + `sw.js` (cache-first for the app shell, no runtime network calls ever attempted). Entirely optional relative to the single-file artifact — `index.html` never references `sw.js` or `manifest.json` in a way that would break standalone file usage (registration is feature-detected and wrapped so it no-ops under `file://`).

## 3. Data flow example (combat turn, bot attacks)

1. Turn advances → `BotAI.decideTurn(bot, state)` returns `{type:'attack', actorId, targetId, weaponId}`.
2. `RulesEngine.apply(action)` validates (bot's turn, target in range/visible), resolves (rolls attack via seeded RNG, checks vs AC, rolls damage), applies (HP diff, conditions if any), returns `[Event]`.
3. Event Bus fanout: UI updates HP bar + appends combat log line + plays roll animation trace (visual only, does not re-roll); Memory appends a compact event record if notable (killing blow, crit); Persistence writes `combat_logs`/`dice_rolls`/updated `characters` row.
4. Player sees result, may **override** (edit HP, undo condition) — overrides are just another `Action` (`manual_override`) through the same engine, logged distinctly in `log_entries` so the log shows what was overridden and by whom.

## 4. Module boundary summary

| Module | Depends on | Must NOT depend on |
|---|---|---|
| RulesEngine | Effect DSL, RNG | DOM, IndexedDB directly |
| BotAI | RulesEngine (read state), Memory | DOM |
| ScriptedDM | RulesEngine (read state), Memory, ContentGen | DOM |
| ContentGen | RNG, random/loot tables | DOM, RulesEngine |
| Memory | DB | DOM |
| UI | RulesEngine (dispatch actions), Event Bus, DB (via async loads) | — (UI is the only DOM-touching layer) |
| DB | IndexedDB API | everything else |

This table is the thing to check before adding an import — if a change would violate a row, it's a sign the action/event boundary is being bypassed.

## 5. File layout (development-time, see D9/D18)

**Phases 1–5** developed `index.html` directly as one banner-commented file. **After Phase 5**, per D18, the dev-time source moved to `app-src/`:

```
app-src/
  shell.head.html    -- everything before <style> (doctype, <head>, meta tags)
  styles.css          -- all CSS (theme tokens + components)
  shell.middle.html   -- everything between </style> and <script> (the <body> shell: #app, toast region)
  shell.tail.html     -- everything after </script> (</body></html>)
  js-order.json        -- ordered list of js/*.js filenames, concatenated in this order
  js/
    00-header.js, 01-utilities.js, 02-db-layer.js, 03a..03i-*.js (data model + bots + combat + maps + DM),
    04-toast-small-ui-helpers.js, 05-router-app-shell.js,
    06a..06c-*.js (campaign/character screens), 07a..07h-*.js (table/bots/combat/map/settings screens),
    08-bootstrap.js
tools/
  build-single-file.mjs   -- Node, zero deps: concatenates app-src/ back into index.html
```

**`index.html` itself is now a generated build artifact** — edit `app-src/`, then run `npm run build` (or `node tools/build-single-file.mjs`) to regenerate it. The shipped file is still 100% self-contained (no `<script type="module">`, no reference back to `app-src/` or Node) — this split only changes how the file is *authored*, never how it *runs*. See DECISIONS.md D18 for the full rationale and the verification steps taken when the split happened (diff against the pre-split file, full in-browser smoke test).

Dev-only pure-logic modules covered by Vitest (`src/rules-core.mjs`, `src/bot-ai-core.mjs`, `src/combat-core.mjs`, `src/grid-core.mjs`) are a **separate, older mechanism** (D10) — their function bodies are mirrored by hand into the relevant `app-src/js/*.js` chunk (e.g. dice/rules functions live in `01-utilities.js`) rather than imported at runtime, so they stay covered by `npm test` without adding a runtime dependency. Don't confuse `src/` (test-only mirrors) with `app-src/` (the actual app source) — they serve different purposes and are built/consumed differently.
