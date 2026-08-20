/* ---------- 4. TOAST / SMALL UI HELPERS ---------- */
function toast(msg, kind) {
  const region = document.getElementById('toastRegion');
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  region.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

let activeModalCleanup = null;
function openModal(innerHtml, onMount) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'activeModal';
  backdrop.innerHTML = `<div class="modal-sheet">${innerHtml}</div>`;
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  if (onMount) onMount(backdrop);
  activeModalCleanup = () => backdrop.remove();
}
function closeModal() {
  const el = document.getElementById('activeModal');
  if (el) el.remove();
  activeModalCleanup = null;
}

function confirmDialog(message, { okLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    openModal(`
      <h3>${escapeHtml(message)}</h3>
      <div class="row" style="margin-top:1rem;">
        <button class="btn block" id="cdCancel">Cancel</button>
        <button class="btn block ${danger ? 'danger' : 'primary'}" id="cdOk">${escapeHtml(okLabel)}</button>
      </div>
    `, (root) => {
      root.querySelector('#cdCancel').onclick = () => { closeModal(); resolve(false); };
      root.querySelector('#cdOk').onclick = () => { closeModal(); resolve(true); };
    });
  });
}
