import * as THREE from './vendor/three.module.js';
import { toon, makeTag } from './avatar.js';

export const ISLANDS = {
  main:  { name:'汴京',     x:0,   z:0,   r:26 },
  peach: { name:'桃溪村',   x:-41, z:27,  r:17 },
  mount: { name:'三清山',   x:50,  z:2,   r:18 },
  maple: { name:'楓林小駐', x:-38, z:-28, r:16 },
  temple:{ name:'磁州孔廟', x:14,  z:46,  r:16 },
};
export const BRIDGES = [];
export const RIVER_X = -14;
const M = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };

export const mats = {
  grass: toon('#9fdc7c'), grass2: toon('#86c96a'), rock: toon('#c9a27e'), rockD: toon('#a9805e'), path: toon('#f3e2bf'),
  red: toon('#d9534f'), redD: toon('#a8322f'), roof: toon('#3f5a73'), roofG: toon('#4f8a6e'), wall: toon('#fff4e0'), wood: toon('#9b6a43'), woodD: toon('#6e4a2f'),
  gold: toon('#f2c14e'), jade: toon('#f4f7f2'), gem: toon('#1f6b4f', { emissive: '#0d3b2a', emissiveIntensity: .3 }),
  peach: toon('#ffb7cf'), peachV: toon('#ff9ec4'), peachV2: toon('#ffc6dc'), maple: toon('#f06a3a'), maple2: toon('#f7a23b'), pine: toon('#4f9a6a'), trunk: toon('#8a5a3c'),
  water: toon('#7fd3e8', { transparent: true, opacity: .92 }), pond: toon('#64c3dd'), snow: toon('#ffffff'), mount: toon('#8fc7a8'), mountD: toon('#6aa889'),
  lantern: new THREE.MeshToonMaterial({ color: '#ff5a4a', emissive: '#ff7a2a', emissiveIntensity: 0 }),
  window: new THREE.MeshToonMaterial({ color: '#e8d6b0', emissive: '#ffc46a', emissiveIntensity: 0 }),
  paper: toon('#fffdf5'),
};

export function walkable(x, z) {
  if (Math.hypot(x, z) < 24 && Math.abs(x - RIVER_X) < 1.5 && Math.abs(z) > 1.2) return false;
  for (const k in ISLANDS) { const I = ISLANDS[k]; if ((x - I.x) ** 2 + (z - I.z) ** 2 < (I.r - 1.2) ** 2) return true; }
  for (const b of BRIDGES) if (onBridge(b, x, z) !== null) return true;
  return false;
}
function onBridge(b, x, z) {
  const dx = b.bx - b.ax, dz = b.bz - b.az, L2 = dx * dx + dz * dz; let t = ((x - b.ax) * dx + (z - b.az) * dz) / L2;
  if (t < 0 || t > 1) return null; const px = b.ax + t * dx - x, pz = b.az + t * dz - z;
  return px * px + pz * pz < (b.w / 2) ** 2 ? t : null;
}
export function heightAt(x, z) {
  for (const k in ISLANDS) { const I = ISLANDS[k]; if ((x - I.x) ** 2 + (z - I.z) ** 2 < (I.r - 1.2) ** 2) return 0; }
  for (const b of BRIDGES) { const t = onBridge(b, x, z); if (t !== null) return b.arch * Math.sin(Math.PI * t); }
  return 0;
}
export function islandAt(x, z) { let best = 'main', bd = 1e9; for (const k in ISLANDS) { const I = ISLANDS[k]; const d = Math.hypot(x - I.x, z - I.z) - I.r; if (d < bd) { bd = d; best = k; } } return best; }

function island(scene, I) {
  const g = new THREE.Group(); g.position.set(I.x, 0, I.z);
  const top = M(new THREE.CylinderGeometry(I.r, I.r * .97, 1.2, 40), mats.grass, 0, -.6, 0); g.add(top);
  const rim = M(new THREE.CylinderGeometry(I.r * .97, I.r * .8, 2.4, 40), mats.rock, 0, -2.4, 0); g.add(rim);
  const bot = M(new THREE.ConeGeometry(I.r * .8, I.r * .7, 10), mats.rockD, 0, -3.6 - I.r * .35, 0); bot.rotation.y = .3; g.add(bot);
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, rr = I.r * (.4 + Math.random() * .5); const t = M(new THREE.SphereGeometry(.4 + Math.random() * .4, 7, 5), mats.grass2, Math.cos(a) * rr, 0, Math.sin(a) * rr); t.scale.y = .5; g.add(t); }
  scene.add(g); return g;
}
function bridge(scene, a, b, opts = {}) {
  const A = ISLANDS[a], B = ISLANDS[b]; const ang = Math.atan2(B.z - A.z, B.x - A.x);
  const ax = A.x + Math.cos(ang) * (A.r - 2), az = A.z + Math.sin(ang) * (A.r - 2), bx = B.x - Math.cos(ang) * (B.r - 2), bz = B.z - Math.sin(ang) * (B.r - 2);
  const br = { ax, az, bx, bz, w: opts.w || 3.2, arch: opts.arch || .8 }; BRIDGES.push(br);
  const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / .8); const g = new THREE.Group();
  const deck = opts.red ? mats.red : mats.wood, rail = opts.red ? mats.redD : mats.woodD;
  for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = br.arch * Math.sin(Math.PI * t);
    const p = M(new THREE.BoxGeometry(.7, .2, br.w), i % 2 ? deck : (opts.red ? mats.redD : mats.wood), x, y - .1, z); p.rotation.y = -ang; g.add(p);
    if (i % 2 === 0) for (const sd of [-1, 1]) { const px = x + Math.sin(ang) * sd * br.w / 2 * -1, pz = z + Math.cos(ang) * sd * br.w / 2; g.add(M(new THREE.CylinderGeometry(.09, .09, 1, 6), rail, px, y + .4, pz)); g.add(M(new THREE.SphereGeometry(.13, 6, 5), opts.red ? mats.gold : rail, px, y + .95, pz)); } }
  for (const sd of [-1, 1]) { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(ax + (bx - ax) * t - Math.sin(ang) * sd * br.w / 2, br.arch * Math.sin(Math.PI * t) + .85, az + (bz - az) * t + Math.cos(ang) * sd * br.w / 2)); }
    g.add(M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .07, 5), rail)); }
  scene.add(g); return { br, ang, mid: new THREE.Vector3((ax + bx) / 2, br.arch, (az + bz) / 2) };
}
export function tree(kind, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  g.add(M(new THREE.CylinderGeometry(.18, .28, 1.6, 6), mats.trunk, 0, .8, 0));
  if (kind === 'pine') { for (let i = 0; i < 3; i++) g.add(M(new THREE.ConeGeometry(1.2 - i * .3, 1.2, 7), mats.pine, 0, 1.8 + i * .7, 0)); }
  else { const m = kind === 'peachV' ? (Math.random() < .5 ? mats.peachV : mats.peachV2) : kind === 'peach' ? mats.peach : (Math.random() < .5 ? mats.maple : mats.maple2);
    for (let i = 0; i < 4; i++) { const b = M(new THREE.IcosahedronGeometry(.75 + Math.random() * .3, 0), m, (Math.random() - .5) * 1.1, 2 + Math.random() * .7, (Math.random() - .5) * 1.1); b.rotation.set(Math.random(), Math.random(), 0); g.add(b); } }
  return g;
}
function roof(w, d, mat, h = .9) { // 翹角屋頂
  const g = new THREE.Group(); const r = M(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + .5, h, 4), mat, 0, h / 2, 0); r.rotation.y = Math.PI / 4; r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(r);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const c = M(new THREE.ConeGeometry(.12, .6, 5), mats.gold, sx * (w / 2 + .45), .2, sz * (d / 2 + .45)); c.rotation.set(sz * -.6, 0, sx * .6); g.add(c); }
  g.add(M(new THREE.BoxGeometry(w * .5, .14, .2), mats.gold, 0, h - .02, 0)); return g;
}
export function lantern(x, y, z, s = 1) { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  const b = M(new THREE.SphereGeometry(.28, 10, 8), mats.lantern); b.scale.y = 1.15; g.add(b); g.add(M(new THREE.CylinderGeometry(.15, .15, .08, 8), mats.gold, 0, .32, 0)); g.add(M(new THREE.CylinderGeometry(.15, .15, .08, 8), mats.gold, 0, -.32, 0)); g.add(M(new THREE.CylinderGeometry(.02, .02, .25, 4), mats.redD, 0, -.48, 0)); return g; }
function hall(w, d, floors, wallMat = mats.wall, roofMat = mats.roof) {
  const g = new THREE.Group(); let y = 0;
  g.add(M(new THREE.BoxGeometry(w + .8, .4, d + .8), mats.rock, 0, .2, 0)); y = .4;
  for (let f = 0; f < floors; f++) { const sc = 1 - f * .12, W = w * sc, D = d * sc, H = 1.8;
    g.add(M(new THREE.BoxGeometry(W, H, D), wallMat, 0, y + H / 2, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(M(new THREE.CylinderGeometry(.13, .13, H, 8), mats.red, sx * W / 2, y + H / 2, sz * D / 2));
    for (let i = -1; i <= 1; i++) if (i || f) g.add(M(new THREE.BoxGeometry(.6, .7, .05), mats.window, i * W / 3.2, y + H * .55, D / 2 + .03));
    if (f === 0) g.add(M(new THREE.BoxGeometry(.8, 1.3, .06), mats.redD, 0, y + .65, D / 2 + .03));
    if (f > 0) g.add(M(new THREE.BoxGeometry(W + .3, .14, D + .3), mats.redD, 0, y + .05, 0));
    const rf = roof(W, D, roofMat, f === floors - 1 ? 1.1 : .6); rf.position.y = y + H; g.add(rf);
    y += H + (f === floors - 1 ? 0 : .5); }
  return g;
}
function signboard(text, color = '#c94a4a') { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#f2c14e'; x.lineWidth = 8; x.strokeRect(6, 6, 244, 84);
  x.fillStyle = '#ffe9a8'; x.font = 'bold 54px "Noto Serif CJK TC",serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(2.2, .82), new THREE.MeshBasicMaterial({ map: t })); }

export function buildWorld(scene, api) {
  const lanterns = [], peachTrees = [], clickables = [], cranes = [], boats = [];
  const W = new THREE.Mesh(new THREE.CircleGeometry(400, 64), mats.water); W.rotation.x = -Math.PI / 2; W.position.y = -4; W.receiveShadow = true; scene.add(W);
  for (const k in ISLANDS) island(scene, ISLANDS[k]);
  const hong = bridge(scene, 'main', 'peach', { red: true, arch: 2.2, w: 3.6 });
  bridge(scene, 'main', 'mount', { arch: 1 }); bridge(scene, 'main', 'maple', { arch: 1 }); bridge(scene, 'main', 'temple', { arch: 1 });
  // 雲
  for (let i = 0; i < 26; i++) { const c = new THREE.Group(); for (let j = 0; j < 4; j++) c.add(M(new THREE.SphereGeometry(2 + Math.random() * 1.5, 8, 6), mats.snow, j * 2.2, Math.random(), Math.random())); const a = Math.random() * 6.28, r = 35 + Math.random() * 50; c.position.set(Math.cos(a) * r, 26 + Math.random() * 10, Math.sin(a) * r); c.userData.spd = .5 + Math.random(); c.scale.setScalar(.65); scene.add(c); cranes.push({ cloud: c }); }

  // ===== 汴京 =====
  const main = new THREE.Group(); scene.add(main);
  const plaza = M(new THREE.CylinderGeometry(7, 7, .1, 32), mats.path, 0, .05, 0); main.add(plaza);
  for (const a of [0, 1, 2, 3]) { const p = M(new THREE.BoxGeometry(2.6, .06, 20), mats.path, 0, .04, 0); p.rotation.y = a * Math.PI / 2 + Math.PI / 4 * 0; p.position.set(Math.sin(a * Math.PI / 2) * 13, .04, Math.cos(a * Math.PI / 2) * 13); main.add(p); }
  // 鑑石
  const altar = new THREE.Group(); main.add(altar);
  altar.add(M(new THREE.CylinderGeometry(2.2, 2.5, .5, 8), mats.jade, 0, .25, 0)); altar.add(M(new THREE.CylinderGeometry(1.6, 1.9, .4, 8), mats.gold, 0, .7, 0));
  altar.add(M(new THREE.CylinderGeometry(.7, .85, 3, 8), mats.jade, 0, 2.4, 0));
  for (const y of [1.2, 2.4, 3.6]) { const t = M(new THREE.TorusGeometry(.82, .1, 6, 16), mats.gold, 0, y, 0); t.rotation.x = Math.PI / 2; altar.add(t); }
  for (let i = 0; i < 4; i++) { const cl = M(new THREE.TorusGeometry(.35, .08, 6, 12, Math.PI * 1.3), mats.gold, Math.cos(i * 1.57) * .85, 3, Math.sin(i * 1.57) * .85); cl.rotation.y = -i * 1.57 + Math.PI / 2; altar.add(cl); }
  altar.add(M(new THREE.CylinderGeometry(1.0, .7, .4, 8), mats.gold, 0, 4.1, 0));
  const gem = M(new THREE.OctahedronGeometry(1.05, 0), mats.gem, 0, 5.6, 0); gem.scale.y = 1.35; altar.add(gem);
  const gemGlow = new THREE.PointLight('#5cffb0', 0, 12); gemGlow.position.y = 5.6; altar.add(gemGlow);
  const atag = makeTag('鑑石・點我抽獎', '#1f6b4f'); atag.position.y = 7.6; altar.add(atag);
  clickables.push({ obj: altar, fn: api.onAltar });
  // 神侯府
  const shf = new THREE.Group(); shf.position.set(15, 0, -8); shf.rotation.y = -Math.PI / 2; main.add(shf);
  shf.add(hall(7, 4.5, 1, mats.wall, mats.roof)); const h2 = hall(3.4, 3, 1, mats.wall, mats.roof); h2.position.set(-5, 0, 1.5); shf.add(h2); const h3 = hall(3.4, 3, 1, mats.wall, mats.roof); h3.position.set(5, 0, 1.5); shf.add(h3);
  for (const [x, z, w, d] of [[0, 6, 12, .5], [-6.2, 3, .5, 6.4], [6.2, 3, .5, 6.4]]) { if (x === 0) { for (const sx of [-1, 1]) { shf.add(M(new THREE.BoxGeometry(4.6, 1.2, .5), mats.wall, sx * 3.7, .6, z)); shf.add(M(new THREE.BoxGeometry(4.8, .25, .8), mats.roof, sx * 3.7, 1.3, z)); } } else { shf.add(M(new THREE.BoxGeometry(w, 1.2, d), mats.wall, x, .6, z)); shf.add(M(new THREE.BoxGeometry(w + .3, .25, d), mats.roof, x, 1.3, z)); } }
  const gate = new THREE.Group(); gate.position.z = 6; shf.add(gate); for (const sx of [-1, 1]) gate.add(M(new THREE.CylinderGeometry(.18, .18, 2.6, 8), mats.red, sx * 1.3, 1.3, 0)); const gr = roof(3.4, 1, mats.roof, .6); gr.position.y = 2.6; gate.add(gr);
  const sb = signboard('神侯府'); sb.position.set(0, 2.2, .1); gate.add(sb);
  for (const sx of [-1, 1]) { const l = lantern(sx * 1.3, 2.1, .4, .8); gate.add(l); lanterns.push(l); }
  // 甜水巷：紅牆深綠瓦的樓閣院落（北側）
  const tss = new THREE.Group(); tss.position.set(-6.5, 0, -15); main.add(tss);
  const maroon = toon('#8a2f2c'), slate = toon('#3d5a55'), stone = toon('#efe6d2'), redBloom = toon('#d0475e');
  tss.add(M(new THREE.BoxGeometry(12, .3, 12), toon('#9a4a3c'), 0, .15, 0)); tss.add(M(new THREE.BoxGeometry(5, .34, 5), stone, 0, .17, .5));
  const pav = [[0, -4, 3, 6, 3, 0], [-4.3, 0, 2, 3, 5, Math.PI / 2], [4.3, 0, 2, 3, 5, -Math.PI / 2], [-3.6, 4.4, 1, 3, 2.4, 0], [3.6, 4.4, 1, 3, 2.4, 0]];
  const tops = []; for (const [x, z, fl, ww, dd, ry] of pav) { const h = hall(ww, dd, fl, maroon, slate); h.position.set(x, .3, z); h.rotation.y = ry; tss.add(h); tops.push(new THREE.Vector3(x, .3 + fl * 1.8 + .6, z));
    for (let f = 0; f < fl; f++) for (const sd of [-1, 1]) { const l = lantern(x + (ry ? 0 : sd * (ww / 2 + .1)), 2 + f * 1.8, z + (ry ? sd * (dd / 2 + .1) : dd / 2 + .3), .5); tss.add(l); lanterns.push(l); } }
  // 院中石景
  for (const [x, z] of [[-1.2, 1.5], [1.4, -.4], [.6, 2.2]]) { const r = M(new THREE.DodecahedronGeometry(.4, 0), mats.rock, x, .6, z); r.scale.y = 1.5; tss.add(r); }
  // 紅綵帶
  for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]]) { const A = tops[a], B = tops[b], mid = A.clone().add(B).multiplyScalar(.5); mid.y -= .8; tss.add(M(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, mid, B), 16, .06, 4), mats.red));
    for (let i = 1; i < 4; i++) { const p = new THREE.QuadraticBezierCurve3(A, mid, B).getPoint(i / 4); const l = lantern(p.x, p.y - .3, p.z, .35); tss.add(l); lanterns.push(l); } }
  // 院門
  const tg2 = new THREE.Group(); tg2.position.set(0, .3, 6); tss.add(tg2); for (const sx of [-1, 1]) tg2.add(M(new THREE.CylinderGeometry(.16, .16, 2.4, 8), mats.red, sx * 1.1, 1.2, 0)); const tgr = roof(2.8, .9, slate, .5); tgr.position.y = 2.4; tg2.add(tgr);
  const ts = signboard('甜水巷', '#8a2f2c'); ts.position.set(0, 2.05, .1); tg2.add(ts);
  for (const [x, z] of [[-6.8, -5], [6.8, -5], [-6.8, 5.5], [6.8, 3]]) { const t = tree('peach', x, z, .9); t.children.slice(1).forEach(m => m.material = redBloom); tss.add(t); }
  // 燈籠串（廣場）
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; const p = new THREE.Group(); p.position.set(Math.cos(a) * 8.5, 0, Math.sin(a) * 8.5); p.add(M(new THREE.CylinderGeometry(.08, .08, 3, 6), mats.woodD, 0, 1.5, 0)); const l = lantern(0, 2.7, 0, .8); p.add(l); lanterns.push(l); main.add(p); }
  // 汴河（城內南北向）+ 紅色小拱橋
  const river = M(new THREE.BoxGeometry(3, .1, 46), mats.pond, RIVER_X, .03, 0); main.add(river);
  for (const sd of [-1, 1]) main.add(M(new THREE.BoxGeometry(.3, .25, 46), mats.rock, RIVER_X + sd * 1.6, .1, 0));
  { const fb = new THREE.Group(); fb.position.set(RIVER_X, 0, 0); main.add(fb); for (let i = 0; i <= 6; i++) { const t = i / 6; fb.add(M(new THREE.BoxGeometry(.7, .15, 2.4), mats.red, -2.1 + t * 4.2, Math.sin(Math.PI * t) * .5 + .1, 0)); }
    for (const sd of [-1, 1]) { const l = lantern(0, 1.5, sd * 1.3, .5); fb.add(l); lanterns.push(l); } }
  // 城牆
  const wallM = toon('#d8ccb4'), wallTop = toon('#4a5f5a');
  const gaps = [0, Math.PI / 2, Math.PI, -Math.PI / 2, ...['peach', 'mount', 'maple', 'temple'].map(k => Math.atan2(ISLANDS[k].z, ISLANDS[k].x))];
  for (let i = 0; i < 72; i++) { const a = i / 72 * 6.28; if (gaps.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < .17)) continue; const r = 24.3; const seg = M(new THREE.BoxGeometry(2.2, 1.3, .6), wallM, Math.cos(a) * r, .65, Math.sin(a) * r); seg.rotation.y = -a + Math.PI / 2; main.add(seg); const cap = M(new THREE.BoxGeometry(2.3, .2, .8), wallTop, Math.cos(a) * r, 1.35, Math.sin(a) * r); cap.rotation.y = seg.rotation.y; main.add(cap); }
  // 街坊民居（奶油牆、深綠／灰瓦）
  const roofs = [toon('#3f5a55'), toon('#5b6b6e'), toon('#4f7a6a')], cream = toon('#f4ead2');
  const busy = (x, z, m) => Math.hypot(x, z) < 10.5 + m || Math.abs(x) < 2.8 + m || Math.abs(z) < 2.8 + m || Math.abs(x - RIVER_X) < 2.6 + m || Math.hypot(x, z) > 22 - m || (x > -14 && x < 1 && z > -22 && z < -8) || (x > 8 && x < 21 && z > -16 && z < -1);
  for (let gx = -20; gx <= 20; gx += 4.2) for (let gz = -20; gz <= 20; gz += 4.2) { const x = gx + (Math.random() - .5), z = gz + (Math.random() - .5); if (busy(x, z, 1.4)) continue; if (Math.random() < .2) { main.add(tree('maple', x, z, .8)); continue; }
    const h = hall(2.2 + Math.random() * .6, 2 + Math.random() * .5, Math.random() < .2 ? 2 : 1, cream, roofs[(gx * 7 + gz * 3 & 7) % 3]); h.position.set(x, 0, z); h.rotation.y = Math.abs(x) > Math.abs(z) ? Math.PI / 2 * Math.sign(-x) : (z > 0 ? 0 : Math.PI); h.scale.setScalar(.85); main.add(h); }
  for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, r = 11 + Math.random() * 11, x = Math.cos(a) * r, z = Math.sin(a) * r; if (busy(x, z, .3)) continue; main.add(tree(Math.random() < .7 ? 'maple' : 'pine', x, z, .75)); }
  // 汴京紅燈籠：街道兩側
  for (let a = 0; a < 4; a++) for (let d = 10; d <= 22; d += 4) for (const sd of [-1, 1]) { const ax = Math.sin(a * Math.PI / 2), az = Math.cos(a * Math.PI / 2); const x = ax * d + az * sd * 2, z = az * d - ax * sd * 2; if (Math.hypot(x + 6.5, z + 15) < 7.5 || (x > 8 && x < 21 && z > -16 && z < -1) || Math.abs(x - RIVER_X) < 2) continue; const p = new THREE.Group(); p.position.set(x, 0, z); p.add(M(new THREE.CylinderGeometry(.07, .07, 2.6, 6), mats.redD, 0, 1.3, 0)); p.add(M(new THREE.BoxGeometry(.7, .07, .07), mats.redD, .3 * sd, 2.6, 0)); const l = lantern(.55 * sd, 2.15, 0, .7); p.add(l); lanterns.push(l); main.add(p); }
  // 神侯府大門與圍牆燈籠
  for (let i = 0; i < 6; i++) { const sx = i < 3 ? -1 : 1, k = i % 3; const l = lantern(sx * (2.4 + k * 1.4), 1.6, 6.5, .6); shf.add(l); lanterns.push(l); }
  for (const sx of [-1, 1]) { const l = lantern(sx * .6, 2.35, .45, .55); gate.add(l); lanterns.push(l); }
  // 虹橋燈籠（相識紀念）
  const memo = new THREE.Group(); memo.position.copy(hong.mid); memo.position.y += .2;
  const off = new THREE.Vector3(-Math.sin(hong.ang), 0, Math.cos(hong.ang)).multiplyScalar(1.9); memo.position.add(off);
  memo.add(M(new THREE.CylinderGeometry(.1, .1, 3.2, 6), mats.redD, 0, 1.6, 0)); memo.add(M(new THREE.BoxGeometry(1.2, .1, .1), mats.redD, .5, 3.2, 0));
  const big = lantern(1, 2.3, 0, 2.2); memo.add(big); lanterns.push(big);
  const memoTag = makeTag('相識紀念', '#c94a4a'); memoTag.position.set(1, 4.6, 0); memo.add(memoTag); scene.add(memo); memo.userData.tag = memoTag;
  clickables.push({ obj: memo, fn: api.onMemo });
  { const b = hong.br, ang = hong.ang; for (let i = 1; i < 8; i++) { const t = i / 8; if (Math.abs(t - .5) < .07) continue; for (const sd of [-1, 1]) { const x = b.ax + (b.bx - b.ax) * t - Math.sin(ang) * sd * (b.w / 2), z = b.az + (b.bz - b.az) * t + Math.cos(ang) * sd * (b.w / 2); const l = lantern(x, b.arch * Math.sin(Math.PI * t) + .75, z, .45); scene.add(l); lanterns.push(l); } } }
  const hsb = signboard('虹橋'); hsb.position.copy(hong.mid).add(new THREE.Vector3(0, 2.6, 0)).sub(off); hsb.lookAt(hsb.position.clone().add(off.clone().multiplyScalar(-1))); scene.add(hsb);
  const hsp = M(new THREE.BoxGeometry(.1, 2.6, .1), mats.redD); hsp.position.copy(hong.mid).sub(off).add(new THREE.Vector3(0, 1.2, 0)); scene.add(hsp);

  // ===== 桃溪村 =====
  const P = ISLANDS.peach, pg = new THREE.Group(); pg.position.set(P.x, 0, P.z); scene.add(pg);
  const pond = M(new THREE.CylinderGeometry(4.2, 4.2, .12, 32), mats.pond, 0, .06, 0); pg.add(pond);
  const pondRim = M(new THREE.TorusGeometry(4.3, .35, 6, 32), mats.rock, 0, .1, 0); pondRim.rotation.x = Math.PI / 2; pg.add(pondRim);
  for (let i = 0; i < 5; i++) { const lp = M(new THREE.CircleGeometry(.4, 10), mats.grass2, Math.cos(i * 1.3) * 3, .14, Math.sin(i * 1.3) * 3); lp.rotation.x = -Math.PI / 2; pg.add(lp); }
  clickables.push({ obj: pond, fn: api.onPond });
  const sign = new THREE.Group(); sign.position.set(5.6, 0, 2.4); sign.rotation.y = -1; pg.add(sign);
  for (const sx of [-1, 1]) sign.add(M(new THREE.CylinderGeometry(.1, .1, 2.4, 6), mats.woodD, sx * 1.1, 1.2, 0));
  sign.add(M(new THREE.BoxGeometry(2.6, 1.5, .15), mats.wood, 0, 1.8, 0)); const st = signboard('願望榜', '#9b6a43'); st.position.set(0, 1.8, .09); sign.add(st);
  clickables.push({ obj: sign, fn: api.onWishBoard });
  const ptag = makeTag('許願池・點我許願', '#F27BA5'); ptag.position.set(0, 3.2, 0); pg.add(ptag);
  // 農田
  for (const [x, z] of [[-9, -5], [-9, 1.5], [-3, -10]]) { const f = M(new THREE.BoxGeometry(5, .25, 4.5), toon('#a8744a'), x, .12, z); pg.add(f); for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) pg.add(M(new THREE.SphereGeometry(.22, 6, 4), mats.grass2, x + c * .9, .35, z + r * .8)); }
  for (const [hx, hz, hs] of [[-13, -6, 4], [-6, -13.5, 3.5], [12, 5, 3.6], [3, -14, 3]]) { const hill = M(new THREE.SphereGeometry(hs, 14, 10), mats.grass2, hx, -hs * .45, hz); hill.scale.y = .8; pg.add(hill); pg.add(tree('peachV', hx, hz, 1)); }
  { const dock = new THREE.Group(); const da = Math.atan2(P.z, P.x); dock.position.set(Math.cos(da) * 15.5, 0, Math.sin(da) * 15.5); dock.rotation.y = -da + Math.PI / 2; pg.add(dock);
    for (let i = 0; i < 6; i++) dock.add(M(new THREE.BoxGeometry(2, .15, .6), mats.wood, 0, -.1, i * .7)); for (const sx of [-1, 1]) for (const zz of [0, 3.5]) dock.add(M(new THREE.CylinderGeometry(.1, .1, 4, 6), mats.woodD, sx * .9, -2, zz));
    const db = rowboat(0); db.position.set(1.8, -3.85, 2.5); db.rotation.y = .2; dock.add(db); }
  for (const [x, z, ry] of [[8, -7, .6], [-10, 10, 2.2], [11, -1, -1.2], [-3, 13, 3]]) { const h = hall(3, 2.6, 1, toon('#f6ead2'), toon('#5b6b6e')); h.position.set(x, 0, z); h.rotation.y = ry; pg.add(h); }
  for (let i = 0; i < 34; i++) { const a = Math.random() * 6.28, r = 6.5 + Math.random() * 9; const x = Math.cos(a) * r, z = Math.sin(a) * r; if ((x + 9) ** 2 < 12 && z > -8 && z < 4) continue; if (z > 2 && Math.abs(x) < 7) continue; if (Math.hypot(x - 5.6, z - 2.4) < 2.5) continue; const t = tree('peachV', x, z, .8 + Math.random() * .4); pg.add(t); peachTrees.push(t); }
  // 池畔一圈粉紅桃樹（後側，不擋視線）
  for (let i = 0; i < 7; i++) { const a = Math.PI + .35 + i / 6 * (Math.PI - .7); const t = tree('peachV', Math.cos(a) * 5.6, Math.sin(a) * 5.6, .95); pg.add(t); peachTrees.push(t); }
  const boatGroup = new THREE.Group(); pg.add(boatGroup);
  const decor = decorate(scene, lanterns);

  // ===== 三清山 =====
  const S = ISLANDS.mount, sg = new THREE.Group(); sg.position.set(S.x, 0, S.z); scene.add(sg);
  // 喀斯特奇峰 + 雲霧 + 棧橋 + 風雷塔
  const peaks = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + .3; if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < .6) continue; const h = 11 + Math.random() * 9, r = 14 + Math.random(), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const pk = M(new THREE.CylinderGeometry(1.6 + Math.random() * .6, 3, h, 7), i % 2 ? mats.mount : mats.mountD, x, h / 2 - .3, z); sg.add(pk); sg.add(M(new THREE.SphereGeometry(2, 7, 5), mats.pine, x, h - .2, z)).scale; peaks.push(new THREE.Vector3(x, h, z));
    if (i % 3 === 0) { const pt = tree('peachV', x + .5, z, .7); pt.position.y = h + .6; sg.add(pt); } }
  for (let i = 0; i < peaks.length - 1; i++) { const A = peaks[i], B = peaks[i + 1]; const y = Math.min(A.y, B.y) - 3; const L = Math.hypot(B.x - A.x, B.z - A.z); const pl = M(new THREE.BoxGeometry(L, .15, .9), mats.wood, (A.x + B.x) / 2, y, (A.z + B.z) / 2); pl.rotation.y = -Math.atan2(B.z - A.z, B.x - A.x); sg.add(pl); }
  const mist = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .45, depthWrite: false });
  for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, r = 10 + Math.random() * 6; const m = new THREE.Mesh(new THREE.SphereGeometry(2.5 + Math.random() * 2, 10, 6), mist); m.scale.y = .35; m.position.set(Math.cos(a) * r, 3 + Math.random() * 5, Math.sin(a) * r); sg.add(m); }
  { const pg2 = new THREE.Group(); pg2.position.set(6, 0, -6); sg.add(pg2); pg2.add(M(new THREE.CylinderGeometry(2, 2.3, .6, 8), mats.rock, 0, .3, 0));
    for (let f = 0; f < 5; f++) { const sc = 1 - f * .15; pg2.add(M(new THREE.CylinderGeometry(1.1 * sc, 1.2 * sc, 1.2, 8), toon('#5a3a32'), 0, .6 + f * 1.4 + .6, 0)); pg2.add(M(new THREE.ConeGeometry(1.9 * sc, .6, 8), toon('#2f4744'), 0, .6 + f * 1.4 + 1.4, 0)); }
    pg2.add(M(new THREE.ConeGeometry(.15, 1, 6), mats.gold, 0, 8.3, 0)); const ft = makeTag('風雷塔', '#2f4744'); ft.position.y = 9.4; pg2.add(ft); }
  { const dh = hall(4, 3, 1, toon('#5a3a32'), toon('#2f4744')); dh.position.set(-6, 0, -7); dh.rotation.y = .5; sg.add(dh); }
  for (const [x, z] of [[-8, 4], [8, 5], [3, 9]]) sg.add(tree('peachV', x, z, .8));
  const dummy = new THREE.Group(); sg.add(dummy);
  dummy.add(M(new THREE.CylinderGeometry(1.4, 1.6, .3, 10), mats.rock, 0, .15, 0));
  const dpost = new THREE.Group(); dummy.add(dpost);
  dpost.add(M(new THREE.CylinderGeometry(.38, .42, 3, 10), mats.wood, 0, 1.8, 0)); dpost.add(M(new THREE.SphereGeometry(.45, 10, 8), mats.wood, 0, 3.4, 0));
  for (const y of [2.6, 1.9]) { const arm = M(new THREE.CylinderGeometry(.1, .1, 2, 6), mats.woodD, 0, y, 0); arm.rotation.z = Math.PI / 2; arm.rotation.y = y > 2 ? .5 : -.5; dpost.add(arm); }
  dpost.add(M(new THREE.TorusGeometry(.42, .06, 6, 14), mats.red, 0, 3.0, 0)).rotation; 
  const dtag = makeTag('木樁', '#9b6a43'); dtag.position.y = 4.4; dummy.add(dtag);
  clickables.push({ obj: dummy, fn: api.onDummy });
  for (let i = 0; i < 4; i++) { const c = crane(); Object.assign(c.userData, { base: i / 4 * 6.28, r: 6 + i, h: 5 + i * .8, loop: 0 }); sg.add(c); cranes.push({ crane: c }); clickables.push({ obj: c, fn: () => api.onCrane(c) }); }
  const stag = makeTag('三清山・仙鶴可點', '#4f8a6e'); stag.position.set(0, 9, -10); sg.add(stag);

  // ===== 楓林小駐 =====
  const F = ISLANDS.maple, fg = new THREE.Group(); fg.position.set(F.x, 0, F.z); scene.add(fg);
  { const cw = toon('#efe4cc'), ct = toon('#2f3f3d'); for (const [x, z, ww, dd] of [[0, -6, 12, .5], [-6, 0, .5, 12], [6, 0, .5, 12], [-3.8, 6, 4.4, .5], [3.8, 6, 4.4, .5]]) { const wl = new THREE.Group(); wl.rotation.y = Math.PI * .35; fg.add(wl); wl.add(M(new THREE.BoxGeometry(ww, 1.3, dd), cw, x, .65, z)); wl.add(M(new THREE.BoxGeometry(ww + .3, .22, dd + .4), ct, x, 1.4, z)); }
    for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5]]) { const sh = hall(2.4, 2, 1, toon('#fff1de'), ct); sh.position.set(x, 0, z); const wr = new THREE.Group(); wr.rotation.y = Math.PI * .35; wr.add(sh); fg.add(wr); }
    const da = Math.atan2(-F.z, -F.x); for (let i = 0; i < 9; i++) { const r = 6.5 + i; const p = M(new THREE.CylinderGeometry(.9, .9, .06, 10), toon('#c9a27e'), Math.cos(da + .25) * r, .04, Math.sin(da + .25) * r); fg.add(p); } }
  const mansion = hall(6, 4.2, 2, toon('#fff1de'), toon('#2f3f3d')); mansion.rotation.y = Math.PI * .35; fg.add(mansion);
  for (const sx of [-1, 1]) { const l = lantern(sx * 2.4, 1.9, 2.6, .8); mansion.add(l); lanterns.push(l); }
  const ms = signboard('楓林小駐', '#8a3b2f'); ms.position.set(0, 2.9, 2.2); mansion.add(ms);
  const mtag = makeTag('照片牆・點我', '#E0892B'); mtag.position.y = 8.6; mansion.add(mtag);
  clickables.push({ obj: mansion, fn: api.onMansion });
  const mapleTrees = []; for (let i = 0; i < 34; i++) { const a = Math.random() * 6.28, r = 8.8 + Math.random() * 5.6; const t = tree('maple', Math.cos(a) * r, Math.sin(a) * r, .8 + Math.random() * .5); fg.add(t); mapleTrees.push(t); }

  // ===== 磁州孔廟 =====
  const T = ISLANDS.temple, tg = new THREE.Group(); tg.position.set(T.x, 0, T.z); scene.add(tg);
  const temple = new THREE.Group(); temple.position.set(0, 0, 7); temple.rotation.y = Math.PI; tg.add(temple); // 正面朝向汴京（-z）
  temple.add(M(new THREE.BoxGeometry(11, .8, 7), mats.rock, 0, .4, 0)); for (let i = 0; i < 3; i++) temple.add(M(new THREE.BoxGeometry(3, .27, .5), mats.jade, 0, .13 + i * .27, 3.7 - i * .3));
  const th = hall(8, 4.8, 2, toon('#f7f3ea'), toon('#2f3f3d')); th.position.y = .4; temple.add(th);
  const tsb = signboard('孔廟', '#2d4a6b'); tsb.position.set(0, 3.1, 2.48); temple.add(tsb);
  for (const sx of [-1, 1]) { const l = lantern(sx * 3, 2.2, 2.9, .8); temple.add(l); lanterns.push(l); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; if (Math.sin(a) < -.3 || Math.cos(a) > .5) continue; tg.add(tree('pine', Math.cos(a) * 12.5, Math.sin(a) * 12.5, .9)); }
  { const ww = toon('#f7f3ea'), wt = toon('#2f3f3d'); for (const [x, z, a, b] of [[-6.5, 7, .4, 8], [6.5, 7, .4, 8], [0, 11, 13.4, .4]]) { tg.add(M(new THREE.BoxGeometry(a, 1.2, b), ww, x, .6, z)); tg.add(M(new THREE.BoxGeometry(a + .3, .2, b + .3), wt, x, 1.3, z)); }
    const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(9, .04, -14), new THREE.Vector3(11, .04, -6), new THREE.Vector3(9.5, .04, 2), new THREE.Vector3(12, .04, 10)]), 30, 1, 6), toon('#3fc7c0')); st.scale.y = .08; tg.add(st);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) { const t = M(new THREE.BoxGeometry(2.6, .3 + k * .25, 1.6), toon(k % 2 ? '#e8c15a' : '#d9ad3c'), -12 + k * 1.2, .15 + k * .12, -6 + j * 1.8); tg.add(t); }
    const gt = new THREE.Group(); gt.position.set(0, 0, -13); tg.add(gt); for (const sx of [-1, 1]) gt.add(M(new THREE.CylinderGeometry(.15, .15, 2.4, 8), mats.red, sx * 1.4, 1.2, 0)); gt.add(M(new THREE.BoxGeometry(3.6, .25, .4), wt, 0, 2.45, 0)); gt.add(M(new THREE.BoxGeometry(4.2, .2, .5), wt, 0, 2.75, 0)); }
  // 香爐
  const bronze = toon('#8a6a3a'), bronzeD = toon('#5e4524');
  const burner = new THREE.Group(); burner.position.set(0, 0, 0); tg.add(burner);
  burner.add(M(new THREE.CylinderGeometry(2, 2.2, .4, 12), mats.rock, 0, .2, 0));
  for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; burner.add(M(new THREE.CylinderGeometry(.18, .12, 1.0, 6), bronzeD, Math.cos(a) * .9, .8, Math.sin(a) * .9)); }
  const bowl = M(new THREE.CylinderGeometry(1.35, .95, 1.3, 16, 1, true), toon('#8a6a3a', { side: THREE.DoubleSide }), 0, 1.9, 0); burner.add(bowl);
  burner.add(M(new THREE.CylinderGeometry(.95, .95, .1, 16), bronzeD, 0, 1.3, 0));
  const rimT = M(new THREE.TorusGeometry(1.35, .1, 6, 20), mats.gold, 0, 2.55, 0); rimT.rotation.x = Math.PI / 2; burner.add(rimT);
  for (const sx of [-1, 1]) burner.add(M(new THREE.TorusGeometry(.3, .08, 6, 10), bronze, sx * 1.45, 2.75, 0));
  const ash = M(new THREE.CylinderGeometry(1.2, 1.2, .05, 16), toon('#cfc6b8'), 0, 2.2, 0); burner.add(ash);
  for (let i = 0; i < 3; i++) { burner.add(M(new THREE.CylinderGeometry(.03, .03, 1.1, 4), toon('#c94a4a'), (i - 1) * .3, 2.7, 0)); }
  const btag = makeTag('香爐・點我踢球獻祭', '#8a6a3a'); btag.position.y = 4.2; burner.add(btag);
  clickables.push({ obj: burner, fn: api.onBurner });
  // 醉落嫣紅（縮成一團的小人球）
  const ball = new THREE.Group(); const skin = toon('#ffe3d0'), dress = toon('#d63a6a'), hair = toon('#2b1d16');
  const core = M(new THREE.SphereGeometry(.55, 16, 12), dress); ball.add(core);
  const hd = M(new THREE.SphereGeometry(.38, 14, 10), skin, 0, .25, .32); ball.add(hd); const hr = M(new THREE.SphereGeometry(.4, 14, 10, 0, 6.28, 0, 1.7), hair, 0, .3, .28); hr.rotation.x = -.8; ball.add(hr);
  for (const sd of [-1, 1]) { const e = M(new THREE.TorusGeometry(.05, .015, 4, 8, Math.PI), toon('#2b1d16'), sd * .13, .25, .68); ball.add(e);
    const arm = M(new THREE.TorusGeometry(.5, .09, 6, 14, Math.PI), skin, sd * .25, -.05, 0); arm.rotation.y = Math.PI / 2; ball.add(arm);
    ball.add(M(new THREE.SphereGeometry(.16, 8, 6), toon('#5a3b2e'), sd * .22, -.5, .2)); }
  const ballTag = makeTag('醉落嫣紅', '#d63a6a'); ballTag.position.y = 1.3; ball.add(ballTag); ball.userData.tag = ballTag;
  const bhit = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ visible: false })); ball.add(bhit);
  const kickSpot = new THREE.Vector3(T.x, .55, T.z - 8); ball.position.copy(kickSpot); scene.add(ball);
  clickables.push({ obj: ball, fn: api.onBurner });
  const ttag = makeTag('磁州孔廟', '#2d4a6b'); ttag.position.set(0, 10.5, 7); tg.add(ttag);

  return { temple: { ball, kickSpot, burnerPos: new THREE.Vector3(T.x, 0, T.z), rimY: 2.4, rimR: 1.15 }, lanterns, clickables, cranes, boatGroup, gem, gemGlow, altar, dummy: { group: dummy, post: dpost, pos: new THREE.Vector3(S.x, 0, S.z) }, memo, W, peachTrees, decor };
}
function crane() {
  const g = new THREE.Group(); const w = toon('#ffffff'), k = toon('#2b1d16'), r = toon('#e23d3d');
  const b = M(new THREE.SphereGeometry(.4, 10, 8), w); b.scale.set(1, .7, 1.8); g.add(b);
  const n = M(new THREE.CylinderGeometry(.06, .08, .9, 6), w, 0, .3, .8); n.rotation.x = .9; g.add(n);
  g.add(M(new THREE.SphereGeometry(.13, 8, 6), w, 0, .6, 1.15)); g.add(M(new THREE.SphereGeometry(.07, 6, 4), r, 0, .72, 1.15));
  const bk = M(new THREE.ConeGeometry(.04, .35, 5), toon('#f2c14e'), 0, .58, 1.38); bk.rotation.x = Math.PI / 2; g.add(bk);
  const tail = M(new THREE.ConeGeometry(.2, .5, 5), k, 0, 0, -.8); tail.rotation.x = -Math.PI / 2; g.add(tail);
  const wings = []; for (const sd of [-1, 1]) { const wg = new THREE.Group(); const f = M(new THREE.BoxGeometry(1.6, .05, .7), w, sd * .8, 0, 0); wg.add(f); wg.add(M(new THREE.BoxGeometry(.5, .06, .7), k, sd * 1.4, 0, 0)); g.add(wg); wings.push(wg); }
  g.userData.wings = wings; g.scale.setScalar(.9);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.6), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
  g.userData.wingsRef = wings; g.userData.isCrane = true; return g;
}
export function paperBoat(color = '#fffdf5') {
  const g = new THREE.Group(); const m = toon(color, { side: THREE.DoubleSide });
  const hull = new THREE.Shape(); hull.moveTo(-.7, 0); hull.lineTo(.7, 0); hull.lineTo(.45, -.3); hull.lineTo(-.45, -.3); hull.closePath();
  const h = M(new THREE.ExtrudeGeometry(hull, { depth: .4, bevelEnabled: false }), m, 0, .3, -.2); g.add(h);
  const sail = new THREE.Shape(); sail.moveTo(-.35, 0); sail.lineTo(.35, 0); sail.lineTo(0, .55); sail.closePath();
  g.add(M(new THREE.ShapeGeometry(sail), m, 0, .3, 0));
  const hit = new THREE.Mesh(new THREE.SphereGeometry(.9), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = .3; g.add(hit);
  return g;
}

// ===== 熱鬧點綴：花草石、動物、小船、河燈、路燈 =====
function decorate(scene, lanterns) {
  const D = { fish: [], birds: [], boats: [], floats: [], rabbits: [] }, rnd = (a, b) => a + Math.random() * (b - a);
  const flowerC = ['#ff8fb1', '#fff27a', '#ffffff', '#b9a4ff', '#ff6a6a'].map(c => toon(c));
  const clearOf = (k, x, z) => { if (k === 'main') return Math.hypot(x, z) > 9.5 && Math.abs(x) > 2 && Math.abs(z) > 2; if (k === 'peach') return Math.hypot(x, z) > 6 && !(z > 2 && Math.abs(x) < 7); if (k === 'temple' || k === 'mount') return Math.hypot(x, z) > 7; return Math.hypot(x, z) > 5; };
  for (const k in ISLANDS) { const I = ISLANDS[k]; const g = new THREE.Group(); g.position.set(I.x, 0, I.z); scene.add(g);
    for (let i = 0; i < 70; i++) { const a = rnd(0, 6.28), r = rnd(3, I.r - 1.5), x = Math.cos(a) * r, z = Math.sin(a) * r; if (!clearOf(k, x, z)) continue;
      const kind = Math.random(); if (kind < .5) { const f = new THREE.Group(); f.position.set(x, 0, z); f.add(M(new THREE.CylinderGeometry(.03, .03, .4, 4), mats.grass2, 0, .2, 0)); f.add(M(new THREE.IcosahedronGeometry(.16, 0), flowerC[i % 5], 0, .45, 0)); g.add(f); }
      else if (kind < .85) { const t = M(new THREE.ConeGeometry(.15, .5, 4), mats.grass2, x, .25, z); g.add(t); g.add(M(new THREE.ConeGeometry(.12, .4, 4), mats.grass2, x + .15, .2, z + .1)); }
      else { const s = M(new THREE.DodecahedronGeometry(rnd(.2, .5), 0), mats.rockD, x, .1, z); s.scale.y = .6; g.add(s); } }
    // 邊緣路燈
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + .4, r = I.r - 1.6; const p = new THREE.Group(); p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); p.add(M(new THREE.CylinderGeometry(.07, .07, 2.2, 6), mats.woodD, 0, 1.1, 0)); const l = lantern(0, 2.1, 0, .6); p.add(l); lanterns.push(l); g.add(p); }
    // 兔子
    if (k !== 'temple') for (let i = 0; i < 2; i++) { const r = rabbit(); const a = rnd(0, 6.28), rr = rnd(I.r * .55, I.r - 2.5); r.position.set(I.x + Math.cos(a) * rr, 0, I.z + Math.sin(a) * rr); r.userData = { I, a, rr, ph: rnd(0, 6) }; scene.add(r); D.rabbits.push(r); } }
  // 橋上燈籠
  for (const b of BRIDGES) for (const t of [.2, .8]) for (const sd of [-1, 1]) { const ang = Math.atan2(b.bz - b.az, b.bx - b.ax); const x = b.ax + (b.bx - b.ax) * t - Math.sin(ang) * sd * (b.w / 2 + .1), z = b.az + (b.bz - b.az) * t + Math.cos(ang) * sd * (b.w / 2 + .1); const l = lantern(x, b.arch * Math.sin(Math.PI * t) + 1.3, z, .55); scene.add(l); lanterns.push(l); }
  const offIsland = (x, z) => { for (const k in ISLANDS) { const I = ISLANDS[k]; if (Math.hypot(x - I.x, z - I.z) < I.r + 2) return false; } return true; };
  const spot = (rMin, rMax) => { for (let n = 0; n < 50; n++) { const a = rnd(0, 6.28), r = rnd(rMin, rMax), x = Math.cos(a) * r, z = Math.sin(a) * r; if (offIsland(x, z)) return [x, z]; } return [rMax, 0]; };
  // 小船
  for (let i = 0; i < 7; i++) { const [x, z] = spot(30, 75); const b = rowboat(i); b.position.set(x, -3.85, z); b.userData = { cx: x, cz: z, ph: rnd(0, 6), r: rnd(2, 5) }; scene.add(b); D.boats.push(b); }
  // 河燈
  for (let i = 0; i < 40; i++) { const [x, z] = spot(24, 70); const f = new THREE.Group(); f.add(M(new THREE.CylinderGeometry(.35, .45, .2, 6), mats.paper, 0, 0, 0)); const l = lantern(0, .1, 0, .45); f.add(l); lanterns.push(l); f.position.set(x, -3.9, z); f.userData = { x, z, ph: rnd(0, 6) }; scene.add(f); D.floats.push(f); }
  // 魚（跳出水面）
  const fishM = [toon('#ff8a4a'), toon('#ffd24a'), toon('#ffffff')];
  for (let i = 0; i < 12; i++) { const [x, z] = spot(26, 65); const f = new THREE.Group(); const b = M(new THREE.SphereGeometry(.35, 8, 6), fishM[i % 3]); b.scale.set(.6, .8, 1.5); f.add(b); const tl = M(new THREE.ConeGeometry(.3, .4, 4), fishM[i % 3], 0, 0, -.6); tl.rotation.x = Math.PI / 2; f.add(tl); f.userData = { x, z, ph: rnd(0, 8), ry: rnd(0, 6.28) }; scene.add(f); D.fish.push(f); }
  // 小鳥
  for (let i = 0; i < 14; i++) { const g = new THREE.Group(); const c = toon(['#5aa0e8', '#f2c14e', '#ff7a7a', '#ffffff'][i % 4]); g.add(M(new THREE.SphereGeometry(.22, 8, 6), c)); const w = []; for (const sd of [-1, 1]) { const wg = M(new THREE.BoxGeometry(.5, .03, .22), c, sd * .28, 0, 0); g.add(wg); w.push(wg); } g.add(M(new THREE.ConeGeometry(.05, .14, 4), mats.gold, 0, 0, .25)).children; g.userData = { w, cx: rnd(-40, 40), cz: rnd(-30, 40), r: rnd(6, 18), h: rnd(7, 13), sp: rnd(.4, .9) * (i % 2 ? 1 : -1), ph: rnd(0, 6) }; scene.add(g); D.birds.push(g); }
  D.update = (dt, t) => {
    for (const b of D.boats) { const u = b.userData, a = u.ph + t * .05; b.position.set(u.cx + Math.cos(a) * u.r, -3.85 + Math.sin(t * 1.4 + u.ph) * .06, u.cz + Math.sin(a) * u.r); b.rotation.y = -a; b.rotation.z = Math.sin(t + u.ph) * .06; }
    for (const f of D.floats) { const u = f.userData; f.position.set(u.x + Math.sin(t * .2 + u.ph) * 1.2, -3.9 + Math.sin(t * 1.2 + u.ph) * .05, u.z + Math.cos(t * .17 + u.ph) * 1.2); }
    for (const f of D.fish) { const u = f.userData, k = ((t * .35 + u.ph) % 4); if (k < 1) { f.visible = true; f.position.set(u.x + Math.cos(u.ry) * (k * 2.4 - 1.2), -4 + Math.sin(k * Math.PI) * 1.6, u.z + Math.sin(u.ry) * (k * 2.4 - 1.2)); f.rotation.set(-Math.cos(k * Math.PI) * .9, -u.ry + Math.PI / 2, 0); } else f.visible = false; }
    for (const g of D.birds) { const u = g.userData, a = u.ph + t * u.sp; g.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(t * 2 + u.ph) * .4, u.cz + Math.sin(a) * u.r); g.rotation.y = -a + (u.sp > 0 ? Math.PI : 0); u.w.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * Math.sin(t * 12 + u.ph) * .7); }
    for (const r of D.rabbits) { const u = r.userData, a = u.a + t * .06 * (u.ph > 3 ? 1 : -1); r.position.set(u.I.x + Math.cos(a) * u.rr, Math.abs(Math.sin(t * 4 + u.ph)) * .25, u.I.z + Math.sin(a) * u.rr); r.rotation.y = -a + (u.ph > 3 ? 0 : Math.PI); }
  };
  return D;
}
function rabbit() { const g = new THREE.Group(), w = toon('#ffffff'), p = toon('#ffb7cf'); const b = M(new THREE.SphereGeometry(.3, 10, 8), w, 0, .3, 0); b.scale.set(.9, .85, 1.1); g.add(b); g.add(M(new THREE.SphereGeometry(.2, 10, 8), w, 0, .55, .25));
  for (const sd of [-1, 1]) { const e = M(new THREE.CapsuleGeometry(.05, .3, 4, 6), w, sd * .08, .85, .2); e.rotation.z = sd * .15; g.add(e); g.add(M(new THREE.SphereGeometry(.03, 5, 4), toon('#2b1d16'), sd * .09, .6, .43)); }
  g.add(M(new THREE.SphereGeometry(.03, 5, 4), p, 0, .53, .45)); g.add(M(new THREE.SphereGeometry(.1, 6, 5), w, 0, .3, -.33)); return g; }
function rowboat(i) { const g = new THREE.Group(); const hull = M(new THREE.CylinderGeometry(.9, .6, .5, 8, 1, false), mats.wood, 0, .25, 0); hull.scale.z = 2.4; g.add(hull);
  const roofM = toon(['#d9534f', '#3f5a73', '#4f8a6e'][i % 3]); const cab = M(new THREE.CylinderGeometry(.75, .75, 1.4, 10, 1, true, 0, Math.PI), roofM, 0, .7, 0); cab.rotation.x = Math.PI / 2; cab.rotation.z = Math.PI / 2; cab.rotation.set(Math.PI / 2, 0, 0); cab.scale.set(1, 1, 1); g.add(cab);
  g.add(M(new THREE.CylinderGeometry(.03, .03, 2.4, 4), mats.woodD, 0, .6, -1.6)); return g; }
