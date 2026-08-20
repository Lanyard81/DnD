/* ---------- 1. UTILITIES ---------- */
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
function nowIso() { return new Date().toISOString(); }

// Mulberry32 seeded PRNG (public domain) — used by content generation in later phases.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeSeed() { return Math.floor(Math.random() * 0xFFFFFFFF); }

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function abilityMod(score) { return Math.floor((Number(score || 10) - 10) / 2); }
function fmtMod(n) { return n >= 0 ? '+' + n : String(n); }
function profBonusForLevel(level) { return 2 + Math.floor((Math.max(1, Number(level || 1)) - 1) / 4); }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ---- Dice/rules-core functions ----
// Mirrored 1:1 from src/rules-core.mjs (see tests/rules-core.test.mjs for unit
// coverage). Kept as plain inline functions here — not imported — so the app
// still works when opened as a standalone file with no server (see D10/D1).
// If you change behavior here, mirror the change in src/rules-core.mjs too.
function parseDiceFormula(formula) {
  if (typeof formula !== 'string') return null;
  const m = formula.trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) return null;
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const modifier = m[3] ? parseInt(m[3].replace(/\s+/g, ''), 10) : 0;
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
  return { count, sides, modifier };
}
function rollDie(sides, rng) {
  const r = rng || Math.random;
  return Math.floor(r() * sides) + 1;
}
function rollFormula(formulaOrParsed, rng) {
  const parsed = typeof formulaOrParsed === 'string' ? parseDiceFormula(formulaOrParsed) : formulaOrParsed;
  if (!parsed) throw new Error('Invalid dice formula');
  const dice = [];
  for (let i = 0; i < parsed.count; i++) dice.push(rollDie(parsed.sides, rng));
  const total = dice.reduce((a, b) => a + b, 0) + parsed.modifier;
  return { dice, modifier: parsed.modifier, total, sides: parsed.sides, count: parsed.count };
}
function rollD20(modifier, mode, rng) {
  const a = rollDie(20, rng);
  if (mode === 'advantage' || mode === 'disadvantage') {
    const b = rollDie(20, rng);
    const chosen = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
    return { rolls: [a, b], chosen, modifier: modifier || 0, total: chosen + (modifier || 0), mode };
  }
  return { rolls: [a], chosen: a, modifier: modifier || 0, total: a + (modifier || 0), mode: 'none' };
}
function sortInitiative(entries) {
  return entries
    .map((e, i) => ({ ...e, __i: i }))
    .sort((a, b) => {
      if (b.roll !== a.roll) return b.roll - a.roll;
      const bDex = b.dexMod ?? 0, aDex = a.dexMod ?? 0;
      if (bDex !== aDex) return bDex - aDex;
      return a.__i - b.__i;
    })
    .map(({ __i, ...rest }) => rest);
}

// ---- Bot AI core functions ----
// Mirrored 1:1 from src/bot-ai-core.mjs (see tests/bot-ai-core.test.mjs).
// Deterministic decision trees + templated dialogue selection — no LLM.
// If you change behavior here, mirror the change in src/bot-ai-core.mjs too.
function parseCommand(text) {
  if (typeof text !== 'string') return { type: null };
  const t = text.trim().toLowerCase();
  if (!t) return { type: null };
  let m;
  if ((m = t.match(/^focus\s+(?:on\s+)?(.+)$/))) return { type: 'focus', target: m[1].trim() };
  if (/^(hold( position)?|stay|wait)$/.test(t)) return { type: 'hold', target: null };
  if (/^(flee|retreat|fall back|run)$/.test(t)) return { type: 'flee', target: null };
  if ((m = t.match(/^use\s+(.+)$/))) return { type: 'use_item', target: m[1].trim() };
  return { type: null, target: null };
}
function filterBankByTemperament(bank, temperament) {
  if (!Array.isArray(bank) || bank.length === 0) return [];
  const tagged = bank.filter(e => Array.isArray(e.temperaments) && e.temperaments.includes(temperament));
  if (tagged.length) return tagged;
  const generic = bank.filter(e => !e.temperaments || e.temperaments.length === 0);
  return generic.length ? generic : bank;
}
function fillTemplate(template, slots) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (whole, key) => (slots && key in slots ? String(slots[key]) : whole));
}
function pickDialogueLine(bank, temperament, slots, rng) {
  const pool = filterBankByTemperament(bank, temperament);
  if (!pool.length) return null;
  const r = rng || Math.random;
  const entry = pool[Math.floor(r() * pool.length)];
  return fillTemplate(entry.text, slots || {});
}
function chooseBotAction(combatStyle, situation) {
  const livingEnemies = (situation.enemies || []).filter(e => e.hp > 0);
  if (!livingEnemies.length) return { type: 'hold' };
  const self = situation.self || {};
  const canHeal = (combatStyle === 'moderate' || combatStyle === 'advanced') && (self.isHealer || (self.spell && self.spell.type === 'heal'));
  if (canHeal) {
    const criticalAlly = (situation.allies || [])
      .filter(a => a.hp > 0 && a.hp / a.hpMax <= 0.5)
      .sort((a, b) => (a.hp / a.hpMax) - (b.hp / b.hpMax))[0];
    if (criticalAlly) return { type: 'heal', targetId: criticalAlly.id };
  }
  let pool = livingEnemies;
  if (combatStyle === 'advanced') {
    const priority = livingEnemies.filter(e => e.role === 'caster' || e.role === 'priority');
    if (priority.length) pool = priority;
  }
  const target = pool.reduce((best, e) => (e.hp < best.hp ? e : best), pool[0]);
  if (combatStyle === 'advanced' && self.spell && self.spell.type === 'damage') return { type: 'cast', targetId: target.id };
  return { type: 'attack', targetId: target.id };
}

// ---- Combat core functions ----
// Mirrored 1:1 from src/combat-core.mjs (see tests/combat-core.test.mjs).
// If you change behavior here, mirror the change in src/combat-core.mjs too.
function isCombatantDown(hp) {
  return hp === undefined || hp === null || hp <= 0;
}
function advanceTurn(order, activeIndex, hpLookup) {
  if (!order || order.length === 0) return { activeIndex: 0, roundDelta: 0 };
  let idx = activeIndex;
  let roundDelta = 0;
  let steps = 0;
  const maxSteps = order.length + 1;
  do {
    idx = (idx + 1) % order.length;
    if (idx === 0) roundDelta++;
    steps++;
  } while (isCombatantDown(hpLookup[order[idx]]) && steps <= maxSteps);
  return { activeIndex: idx, roundDelta };
}
function isSideDefeated(order, hpLookup, sideOf, side) {
  const members = order.filter(id => sideOf[id] === side);
  if (members.length === 0) return true;
  return members.every(id => isCombatantDown(hpLookup[id]));
}
function resistanceMultiplier(damageType, entity) {
  if (!damageType || !entity) return 1;
  const type = String(damageType).trim().toLowerCase();
  if (!type) return 1;
  const has = (arr) => Array.isArray(arr) && arr.some(t => String(t).trim().toLowerCase() === type);
  if (has(entity.immunities)) return 0;
  if (has(entity.resistances)) return 0.5;
  if (has(entity.vulnerabilities)) return 2;
  return 1;
}
function applyDamageWithResistance(amount, damageType, entity) {
  return Math.floor(Math.max(0, amount) * resistanceMultiplier(damageType, entity));
}
function saveBonusFor(info, ability, profBonus) {
  const abilities = (info && info.abilities) || {};
  const mod = Math.floor((Number(abilities[ability] ?? 10) - 10) / 2);
  const st = ((info && info.savingThrows) || {})[ability];
  if (typeof st === 'number') return st;
  const proficient = !!(st && st.proficient);
  return mod + (proficient ? Math.max(0, profBonus || 0) : 0);
}

// ---- Grid core functions ----
// Mirrored 1:1 from src/grid-core.mjs (see tests/grid-core.test.mjs).
// Square grid math. Hex grid math lives in 01b-hex-core.js — see D7/D19.
function gridDistance(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
function cellsInCircle(origin, radiusCells) {
  const cells = [];
  const r = Math.ceil(radiusCells);
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (Math.sqrt(dx * dx + dy * dy) <= radiusCells + 0.001) cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
  }
  return cells;
}
function cellsInSquare(origin, halfSize) {
  const cells = [];
  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      if (dx === 0 && dy === 0) continue;
      cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
  }
  return cells;
}
function bresenhamLine(a, b) {
  const points = [];
  let x0 = a.x, y0 = a.y;
  const x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return points;
}
function cellsInLine(origin, target, length) {
  if (origin.x === target.x && origin.y === target.y) return [];
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  const farPoint = { x: Math.round(origin.x + (dx / mag) * length), y: Math.round(origin.y + (dy / mag) * length) };
  return bresenhamLine(origin, farPoint).filter(p => !(p.x === origin.x && p.y === origin.y));
}
function cellsInCone(origin, target, length) {
  const dirX = target.x - origin.x, dirY = target.y - origin.y;
  const dirMag = Math.sqrt(dirX * dirX + dirY * dirY);
  if (dirMag === 0) return [];
  const cells = [];
  for (let dx = -length; dx <= length; dx++) {
    for (let dy = -length; dy <= length; dy++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > length + 0.001) continue;
      const dot = (dx * dirX + dy * dirY) / (dist * dirMag);
      if (dot >= Math.SQRT1_2 - 0.001) cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
  }
  return cells;
}
function hasLineOfSight(a, b, blockedCells) {
  const line = bresenhamLine(a, b);
  for (let i = 1; i < line.length - 1; i++) {
    if (blockedCells.has(`${line[i].x},${line[i].y}`)) return false;
  }
  return true;
}
function cellKey(cell) { return `${cell.x},${cell.y}`; }
const FEATURE_FLAGS = { hexGrid: true };
