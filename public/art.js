/* ---------- Dessin des voitures (SVG original) ---------- */
function shade(h,p){const n=parseInt(h.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const t=p<0?0:255,q=Math.abs(p);r=Math.round((t-r)*q+r);g=Math.round((t-g)*q+g);b=Math.round((t-b)*q+b);return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}

const BODY = {
 hatch:{d:'M16 82 L16 62 Q16 56 24 54 L40 52 Q46 34 66 32 L140 32 Q152 32 160 42 L176 54 L208 60 Q224 63 224 74 L224 82 Z',win:['M50 51 Q54 38 68 37 L96 37 L96 51 Z','M102 37 L138 37 Q146 37 152 44 L162 51 L102 51 Z'],f:[216,69],r:[17,66],w:[58,180],R:19,door:99},
 sedan:{d:'M12 82 L12 66 Q12 60 20 58 L50 56 L70 38 Q74 34 82 34 L136 34 Q146 34 154 40 L176 56 L212 62 Q226 65 226 74 L226 82 Z',win:['M62 54 L76 40 L98 40 L98 54 Z','M104 40 L134 40 Q142 40 148 46 L160 54 L104 54 Z'],f:[218,69],r:[13,69],w:[58,180],R:19,door:101},
 coupe:{d:'M10 82 L10 68 Q10 62 18 60 L56 56 L88 38 Q94 34 102 34 L130 34 Q142 35 152 44 L172 56 L214 62 Q228 65 228 75 L228 82 Z',win:['M80 54 L96 40 L112 40 L112 54 Z','M118 40 L130 40 Q138 41 146 48 L158 55 L118 55 Z'],f:[220,70],r:[11,69],w:[58,182],R:19,door:115},
 roadster:{d:'M10 82 L10 68 Q10 62 18 60 L100 58 L108 44 L116 44 L124 58 L170 58 L214 64 Q228 67 228 76 L228 82 Z',win:['M104 58 L111 43 L117 43 L125 58 Z'],f:[220,71],r:[11,69],w:[56,182],R:19,door:0,open:true},
 suv:{d:'M14 84 L14 52 Q14 44 22 42 L50 40 L56 30 Q58 26 64 26 L150 26 Q158 26 162 32 L176 50 L212 56 Q226 59 226 70 L226 84 Z',win:['M60 40 L63 31 L100 31 L100 40 Z','M106 31 L148 31 L158 40 L106 40 Z'],f:[218,63],r:[15,62],w:[58,182],R:21,door:103},
 pickup:{d:'M10 84 L10 58 L68 58 L68 50 L86 32 Q90 28 96 28 L138 28 Q146 28 152 34 L168 52 L214 58 Q228 61 228 72 L228 84 Z',win:['M92 33 L136 33 Q142 33 146 38 L156 50 L92 50 Z'],f:[220,66],r:[11,70],w:[40,184],R:20,door:90,bed:true},
 van:{d:'M12 84 L12 28 Q12 22 20 22 L140 22 Q150 22 156 28 L178 52 L216 58 Q228 61 228 72 L228 84 Z',win:['M28 30 L70 30 L70 46 L28 46 Z','M78 30 L120 30 L120 46 L78 46 Z','M144 29 L151 29 L168 50 L144 50 Z'],f:[220,66],r:[13,60],w:[52,186],R:20,door:125},
 wagon:{d:'M12 82 L12 60 L20 52 L40 48 L52 36 Q56 32 64 32 L142 32 Q150 32 156 40 L176 54 L212 60 Q226 63 226 74 L226 82 Z',win:['M24 51 L40 51 L50 38 L66 36 L96 36 L96 51 Z','M102 36 L140 36 Q146 36 150 42 L160 51 L102 51 Z'],f:[218,68],r:[13,64],w:[58,182],R:19,door:99},
 super:{d:'M8 82 L8 72 Q8 68 16 66 L70 60 L108 40 Q114 36 122 36 L142 36 Q152 37 160 46 L172 56 L216 64 Q232 68 232 77 L232 82 Z',win:['M104 55 L116 41 L136 41 Q144 42 150 48 L156 56 L104 56 Z'],f:[224,71],r:[9,70],w:[56,178],R:19,door:0},
 beetle:{d:'M16 82 Q10 62 36 50 Q56 32 100 32 Q140 32 164 52 L196 58 Q222 62 224 76 L224 82 Z',win:['M58 51 Q70 38 100 38 L100 51 Z','M106 38 Q130 40 148 51 L106 51 Z'],f:[216,70],r:[16,70],w:[56,178],R:19,door:103}
};

const MIR={hatch:[158,48],sedan:[156,50],coupe:[154,51],roadster:[122,54],suv:[160,44],pickup:[150,46],van:[164,46],wagon:[156,48],super:[152,52],beetle:[148,48]};
let _uid = 0;
function wheel(cx,cy,R,vint,id){
  let s = `<circle cx="${cx}" cy="${cy}" r="${R+5}" fill="#090b0e"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="#0e1013"/><circle cx="${cx}" cy="${cy}" r="${(R*.68).toFixed(1)}" fill="url(#rim${id})"/>`;
  if(vint){ for(let i=0;i<12;i++){const a=i*Math.PI/6;s+=`<line x1="${cx}" y1="${cy}" x2="${(cx+R*.64*Math.cos(a)).toFixed(1)}" y2="${(cy+R*.64*Math.sin(a)).toFixed(1)}" stroke="#7d8792" stroke-width=".9"/>`;} }
  else { for(let i=0;i<5;i++){const a=i*2*Math.PI/5-Math.PI/2;s+=`<line x1="${cx}" y1="${cy}" x2="${(cx+R*.62*Math.cos(a)).toFixed(1)}" y2="${(cy+R*.62*Math.sin(a)).toFixed(1)}" stroke="#59616b" stroke-width="3" stroke-linecap="round"/>`;} }
  return s + `<circle cx="${cx}" cy="${cy}" r="${(R*.17).toFixed(1)}" fill="#c9d1d9"/>`;
}

function carSVG(c, sil){
  const id = ++_uid, B = BODY[c.t], y = c.y, rar = RAR[c.r];
  const seed = c.id * 7;
  const sky = y<1970 ? ['#f6b873','#7b3a30'] : y<1990 ? ['#2b1b52','#d4488a'] : y<2000 ? ['#123a5a','#3aa6b9'] : ['#0a1226','#2f55a6'];
  const body = c.hx, top = shade(body,.32), bot = shade(body,-.4);
  let s = `<svg viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${c.b} ${c.m}"><defs>`
   + `<linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sil?'#0f1419':sky[0]}"/><stop offset="1" stop-color="${sil?'#0b0e12':sky[1]}"/></linearGradient>`
   + `<linearGradient id="bd${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".45" stop-color="${body}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`
   + `<linearGradient id="gl${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6ecff"/><stop offset="1" stop-color="#1b2740"/></linearGradient>`
   + `<linearGradient id="gt${id}" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/></linearGradient>`
   + `<linearGradient id="rim${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7fa"/><stop offset="1" stop-color="#7e8791"/></linearGradient>`
   + `<linearGradient id="rd${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f36"/><stop offset="1" stop-color="#0c0e11"/></linearGradient>`
   + `<radialGradient id="sn${id}"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="${y<1970?'#ffd27a':'#ff8fc0'}" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
   + `<linearGradient id="hl${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".3" stop-color="#fff" stop-opacity=".05"/><stop offset=".31" stop-color="#fff" stop-opacity="0"/></linearGradient>`
   + `</defs><rect width="240" height="150" fill="url(#sky${id})"/>`;
  if(!sil){
    if(y<1990) s += `<circle cx="${170 - (seed%40)}" cy="82" r="30" fill="url(#sn${id})"/>`;
    if(y>=2000||c.r>=4) for(let i=0;i<14;i++) s += `<circle cx="${(seed*(i+3)*13)%240}" cy="${(seed*(i+5)*7)%60}" r="${i%3?.6:1}" fill="#fff" opacity=".7"/>`;
    if(y>=1990){ for(let i=0;i<15;i++){const h=10+((seed*(i+3))%34);s += `<rect x="${i*16-4}" y="${124-h}" width="13" height="${h}" fill="#000" opacity=".28"/>`;} }
    else { s += `<path d="M0 124 L0 108 Q30 96 60 106 T120 104 T180 106 T240 100 L240 124 Z" fill="#000" opacity=".25"/>`; }
  }
  s += `<rect y="124" width="240" height="26" fill="url(#rd${id})"/><rect y="123" width="240" height="1.5" fill="#fff" opacity=".18"/>`
    + `<path d="M0 138 H26 M52 138 H78 M104 138 H130 M156 138 H182 M208 138 H240" stroke="#e9edf1" stroke-width="2" opacity="${sil?.08:.35}"/>`;
  if(!sil && c.r>=3) for(let i=0;i<4;i++) s += `<line x1="${4+i*5}" y1="${70+i*10}" x2="${44+i*8}" y2="${70+i*10}" stroke="#fff" stroke-width="1.2" opacity=".28" stroke-linecap="round"/>`;
  s += `<ellipse cx="120" cy="126" rx="108" ry="6" fill="#000" opacity=".5"/><use href="#car${id}" transform="translate(0,250) scale(1,-1)" opacity="${sil?0:.17}"/><g id="car${id}" transform="translate(0,22)">`;
  const fill = sil ? '#1a2029' : `url(#bd${id})`;
  if(B.bed) s += `<path d="M10 58 L68 58 L68 84 L10 84 Z" fill="${shade(body,-.55)}"/>`;
  if(c.sp) s += `<path d="M6 59 L38 53 L40 58 L8 64 Z" fill="${sil?'#1a2029':shade(body,-.55)}"/><path d="M16 64 L18 70 M30 60 L31 68" stroke="${shade(body,-.6)}" stroke-width="2"/>`;
  s += `<path d="${B.d}" fill="${fill}" stroke="${sil?rar.c:'rgba(0,0,0,.35)'}" stroke-opacity="${sil?.35:1}" stroke-width="1.2"/>`;
  if(!sil){
    s += `<path d="${B.d}" fill="url(#hl${id})"/>`;
    if(B.open) s += `<ellipse cx="70" cy="58" rx="40" ry="5" fill="#16181d"/><rect x="48" y="44" width="12" height="14" rx="5" fill="#1d2026"/><rect x="78" y="44" width="12" height="14" rx="5" fill="#1d2026"/>`;
    for(const w of B.win) s += `<path d="${w}" fill="url(#gl${id})" stroke="rgba(0,0,0,.45)" stroke-width="1"/><path d="${w}" fill="url(#gt${id})"/>`;
    if(B.bed) s += `<path d="M14 58 L64 58 L64 63 L14 63 Z" fill="rgba(0,0,0,.4)"/>`;
    s += `<path d="M20 70 L216 70" stroke="#000" stroke-opacity=".16" stroke-width="1.4"/><path d="M22 79 L212 79" stroke="#000" stroke-opacity=".38" stroke-width="4.5" stroke-linecap="round"/>`;
    if(c.st) s += `<path d="M24 73.5 L214 73.5" stroke="${c.st}" stroke-width="3" opacity=".9"/>`;
    if(B.door) s += `<path d="M${B.door} ${B.win[0]?52:52} L${B.door} 79" stroke="#000" stroke-opacity=".32" stroke-width="1.2"/><rect x="${B.door-14}" y="62" width="8" height="2.4" rx="1.2" fill="#000" opacity=".35"/>`;
    const M = MIR[c.t]; s += `<rect x="${M[0]}" y="${M[1]}" width="9" height="5" rx="2" fill="${shade(body,-.25)}" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>`;
    const vint = y < 1975;
    s += `<ellipse cx="${B.f[0]}" cy="${B.f[1]}" rx="${vint?5:7}" ry="${vint?5:3.6}" fill="#fff7cf"/><ellipse cx="${B.f[0]}" cy="${B.f[1]}" rx="${vint?9:12}" ry="${vint?9:7}" fill="#ffe9a0" opacity=".28"/>`
      + `<rect x="${B.r[0]-2}" y="${B.r[1]-4}" width="5" height="9" rx="1.5" fill="#e0201a"/>`;
  }
  const wv = y < 1975;
  for(const cx of B.w) s += wheel(cx, 84, B.R, wv, id);
  s += `</g></svg>`;
  return s;
}

function dialSVG(){
  let t = '';
  for(let i=0;i<=20;i++){
    const a=(-225+i*13.5)*Math.PI/180, major=i%5===0, r2=major?38:44, red=i>=16;
    t += `<line x1="${(60+50*Math.cos(a)).toFixed(1)}" y1="${(60+50*Math.sin(a)).toFixed(1)}" x2="${(60+r2*Math.cos(a)).toFixed(1)}" y2="${(60+r2*Math.sin(a)).toFixed(1)}" stroke="${red?'#ff3b30':'#e9edf1'}" stroke-width="${major?3:1.6}" stroke-linecap="round"/>`;
  }
  const n=(-225+17.5*13.5)*Math.PI/180;
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="57" fill="#0c0f13" stroke="#c9d1d9" stroke-width="3"/>${t}<line x1="60" y1="60" x2="${(60+40*Math.cos(n)).toFixed(1)}" y2="${(60+40*Math.sin(n)).toFixed(1)}" stroke="#ff6a1a" stroke-width="3.6" stroke-linecap="round"/><circle cx="60" cy="60" r="6" fill="#c9d1d9"/><text x="60" y="90" text-anchor="middle" font-size="7.5" fill="#8b95a1" font-family="Barlow Semi Condensed,Arial,sans-serif" letter-spacing="1">x1000 tr/min</text></svg>`;
}

/* ---------- Cartes ---------- */
function cardHTML(c, o={}){
  const r = RAR[c.r];
  const gems = '<i></i>'.repeat(c.r+1);
  const flip = o.locked ? '' : `<div class="flipper${o.down?' down':''}">`;
  const backHTML = o.locked ? '' : `<div class="face back"><div class="back-in">${dialSVG()}<b>TORQUE DECK</b></div></div>`;
  const front = o.locked
   ? `<div class="face front"><div class="inner"><div class="top"><span class="brand">Série 01</span><span class="gems">${gems}</span></div><div class="name">N° ${pad3(c.id)}</div><div class="art">${carSVG(c,true)}</div><p class="tag">?</p><div class="foot"><span>N° ${pad3(c.id)}/${pad3(CARS.length)}</span><span class="rl">${r.n}</span></div></div></div>`
   : `<div class="face front"><div class="inner">
      <div class="top"><span class="brand">${c.b}</span><span class="gems">${gems}</span></div>
      <div class="name">${c.m}</div>
      <div class="art">${PHOTOS[pkey(c)]?`<img src="${PHOTOS[pkey(c)]}" alt="${c.b} ${c.m}">`:carSVG(c)}<span class="era">${eraLabel(c.y)}</span><span class="yr">${c.y}</span></div>
      <p class="tag"><span><b>${c.tg}</b> ${c.ds}</span></p>
      <div class="stats"><div class="stat"><b>${c.hp}</b><span>Chevaux</span></div><div class="stat"><b>${c.km}</b><span>km/h</span></div><div class="stat"><b>${fmtV(c.v)}</b><span>Valeur</span></div></div>
      <div class="foot"><span>N° ${pad3(c.id)}/${pad3(CARS.length)} · ${c.cn}</span><span class="rl">${r.n}</span></div>
    </div><i class="holo"></i><i class="glare"></i></div>`;
  const badge = o.badge ? `<span class="badge${o.badge[0]==='×'?' dup':''}">${o.badge}</span>` : '';
  return `<div class="card${o.locked?' locked':''}${o.pick?' pick':''}${o.glow?' glow':''}" data-r="${r.k}" data-id="${c.id}"${o.pick?' tabindex="0" role="button"':''}><div class="tilt">${flip}${backHTML}${front}${o.locked?'':'</div>'}</div>${badge}</div>`;
}

/* ---------- Paquet ---------- */
function packInner(){
  return `<div class="pk-face"><div class="pk-crimp t"></div><div class="pk-brand"><small>Série 01 · Voitures</small><b>Torque<br>Deck</b></div><div class="pk-stripe"></div><div class="pk-dial">${dialSVG()}</div><div class="pk-crimp b"></div><div class="pk-foot"><span>Édition garage</span><span class="pk-badge">5 cartes</span></div><div class="pk-check"></div><div class="pk-sheen"></div></div>`;
}
function poly(pts){ return 'polygon('+pts.map(p=>p[0].toFixed(2)+'% '+p[1].toFixed(2)+'%').join(',')+')'; }
function zig(y, n, amp, rev){ const a=[]; for(let i=0;i<=n;i++) a.push([i*100/n, y+(i%2?0:amp)]); return rev?a.reverse():a; }
function jag(y, n, amp, rev){ const a=[]; for(let i=0;i<=n;i++) a.push([i*100/n, y+(i%2?amp:-amp)]); return rev?a.reverse():a; }
function packHTML(tearable){
  const full = poly([...zig(0.8,16,2.2,false), ...zig(97,16,-2.2,true)]);
  if(!tearable) return `<div class="pk-stack"><div class="pk" style="clip-path:${full}">${packInner()}</div></div>`;
  const top = poly([...zig(0.8,16,2.2,false), ...jag(15,22,1.2,true)]);
  const bot = poly([...jag(15,22,1.2,false), ...zig(97,16,-2.2,true)]);
  return `<div class="pk-stack" id="pkStack"><div class="pk pk-bottom" style="clip-path:${bot}">${packInner()}</div><div class="pk pk-top" style="clip-path:${top}">${packInner()}</div></div>`;
}

/* ---------- Petite carte (listes, échanges, sélecteurs) ---------- */
function miniHTML(c, o={}){
  const r = RAR[c.r], p = PHOTOS[pkey(c)];
  const art = p ? `<img src="${p}" alt="" loading="lazy">` : carSVG(c);
  const tag = o.tag ? `<span class="mini-t${o.tagOk?' ok':''}">${o.tag}</span>` : '';
  const n = o.count ? `<span class="mini-n">×${o.count}</span>` : '';
  const inner = `${tag}${n}<div class="mini-art">${art}</div><b>${c.m}</b><small>${c.b} · <i>${r.n}</i></small>`;
  const attrs = `class="mini" data-r="${r.k}" data-id="${c.id}"`;
  return o.button ? `<button type="button" ${attrs}${o.disabled?' disabled':''}>${inner}</button>` : `<div ${attrs}>${inner}</div>`;
}
