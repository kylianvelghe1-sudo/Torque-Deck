/* ---------- Outils, état, API, comptes, navigation ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtN = n => Number(n).toLocaleString('fr-FR');

let ME = null;
let S = {packs:0, nextAt:null, cards:{}, opened:0, points:0, tradeLeft:0};
let CFG = {dupsOnly:true, max:10, intervalMin:10};
let NOTIFY = {incoming:0, unseen:0};
let OFFSET = 0, PHOTOS = {}, stageOpen = false;
const pkey = c => c.b + '|' + c.m;
const nowSrv = () => Date.now() + OFFSET;
const mmss = ms => { const t = Math.max(0, Math.ceil(ms/1000)); return String(Math.floor(t/60)).padStart(2,'0') + ':' + String(t%60).padStart(2,'0'); };

let toastT;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }

async function api(method, url, body, rawType){
  const opt = {method, headers:{'X-Requested-With':'td'}, credentials:'same-origin'};
  if(body !== undefined){
    if(rawType){ opt.body = body; opt.headers['Content-Type'] = rawType; }
    else { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
  }
  let r;
  try { r = await fetch(url, opt); } catch(e){ throw Object.assign(new Error('Serveur injoignable'), {status:0}); }
  let j = null; try { j = await r.json(); } catch(e){ /* pas de JSON */ }
  if(!r.ok) throw Object.assign(new Error((j && j.error) || 'Erreur ' + r.status), {status:r.status});
  return j;
}
function applySession(j){
  if(j.user) ME = j.user;
  if(j.state) S = j.state;
  if(j.cfg) CFG = j.cfg;
  if(j.notify) NOTIFY = j.notify;
  if(j.now) OFFSET = j.now - Date.now();
}
// Un 401 signifie que la session a expiré : on revient à l'écran de connexion.
function onApiError(e){
  if(e.status === 401 && ME){ ME = null; S = {packs:0,nextAt:null,cards:{},opened:0,points:0,tradeLeft:0}; route(); }
  toast(e.message);
}

const copies = id => S.cards[id] || 0;
const spare = id => Math.max(0, copies(id) - 1);                          // doublons recyclables
const tradable = id => Math.max(0, copies(id) - (CFG.dupsOnly ? 1 : 0));  // exemplaires qu'on peut donner
const owned = () => Object.keys(S.cards).filter(k => S.cards[k] > 0).length;
const totalSpare = () => Object.keys(S.cards).reduce((a,k) => a + Math.max(0, S.cards[k]-1), 0);

/* Confirmation en deux clics pour les actions définitives */
let armedBtn = null, armedT = 0;
function twoStep(btn, fn){
  if(armedBtn === btn){ armedBtn = null; clearTimeout(armedT); fn(); return; }
  if(armedBtn && armedBtn.isConnected) armedBtn.textContent = armedBtn.dataset.l;
  btn.dataset.l = btn.textContent; btn.textContent = 'Confirmer ?'; armedBtn = btn;
  clearTimeout(armedT);
  armedT = setTimeout(() => { if(armedBtn === btn){ if(btn.isConnected) btn.textContent = btn.dataset.l; armedBtn = null; } }, 3500);
}

/* ---------- Barre du haut ---------- */
function renderChrome(){
  $('#navUser').textContent = ME ? ME.name : 'Connexion';
  $('#navPts').hidden = !ME;
  $('#ptsVal').textContent = ME ? fmtN(S.points) : '0';
  $('#navCount').textContent = owned();
  const n = NOTIFY.incoming + NOTIFY.unseen, b = $('#navTrade');
  b.hidden = !ME || n <= 0; b.textContent = n;
}

/* ---------- Connexion et compte ---------- */
let authMode = 'login';
function setAuthMode(m){
  authMode = m;
  $('#tabLogin').setAttribute('aria-pressed', m === 'login');
  $('#tabReg').setAttribute('aria-pressed', m === 'reg');
  $('#authBtn').textContent = m === 'login' ? 'Se connecter' : 'Créer mon compte';
  $('#aPass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
  $('#authErr').textContent = '';
}
$('#tabLogin').addEventListener('click', () => setAuthMode('login'));
$('#tabReg').addEventListener('click', () => setAuthMode('reg'));
$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#authBtn'); btn.disabled = true; $('#authErr').textContent = '';
  try {
    const j = await api('POST', authMode === 'login' ? '/api/login' : '/api/register', {name: $('#aName').value.trim(), password: $('#aPass').value});
    applySession(j); $('#aPass').value = '';
    toast(authMode === 'login' ? 'Bon retour, ' + j.user.name : 'Compte créé : 10 paquets t\'attendent');
    location.hash = 'boutique'; route();
  } catch(err){ $('#authErr').textContent = err.message; }
  btn.disabled = false;
});
$('#logoutBtn').addEventListener('click', async () => {
  try { await api('POST', '/api/logout', {}); } catch(e){ /* déjà déconnecté */ }
  ME = null; S = {packs:0,nextAt:null,cards:{},opened:0,points:0,tradeLeft:0}; NOTIFY = {incoming:0,unseen:0};
  location.hash = 'compte'; route();
});
function renderAccount(){
  $('#authBox').hidden = !!ME; $('#meBox').hidden = !ME;
  if(!ME) return;
  $('#meName').textContent = ME.name;
  $('#mePacks').textContent = S.packs; $('#meOpened').textContent = S.opened;
  $('#meUnique').textContent = owned() + ' / ' + CARS.length; $('#mePoints').textContent = fmtN(S.points);
}

/* ---------- Navigation ---------- */
const VIEWS = ['boutique','collection','echanges','points','compte','admin'];
const NEEDS_AUTH = ['boutique','collection','echanges','points'];
function currentView(){
  const h = location.hash.slice(1); let v = VIEWS.includes(h) ? h : 'boutique';
  if(!ME && NEEDS_AUTH.includes(v)) v = 'compte';
  return v;
}
function route(){
  const v = currentView();
  $$('.view').forEach(e => e.classList.toggle('on', e.id === 'v-' + v));
  $$('[data-v]').forEach(a => { if(a.dataset.v === v) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  renderChrome();
  const r = {boutique:renderShop, collection:renderCollection, echanges:enterTrades, points:renderPoints, compte:renderAccount, admin:enterAdmin}[v];
  r();
}
addEventListener('hashchange', () => { if(stageOpen){ closeStage(); return; } route(); window.scrollTo(0, 0); });

async function refresh(){
  try { applySession(await api('GET', '/api/me')); }
  catch(e){ if(e.status === 401 && ME){ ME = null; route(); } }
  renderChrome();
}
