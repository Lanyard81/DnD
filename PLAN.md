# PLAN.md — FableTable Solo

Phased build plan. Each phase ends in a runnable, demoable state — not a partial feature you can't see. Phases are scoped to keep review/testing tractable; later phases build strictly on earlier ones per ARCHITECTURE.md's dependency table.

## Phase 0 — Scaffolding & foundations
- Repo skeleton: `index.html`, `README.md`, `manifest.json`, `sw.js`, `/icons` placeholders.
- Section-banner structure inside `index.html` per ARCHITECTURE.md §5.
- `DB` module (IndexedDB wrapper) with schema creation/versioning for all stores in DATA_MODEL.md.
- Theme system: 4 CSS-variable theme palettes + switcher, applied at `<html>` root.
- App shell/router: bottom tab nav (phone-first), screen containers, empty-state placeholders for every screen listed in the brief.
- Seeded RNG utility (D6) + uid helper.
- **Demo:** open the file, see themed landing screen, switch themes, empty campaign list, no console errors, works from `file://`.

## Phase 1 — Campaigns & characters (no bots/combat yet)
- Campaign list, campaign creation wizard (name/description/rulesProfile/automationLevel/aiDmEnabled/theme/playMode), campaign detail view, archive/delete with export-before-delete prompt.
- Character data model + validators.
- Character creation wizard (ability score entry, class/species/background pick from seed lists, derived stats calculated).
- Full character sheet view/edit (all fields from the brief).
- Character list per campaign.
- Persistence round-trip: close/reopen browser retains state.
- **Demo:** create a campaign, create a character by hand, edit every sheet field, reload the page, data is still there.

## Phase 2 — Dice system & unified log
- Dice tray UI: d4/d6/d8/d10/d12/d20/d100, custom formula input, advantage/disadvantage, animated roll presentation.
- `dice_rolls` persistence + roll history view.
- Unified session log: narration/dialogue/ooc/emote/system entry types, IC/OOC visual distinction, manual entry composer.
- Log export (Markdown/plain text).
- **Demo:** roll dice from the tray, see results animate and land in the log and history, add manual log entries, export the log as Markdown.

## Phase 3 — Rules Engine core + Light/Medium automation
- `RulesEngine` module: Action validation/resolution/apply/emit pipeline (ARCHITECTURE.md §2.1), wired to the Event Bus.
- Ability checks, attack rolls, damage rolls, saving throws, skill checks, proficiency bonus math, initiative calculation — Medium tier.
- Conditions tracking, spell slot tracking (data + UI, not yet effect-driven).
- Manual override path (`manual_override` action) logged distinctly.
- Unit tests (Vitest, dev-only) for dice math, modifiers, initiative ordering.
- **Demo:** perform an ability check and an attack roll through the engine (not just the raw dice tray), see HP/conditions update, override an HP value and see it logged as an override.

## Phase 4 — Bot party AI (out of combat + combat)
- `bots` data model + bot creation (trait-based: temperament/bonds/fears/goals/quirks/speaking style/combat style).
- Phrase-bank templated dialogue engine, trigger-keyed (party wipe, level up, new location, player command, low HP, etc.).
- Recognized player command grammar ("focus X", "hold position", "flee", "use potion").
- `BotAI` combat decision trees: Simple / Moderate (default) / Advanced tiers.
- Pre-seeded bot party (3–4 bots, distinct personalities) as demo content.
- **Demo:** enter the table view with a bot party seeded in, bots comment in the log on scene entry, give a party command and see a bot react, bots take an automatic action when it's their turn.

## Phase 5 — Combat: initiative tracker + theater-of-the-mind
- `encounters` + `initiative_entries` data/UI: start combat, roll/enter initiative, turn order, round counter, active combatant highlight.
- Combat log entries wired through Rules Engine actions.
- Bots take full automatic turns in combat (attack/heal/protect per combat style).
- Player turn UI: attack/cast/use item/move(theater-of-mind)/end turn.
- **Demo:** start an encounter with the seeded bot party vs. seeded monsters, run a full combat round with player + bot turns, initiative advances correctly, HP/conditions update live, combat ends cleanly.

## Phase 6 — Map/board (grid combat) + tokens
- `GridSystem` abstraction + `SquareGrid` implementation (D7); `HexGrid` stub behind feature flag.
- Map data/UI: multiple maps per campaign, background image or placeholder, pan/zoom, touch drag-to-move tokens, pinch-to-zoom.
- Token placement/movement, movement range display, basic line-of-sight, fog of war (reveal/hide cells, DM-only hidden areas).
- Promote a theater-of-the-mind encounter to grid mode.
- **Demo:** run the same seeded encounter on a grid map on a touch-emulated phone viewport — drag tokens, see movement range, reveal fog, verify basic LoS blocking.

## Phase 7 — Heavy automation: Effect DSL + AoE
- `effects` data model + interpreter (triggers, target selectors, operations) per ARCHITECTURE.md §2.2.
- AoE templates (circle/square/cube/cone/line) placeable on the grid.
- Opportunity attacks, movement range enforcement, cover, automatic calculation hooks where feasible.
- Sample effects wired to a handful of seed spells/items/monster abilities.
- **Demo:** cast a seeded AoE spell (e.g. templated "burst" effect), see the template placed on the grid, see it correctly apply damage/conditions to all combatants inside it, trigger an opportunity attack by moving out of a threatened square.

## Phase 8 — Scripted DM AI + content generation
- `ScriptedDM` module: scene narration assembly, NPC dialogue from templates, structured choice presentation, roll-calling, outcome interpretation, "what do you do?" verb-set free text.
- `ContentGen` module: weighted random tables for NPCs/quests/loot/locations/wilderness encounters/names, mature-content toggle with hard boundaries enforced.
- Quest tracker, NPC manager, encounter builder, random tables UI, loot generator, XP tracker — DM dashboard screens.
- **Demo:** enable AI DM on a fresh campaign, get narrated into a scene, get offered structured choices, trigger a random encounter/NPC/loot generation, see quest tracker update from a scripted DM action.

## Phase 9 — Memory store wiring
- `campaign_memory` / `bot_memory` read/write wired into BotAI, ScriptedDM, ContentGen (they already have the data model from Phase 0, this phase is the *usage* wiring + pruning rules).
- NPC standing, party bonds, tagged facts UI (visible in DM dashboard + character/NPC detail).
- **Demo:** have a bot recall a fact set earlier in the session (e.g., NPC standing shifts after a choice, a bot references "last time we met X" via templated recall).

## Phase 10 — Homebrew editor + import/export polish
- Schema-driven forms for races/classes/subclasses/backgrounds/spells/items/monsters/npcs/feats/conditions/random tables/loot tables/quests/locations/maps/handouts.
- Full export/import surface: campaign JSON, character JSON, content packs, log Markdown, quest/journal export, maps/tokens export — all reachable from a persistent Backup entry point.
- Import validation + warnings, conflict handling (remap vs. replace).
- **Demo:** homebrew a new monster and spell, use them in an encounter, export the full campaign, wipe IndexedDB (simulate storage loss), import the backup, verify full round-trip including the homebrew content.

## Phase 11 — Sample adventures + seed content pass
- 3 original sample adventures (tutorial / wilderness / mystery-urban): premise, NPCs, locations, objectives, encounters, loot, DM notes, structured scripted-DM data.
- Seed data completeness pass: 1 demo campaign, 1 tutorial quest, 1 combat encounter, pregenerated bot party, 4+ characters, 6+ monsters, several items/spells/features, several random tables, example maps/placeholder tokens.
- **Demo:** play the tutorial adventure start-to-finish solo using only seed content, no manual data entry required.

## Phase 12 — PWA packaging + offline hardening + final QA
- `manifest.json` + `sw.js` cache-first shell, install prompt, icons.
- Offline verification (airplane mode after first load, both standalone-file mode and GitHub-Pages-installed mode).
- Full TEST_PLAN.md critical-path pass (manual), phone one-handed usability pass on the table/session view.
- README finalization: run instructions, GitHub Pages deploy instructions, storage-persistence caveat/backup reminder.
- **Demo:** install as PWA on phone, go to airplane mode, play a full session end to end.

## Cut-line / feature flags
Anything that threatens phase-6/7 timelines gets flagged rather than cut silently (per prompt instruction): candidates are hex grid (already flagged, D7), Advanced bot combat AI tier (Simple/Moderate ship first, Advanced can trail), and the src-split build step (D9, only if file size forces it). All tracked in STATUS.md as they come up.

## Sequencing note
Phases 0–3 are foundational and should not be reordered. Phases 4–9 are the "solo play loop" and are the actual MVP per the brief's Definition of Done — Phase 5 (theater-of-mind combat) is arguably DoD-complete without Phase 6/7 (grid/AoE), which are meaningfully separable enhancements. If time-constrained, **Phases 0–5 + 8 (light) + 11 (light) + 12 constitute a defensible "MVP-minus" cutline** — flag this explicitly if we need to stop early.
