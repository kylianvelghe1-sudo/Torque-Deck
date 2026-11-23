/* ---------- Points : achat de paquets et recyclage ---------- */
async function recycle(body){
  try {
    const r = await api('POST', '/api/recycle', body); applySession(r); renderChrome();
    toast('+' + fmtN(r.gained) + ' points (' + r.count + (r.count > 1 ? ' doublons recyclés' : ' doublon recyclé') + ')');
    return true;
  } catch(e){ onApiError(e); return false; }
}
function renderPoints(){
  if(!ME) return;
  $('#pBal').textContent = fmtN(S.points); $('#pDup').textContent = totalSpare();
  const price = ECON.packPrice;
  $('#buyCard').innerHTML = `
    <h3>Acheter des paquets</h3>
    <div class="big-price">${fmtN(price)}<small>points par paquet</small></div>
    <p>Les paquets achetés s'ajoutent à ton stock, même au-delà de ${CFG.max}.</p>
    <div class="row">
      <button class="btn" data-buy="1"${S.points < price ? ' disabled' : ''}>1 paquet</button>
      <button class="btn ghost" data-buy="5"${S.points < price * 5 ? ' disabled' : ''}>5 paquets · ${fmtN(price * 5)} pts</button>
    </div>
    <p>Tu as ${S.packs} paquet${S.packs > 1 ? 's' : ''} prêt${S.packs > 1 ? 's' : ''} à ouvrir.</p>`;
  const per = RAR.map(() => ({n:0, pts:0}));
  for(const c of CARS){ const k = spare(c.id); per[c.r].n += k; per[c.r].pts += k * ECON.recycle[c.r]; }
  const all = per.reduce((a, x) => a + x.pts, 0), allN = per.reduce((a, x) => a + x.n, 0);
  $('#recCard').innerHTML = `
    <h3>Recycler les doublons</h3>
    <p>Chaque doublon rapporte des points selon sa rareté. Tu gardes toujours un exemplaire de chaque carte.</p>
    <div class="rec-list">${RAR.map((r, i) => `
      <div class="rec-row" style="--c:${r.c}"><i class="gemdot"></i>
        <span><b>${r.n}</b> <small>${per[i].n} doublon${per[i].n > 1 ? 's' : ''} · ${ECON.recycle[i]} pts l'unité</small></span>
        <button class="btn ghost sm" data-rec="${i}"${per[i].n ? '' : ' disabled'}>+${fmtN(per[i].pts)}</button>
      </div>`).join('')}
    </div>
    <button class="btn" data-rec="all"${allN ? '' : ' disabled'}>Tout recycler · +${fmtN(all)} pts</button>`;
  const list = SORTED.filter(c => spare(c.id) > 0);
  $('#dupGrid').innerHTML = list.length
    ? list.map(c => `<div class="dup">${miniHTML(c, {count:spare(c.id)})}<button class="btn ghost sm" data-rec1="${c.id}">Recycler 1 · +${ECON.recycle[c.r]}</button></div>`).join('')
    : '<div class="empty" style="grid-column:1/-1">Aucun doublon pour le moment. Ouvre des paquets : les cartes en double apparaîtront ici.</div>';
}
$('#buyCard').addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if(b) buyPacks(+b.dataset.buy); });
$('#recCard').addEventListener('click', async e => {
  const b = e.target.closest('[data-rec]'); if(!b || b.disabled) return;
  const go = async () => { if(await recycle(b.dataset.rec === 'all' ? {all:true, upTo:5} : {all:true, rarity:+b.dataset.rec})) renderPoints(); };
  // Les raretés élevées et « tout recycler » demandent une confirmation
  if(b.dataset.rec === 'all' || +b.dataset.rec >= 3) twoStep(b, go); else go();
});
$('#dupGrid').addEventListener('click', async e => {
  const b = e.target.closest('[data-rec1]'); if(!b) return;
  if(await recycle({id:+b.dataset.rec1, qty:1})) renderPoints();
});

/* ---------- Échanges ---------- */
let TR = {offers:[], incoming:[], mine:[], history:[]}, tradeTab = 'market', onlyAcceptable = false;
function renderTradeInfo(){
  $('#tradeInfo').textContent = (CFG.dupsOnly ? 'Seuls tes doublons peuvent être donnés. ' : '')
    + 'Chaque échange réussi rapporte des points selon la rareté de la carte que tu donnes, de ' + ECON.tradeBonus[0] + ' pts (commune) à ' + ECON.tradeBonus[5] + ' pts (légendaire), pour ' + ECON.tradeCap + ' échanges par jour. Il t\'en reste ' + S.tradeLeft + ' aujourd\'hui avec bonus.';
}
async function enterTrades(){
  if(!ME) return;
  renderTradeInfo(); renderTrades();
  try {
    TR = await api('GET', '/api/trades');
    NOTIFY.unseen = 0; NOTIFY.incoming = TR.incoming.length;
  } catch(e){ onApiError(e); return; }
  renderChrome(); renderTrades();
}
function sideHTML(label, c, o){ return `<div class="tr-side"><span class="lbl">${label}</span>${miniHTML(c, o)}</div>`; }
function offerRow(o, mode){
  const g = BYID[o.give], w = BYID[o.want];
  if(mode === 'mine'){
    const who = o.to ? 'Réservée à <b>' + esc(o.to) + '</b>' : 'Publique';
    const left = Math.max(1, Math.ceil((o.exp - nowSrv()) / 864e5));
    return `<div class="tr-row${o.ok ? '' : ' bad'}">${sideHTML('Je donne', g, {count:copies(o.give) || 0})}<span class="tr-arrow">⇄</span>${sideHTML('Je veux', w, {tag:copies(o.want) ? '' : 'Te manque', count:copies(o.want) || 0})}
      <div class="tr-act"><span class="tr-who">${who}<br>${o.ok ? 'Expire dans ' + left + ' j' : '<b>Plus valable : tu n\'as plus ce doublon</b>'}</span><button class="btn ghost sm" data-cancel="${o.id}">Annuler</button></div></div>`;
  }
  const can = tradable(o.want) > 0;
  const act = `<span class="tr-who">${mode === 'incoming' ? 'Proposition de' : 'De'} <b>${esc(o.from)}</b>${can ? '' : '<br>Il te faut « ' + esc(w.m) + ' » en double'}</span>`
    + `<button class="btn sm" data-accept="${o.id}"${can ? '' : ' disabled'}>Accepter</button>`
    + (mode === 'incoming' ? `<button class="btn ghost sm" data-cancel="${o.id}">Refuser</button>` : '');
  return `<div class="tr-row">${sideHTML('Tu reçois', g, {tag:copies(o.give) ? '' : 'Te manque', count:copies(o.give) || 0})}<span class="tr-arrow">⇄</span>${sideHTML('Tu donnes', w, {count:copies(o.want) || 0})}<div class="tr-act">${act}</div></div>`;
}
function renderTrades(){
  $$('#tradeTabs .chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === tradeTab));
  $('#tabMine').textContent = TR.mine.length + TR.incoming.length;
  const body = $('#tradeBody');
  if(tradeTab === 'market'){
    let list = TR.offers.slice();
    const score = o => (tradable(o.want) > 0 ? 2 : 0) + (copies(o.give) === 0 ? 1 : 0);
    list.sort((a, b) => score(b) - score(a));
    if(onlyAcceptable) list = list.filter(o => tradable(o.want) > 0);
    body.innerHTML = `<label class="check" style="margin-bottom:14px"><input type="checkbox" id="onlyOk"${onlyAcceptable ? ' checked' : ''}> Seulement les offres que je peux accepter</label>`
      + (list.length ? `<div class="tr-list">${list.map(o => offerRow(o, 'market')).join('')}</div>`
        : `<div class="empty">${TR.offers.length ? 'Aucune offre ne correspond à tes doublons pour le moment.' : 'Aucune offre sur le marché pour le moment. Publie la première avec « Nouvelle offre ».'}</div>`);
  } else if(tradeTab === 'mine'){
    let h = '';
    if(TR.incoming.length) h += `<h3 class="sub">Propositions reçues</h3><div class="tr-list">${TR.incoming.map(o => offerRow(o, 'incoming')).join('')}</div>`;
    h += `<h3 class="sub">Mes offres en cours</h3>` + (TR.mine.length ? `<div class="tr-list">${TR.mine.map(o => offerRow(o, 'mine')).join('')}</div>` : '<div class="empty">Tu n\'as aucune offre en cours.</div>');
    body.innerHTML = h;
  } else {
    body.innerHTML = TR.history.length ? `<div class="tr-list">${TR.history.map(h => {
      const g = BYID[h.got], w = BYID[h.gave];
      return `<div class="tr-row">${sideHTML('Tu as reçu', g)}<span class="tr-arrow">⇄</span>${sideHTML('Tu as donné', w)}<div class="tr-act"><span class="tr-who">Avec <b>${esc(h.with)}</b>${h.seen ? '' : '<span class="new-tag">Nouveau</span>'}<br>${new Date(h.t).toLocaleDateString('fr-FR', {day:'numeric', month:'short'})}${h.pts ? '<br><span class="tr-pts">+' + h.pts + ' pts</span>' : ''}</span></div></div>`;
    }).join('')}</div>` : '<div class="empty">Aucun échange terminé pour le moment.</div>';
  }
}
$('#tradeTabs').addEventListener('click', e => { const b = e.target.closest('.chip'); if(b){ tradeTab = b.dataset.t; renderTrades(); } });
$('#tradeBody').addEventListener('change', e => { if(e.target.id === 'onlyOk'){ onlyAcceptable = e.target.checked; renderTrades(); } });
$('#tradeBody').addEventListener('click', async e => {
  const a = e.target.closest('[data-accept]'), c = e.target.closest('[data-cancel]');
  if(a && !a.disabled){
    twoStep(a, async () => {
      try {
        const r = await api('POST', '/api/trade/accept', {id:a.dataset.accept}); applySession(r);
        renderTradeInfo(); showTradeDone(r.trade);
      } catch(err){ onApiError(err); }
      enterTrades();
    });
  } else if(c){
    try { await api('POST', '/api/trade/cancel', {id:c.dataset.cancel}); toast('Offre retirée'); } catch(err){ onApiError(err); }
    enterTrades();
  }
});
$('#newOffer').addEventListener('click', () => openOfferModal());

/* ---------- Fenêtre modale : créer une offre ---------- */
function modalOpen(html){ const m = $('#modal'); m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; document.body.style.overflow = 'hidden'; }
function modalClose(){ const m = $('#modal'); m.hidden = true; m.innerHTML = ''; if(!stageOpen) document.body.style.overflow = ''; }
let draft = {give:0, want:0, to:''}, pickKind = '', pickQ = '', pickMissing = true;
function openOfferModal(pre){
  draft = {give:pre && pre.give || 0, want:pre && pre.want || 0, to:''};
  renderOfferModal();
}
function slotHTML(kind){
  const id = draft[kind], label = kind === 'give' ? 'Choisir un doublon' : 'Choisir une carte';
  return id ? miniHTML(BYID[id], {button:true}).replace('<button ', `<button data-m="pick-${kind}" `) : `<button type="button" class="slot-pick" data-m="pick-${kind}">${label}</button>`;
}
function renderOfferModal(err){
  const g = BYID[draft.give], w = BYID[draft.want];
  const hint = g && w && w.r > g.r ? `<p class="lead" style="margin:0">Tu demandes une carte plus rare (${RAR[w.r].n}) que celle que tu donnes (${RAR[g.r].n}) : l'offre risque de rester sans réponse.</p>` : '';
  modalOpen(`
    <div class="modal-head"><h3>Nouvelle offre</h3><button class="btn ghost sm" data-m="close">Fermer</button></div>
    <div class="slots">
      <div class="slot-col"><span class="lbl">Je donne</span>${slotHTML('give')}</div>
      <span class="tr-arrow">⇄</span>
      <div class="slot-col"><span class="lbl">Je veux</span>${slotHTML('want')}</div>
    </div>
    ${hint}
    <div class="slot-col"><label class="lbl" for="offTo">Réservée à un joueur (facultatif)</label>
      <input class="inp" id="offTo" maxlength="20" autocomplete="off" autocapitalize="none" placeholder="Pseudo (vide = marché public)" value="${esc(draft.to)}"></div>
    <p class="err" id="offErr" role="alert">${err ? esc(err) : ''}</p>
    <div class="row"><button class="btn" data-m="publish">Publier l'offre</button><button class="btn ghost" data-m="close">Annuler</button></div>`);
}
function renderPicker(kind){
  pickKind = kind; pickQ = '';
  modalOpen(`
    <div class="modal-head"><h3>${kind === 'give' ? 'Quel doublon donnes-tu ?' : 'Quelle carte veux-tu ?'}</h3><button class="btn ghost sm" data-m="back">Retour</button></div>
    <div class="pick-tools"><input class="inp" id="pickQ" placeholder="Rechercher une marque ou un modèle" autocomplete="off">
      ${kind === 'want' ? `<label class="check"><input type="checkbox" id="pickMissing"${pickMissing ? ' checked' : ''}> Seulement celles qui me manquent</label>` : ''}</div>
    <div class="mini-grid" id="pickGrid"></div>`);
  renderPickGrid();
}
function renderPickGrid(){
  const q = pickQ.trim().toLowerCase();
  let list = SORTED.filter(c => pickKind === 'give' ? tradable(c.id) > 0 : c.id !== draft.give);
  if(pickKind === 'want' && pickMissing) list = list.filter(c => copies(c.id) === 0);
  if(q) list = list.filter(c => (c.b + ' ' + c.m).toLowerCase().includes(q));
  $('#pickGrid').innerHTML = list.length
    ? list.map(c => miniHTML(c, {button:true, count:pickKind === 'give' ? tradable(c.id) : copies(c.id), tag:pickKind === 'want' && !copies(c.id) ? 'Te manque' : ''}).replace('<button ', `<button data-pick="${c.id}" `)).join('')
    : `<div class="empty" style="grid-column:1/-1">${pickKind === 'give' ? 'Tu n\'as aucun doublon à échanger. Ouvre des paquets pour en obtenir.' : 'Aucune carte ne correspond.'}</div>`;
}
function showTradeDone(t){
  modalOpen(`<div class="done-box"><h3>Échange réussi</h3>
    <div class="slots">${sideHTML('Tu reçois', BYID[t.got])}<span class="tr-arrow">⇄</span>${sideHTML('Tu donnes', BYID[t.gave])}</div>
    <p>Échange avec <b>${esc(t.with)}</b>.${t.pts ? ' <span class="tr-pts">+' + t.pts + ' points</span>' : ' Plus de bonus aujourd\'hui : la limite de ' + ECON.tradeCap + ' échanges est atteinte.'}</p>
    <button class="btn" data-m="close">Super</button></div>`);
}
$('#modal').addEventListener('click', async e => {
  if(e.target === $('#modal')){ modalClose(); return; }
  const pk = e.target.closest('[data-pick]');
  if(pk){
    const id = +pk.dataset.pick; draft[pickKind] = id;
    if(draft.give && draft.give === draft.want) draft[pickKind === 'give' ? 'want' : 'give'] = 0;
    renderOfferModal(); return;
  }
  const b = e.target.closest('[data-m]'); if(!b) return;
  const m = b.dataset.m;
  if(m === 'close') modalClose();
  else if(m === 'back') renderOfferModal();
  else if(m === 'pick-give' || m === 'pick-want') renderPicker(m.slice(5));
  else if(m === 'publish'){
    if(!draft.give || !draft.want){ renderOfferModal('Choisis la carte que tu donnes et celle que tu veux.'); return; }
    try {
      await api('POST', '/api/trade/offer', {give:draft.give, want:draft.want, to:draft.to.trim() || undefined});
      modalClose(); toast('Offre publiée'); tradeTab = 'mine'; location.hash = 'echanges'; enterTrades();
    } catch(err){
      if(err.status === 401){ modalClose(); onApiError(err); } else renderOfferModal(err.message);
    }
  }
});
$('#modal').addEventListener('input', e => {
  if(e.target.id === 'offTo') draft.to = e.target.value;
  else if(e.target.id === 'pickQ'){ pickQ = e.target.value; renderPickGrid(); }
});
$('#modal').addEventListener('change', e => { if(e.target.id === 'pickMissing'){ pickMissing = e.target.checked; renderPickGrid(); } });
