/* ---- XP & loot ---- */
// A simple, generic milestone table — not tied to any official progression,
// just enough to nudge "maybe it's time to level up" without blocking play.
const XP_LEVEL_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
function levelForXp(xp) {
  let lvl = 1;
  for (let i = 0; i < XP_LEVEL_THRESHOLDS.length; i++) if (xp >= XP_LEVEL_THRESHOLDS[i]) lvl = i + 1;
  return lvl;
}

async function ScreenXpLoot(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }

  async function render() {
    const characters = await DB.getAllByIndex('characters', 'campaignId', campaignId);
    root.innerHTML = `
      <div class="section-title">XP Tracker</div>
      ${characters.map(c => {
        const suggested = levelForXp(c.xp);
        return `
        <div class="card">
          <div class="row between">
            <strong>${escapeHtml(c.name)}</strong>
            <span class="badge">Lv ${c.level}${suggested !== c.level ? ` → suggests ${suggested}` : ''}</span>
          </div>
          <div class="row" style="margin-top:.5rem;gap:.4rem;align-items:center">
            <input type="number" data-xp-add="${c.id}" placeholder="Award XP" style="width:8em">
            <button class="btn sm" data-xp-go="${c.id}">Award</button>
            ${suggested !== c.level ? `<button class="btn sm primary" data-xp-levelup="${c.id}">Level Up to ${suggested}</button>` : ''}
          </div>
          <p class="hint" style="margin-top:.3rem">${c.xp} XP total</p>
        </div>
      `; }).join('') || emptyState('⭐', 'No characters yet')}

      <div class="section-title">Loot Generator</div>
      <button class="btn block" id="rollLootBtn">🎁 Roll Loot</button>
      <div id="lootResultSlot"></div>
      ${characters.length ? `
        <div class="field" style="margin-top:.6rem">
          <label>Give to</label>
          <select id="lootGiveTo">${characters.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
        </div>
      ` : ''}
    `;
    root.querySelectorAll('[data-xp-go]').forEach(el => el.onclick = async () => {
      const id = el.getAttribute('data-xp-go');
      const input = root.querySelector(`[data-xp-add="${id}"]`);
      const amount = parseInt(input.value) || 0;
      if (!amount) return;
      const c = await DB.get('characters', id);
      c.xp += amount;
      c.updatedAt = nowIso();
      await DB.put('characters', c);
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text: `${c.name} gains ${amount} XP (${c.xp} total).` }));
      render();
    });
    root.querySelectorAll('[data-xp-levelup]').forEach(el => el.onclick = async () => {
      const id = el.getAttribute('data-xp-levelup');
      const c = await DB.get('characters', id);
      c.level = levelForXp(c.xp);
      c.proficiencyBonus = profBonusForLevel(c.level);
      c.updatedAt = nowIso();
      await DB.put('characters', c);
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text: `${c.name} levels up to ${c.level}!` }));
      render();
    });
    root.querySelector('#rollLootBtn').onclick = () => {
      const loot = generateLoot();
      const slot = root.querySelector('#lootResultSlot');
      slot.innerHTML = `<div class="card"><strong>${escapeHtml(loot.name)}</strong>${loot.gold ? ` <span class="badge">${loot.gold} gp</span>` : ''}</div>`;
      slot.dataset.lootText = loot.name;
      slot.dataset.lootGold = loot.gold || 0;
      const giveBtn = document.createElement('button');
      giveBtn.className = 'btn sm block';
      giveBtn.textContent = 'Give to selected character';
      giveBtn.style.marginTop = '.4rem';
      giveBtn.onclick = async () => {
        const giveTo = root.querySelector('#lootGiveTo');
        if (!giveTo) return;
        const c = await DB.get('characters', giveTo.value);
        if (loot.gold) c.currency.gp += loot.gold;
        else c.inventory.push({ itemId: uid(), name: loot.name, qty: 1, equipped: false });
        c.updatedAt = nowIso();
        await DB.put('characters', c);
        await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text: `${c.name} receives ${loot.name}${loot.gold ? ` (${loot.gold} gp)` : ''}.` }));
        toast('Given.', 'success');
      };
      slot.appendChild(giveBtn);
    };
  }

  render();
}
