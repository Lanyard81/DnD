/* ---- Character wizard ---- */
async function ScreenCharacterWizard(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const char = makeCharacter({ campaignId, controlledBy: 'player' });
  const homebrewFeatures = await DB.getAllByIndex('features', 'campaignId', campaignId);
  const speciesOptions = [...SUGGESTED_SPECIES, ...homebrewFeatures.filter(f => f.source === 'species').map(f => f.name)];
  const classOptions = [...SUGGESTED_CLASSES, ...homebrewFeatures.filter(f => f.source === 'class').map(f => f.name)];
  const backgroundOptions = [...SUGGESTED_BACKGROUNDS, ...homebrewFeatures.filter(f => f.source === 'background').map(f => f.name)];
  let step = 0;
  const steps = ['Identity', 'Ability scores', 'Combat basics', 'Background'];

  function render() {
    root.innerHTML = `
      <div class="stepper">${steps.map((_, i) => `<div class="dot ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('')}</div>
      <h2>${steps[step]}</h2>
      <div id="cwBody"></div>
      <div class="row" style="margin-top:1rem">
        ${step > 0 ? `<button class="btn block" id="cwBack">Back</button>` : `<button class="btn block" id="cwCancel">Cancel</button>`}
        <button class="btn primary block" id="cwNext">${step === steps.length - 1 ? 'Create Character' : 'Next'}</button>
      </div>
    `;
    const body = document.getElementById('cwBody');
    body.innerHTML = stepHtml();
    wireStep(body);
    const backBtn = document.getElementById('cwBack');
    if (backBtn) backBtn.onclick = () => { step--; render(); };
    const cancelBtn = document.getElementById('cwCancel');
    if (cancelBtn) cancelBtn.onclick = () => Router.go(`#/campaigns/${campaignId}`);
    document.getElementById('cwNext').onclick = async () => {
      if (step === 0 && !char.name.trim()) { toast('Give your character a name first.', 'danger'); return; }
      if (step < steps.length - 1) { step++; render(); return; }
      await finalizeAndSave();
    };
  }

  async function finalizeAndSave() {
    char.proficiencyBonus = profBonusForLevel(char.level);
    char.initiativeBonus = abilityMod(char.abilities.dex);
    const errs = validateCharacter(char);
    if (errs.length) { toast(errs.join(' '), 'danger'); return; }
    await DB.put('characters', char);
    toast('Character created.', 'success');
    Router.go(`#/campaigns/${campaignId}/characters/${char.id}`);
  }

  function openPregenPicker() {
    openModal(`
      <h2>Start from a pregenerated character</h2>
      <p class="hint">Fully editable afterward — this just gives you a running start.</p>
      <div class="col">
        ${PREGEN_CHARACTERS.map((p, i) => `
          <div class="card tap" data-pregen-pick="${i}">
            <div class="row between"><strong>${escapeHtml(p.name)}</strong><span class="badge">Lv ${p.level}</span></div>
            <p style="margin:.3rem 0 0">${escapeHtml(p.species)} · ${escapeHtml(p.class)}</p>
            <p class="hint" style="margin-top:.3rem">${escapeHtml(p.personalityTraits)}</p>
          </div>
        `).join('')}
      </div>
      <button class="btn block" id="pregenCancel" style="margin-top:.4rem">Cancel</button>
    `, (rootEl) => {
      rootEl.querySelector('#pregenCancel').onclick = closeModal;
      rootEl.querySelectorAll('[data-pregen-pick]').forEach(el => {
        el.onclick = async () => {
          const p = PREGEN_CHARACTERS[parseInt(el.getAttribute('data-pregen-pick'))];
          const built = buildCharacterFromPregen(p, campaignId, 'player');
          Object.assign(char, built, { id: char.id, campaignId, createdAt: char.createdAt });
          closeModal();
          await finalizeAndSave();
        };
      });
    });
  }

  function stepHtml() {
    if (step === 0) return `
      <button class="btn block" id="usePregenBtn" type="button">⚡ Start from a pregenerated character</button>
      <p class="hint" style="text-align:center;margin:.5rem 0 1rem">— or build your own —</p>
      <div class="field"><label for="cfName">Name</label><input type="text" id="cfName" value="${escapeHtml(char.name)}" placeholder="Character name"></div>
      <div class="grid2">
        <div class="field"><label for="cfSpecies">Species</label><input type="text" id="cfSpecies" list="speciesList" value="${escapeHtml(char.species)}"></div>
        <div class="field"><label for="cfClass">Class</label><input type="text" id="cfClass" list="classList" value="${escapeHtml(char.class)}"></div>
      </div>
      <div class="grid2">
        <div class="field"><label for="cfSubclass">Subclass</label><input type="text" id="cfSubclass" value="${escapeHtml(char.subclass)}"></div>
        <div class="field"><label for="cfLevel">Level</label><input type="number" id="cfLevel" min="1" max="20" value="${char.level}"></div>
      </div>
      <datalist id="speciesList">${speciesOptions.map(s => `<option value="${escapeHtml(s)}">`).join('')}</datalist>
      <datalist id="classList">${classOptions.map(s => `<option value="${escapeHtml(s)}">`).join('')}</datalist>
    `;
    if (step === 1) return `
      <p class="hint">Standard array shown as defaults — adjust as you like. Modifiers shown update automatically.</p>
      <div class="grid3">
        ${ABILITIES.map(a => `
          <div class="statbox">
            <div class="label">${a.toUpperCase()}</div>
            <input type="number" id="ab_${a}" value="${char.abilities[a]}" style="text-align:center;margin-top:.3rem" min="1" max="30">
            <div class="sub" id="abmod_${a}">${fmtMod(abilityMod(char.abilities[a]))}</div>
          </div>
        `).join('')}
      </div>
    `;
    if (step === 2) return `
      <div class="grid2">
        <div class="field"><label for="cfHpMax">Max HP</label><input type="number" id="cfHpMax" value="${char.hp.max}" min="1"></div>
        <div class="field"><label for="cfAc">Armor Class</label><input type="number" id="cfAc" value="${char.ac}" min="1"></div>
        <div class="field"><label for="cfSpeed">Speed</label><input type="number" id="cfSpeed" value="${char.speed}" min="0"></div>
        <div class="field"><label>Proficiency Bonus</label><input type="text" value="+${profBonusForLevel(char.level)}" disabled></div>
      </div>
    `;
    if (step === 3) return `
      <div class="field"><label for="cfBg">Background</label><input type="text" id="cfBg" list="bgList" value="${escapeHtml(char.background)}"></div>
      <div class="field"><label for="cfPersonality">Personality traits</label><textarea id="cfPersonality">${escapeHtml(char.personalityTraits)}</textarea></div>
      <datalist id="bgList">${backgroundOptions.map(s => `<option value="${escapeHtml(s)}">`).join('')}</datalist>
    `;
    return '';
  }

  function wireStep(body) {
    if (step === 0) {
      body.querySelector('#usePregenBtn').onclick = () => openPregenPicker();
      body.querySelector('#cfName').oninput = e => char.name = e.target.value;
      body.querySelector('#cfSpecies').oninput = e => char.species = e.target.value;
      body.querySelector('#cfClass').oninput = e => char.class = e.target.value;
      body.querySelector('#cfSubclass').oninput = e => char.subclass = e.target.value;
      body.querySelector('#cfLevel').oninput = e => char.level = clamp(parseInt(e.target.value) || 1, 1, 20);
    }
    if (step === 1) {
      ABILITIES.forEach(a => {
        body.querySelector('#ab_' + a).oninput = e => {
          char.abilities[a] = clamp(parseInt(e.target.value) || 10, 1, 30);
          body.querySelector('#abmod_' + a).textContent = fmtMod(abilityMod(char.abilities[a]));
        };
      });
    }
    if (step === 2) {
      body.querySelector('#cfHpMax').oninput = e => { char.hp.max = parseInt(e.target.value) || 1; char.hp.current = char.hp.max; };
      body.querySelector('#cfAc').oninput = e => char.ac = parseInt(e.target.value) || 10;
      body.querySelector('#cfSpeed').oninput = e => char.speed = parseInt(e.target.value) || 0;
    }
    if (step === 3) {
      body.querySelector('#cfBg').oninput = e => char.background = e.target.value;
      body.querySelector('#cfPersonality').oninput = e => char.personalityTraits = e.target.value;
    }
  }

  render();
}
