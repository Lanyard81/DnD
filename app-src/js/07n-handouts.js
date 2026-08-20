/* ---- Handouts ---- */
async function ScreenHandouts(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }

  async function render() {
    const handouts = (await DB.getAllByIndex('handouts', 'campaignId', campaignId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    root.innerHTML = `
      ${handouts.length ? handouts.map(h => `
        <div class="card">
          <div class="row between">
            <strong>${escapeHtml(h.title)}</strong>
            <div class="row" style="gap:.3rem">
              <button class="btn sm ${h.revealedToPlayer ? 'primary' : ''}" data-handout-reveal="${h.id}">${h.revealedToPlayer ? 'Revealed' : 'Hidden'}</button>
              <button class="icon-btn" data-handout-delete="${h.id}" style="width:28px;height:28px;font-size:1rem">✕</button>
            </div>
          </div>
          ${h.imageData ? `<img src="${h.imageData}" style="max-width:100%;border-radius:var(--radius);margin-top:.5rem">` : ''}
          ${h.body ? `<p style="margin:.4rem 0 0;white-space:pre-wrap">${escapeHtml(h.body)}</p>` : ''}
        </div>
      `).join('') : emptyState('🖼', 'No handouts yet', 'Add a letter, map excerpt, or portrait to show at the table.')}
      <button class="btn primary block" id="newHandoutBtn">+ New Handout</button>
    `;
    root.querySelectorAll('[data-handout-reveal]').forEach(el => el.onclick = async () => {
      const h = await DB.get('handouts', el.getAttribute('data-handout-reveal'));
      h.revealedToPlayer = !h.revealedToPlayer;
      await DB.put('handouts', h);
      render();
    });
    root.querySelectorAll('[data-handout-delete]').forEach(el => el.onclick = async () => {
      const ok = await confirmDialog('Delete this handout?', { okLabel: 'Delete', danger: true });
      if (!ok) return;
      await DB.delete('handouts', el.getAttribute('data-handout-delete'));
      render();
    });
    root.querySelector('#newHandoutBtn').onclick = () => {
      openModal(`
        <h2>New Handout</h2>
        <div class="field"><label>Title</label><input type="text" id="hTitle"></div>
        <div class="field"><label>Text</label><textarea id="hBody"></textarea></div>
        <div class="field"><label>Image (optional, kept small)</label><input type="file" id="hImage" accept="image/*"></div>
        <p class="hint">Large images bloat your campaign export — a small scan or crop works best.</p>
        <div class="row" style="margin-top:1rem">
          <button class="btn block" id="hCancel">Cancel</button>
          <button class="btn primary block" id="hSave">Save</button>
        </div>
      `, (rootEl) => {
        rootEl.querySelector('#hCancel').onclick = closeModal;
        rootEl.querySelector('#hSave').onclick = async () => {
          const title = rootEl.querySelector('#hTitle').value.trim();
          if (!title) { toast('Give the handout a title.', 'danger'); return; }
          const file = rootEl.querySelector('#hImage').files[0];
          let imageData = null;
          if (file) imageData = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); });
          await DB.put('handouts', { id: uid(), campaignId, title, body: rootEl.querySelector('#hBody').value, imageData, revealedToPlayer: false, createdAt: nowIso() });
          closeModal();
          render();
        };
      });
    };
  }

  render();
}
