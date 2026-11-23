/* ---------- Administration ---------- */
let adminOn = false, ADM = null;
function showAdmin(){ $('#adminGate').hidden = adminOn; $('#adminPanel').hidden = !adminOn; }
async function enterAdmin(){
  showAdmin();
  try { await loadAdmin(); }
  catch(e){ adminOn = false; showAdmin(); if(e.status !== 401) toast(e.message); }
}
async function loadAdmin(){
  ADM = await api('GET', '/api/admin/stats');
  PHOTOS = ADM.photos || PHOTOS;
  adminOn = true; showAdmin(); renderAdmin();
}
function renderAdmin(){
  if(!ADM) return;
  $('#sPlayers').textContent = ADM.users.length;
  $('#sOpened').textContent = ADM.users.reduce((a, u) => a + u.opened, 0);
  $('#sOffers').textContent = ADM.offers; $('#sCards').textContent = ADM.cards;
  $('#sRate').textContent = '1 paquet / ' + ADM.intervalMin + ' min, jusqu\'à ' + ADM.max;
  $('#plList').innerHTML = ADM.users.length ? ADM.users.map(u => `
    <div class="pl-row"><div><b>${esc(u.name)}</b><small>${u.packs} paquet${u.packs > 1 ? 's' : ''} · ${fmtN(u.points)} pts · ${u.unique}/${ADM.cards} cartes · ${u.opened} ouverts</small></div>
      <div class="pl-act" data-u="${esc(u.name)}">
        <button class="btn ghost sm" data-a="add-pack">+1 paquet</button>
        <button class="btn ghost sm" data-a="reset-packs">Remise à ${ADM.max}</button>
        <button class="btn ghost sm" data-a="skip">+10 min</button>
        <button class="btn ghost sm" data-a="add-points">+100 pts</button>
        <button class="btn ghost sm" data-a="wipe">Vider</button>
      </div></div>`).join('') : '<div class="empty">Aucun joueur inscrit pour le moment.</div>';
  renderPhotoList();
}
$('#adminForm').addEventListener('submit', async e => {
  e.preventDefault(); $('#adminErr').textContent = '';
  try {
    await api('POST', '/api/admin/login', {password: $('#adminPass').value});
    $('#adminPass').value = ''; await loadAdmin();
  } catch(err){ $('#adminErr').textContent = err.message; $('#adminPass').select(); }
});
$('#aLogout').addEventListener('click', async () => { try { await api('POST', '/api/admin/logout', {}); } catch(e){ /* déjà verrouillé */ } adminOn = false; showAdmin(); });
$('#aRefresh').addEventListener('click', () => loadAdmin().catch(onApiError));
async function adminAction(url, msg){
  try { await api('POST', url, {}); toast(msg); await loadAdmin(); if(ME) await refresh(); } catch(e){ onApiError(e); }
}
$('#aResetAll').addEventListener('click', e => twoStep(e.currentTarget, () => adminAction('/api/admin/reset-all-packs', 'Paquets réinitialisés pour tous les joueurs')));
$('#aCancelOffers').addEventListener('click', e => twoStep(e.currentTarget, () => adminAction('/api/admin/cancel-offers', 'Toutes les offres sont annulées')));
$('#plList').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if(!b) return;
  const name = b.parentElement.dataset.u, a = b.dataset.a;
  const msgs = {'add-pack':'+1 paquet', 'reset-packs':'Paquets remis à ' + (ADM ? ADM.max : 10), 'skip':'Temps avancé de 10 minutes', 'add-points':'+100 points', 'wipe':'Collection vidée'};
  const go = () => adminAction('/api/admin/users/' + encodeURIComponent(name) + '/' + a, msgs[a] + ' pour ' + name);
  if(a === 'wipe') twoStep(b, go); else go();
});

/* ----- Photos ----- */
function renderPhotoList(){
  const el = $('#photoList'); if(!el) return;
  el.innerHTML = SORTED.map(c => {
    const p = PHOTOS[pkey(c)];
    return `<div class="ph-row"><div class="ph-th">${p ? `<img src="${p}" alt="" loading="lazy">` : ''}</div><div class="ph-n"><b>${c.b} ${c.m}</b><small>${c.y} · ${RAR[c.r].n}</small></div>
      <input class="sr" type="file" accept="image/*" id="ph-${c.id}" data-id="${c.id}"><label class="btn ghost sm" for="ph-${c.id}">${p ? 'Changer' : 'Ajouter'}</label>${p ? `<button class="btn ghost sm" data-rm="${c.id}">Retirer</button>` : ''}</div>`;
  }).join('');
  $('#phCount').textContent = Object.keys(PHOTOS).length + ' / ' + CARS.length;
}
function fileToJpeg(file){
  return new Promise(resolve => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const W = 720, H = 450, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const x = cv.getContext('2d'), s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s;
        x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
        cv.toBlob(b => resolve(b), 'image/jpeg', .82);
      };
      im.onerror = () => resolve(null);
      im.src = fr.result;
    };
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(file);
  });
}
$('#photoList').addEventListener('change', async e => {
  const inp = e.target.closest('input[type=file]'); if(!inp || !inp.files[0]) return;
  const id = +inp.dataset.id, blob = await fileToJpeg(inp.files[0]);
  if(!blob){ toast('Image illisible'); return; }
  try {
    const r = await api('PUT', '/api/admin/photo/' + id, blob, 'image/jpeg');
    PHOTOS[pkey(BYID[id])] = r.url; toast('Photo enregistrée'); renderPhotoList();
  } catch(err){ onApiError(err); }
});
$('#photoList').addEventListener('click', async e => {
  const b = e.target.closest('[data-rm]'); if(!b) return;
  try { await api('DELETE', '/api/admin/photo/' + b.dataset.rm); delete PHOTOS[pkey(BYID[+b.dataset.rm])]; toast('Photo retirée'); renderPhotoList(); }
  catch(err){ onApiError(err); }
});
