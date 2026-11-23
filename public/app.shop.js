/* ---------- Boutique, ouverture des paquets, collection ---------- */
function renderOdds(){
  $('#odds').innerHTML = RAR.map(r => `<li style="--c:${r.c}"><i class="gemdot"></i><span><b>${r.n}</b><small>${r.range}</small></span><em>${r.w.toLocaleString('fr-FR')} %</em></li>`).join('');
}
function renderShop(){
  if(!ME) return;
  const max = CFG.max;
  $('#pkCount').textContent = S.packs; $('#pkMax').textContent = max;
  const pips = $('#pips'); pips.style.gridTemplateColumns = `repeat(${max},1fr)`;
  pips.innerHTML = Array.from({length:max}, (_, i) => `<i class="${i < S.packs ? 'on' : i === S.packs ? 'next' : ''}"></i>`).join('');
  $('#openBtn').disabled = S.packs <= 0; $('#shopPack').disabled = S.packs <= 0;
  $('#buyPrice').textContent = fmtN(ECON.packPrice);
  $('#buyBtn').disabled = S.points < ECON.packPrice;
  updateTimer();
}
let refreshing = false;
function updateTimer(){
  if(!ME) return;
  const full = S.packs >= CFG.max;
  $('#timerLabel').textContent = full ? 'Stock plein : ouvre un paquet pour relancer le compteur' : 'Prochain paquet dans';
  if(full || !S.nextAt){ $('#timerVal').textContent = ''; return; }
  const left = S.nextAt - nowSrv();
  $('#timerVal').textContent = mmss(left);
  if(left <= 0 && !refreshing && !stageOpen){
    refreshing = true;
    refresh().then(() => { refreshing = false; if(currentView() === 'boutique') renderShop(); }, () => { refreshing = false; });
  }
}

/* ----- Achat d'un paquet depuis la boutique ----- */
$('#buyBtn').addEventListener('click', () => buyPacks(1));
async function buyPacks(n){
  try {
    const r = await api('POST', '/api/buy-pack', {qty:n}); applySession(r); renderChrome();
    toast(n === 1 ? 'Paquet acheté' : n + ' paquets achetés');
    const v = currentView(); if(v === 'boutique') renderShop(); if(v === 'points') renderPoints();
  } catch(e){ onApiError(e); }
}

/* ---------- Ouverture : une carte à la fois ---------- */
let drawn = [], idx = 0, seen = [], phase = 'idle', opening = false;
async function openStage(){
  if(!ME){ location.hash = 'compte'; return; }
  if(opening) return; opening = true;
  try {
    const r = await api('POST', '/api/open'); applySession(r); renderChrome();
    drawn = r.cards.map(x => ({c:BYID[x.id], before:x.before}));
    if(currentView() === 'boutique') renderShop();
  } catch(e){ opening = false; onApiError(e); refresh().then(() => { if(currentView() === 'boutique') renderShop(); }); return; }
  opening = false;
  idx = 0; seen = []; stageOpen = true; phase = 'pack';
  const st = $('#stage'); st.hidden = false; st.classList.remove('legend'); st.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  $('#hand').innerHTML = ''; $('#hand').className = 'hand'; $('#dots').innerHTML = ''; $('#stageActions').innerHTML = '';
  $('#packWrap').innerHTML = `<button id="tearBtn" aria-label="Déchirer le paquet">${packHTML(true)}</button>`;
  $('#packWrap').hidden = false;
  $('#stageMsg').textContent = 'Touche le paquet pour le déchirer';
  $('#tearBtn').addEventListener('click', tearPack, {once:true});
  $('#tearBtn').focus();
}
function tearPack(){
  const stack = $('#pkStack'); $('#stageMsg').textContent = '';
  stack.classList.add('shake');
  setTimeout(() => { stack.classList.remove('shake'); stack.classList.add('tear'); flash('#ffffff'); }, 720);
  setTimeout(() => { $('#packWrap').hidden = true; showCard(0); }, 1500);
}
function renderDots(){
  $('#dots').innerHTML = drawn.map((d, i) => {
    const done = seen[i], cur = i === idx && phase === 'card';
    return `<i class="${done ? 'done' : ''}${cur ? ' cur' : ''}" style="${done ? '--c:' + RAR[d.c.r].c : ''}"></i>`;
  }).join('');
}
function showCard(i){
  idx = i; phase = 'card';
  const d = drawn[i];
  $('#hand').className = 'hand solo';
  $('#hand').innerHTML = `<div class="slot big" style="--i:2">${cardHTML(d.c, {down:true, pick:true})}</div>`;
  $('#stageMsg').textContent = 'Carte ' + (i+1) + ' sur ' + drawn.length + ' · touche la carte pour la retourner';
  $('#stageActions').innerHTML = '<button class="btn ghost" id="skipAll">Tout passer</button>';
  $('#skipAll').addEventListener('click', () => { drawn.forEach((_, k) => seen[k] = true); showRecap(); });
  renderDots();
  const c = $('#hand .card'); if(c) c.focus();
}
function reveal(card){
  if(phase !== 'card') return;
  const f = card.querySelector('.flipper');
  if(!f || !f.classList.contains('down')) return;
  f.classList.remove('down'); card.classList.remove('pick'); card.removeAttribute('tabindex');
  const d = drawn[idx], r = RAR[d.c.r];
  card.insertAdjacentHTML('beforeend', `<span class="badge${d.before === 0 ? '' : ' dup'}">${d.before === 0 ? 'Nouveau' : '×' + (d.before + 1)}</span>`);
  seen[idx] = true; renderDots();
  if(d.c.r >= 2) card.classList.add('glow');
  if(d.c.r >= 3){
    const rect = card.getBoundingClientRect();
    burst(rect.left + rect.width/2, rect.top + rect.height/2, r.c, 10 + d.c.r * 8);
    flash(r.c); banner(r.n, r.c);
  }
  if(d.c.r === 5) $('#stage').classList.add('legend');
  const last = idx === drawn.length - 1;
  $('#stageMsg').textContent = r.n + ' · ' + d.c.b + ' ' + d.c.m;
  $('#stageActions').innerHTML = `<button class="btn" id="nextBtn">${last ? 'Voir le récapitulatif' : 'Carte suivante'}</button>`;
  const nb = $('#nextBtn'); nb.addEventListener('click', () => { $('#stage').classList.remove('legend'); last ? showRecap() : showCard(idx + 1); }); nb.focus();
}
function showRecap(){
  phase = 'recap'; renderDots();
  $('#stage').classList.remove('legend');
  $('#stageMsg').textContent = 'Paquet ouvert';
  $('#hand').className = 'hand';
  $('#hand').innerHTML = drawn.map((d, i) => `<div class="slot" style="--i:${i}">${cardHTML(d.c, {glow:d.c.r >= 2, badge:d.before === 0 ? 'Nouveau' : '×' + (d.before + 1)})}</div>`).join('');
  const dupCount = drawn.filter(d => d.before > 0).length;
  $('#stageActions').innerHTML = (S.packs > 0 ? '<button class="btn" id="again">Ouvrir un autre paquet (' + S.packs + ')</button>' : '')
    + (dupCount ? '<button class="btn ghost" id="toPts">Recycler les doublons</button>' : '')
    + '<button class="btn ghost" id="toCol">Voir ma collection</button>';
  const a = $('#again'); if(a) a.addEventListener('click', openStage);
  const p = $('#toPts'); if(p) p.addEventListener('click', () => { closeStage(); location.hash = 'points'; });
  $('#toCol').addEventListener('click', () => { closeStage(); location.hash = 'collection'; });
}
function flash(c){ const e = $('#flash'); e.style.setProperty('--c', c); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); }
function banner(t, c){ const e = $('#banner'); e.textContent = t; e.style.setProperty('--c', c); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); }
function burst(x, y, c, n){
  const fx = $('#fx');
  for(let i = 0; i < n; i++){
    const p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 190;
    p.style.cssText = `left:${x}px;top:${y}px;--c:${c};--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d}px`;
    fx.appendChild(p); setTimeout(() => p.remove(), 1000);
  }
}
function closeStage(){
  if(phase === 'card') toast('Les cartes non retournées sont déjà dans ta collection');
  stageOpen = false; phase = 'idle'; $('#stage').hidden = true;
  document.body.style.overflow = $('#modal').hidden ? '' : 'hidden';
  route();
}

/* ---------- Collection ---------- */
let filter = -1;
function renderCollection(){
  if(!ME) return;
  const n = owned(), tot = CARS.length;
  const val = CARS.reduce((a, c) => a + (copies(c.id) > 0 ? c.v : 0), 0);
  $('#kOwned').textContent = n + ' / ' + tot; $('#kDup').textContent = totalSpare(); $('#kValue').textContent = fmtV(val);
  $('#progBar').style.width = (n / tot * 100) + '%';
  const chips = [{i:-1, n:'Toutes', a:n, t:tot}].concat(RAR.map((r, i) => ({i, n:r.n, a:BYR[i].filter(c => copies(c.id) > 0).length, t:BYR[i].length, c:r.c})));
  $('#chips').innerHTML = chips.map(c => `<button class="chip" data-f="${c.i}" aria-pressed="${filter === c.i}">${c.c ? `<i class="gemdot" style="--c:${c.c}"></i>` : ''}${c.n}<small>${c.a}/${c.t}</small></button>`).join('');
  $('#grid').innerHTML = SORTED.filter(c => filter < 0 || c.r === filter).map(c => {
    const k = copies(c.id);
    return k > 0 ? cardHTML(c, {badge:k > 1 ? '×' + k : '', pick:true, glow:c.r >= 2}) : cardHTML(c, {locked:true});
  }).join('');
}
function openLightbox(id){
  const c = BYID[id], k = copies(id), acts = [];
  if(spare(id) > 0) acts.push(`<button class="btn ghost" data-act="rec" data-id="${id}">Recycler 1 doublon · +${ECON.recycle[c.r]} pts</button>`);
  if(tradable(id) > 0) acts.push(`<button class="btn" data-act="offer" data-id="${id}">Proposer à l'échange</button>`);
  const lb = $('#lightbox');
  lb.innerHTML = `<div class="lb">${cardHTML(c, {glow:c.r >= 2, badge:k > 1 ? '×' + k : ''})}<div class="lb-actions">${acts.join('')}</div></div>`;
  lb.hidden = false;
}

/* ---------- Interactions ---------- */
$('#openBtn').addEventListener('click', openStage);
$('#shopPack').addEventListener('click', openStage);
$('#stageClose').addEventListener('click', closeStage);
addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if(!$('#modal').hidden) modalClose();
  else if(!$('#lightbox').hidden) $('#lightbox').hidden = true;
  else if(stageOpen) closeStage();
});
$('#hand').addEventListener('click', e => { const c = e.target.closest('.card'); if(c) reveal(c); });
$('#hand').addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ const c = e.target.closest('.card'); if(c){ e.preventDefault(); reveal(c); } } });
$('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if(b){ filter = +b.dataset.f; renderCollection(); } });
$('#grid').addEventListener('click', e => { const c = e.target.closest('.card'); if(c && !c.classList.contains('locked')) openLightbox(+c.dataset.id); });
$('#grid').addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ const c = e.target.closest('.card'); if(c && !c.classList.contains('locked')){ e.preventDefault(); openLightbox(+c.dataset.id); } } });
$('#lightbox').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if(b){
    const id = +b.dataset.id;
    if(b.dataset.act === 'rec'){ if(await recycle({id, qty:1})){ renderCollection(); openLightbox(id); } }
    else if(b.dataset.act === 'offer'){ $('#lightbox').hidden = true; location.hash = 'echanges'; openOfferModal({give:id}); }
    return;
  }
  if(!e.target.closest('.card')) $('#lightbox').hidden = true;
});

let lastCard = null;
function resetTilt(c){ if(!c) return; c.style.setProperty('--mx', .5); c.style.setProperty('--my', .5); const t = c.querySelector('.tilt'); if(t) t.style.transform = ''; }
document.addEventListener('pointermove', e => {
  const c = e.target.closest ? e.target.closest('.card') : null;
  if(lastCard && lastCard !== c) resetTilt(lastCard);
  lastCard = c; if(!c || c.classList.contains('locked')) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  c.style.setProperty('--mx', x.toFixed(3)); c.style.setProperty('--my', y.toFixed(3));
  c.querySelector('.tilt').style.transform = `rotateX(${((.5 - y) * 14).toFixed(1)}deg) rotateY(${((x - .5) * 18).toFixed(1)}deg)`;
});
document.addEventListener('pointerleave', () => resetTilt(lastCard));
