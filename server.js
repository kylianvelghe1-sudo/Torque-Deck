'use strict';
/* Torque Deck : serveur Node.js sans dépendance (Node 18 ou plus récent). */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

/* ---------- Configuration ---------- */
const PORT = +process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PUB = path.join(__dirname, 'public');
const PHOTO_DIR = path.join(DATA_DIR, 'photos');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1188';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const MAX_PACKS = +process.env.MAX_PACKS || 10;
const INTERVAL = (+process.env.PACK_INTERVAL_MIN || 10) * 60 * 1000;
const DUPS_ONLY = process.env.TRADE_DUPLICATES_ONLY !== '0';   // 1 par défaut : seuls les doublons s'échangent
const NEED = DUPS_ONLY ? 2 : 1;                                // exemplaires nécessaires pour donner une carte
const MAX_USERS = 5000, MAX_OFFERS = 10, OFFER_MS = 7 * 864e5, SESSION_MS = 30 * 864e5, ADMIN_MS = 12 * 36e5;
fs.mkdirSync(PHOTO_DIR, { recursive: true });

/* ---------- Données du jeu (partagées avec le site) ---------- */
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(PUB, 'data.js'), 'utf8') + '\nglobalThis.__g = {CARS, RAR, BYR, BYID, ECON};', ctx);
const { CARS, RAR, BYR, BYID, ECON } = ctx.__g;

/* ---------- Base de données (fichier JSON, écriture atomique) ---------- */
let db = { users: {}, sessions: {}, offers: {} };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* première exécution */ }
for (const u of Object.values(db.users)) { u.points = u.points || 0; u.history = u.history || []; u.tradeDay = u.tradeDay || ''; u.tradeN = u.tradeN || 0; }
let dirty = false, timer = null;
function save() { dirty = true; if (!timer) timer = setTimeout(flush, 250); }
function flush() {
  timer = null; if (!dirty) return; dirty = false;
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_FILE);
}
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { flush(); process.exit(0); });
process.on('exit', flush);

/* ---------- Outils ---------- */
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const safeEq = (a, b) => crypto.timingSafeEqual(Buffer.from(sha(a)), Buffer.from(sha(b)));
const adminSessions = new Map();
const hits = new Map();
function ip(req) { return (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?'; }
function limited(req, key, max, ms) {
  const k = key + '|' + ip(req), now = Date.now(); let h = hits.get(k);
  if (!h || h.reset < now) { h = { n: 0, reset: now + ms }; hits.set(k, h); }
  return ++h.n > max;
}
setInterval(() => { const n = Date.now(); for (const [k, h] of hits) if (h.reset < n) hits.delete(k); for (const [k, e] of adminSessions) if (e < n) adminSessions.delete(k); }, 60000).unref();
function cookies(req) {
  const o = {};
  for (const p of (req.headers.cookie || '').split(';')) { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }
  return o;
}
const isSecure = req => process.env.COOKIE_SECURE === '1' || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');
const setCookie = (req, name, val, sec) => `${name}=${val}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sec}${isSecure(req) ? '; Secure' : ''}`;
function json(res, code, obj, extra) {
  const b = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': b.length, 'Cache-Control': 'no-store' }, extra || {}));
  res.end(b);
}
const fail = (res, code, msg) => json(res, code, { error: msg });
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const parts = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(Object.assign(new Error('Fichier trop volumineux'), { status: 413 })); req.destroy(); } else parts.push(c); });
    req.on('end', () => resolve(Buffer.concat(parts)));
    req.on('error', reject);
  });
}
async function readJSON(req) {
  const b = await readBody(req, 20000);
  try { const o = JSON.parse(b.toString('utf8') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { throw Object.assign(new Error('Requête invalide'), { status: 400 }); }
}
const today = () => new Date().toISOString().slice(0, 10);
const cardId = v => (Number.isInteger(v) && BYID[v]) ? v : 0;

/* ---------- Joueurs, paquets, points ---------- */
// Le stock grandit toutes les 10 min jusqu'à MAX_PACKS. Les paquets achetés avec des points peuvent le dépasser.
function sync(u, now = Date.now()) {
  if (u.packs >= MAX_PACKS) { u.nextAt = null; return; }
  if (!u.nextAt) u.nextAt = now + INTERVAL;
  while (u.nextAt <= now && u.packs < MAX_PACKS) { u.packs++; u.nextAt += INTERVAL; }
  if (u.packs >= MAX_PACKS) u.nextAt = null;
}
function tradeLeft(u) { return Math.max(0, ECON.tradeCap - (u.tradeDay === today() ? u.tradeN : 0)); }
function stateOf(u) { sync(u); return { packs: u.packs, nextAt: u.nextAt, cards: u.cards, opened: u.opened, points: u.points, tradeLeft: tradeLeft(u) }; }
function notifyOf(u) {
  pruneOffers();
  let incoming = 0;
  for (const o of Object.values(db.offers)) if (o.to === u.key && offerValid(o)) incoming++;
  return { incoming, unseen: u.history.filter(h => !h.seen).length };
}
const cfg = () => ({ dupsOnly: DUPS_ONLY, max: MAX_PACKS, intervalMin: INTERVAL / 6e4 });
const sessionInfo = u => ({ user: { name: u.name }, state: stateOf(u), notify: notifyOf(u), cfg: cfg(), now: Date.now() });
function pickRarity(min) {
  const w = RAR.map((r, i) => i < min ? 0 : r.w), sum = w.reduce((a, b) => a + b, 0);
  let x = crypto.randomInt(1e9) / 1e9 * sum;
  for (let i = 0; i < w.length; i++) { if ((x -= w[i]) < 0) return i; }
  return RAR.length - 1;
}
function drawPack() {
  const used = new Set(), out = [];
  for (let s = 0; s < 5; s++) {
    let c = null;
    while (!c) {
      const pool = BYR[pickRarity(s === 4 ? 2 : 0)].filter(x => !used.has(x.id));
      if (pool.length) c = pool[crypto.randomInt(pool.length)];
    }
    used.add(c.id); out.push(c);
  }
  return out.sort((a, b) => a.r - b.r || a.v - b.v);
}
const validName = n => typeof n === 'string' && /^[\p{L}\p{N}_-]{3,20}$/u.test(n);
function userFor(req) {
  const t = cookies(req).td_sid; if (!t || !/^[0-9a-f]{64}$/.test(t)) return null;
  const s = db.sessions[sha(t)]; if (!s) return null;
  if (s.exp < Date.now()) { delete db.sessions[sha(t)]; save(); return null; }
  return db.users[s.user] || null;
}
function isAdmin(req) {
  const t = cookies(req).td_admin; if (!t || !/^[0-9a-f]{64}$/.test(t)) return false;
  const e = adminSessions.get(sha(t)); return !!e && e > Date.now();
}
function newSession(u) {
  const t = crypto.randomBytes(32).toString('hex');
  db.sessions[sha(t)] = { user: u.key, exp: Date.now() + SESSION_MS }; save(); return t;
}
const hashPw = async (pw, salt) => (await scrypt(pw, salt, 64)).toString('hex');

/* ---------- Échanges ---------- */
const have = (u, id) => u.cards[id] || 0;
function pruneOffers() { const n = Date.now(); for (const k of Object.keys(db.offers)) if (db.offers[k].exp < n || !db.users[db.offers[k].from]) delete db.offers[k]; }
function offerValid(o) { const m = db.users[o.from]; return !!m && have(m, o.give) >= NEED; }
const offerOut = o => ({ id: o.id, from: o.fromName, to: o.toName || null, give: o.give, want: o.want, created: o.created, exp: o.exp });
function giveCard(u, id) { u.cards[id] = have(u, id) - 1; if (u.cards[id] <= 0) delete u.cards[id]; }
function takeCard(u, id) { u.cards[id] = have(u, id) + 1; }
function reward(u, givenCard) {
  if (u.tradeDay !== today()) { u.tradeDay = today(); u.tradeN = 0; }
  if (u.tradeN >= ECON.tradeCap) return 0;
  u.tradeN++; const pts = ECON.tradeBonus[BYID[givenCard].r]; u.points += pts; return pts;
}
function pushHistory(u, e) { u.history.unshift(e); u.history.length = Math.min(u.history.length, 30); }

/* ---------- Photos ---------- */
function photoMap() {
  const m = {};
  for (const c of CARS) {
    try { m[c.b + '|' + c.m] = '/photos/' + c.id + '.jpg?v=' + Math.floor(fs.statSync(path.join(PHOTO_DIR, c.id + '.jpg')).mtimeMs); } catch (e) { /* pas de photo */ }
  }
  return m;
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  if (m !== 'GET' && req.headers['x-requested-with'] !== 'td') return fail(res, 403, 'Requête refusée');

  if (m === 'GET' && p === '/api/photos') return json(res, 200, { photos: photoMap() });
  if (m === 'GET' && p === '/api/health') return json(res, 200, { ok: true });

  if (m === 'POST' && (p === '/api/register' || p === '/api/login')) {
    const reg = p === '/api/register';
    if (limited(req, reg ? 'reg' : 'login', reg ? 10 : 15, reg ? 36e5 : 6e5)) return fail(res, 429, 'Trop de tentatives, réessaie plus tard');
    const { name, password } = await readJSON(req);
    if (!validName(name)) return fail(res, 400, 'Pseudo de 3 à 20 caractères : lettres, chiffres, - ou _');
    if (typeof password !== 'string' || password.length < 6 || password.length > 100) return fail(res, 400, 'Mot de passe de 6 caractères minimum');
    const key = name.toLowerCase();
    let u = db.users[key];
    if (reg) {
      if (u) return fail(res, 409, 'Ce pseudo est déjà pris');
      if (Object.keys(db.users).length >= MAX_USERS) return fail(res, 503, 'Inscriptions fermées');
      const salt = crypto.randomBytes(16).toString('hex');
      u = db.users[key] = { key, name, salt, hash: await hashPw(password, salt), created: Date.now(), packs: MAX_PACKS, nextAt: null, cards: {}, opened: 0, points: 0, history: [], tradeDay: '', tradeN: 0 };
    } else {
      const ok = u && crypto.timingSafeEqual(Buffer.from(await hashPw(password, u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
      if (!ok) return fail(res, 401, 'Pseudo ou mot de passe incorrect');
    }
    const t = newSession(u);
    return json(res, 200, sessionInfo(u), { 'Set-Cookie': setCookie(req, 'td_sid', t, SESSION_MS / 1000) });
  }
  if (m === 'POST' && p === '/api/logout') {
    const t = cookies(req).td_sid; if (t) { delete db.sessions[sha(t)]; save(); }
    return json(res, 200, { ok: true }, { 'Set-Cookie': setCookie(req, 'td_sid', '', 0) });
  }
  if (p.startsWith('/api/') && !p.startsWith('/api/admin/')) {
    const u = userFor(req);
    if (!u && !['/api/photos', '/api/health'].includes(p)) return fail(res, 401, 'Non connecté');

    if (m === 'GET' && p === '/api/me') { save(); return json(res, 200, sessionInfo(u)); }

    if (m === 'POST' && p === '/api/open') {
      sync(u);
      if (u.packs <= 0) return fail(res, 409, 'Plus de paquet pour le moment');
      u.packs--; if (!u.nextAt) u.nextAt = Date.now() + INTERVAL;
      u.opened++;
      const cards = drawPack().map(c => { const before = have(u, c.id); u.cards[c.id] = before + 1; return { id: c.id, before }; });
      save();
      return json(res, 200, { cards, state: stateOf(u), now: Date.now() });
    }

    /* ----- Points : achat de paquets et recyclage ----- */
    if (m === 'POST' && p === '/api/buy-pack') {
      const { qty } = await readJSON(req); const n = Number.isInteger(qty) ? qty : 1;
      if (n < 1 || n > 10) return fail(res, 400, 'Quantité invalide');
      const cost = n * ECON.packPrice;
      if (u.points < cost) return fail(res, 409, 'Pas assez de points');
      sync(u); u.points -= cost; u.packs += n; save();
      return json(res, 200, { bought: n, state: stateOf(u), now: Date.now() });
    }
    if (m === 'POST' && p === '/api/recycle') {
      const b = await readJSON(req); let gained = 0, count = 0;
      if (b.all === true) {
        const only = Number.isInteger(b.rarity) ? b.rarity : -1;
        const up = Number.isInteger(b.upTo) ? b.upTo : only;
        if (up < 0 || up > 5 || only > 5) return fail(res, 400, 'Rareté invalide');
        for (const [id, n] of Object.entries(u.cards)) {
          const c = BYID[id]; if (!c || c.r > up || (only >= 0 && c.r !== only) || n < 2) continue;
          gained += (n - 1) * ECON.recycle[c.r]; count += n - 1; u.cards[id] = 1;
        }
      } else {
        const id = cardId(b.id), qty = Number.isInteger(b.qty) ? b.qty : 1;
        if (!id) return fail(res, 400, 'Carte inconnue');
        if (qty < 1 || have(u, id) - qty < 1) return fail(res, 409, 'Tu gardes toujours un exemplaire de chaque carte');
        u.cards[id] -= qty; gained = qty * ECON.recycle[BYID[id].r]; count = qty;
      }
      if (!count) return fail(res, 409, 'Aucun doublon à recycler');
      u.points += gained; save();
      return json(res, 200, { gained, count, state: stateOf(u), now: Date.now() });
    }

    /* ----- Échanges ----- */
    if (m === 'GET' && p === '/api/trades') {
      pruneOffers();
      const out = { offers: [], incoming: [], mine: [], history: u.history.map(h => Object.assign({}, h)) };
      for (const o of Object.values(db.offers).sort((a, b) => b.created - a.created)) {
        const ok = offerValid(o);
        if (o.from === u.key) out.mine.push(Object.assign(offerOut(o), { ok }));
        else if (!ok) continue;
        else if (o.to === u.key) out.incoming.push(offerOut(o));
        else if (!o.to && out.offers.length < 300) out.offers.push(offerOut(o));
      }
      let changed = false; for (const h of u.history) if (!h.seen) { h.seen = true; changed = true; }
      if (changed) save();
      return json(res, 200, out);
    }
    if (m === 'POST' && p === '/api/trade/offer') {
      pruneOffers();
      const b = await readJSON(req), give = cardId(b.give), want = cardId(b.want);
      if (!give || !want || give === want) return fail(res, 400, 'Choisis deux cartes différentes');
      if (have(u, give) < NEED) return fail(res, 409, DUPS_ONLY ? 'Seuls tes doublons peuvent être échangés' : 'Tu ne possèdes pas cette carte');
      if (Object.values(db.offers).filter(o => o.from === u.key).length >= MAX_OFFERS) return fail(res, 409, 'Tu as déjà ' + MAX_OFFERS + ' offres en cours');
      let to = null, toName = null;
      if (b.to) {
        if (!validName(b.to)) return fail(res, 400, 'Pseudo invalide');
        const t = db.users[b.to.toLowerCase()];
        if (!t) return fail(res, 404, 'Joueur introuvable');
        if (t.key === u.key) return fail(res, 400, 'Tu ne peux pas t\'envoyer une offre');
        to = t.key; toName = t.name;
      }
      if (Object.values(db.offers).some(o => o.from === u.key && o.give === give && o.want === want && o.to === to)) return fail(res, 409, 'Cette offre existe déjà');
      const o = { id: crypto.randomBytes(6).toString('hex'), from: u.key, fromName: u.name, to, toName, give, want, created: Date.now(), exp: Date.now() + OFFER_MS };
      db.offers[o.id] = o; save();
      return json(res, 200, { offer: offerOut(o) });
    }
    if (m === 'POST' && p === '/api/trade/cancel') {
      const { id } = await readJSON(req), o = db.offers[id];
      if (!o || (o.from !== u.key && o.to !== u.key)) return fail(res, 404, 'Offre introuvable');
      delete db.offers[id]; save(); return json(res, 200, { ok: true });
    }
    if (m === 'POST' && p === '/api/trade/accept') {
      pruneOffers();
      const { id } = await readJSON(req), o = db.offers[id];
      if (!o) return fail(res, 404, 'Cette offre n\'existe plus');
      if (o.from === u.key) return fail(res, 400, 'C\'est ta propre offre');
      if (o.to && o.to !== u.key) return fail(res, 403, 'Cette offre est destinée à un autre joueur');
      const maker = db.users[o.from];
      if (!offerValid(o)) { delete db.offers[id]; save(); return fail(res, 409, 'Cette offre n\'est plus valable'); }
      if (have(u, o.want) < NEED) return fail(res, 409, DUPS_ONLY ? 'Tu n\'as pas cette carte en double' : 'Tu n\'as pas cette carte');
      giveCard(maker, o.give); takeCard(u, o.give);
      giveCard(u, o.want); takeCard(maker, o.want);
      const ptsU = reward(u, o.want), ptsM = reward(maker, o.give), t = Date.now();
      pushHistory(u, { t, gave: o.want, got: o.give, with: maker.name, pts: ptsU, seen: true });
      pushHistory(maker, { t, gave: o.give, got: o.want, with: u.name, pts: ptsM, seen: false });
      delete db.offers[id]; save();
      return json(res, 200, { trade: { gave: o.want, got: o.give, with: maker.name, pts: ptsU }, state: stateOf(u), notify: notifyOf(u), now: Date.now() });
    }
    return fail(res, 404, 'Introuvable');
  }

  /* ----- Admin ----- */
  if (m === 'POST' && p === '/api/admin/login') {
    if (limited(req, 'adm', 8, 6e5)) return fail(res, 429, 'Trop de tentatives, réessaie plus tard');
    const { password } = await readJSON(req);
    if (typeof password !== 'string' || !safeEq(password, ADMIN_PASSWORD)) return fail(res, 401, 'Code incorrect');
    const t = crypto.randomBytes(32).toString('hex'); adminSessions.set(sha(t), Date.now() + ADMIN_MS);
    return json(res, 200, { ok: true }, { 'Set-Cookie': setCookie(req, 'td_admin', t, ADMIN_MS / 1000) });
  }
  if (p.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return fail(res, 401, 'Accès réservé');
    if (m === 'POST' && p === '/api/admin/logout') {
      const t = cookies(req).td_admin; if (t) adminSessions.delete(sha(t));
      return json(res, 200, { ok: true }, { 'Set-Cookie': setCookie(req, 'td_admin', '', 0) });
    }
    if (m === 'GET' && p === '/api/admin/stats') {
      pruneOffers();
      const users = Object.values(db.users).map(u => { sync(u); return { name: u.name, packs: u.packs, nextAt: u.nextAt, opened: u.opened, points: u.points, unique: Object.keys(u.cards).length, total: Object.values(u.cards).reduce((a, b) => a + b, 0), created: u.created }; });
      users.sort((a, b) => b.unique - a.unique || a.name.localeCompare(b.name));
      save();
      return json(res, 200, { users, offers: Object.keys(db.offers).length, max: MAX_PACKS, intervalMin: INTERVAL / 6e4, cards: CARS.length, now: Date.now(), photos: photoMap() });
    }
    if (m === 'POST' && p === '/api/admin/reset-all-packs') {
      for (const u of Object.values(db.users)) { sync(u); if (u.packs < MAX_PACKS) { u.packs = MAX_PACKS; u.nextAt = null; } }
      save(); return json(res, 200, { ok: true });
    }
    if (m === 'POST' && p === '/api/admin/cancel-offers') { db.offers = {}; save(); return json(res, 200, { ok: true }); }
    let mm = p.match(/^\/api\/admin\/users\/([^/]+)\/(reset-packs|add-pack|skip|wipe|add-points)$/);
    if (m === 'POST' && mm) {
      let key; try { key = decodeURIComponent(mm[1]).toLowerCase(); } catch (e) { return fail(res, 400, 'Pseudo invalide'); }
      const u = db.users[key]; if (!u) return fail(res, 404, 'Joueur introuvable');
      const a = mm[2]; sync(u);
      if (a === 'reset-packs') { if (u.packs < MAX_PACKS) { u.packs = MAX_PACKS; u.nextAt = null; } }
      else if (a === 'add-pack') { u.packs++; if (u.packs >= MAX_PACKS) u.nextAt = null; }
      else if (a === 'skip') { if (u.packs < MAX_PACKS) { u.nextAt -= INTERVAL; sync(u); } }
      else if (a === 'add-points') { u.points += 100; }
      else if (a === 'wipe') { u.cards = {}; for (const k of Object.keys(db.offers)) if (db.offers[k].from === u.key) delete db.offers[k]; }
      save(); return json(res, 200, { ok: true });
    }
    mm = p.match(/^\/api\/admin\/photo\/(\d{1,3})$/);
    if (mm && (m === 'PUT' || m === 'DELETE')) {
      const id = +mm[1]; if (!BYID[id]) return fail(res, 404, 'Voiture inconnue');
      const f = path.join(PHOTO_DIR, id + '.jpg');
      if (m === 'DELETE') { try { fs.unlinkSync(f); } catch (e) { /* déjà absente */ } return json(res, 200, { ok: true }); }
      const buf = await readBody(req, 1.5 * 1024 * 1024);
      if (buf.length < 100 || buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[2] !== 0xFF) return fail(res, 400, 'Image JPEG attendue');
      fs.writeFileSync(f + '.tmp', buf); fs.renameSync(f + '.tmp', f);
      return json(res, 200, { ok: true, url: '/photos/' + id + '.jpg?v=' + Math.floor(fs.statSync(f).mtimeMs) });
    }
  }
  return fail(res, 404, 'Introuvable');
}

/* ---------- Fichiers statiques ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
function serveFile(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return fail(res, 404, 'Introuvable');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
function serveStatic(req, res, url) {
  let p; try { p = decodeURIComponent(url.pathname); } catch (e) { return fail(res, 400, 'Adresse invalide'); }
  if (p.includes('\0')) return fail(res, 400, 'Adresse invalide');
  if (p.startsWith('/photos/')) return serveFile(req, res, path.join(PHOTO_DIR, path.basename(p)), 'public, max-age=86400');
  if (p === '/') p = '/index.html';
  const f = path.normalize(path.join(PUB, p));
  if (!f.startsWith(PUB + path.sep) || path.basename(f).startsWith('.')) return fail(res, 404, 'Introuvable');
  serveFile(req, res, f, 'no-cache');
}

/* ---------- Serveur ---------- */
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Méthode non autorisée');
    serveStatic(req, res, url);
  } catch (e) {
    if (res.headersSent) return res.end();
    if (e.status) return fail(res, e.status, e.message);
    console.error(e); fail(res, 500, 'Erreur du serveur');
  }
});
server.listen(PORT, () => {
  console.log(`Torque Deck : http://localhost:${PORT}  (${CARS.length} cartes, données dans ${DATA_DIR})`);
  if (!process.env.ADMIN_PASSWORD) console.warn('ATTENTION : code admin par défaut (1188). Définis la variable ADMIN_PASSWORD avant la mise en ligne.');
});
