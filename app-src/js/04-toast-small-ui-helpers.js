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

/* ---------- Bundled portrait gallery (assets/portraits/bust-01..25.jpg) ---------- */
const PORTRAIT_GALLERY = Array.from({ length: 25 }, (_, i) => `assets/portraits/bust-${String(i + 1).padStart(2, '0')}.jpg`);

async function urlToDataUrl(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('fetch failed');
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function openPortraitGallery(onPick) {
  openModal(`
    <h2>Choose a Portrait</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:.5rem;max-height:60vh;overflow-y:auto;margin-top:.5rem">
      ${PORTRAIT_GALLERY.map((src, i) => `<button class="portraitGalleryItem" data-src="${src}" style="padding:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1;background:var(--bg-input)"><img src="${src}" alt="Portrait ${i + 1}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy"></button>`).join('')}
    </div>
    <div class="row" style="margin-top:1rem"><button class="btn block" id="pgCancel">Cancel</button></div>
  `, (root) => {
    root.querySelector('#pgCancel').onclick = closeModal;
    root.querySelectorAll('.portraitGalleryItem').forEach((btn) => {
      btn.onclick = async () => {
        const src = btn.getAttribute('data-src');
        try {
          const dataUrl = await urlToDataUrl(src);
          closeModal();
          onPick(dataUrl);
        } catch (e) {
          toast("Couldn't load that portrait — is the assets/portraits folder present?", 'error');
        }
      };
    });
  });
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
