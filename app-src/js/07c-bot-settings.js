/* ---- Bot settings ---- */
async function ScreenBotSettings(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const bots = await DB.getAllByIndex('bots', 'campaignId', campaignId);
  const characters = await DB.getAllByIndex('characters', 'campaignId', campaignId);
  const charById = Object.fromEntries(characters.map(c => [c.id, c]));

  root.innerHTML = `
    <p class="hint">Combat intelligence controls how a bot picks targets and abilities once combat arrives (Phase 4). Personality drives how they talk right now.</p>
    ${bots.length ? bots.map(b => botSettingsCardHtml(b, charById[b.characterId])).join('') : emptyState('🤖', 'No bots yet', 'Add bots from the campaign detail screen.')}
    <button class="btn block" id="addOneBotBtn2">+ Add One Bot</button>
  `;
  root.querySelectorAll('[data-bot-combat-style]').forEach(sel => {
    sel.onchange = async () => {
      const botId = sel.getAttribute('data-bot-combat-style');
      const bot = bots.find(b => b.id === botId);
      bot.combatStyle = sel.value;
      await DB.put('bots', bot);
      toast('Combat style updated.', 'success');
    };
  });
  root.querySelectorAll('[data-bot-regenerate]').forEach(btn => {
    btn.onclick = async () => {
      const botId = btn.getAttribute('data-bot-regenerate');
      const bot = bots.find(b => b.id === botId);
      const p = generateBotPersonality();
      Object.assign(bot, { temperament: p.temperament, speakingStyle: p.speakingStyle, quirks: p.quirks, goals: p.goals, fears: p.fears, bonds: p.bonds });
      await DB.put('bots', bot);
      toast('Personality regenerated.', 'success');
      ScreenBotSettings(root, campaignId);
    };
  });
  root.querySelectorAll('[data-bot-sheet]').forEach(btn => {
    btn.onclick = () => Router.go(`#/campaigns/${campaignId}/characters/${btn.getAttribute('data-bot-sheet')}`);
  });
  root.querySelector('#addOneBotBtn2').onclick = async () => {
    await createBot(campaignId);
    toast('Bot added.', 'success');
    ScreenBotSettings(root, campaignId);
  };
}

function botSettingsCardHtml(bot, char) {
  if (!char) return '';
  return `
    <div class="card">
      <div class="row between">
        <h3 style="margin:0">${escapeHtml(char.name)}</h3>
        <button class="btn sm" data-bot-sheet="${char.id}">Sheet</button>
      </div>
      <p style="margin:.3rem 0 0">${escapeHtml(char.species)} · ${escapeHtml(char.class)} · <em>${escapeHtml(bot.temperament)}</em></p>
      <p class="hint" style="margin-top:.2rem">${escapeHtml(bot.speakingStyle)}</p>
      <div class="field" style="margin-top:.6rem">
        <label>Combat intelligence</label>
        <select data-bot-combat-style="${bot.id}">
          ${COMBAT_STYLES.map(s => `<option value="${s}" ${bot.combatStyle === s ? 'selected' : ''}>${COMBAT_STYLE_INFO[s].label} — ${COMBAT_STYLE_INFO[s].blurb}</option>`).join('')}
        </select>
      </div>
      <div class="section-title">Traits</div>
      <div class="chip-list">
        ${bot.goals.map(g => `<span class="chip">🎯 ${escapeHtml(g)}</span>`).join('')}
        ${bot.fears.map(f => `<span class="chip">😨 ${escapeHtml(f)}</span>`).join('')}
        ${bot.bonds.map(bd => `<span class="chip">🤝 ${escapeHtml(bd)}</span>`).join('')}
        ${bot.quirks.map(q => `<span class="chip">✨ ${escapeHtml(q)}</span>`).join('')}
      </div>
      <button class="btn sm block" data-bot-regenerate="${bot.id}" style="margin-top:.6rem">🎲 Regenerate Personality</button>
    </div>
  `;
}
