/* ---- Homebrew library: schema-driven content types ---- */
// One generic list+form screen (07i) drives every entry here instead of
// hand-building a bespoke screen per content type. Each schema lists its
// DB store, display fields, and how to build a blank row / parse the form.
const HOMEBREW_SCHEMAS = {
  items: {
    label: 'Items', store: 'items', icon: '🎒',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['weapon', 'armor', 'gear', 'consumable', 'wondrous'] },
      { key: 'rarity', label: 'Rarity', type: 'text' },
      { key: 'cost', label: 'Cost', type: 'text' },
      { key: 'weight', label: 'Weight', type: 'number' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ],
    blank: () => ({ id: uid(), campaignId: null, type: 'gear', rarity: '', weight: 0, cost: '', description: '', effectIds: [], attunement: false, name: '' })
  },
  spells: {
    label: 'Spells', store: 'spells', icon: '✨',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'level', label: 'Level', type: 'number' },
      { key: 'school', label: 'School', type: 'text' },
      { key: 'castingTime', label: 'Casting time', type: 'text' },
      { key: 'range', label: 'Range', type: 'text' },
      { key: 'duration', label: 'Duration', type: 'text' },
      { key: 'damageDice', label: 'Damage dice (combat, optional)', type: 'text' },
      { key: 'healFormula', label: 'Heal formula (combat, optional)', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ],
    blank: () => ({ id: uid(), campaignId: null, level: 1, school: '', castingTime: '', range: '', components: '', duration: '', damageDice: '', healFormula: '', description: '', effectIds: [], name: '' })
  },
  features: {
    label: 'Features & Options', store: 'features', icon: '📘',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'source', label: 'Type', type: 'select', options: ['species', 'class', 'background', 'feat'] },
      { key: 'description', label: 'Description', type: 'textarea' }
    ],
    blank: () => ({ id: uid(), campaignId: null, source: 'feat', description: '', effectIds: null, name: '' })
  },
  conditions: {
    label: 'Conditions', store: 'conditions', icon: '🩹',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'mechanicalReminder', label: 'Mechanical reminder', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ],
    blank: () => ({ id: uid(), campaignId: null, description: '', mechanicalReminder: '', name: '' })
  },
  random_tables: {
    label: 'Random Tables', store: 'random_tables', icon: '🎲',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'entriesText', label: 'Entries (one per line: weight | text)', type: 'textarea' }
    ],
    blank: () => ({ id: uid(), campaignId: null, category: '', entries: [], name: '', entriesText: '' }),
    onLoad: (row) => ({ ...row, entriesText: (row.entries || []).map(e => `${e.weight}|${e.text}`).join('\n') }),
    onSave: (data) => ({ ...data, entries: parseWeightedLines(data.entriesText) })
  },
  loot_tables: {
    label: 'Loot Tables', store: 'loot_tables', icon: '🎁',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'entriesText', label: 'Entries (one per line: weight | item or gold amount)', type: 'textarea' }
    ],
    blank: () => ({ id: uid(), campaignId: null, entries: [], name: '', entriesText: '' }),
    onLoad: (row) => ({ ...row, entriesText: (row.entries || []).map(e => `${e.weight}|${e.text}`).join('\n') }),
    onSave: (data) => ({ ...data, entries: parseWeightedLines(data.entriesText) })
  },
  monsters: {
    label: 'Monster Library', store: 'monsters', icon: '🐉',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'ac', label: 'AC', type: 'number' },
      { key: 'hpMax', label: 'HP', type: 'number' },
      { key: 'attackName', label: 'Attack name', type: 'text' },
      { key: 'attackBonus', label: 'Attack bonus', type: 'text' },
      { key: 'damageDice', label: 'Damage dice', type: 'text' },
      { key: 'damageType', label: 'Damage type', type: 'text' },
      { key: 'attackCount', label: 'Attacks per turn (multiattack)', type: 'number' },
      { key: 'saveBonusText', label: 'Saving throw bonuses (e.g. dex:4, wis:2)', type: 'text' },
      { key: 'resistancesText', label: 'Resistances (comma-separated, e.g. fire, cold)', type: 'text' },
      { key: 'immunitiesText', label: 'Immunities (comma-separated)', type: 'text' },
      { key: 'vulnerabilitiesText', label: 'Vulnerabilities (comma-separated)', type: 'text' }
    ],
    blank: () => ({ id: uid(), campaignId: null, ac: 12, hpMax: 10, attackName: 'Strike', attackBonus: '+3', damageDice: '1d6+1', damageType: 'bludgeoning', attackCount: 1, saveBonusText: '', resistancesText: '', immunitiesText: '', vulnerabilitiesText: '', name: '' }),
    onLoad: (row) => ({
      id: row.id, campaignId: row.campaignId, name: row.name, ac: row.ac, hpMax: row.hp ? row.hp.max : 10,
      attackName: (row.actions && row.actions[0] && row.actions[0].name) || 'Strike',
      attackBonus: (row.actions && row.actions[0] && row.actions[0].attackBonus) || '+3',
      damageDice: (row.actions && row.actions[0] && row.actions[0].damageDice) || '1d6',
      damageType: (row.actions && row.actions[0] && row.actions[0].damageType) || 'bludgeoning',
      attackCount: (row.actions && row.actions[0] && row.actions[0].attackCount) || 1,
      saveBonusText: fmtSaveBonusText(row.savingThrows),
      resistancesText: (row.resistances || []).join(', '),
      immunitiesText: (row.immunities || []).join(', '),
      vulnerabilitiesText: (row.vulnerabilities || []).join(', ')
    }),
    // onSave returns a monster shape via makeMonster(); the generic screen
    // overwrites .id/.campaignId afterward so edits keep their original id.
    onSave: (data) => makeMonster({
      campaignId: data.campaignId, name: data.name, ac: data.ac, hpMax: data.hpMax,
      attackName: data.attackName, attackBonus: data.attackBonus, damageDice: data.damageDice, damageType: data.damageType,
      attackCount: data.attackCount,
      savingThrows: parseSaveBonusText(data.saveBonusText),
      resistances: parseTagList(data.resistancesText),
      immunities: parseTagList(data.immunitiesText),
      vulnerabilities: parseTagList(data.vulnerabilitiesText)
    })
  }
};

function parseTagList(text) { return (text || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean); }
function parseSaveBonusText(text) {
  const out = {};
  (text || '').split(',').forEach(part => {
    const [k, v] = part.split(':').map(s => (s || '').trim().toLowerCase());
    if (k && ABILITIES.includes(k) && v !== undefined && v !== '') out[k] = parseInt(v) || 0;
  });
  return out;
}
function fmtSaveBonusText(obj) {
  return Object.entries(obj || {}).map(([k, v]) => `${k}:${v}`).join(', ');
}

function parseWeightedLines(text) {
  return (text || '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const [w, ...rest] = line.split('|');
    return { weight: parseInt(w) || 1, text: rest.join('|').trim() };
  });
}

function validateSchemaEntity(schema, data) {
  const errs = [];
  for (const f of schema.fields) {
    if (f.required && (!data[f.key] || !String(data[f.key]).trim())) errs.push(`${f.label} is required.`);
  }
  return errs;
}
