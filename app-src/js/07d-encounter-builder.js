/* ---- Encounter builder ---- */
async function ScreenEncounterBuilder(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const characters = await DB.getAllByIndex('characters', 'campaignId', campaignId);
  const bots = await DB.getAllByIndex('bots', 'campaignId', campaignId);
  const botByCharId = Object.fromEntries(bots.map(b => [b.characterId, b]));
  const libraryMonsters = await DB.getAllByIndex('monsters', 'campaignId', campaignId);
  const selected = new Set(characters.map(c => c.id));
  const monsterDrafts = [];
  let encounterName = 'Encounter';

  function render() {
    root.innerHTML = `
      <div class="field"><label for="encName">Encounter name</label><input type="text" id="encName" value="${escapeHtml(encounterName)}"></div>

      <div class="section-title">Party combatants</div>
      ${characters.length ? characters.map(c => `
        <label class="card tap" style="margin-bottom:.5rem" data-party-toggle="${c.id}">
          <div class="row between">
            <span>${escapeHtml(c.name)} <span class="hint">(${escapeHtml(c.class || 'no class')})</span></span>
            <span>${selected.has(c.id) ? '✓' : ''}</span>
          </div>
        </label>
      `).join('') : emptyState('🧙', 'No characters yet', 'Add a player character or bots before starting combat.')}

      <div class="section-title">Enemies</div>
      ${monsterDrafts.length ? (() => {
        const partyLevels = characters.filter(c => selected.has(c.id)).map(c => c.level);
        const expanded = monsterDrafts.flatMap(m => Array(m.qty).fill(m));
        const diff = assessEncounterDifficulty(partyLevels, expanded);
        const diffColor = { Easy: 'var(--success)', Moderate: 'var(--info)', Hard: 'var(--accent)', Deadly: 'var(--danger)' }[diff.label];
        return `<p class="hint">Rough difficulty guide (not a hard rule): <strong style="color:${diffColor}">${diff.label}</strong></p>`;
      })() : ''}
      ${monsterDrafts.length ? monsterDrafts.map((m, i) => `
        <div class="card">
          <div class="row between">
            <strong>${escapeHtml(m.name)} ${m.qty > 1 ? `×${m.qty}` : ''}</strong>
            <button class="icon-btn" data-remove-monster="${i}">✕</button>
          </div>
          <p class="hint" style="margin-top:.2rem">HP ${m.hp} · AC ${m.ac} · ${escapeHtml(m.attackBonus)} / ${escapeHtml(m.damageDice)} ${escapeHtml(m.damageType)}</p>
        </div>
      `).join('') : '<p class="hint">No enemies added yet.</p>'}

      ${libraryMonsters.length ? `
        <div class="card">
          <div class="section-title" style="margin-top:0">Add from Monster Library</div>
          <div class="field"><select id="libraryMonsterSelect">${libraryMonsters.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (AC ${m.ac}, ${m.hp.max} HP)</option>`).join('')}</select></div>
          <div class="row" style="gap:.5rem">
            <input type="number" id="libraryMonsterQty" value="1" min="1" max="12" style="width:5em">
            <button class="btn sm block" id="addFromLibraryBtn">+ Add</button>
          </div>
        </div>
      ` : ''}
      <div class="card">
        <div class="section-title" style="margin-top:0">Add custom enemy</div>
        <div class="field"><label for="mName">Name</label><input type="text" id="mName" placeholder="Goblin Skulker"></div>
        <div class="grid3">
          <div class="field"><label for="mHp">HP</label><input type="number" id="mHp" value="7" min="1"></div>
          <div class="field"><label for="mAc">AC</label><input type="number" id="mAc" value="13" min="1"></div>
          <div class="field"><label for="mQty">Qty</label><input type="number" id="mQty" value="1" min="1" max="12"></div>
        </div>
        <div class="grid3">
          <div class="field"><label for="mAtkBonus">Attack bonus</label><input type="text" id="mAtkBonus" value="+4"></div>
          <div class="field"><label for="mDmg">Damage</label><input type="text" id="mDmg" value="1d6+2"></div>
          <div class="field"><label for="mDmgType">Type</label><input type="text" id="mDmgType" value="piercing"></div>
        </div>
        <button class="btn sm block" id="addMonsterBtn">+ Add Enemy</button>
      </div>

      <button class="btn primary block" id="startBtn" style="margin-top:1rem">⚔ Start Encounter</button>
      <button class="btn block" id="cancelBtn">Cancel</button>
    `;
    root.querySelector('#encName').oninput = e => { encounterName = e.target.value; };
    root.querySelectorAll('[data-party-toggle]').forEach(el => {
      el.onclick = () => {
        const id = el.getAttribute('data-party-toggle');
        if (selected.has(id)) selected.delete(id); else selected.add(id);
        render();
      };
    });
    root.querySelectorAll('[data-remove-monster]').forEach(el => {
      el.onclick = () => { monsterDrafts.splice(parseInt(el.getAttribute('data-remove-monster')), 1); render(); };
    });
    const addFromLibraryBtn = root.querySelector('#addFromLibraryBtn');
    if (addFromLibraryBtn) addFromLibraryBtn.onclick = () => {
      const m = libraryMonsters.find(x => x.id === root.querySelector('#libraryMonsterSelect').value);
      if (!m) return;
      const action = m.actions[0] || {};
      monsterDrafts.push({
        libraryMonsterId: m.id,
        name: m.name, hp: m.hp.max, ac: m.ac,
        qty: clamp(parseInt(root.querySelector('#libraryMonsterQty').value) || 1, 1, 12),
        attackBonus: action.attackBonus || '+3', damageDice: action.damageDice || '1d6', damageType: action.damageType || 'bludgeoning'
      });
      render();
    };
    root.querySelector('#addMonsterBtn').onclick = () => {
      const name = root.querySelector('#mName').value.trim();
      if (!name) { toast('Give the enemy a name.', 'danger'); return; }
      monsterDrafts.push({
        name, hp: parseInt(root.querySelector('#mHp').value) || 1, ac: parseInt(root.querySelector('#mAc').value) || 10,
        qty: clamp(parseInt(root.querySelector('#mQty').value) || 1, 1, 12),
        attackBonus: root.querySelector('#mAtkBonus').value.trim() || '+3',
        damageDice: root.querySelector('#mDmg').value.trim() || '1d6',
        damageType: root.querySelector('#mDmgType').value.trim() || 'bludgeoning'
      });
      render();
    };
    root.querySelector('#cancelBtn').onclick = () => Router.go(`#/campaigns/${campaignId}`);
    root.querySelector('#startBtn').onclick = async () => {
      if (!selected.size) { toast('Select at least one party combatant.', 'danger'); return; }
      if (!monsterDrafts.length) { toast('Add at least one enemy.', 'danger'); return; }
      const partyCombatants = await Promise.all(characters.filter(c => selected.has(c.id)).map(c => combatantFromCharacter(c, botByCharId[c.id])));
      const encounter = await startEncounter(campaignId, encounterName, partyCombatants, monsterDrafts);
      toast('Combat started!', 'success');
      Router.go(`#/campaigns/${campaignId}/encounters/${encounter.id}`);
    };
  }

  render();
}
