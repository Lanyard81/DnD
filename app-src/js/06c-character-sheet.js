/* ---- Character sheet (view/edit) ---- */
async function ScreenCharacterSheet(root, campaignId, characterId) {
  const char = await DB.get('characters', characterId);
  if (!char) { root.innerHTML = emptyState('❓', 'Character not found'); return; }
  const campaign = await DB.get('campaigns', campaignId);
  const quickRollsEnabled = !!(campaign && AUTOMATION_INFO[campaign.automationLevel] && AUTOMATION_INFO[campaign.automationLevel].quickRolls);
  let tab = 'main';
  const TABS = [
    { id: 'main', label: 'Main' },
    { id: 'skills', label: 'Skills & Saves' },
    { id: 'combat', label: 'Combat' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'notes', label: 'Notes' }
  ];

  const save = debounce(async () => { char.updatedAt = nowIso(); await DB.put('characters', char); }, 400);

  function render() {
    root.innerHTML = `
      <div class="card">
        <div class="row" style="gap:.7rem;align-items:center">
          <button id="portraitBtn" style="flex-shrink:0;width:56px;height:56px;border-radius:50%;border:1px solid var(--border);background:${char.portraitImage ? `url('${char.portraitImage}') center/cover` : 'var(--bg-input)'};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.3rem;padding:0">${char.portraitImage ? '' : '🧙'}</button>
          <div style="flex:1;min-width:0">
            <div class="row between">
              <h2 style="margin:0">${escapeHtml(char.name || 'Unnamed')}</h2>
              <button class="icon-btn" id="deleteCharBtn">🗑</button>
            </div>
            <p style="margin:.2rem 0 0">${escapeHtml([char.species, char.class, char.subclass].filter(Boolean).join(' · ') || 'No species/class set')} ${char.controlledBy === 'bot' ? '· <span class="badge accent">Bot</span>' : ''}</p>
          </div>
        </div>
        <input type="file" id="portraitFile" accept="image/*" style="display:none">
      </div>
      <div class="tabbar">${TABS.map(t => `<button data-tab="${t.id}" class="${tab === t.id ? 'active' : ''}">${t.label}</button>`).join('')}</div>
      <div id="tabBody"></div>
    `;
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.getAttribute('data-tab'); render(); });
    root.querySelector('#deleteCharBtn').onclick = async () => {
      const ok = await confirmDialog(`Delete ${char.name || 'this character'}?`, { okLabel: 'Delete', danger: true });
      if (!ok) return;
      await DB.delete('characters', characterId);
      toast('Character deleted.', 'success');
      Router.go(`#/campaigns/${campaignId}`);
    };
    root.querySelector('#portraitBtn').onclick = () => root.querySelector('#portraitFile').click();
    root.querySelector('#portraitFile').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      char.portraitImage = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); });
      await DB.put('characters', char);
      render();
    };
    const body = document.getElementById('tabBody');
    body.innerHTML = tabHtml();
    wireTab(body);
  }

  function tabHtml() {
    if (tab === 'main') return `
      <div class="grid6">
        ${ABILITIES.map(a => `
          <div class="statbox">
            <div class="label">${a.toUpperCase()}</div>
            <input type="number" id="ab_${a}" value="${char.abilities[a]}" style="text-align:center;background:transparent;border:none;font-size:1.1rem;font-weight:700;padding:0" min="1" max="30">
            <div class="sub">${fmtMod(abilityMod(char.abilities[a]))}</div>
          </div>
        `).join('')}
      </div>
      <div class="grid3" style="margin-top:.7rem">
        <div class="statbox"><div class="label">HP</div>
          <div class="row" style="justify-content:center;gap:.2rem">
            <input type="number" id="hpCur" value="${char.hp.current}" style="width:3.2em;text-align:center;background:transparent;border:none;font-weight:700">/
            <input type="number" id="hpMax" value="${char.hp.max}" style="width:3.2em;text-align:center;background:transparent;border:none;font-weight:700">
          </div>
          <div class="sub">Temp <input type="number" id="hpTemp" value="${char.hp.temp}" style="width:2.6em;text-align:center;background:transparent;border:none"></div>
        </div>
        <div class="statbox"><div class="label">Armor Class</div><input type="number" id="acVal" value="${char.ac}" style="text-align:center;background:transparent;border:none;font-size:1.3rem;font-weight:700;padding:0"></div>
        <div class="statbox"><div class="label">Initiative</div><div class="value">${fmtMod(abilityMod(char.abilities.dex))}</div></div>
        <div class="statbox"><div class="label">Speed</div><input type="number" id="speedVal" value="${char.speed}" style="text-align:center;background:transparent;border:none;font-size:1.3rem;font-weight:700;padding:0"></div>
        <div class="statbox"><div class="label">Prof. Bonus</div><div class="value">+${profBonusForLevel(char.level)}</div></div>
        <div class="statbox"><div class="label">Level / XP</div>
          <div class="row" style="justify-content:center;gap:.2rem">
            <input type="number" id="lvlVal" value="${char.level}" min="1" max="20" style="width:2.6em;text-align:center;background:transparent;border:none;font-weight:700">/
            <input type="number" id="xpVal" value="${char.xp}" style="width:3.6em;text-align:center;background:transparent;border:none">
          </div>
        </div>
      </div>
      <div class="section-title">Conditions</div>
      <div class="chip-list" id="condList">
        ${char.conditions.map((c, i) => `<span class="chip">${escapeHtml(c.conditionId)}<button data-remove-cond="${i}">✕</button></span>`).join('') || '<span class="hint">No active conditions.</span>'}
      </div>
      ${char.conditions.map(c => getConditionReminder(c.conditionId)).filter(Boolean).length ? `
        <p class="hint" style="margin-top:.3rem">${char.conditions.map(c => { const r = getConditionReminder(c.conditionId); return r ? `<strong>${escapeHtml(c.conditionId)}:</strong> ${escapeHtml(r)}` : ''; }).filter(Boolean).join(' · ')}</p>
      ` : ''}
      <div class="list-add-row"><input type="text" id="condInput" list="condSuggestList" placeholder="Add condition (e.g. Prone)"><button class="btn sm" id="condAddBtn">Add</button></div>
      <datalist id="condSuggestList">${Object.keys(CONDITION_LIBRARY).map(c => `<option value="${c[0].toUpperCase() + c.slice(1)}">`).join('')}</datalist>

      <div class="section-title">Rest</div>
      <div class="row wrap">
        <button class="btn sm" id="shortRestBtn">🏕 Short Rest</button>
        <button class="btn sm primary" id="longRestBtn">🌙 Long Rest</button>
      </div>
    `;
    if (tab === 'skills') return `
      ${quickRollsEnabled ? `<p class="hint">Medium+ automation: tap 🎲 to roll and post the result to the table log.</p>` : ''}
      <div class="section-title">Saving throws</div>
      ${ABILITIES.map(a => `
        <div class="skill-row">
          <button class="prof-toggle ${char.savingThrows[a].proficient ? 'on' : ''}" data-save-prof="${a}"></button>
          <span class="sk-name">${ABILITY_LABELS[a]} save</span>
          <span class="sk-mod">${fmtMod(abilityMod(char.abilities[a]) + (char.savingThrows[a].proficient ? profBonusForLevel(char.level) : 0))}</span>
          ${quickRollsEnabled ? `<button class="icon-btn" data-roll-save="${a}" style="width:32px;height:32px;font-size:1rem">🎲</button>` : ''}
        </div>
      `).join('')}
      <div class="section-title">Skills</div>
      ${SKILLS.map(s => `
        <div class="skill-row">
          <button class="prof-toggle ${char.skills[s.id].proficient ? 'on' : ''}" data-skill-prof="${s.id}"></button>
          <span class="sk-name">${s.label} <span class="hint">(${s.ability})</span></span>
          <span class="sk-mod">${fmtMod(abilityMod(char.abilities[s.ability]) + (char.skills[s.id].proficient ? profBonusForLevel(char.level) : 0))}</span>
          ${quickRollsEnabled ? `<button class="icon-btn" data-roll-skill="${s.id}" style="width:32px;height:32px;font-size:1rem">🎲</button>` : ''}
        </div>
      `).join('')}
    `;
    if (tab === 'combat') return `
      <div class="section-title">Attacks</div>
      <table class="data-table" id="attackTable">
        <thead><tr><th>Name</th><th>Bonus</th><th>Damage</th><th></th></tr></thead>
        <tbody>
          ${char.attacks.map((a, i) => `<tr>
            <td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.attackBonus)}</td><td>${escapeHtml(a.damageDice)} ${escapeHtml(a.damageType || '')}</td>
            <td><button class="icon-btn" data-remove-attack="${i}" style="width:28px;height:28px;font-size:1rem">✕</button></td>
          </tr>`).join('') || `<tr><td colspan="4" class="hint">No attacks added.</td></tr>`}
        </tbody>
      </table>
      <div class="grid2" style="margin-top:.6rem">
        <input type="text" id="atkName" placeholder="Attack name">
        <input type="text" id="atkBonus" placeholder="Bonus e.g. +5">
        <input type="text" id="atkDmg" placeholder="Damage e.g. 1d8+3">
        <input type="text" id="atkType" placeholder="Type e.g. slashing">
      </div>
      <button class="btn sm block" id="addAttackBtn" style="margin-top:.4rem">+ Add Attack</button>

      <div class="section-title">Spell slots</div>
      <div class="grid3">
        ${[1,2,3,4,5,6,7,8,9].map(l => `
          <div class="statbox">
            <div class="label">Lvl ${l}</div>
            <input type="number" id="slot_${l}" min="0" value="${(char.spellSlots[l] && char.spellSlots[l].max) || 0}" style="text-align:center;background:transparent;border:none;font-weight:700">
          </div>
        `).join('')}
      </div>
    `;
    if (tab === 'inventory') return `
      <div class="section-title">Currency</div>
      <div class="grid3">
        <div class="field"><label for="curGp">GP</label><input type="number" id="curGp" value="${char.currency.gp}"></div>
        <div class="field"><label for="curSp">SP</label><input type="number" id="curSp" value="${char.currency.sp}"></div>
        <div class="field"><label for="curCp">CP</label><input type="number" id="curCp" value="${char.currency.cp}"></div>
      </div>
      <div class="section-title">Inventory</div>
      <div class="chip-list" id="invList">
        ${char.inventory.map((it, i) => `<span class="chip">${escapeHtml(it.name)}${it.qty > 1 ? ` ×${it.qty}` : ''}<button data-remove-item="${i}">✕</button></span>`).join('') || '<span class="hint">No items yet.</span>'}
      </div>
      <div class="list-add-row"><input type="text" id="invInput" placeholder="Add item"><input type="number" id="invQty" value="1" min="1" style="width:4.5em"><button class="btn sm" id="invAddBtn">Add</button></div>

      <div class="section-title">Features & traits</div>
      <div class="chip-list" id="featList">
        ${char.features.map((f, i) => `<span class="chip">${escapeHtml(f)}<button data-remove-feat="${i}">✕</button></span>`).join('') || '<span class="hint">No features yet.</span>'}
      </div>
      <div class="list-add-row"><input type="text" id="featInput" placeholder="Add feature/trait"><button class="btn sm" id="featAddBtn">Add</button></div>
    `;
    if (tab === 'notes') return `
      <div class="field"><label for="bgInput">Background</label><input type="text" id="bgInput" value="${escapeHtml(char.background)}"></div>
      <div class="field"><label for="persInput">Personality traits</label><textarea id="persInput">${escapeHtml(char.personalityTraits)}</textarea></div>
      <div class="field"><label for="notesInput">Notes</label><textarea id="notesInput" style="min-height:8em">${escapeHtml(char.notes)}</textarea></div>
      <button class="btn block" id="exportCharBtn">Export Character JSON</button>
    `;
    return '';
  }

  function wireTab(body) {
    if (tab === 'main') {
      ABILITIES.forEach(a => body.querySelector('#ab_' + a).oninput = e => { char.abilities[a] = clamp(parseInt(e.target.value) || 10, 1, 30); save(); render(); });
      body.querySelector('#hpCur').oninput = async e => {
        const wasAboveThreshold = char.hp.current / char.hp.max > 0.25;
        char.hp.current = clamp(parseInt(e.target.value) || 0, 0, 999);
        save();
        if (char.controlledBy === 'bot' && wasAboveThreshold && char.hp.current > 0 && char.hp.current / char.hp.max <= 0.25) {
          const bot = (await DB.getAllByIndex('bots', 'campaignId', campaignId)).find(b => b.characterId === char.id);
          if (bot) {
            await postBotDialogue(campaignId, bot, char, 'low_hp');
            await addBotRecentEvent(campaignId, bot.id, 'Dropped to low HP.');
          }
        }
      };
      body.querySelector('#hpMax').oninput = e => { char.hp.max = Math.max(1, parseInt(e.target.value) || 1); save(); };
      body.querySelector('#hpTemp').oninput = e => { char.hp.temp = Math.max(0, parseInt(e.target.value) || 0); save(); };
      body.querySelector('#acVal').oninput = e => { char.ac = parseInt(e.target.value) || 10; save(); };
      body.querySelector('#speedVal').oninput = e => { char.speed = parseInt(e.target.value) || 0; save(); };
      body.querySelector('#lvlVal').oninput = e => { char.level = clamp(parseInt(e.target.value) || 1, 1, 20); save(); render(); };
      body.querySelector('#xpVal').oninput = e => { char.xp = parseInt(e.target.value) || 0; save(); };
      body.querySelector('#condAddBtn').onclick = () => {
        const input = body.querySelector('#condInput');
        if (!input.value.trim()) return;
        char.conditions.push({ conditionId: input.value.trim(), source: 'manual', roundsRemaining: null });
        save(); render();
      };
      body.querySelectorAll('[data-remove-cond]').forEach(b => b.onclick = () => { char.conditions.splice(parseInt(b.getAttribute('data-remove-cond')), 1); save(); render(); });
      body.querySelector('#shortRestBtn').onclick = async () => {
        const conMod = abilityMod(char.abilities.con);
        const result = rollFormula(`1d8${conMod >= 0 ? '+' : ''}${conMod}`);
        Object.assign(char.hp, shortRestChanges(char, result.total).hp);
        save();
        await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: char.controlledBy, speakerId: char.id, text: `${char.name} takes a short rest and recovers ${Math.max(0, result.total)} HP (${char.hp.current}/${char.hp.max}).` }));
        toast(`${char.name} recovers ${Math.max(0, result.total)} HP.`, 'success');
        render();
      };
      body.querySelector('#longRestBtn').onclick = async () => {
        Object.assign(char, longRestChanges(char));
        save();
        await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: char.controlledBy, speakerId: char.id, text: `${char.name} takes a long rest — HP and spell slots fully restored, conditions cleared.` }));
        toast(`${char.name} is fully rested.`, 'success');
        render();
      };
    }
    if (tab === 'skills') {
      body.querySelectorAll('[data-save-prof]').forEach(b => b.onclick = () => {
        const a = b.getAttribute('data-save-prof');
        char.savingThrows[a].proficient = !char.savingThrows[a].proficient;
        save(); render();
      });
      body.querySelectorAll('[data-skill-prof]').forEach(b => b.onclick = () => {
        const s = b.getAttribute('data-skill-prof');
        char.skills[s].proficient = !char.skills[s].proficient;
        save(); render();
      });
      body.querySelectorAll('[data-roll-save]').forEach(b => b.onclick = async () => {
        const a = b.getAttribute('data-roll-save');
        const mod = abilityMod(char.abilities[a]) + (char.savingThrows[a].proficient ? profBonusForLevel(char.level) : 0);
        await rollAndLog(campaignId, { actorType: char.controlledBy, actorId: char.id, actorName: char.name, modifier: mod, purpose: `${ABILITY_LABELS[a]} save` });
        toast(`${char.name}: ${ABILITY_LABELS[a]} save rolled — see the table log.`, 'success');
      });
      body.querySelectorAll('[data-roll-skill]').forEach(b => b.onclick = async () => {
        const s = b.getAttribute('data-roll-skill');
        const skillDef = SKILLS.find(sk => sk.id === s);
        const mod = abilityMod(char.abilities[skillDef.ability]) + (char.skills[s].proficient ? profBonusForLevel(char.level) : 0);
        await rollAndLog(campaignId, { actorType: char.controlledBy, actorId: char.id, actorName: char.name, modifier: mod, purpose: `${skillDef.label} check` });
        toast(`${char.name}: ${skillDef.label} check rolled — see the table log.`, 'success');
      });
    }
    if (tab === 'combat') {
      body.querySelector('#addAttackBtn').onclick = () => {
        const name = body.querySelector('#atkName').value.trim();
        if (!name) { toast('Attack needs a name.', 'danger'); return; }
        char.attacks.push({
          id: uid(), name,
          attackBonus: body.querySelector('#atkBonus').value.trim(),
          damageDice: body.querySelector('#atkDmg').value.trim(),
          damageType: body.querySelector('#atkType').value.trim(),
          notes: ''
        });
        save(); render();
      };
      body.querySelectorAll('[data-remove-attack]').forEach(b => b.onclick = () => { char.attacks.splice(parseInt(b.getAttribute('data-remove-attack')), 1); save(); render(); });
      [1,2,3,4,5,6,7,8,9].forEach(l => {
        const el = body.querySelector('#slot_' + l);
        if (el) el.oninput = e => {
          const max = Math.max(0, parseInt(e.target.value) || 0);
          char.spellSlots[l] = { max, current: max };
          save();
        };
      });
    }
    if (tab === 'inventory') {
      body.querySelector('#curGp').oninput = e => { char.currency.gp = parseInt(e.target.value) || 0; save(); };
      body.querySelector('#curSp').oninput = e => { char.currency.sp = parseInt(e.target.value) || 0; save(); };
      body.querySelector('#curCp').oninput = e => { char.currency.cp = parseInt(e.target.value) || 0; save(); };
      body.querySelector('#invAddBtn').onclick = () => {
        const name = body.querySelector('#invInput').value.trim();
        if (!name) return;
        const qty = Math.max(1, parseInt(body.querySelector('#invQty').value) || 1);
        char.inventory.push({ itemId: uid(), name, qty, equipped: false });
        save(); render();
      };
      body.querySelectorAll('[data-remove-item]').forEach(b => b.onclick = () => { char.inventory.splice(parseInt(b.getAttribute('data-remove-item')), 1); save(); render(); });
      body.querySelector('#featAddBtn').onclick = () => {
        const v = body.querySelector('#featInput').value.trim();
        if (!v) return;
        char.features.push(v);
        save(); render();
      };
      body.querySelectorAll('[data-remove-feat]').forEach(b => b.onclick = () => { char.features.splice(parseInt(b.getAttribute('data-remove-feat')), 1); save(); render(); });
    }
    if (tab === 'notes') {
      body.querySelector('#bgInput').oninput = e => { char.background = e.target.value; save(); };
      body.querySelector('#persInput').oninput = e => { char.personalityTraits = e.target.value; save(); };
      body.querySelector('#notesInput').oninput = e => { char.notes = e.target.value; save(); };
      body.querySelector('#exportCharBtn').onclick = () => {
        const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `fabletable-character-${(char.name || 'character').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast('Character exported.', 'success');
      };
    }
  }

  render();
}
