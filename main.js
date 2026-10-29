import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { CLASSES, classById, GACHA, HAIRS, OUTFITS, HAIR_COLORS, OUTFIT_COLORS, SKIN_COLORS, MET_DATE, JIANGHU_QUOTES } from './config.js';
import { db } from './data.js';
import { Avatar, makeTag } from './avatar.js';
import { buildWorld, ISLANDS, walkable, heightAt, islandAt, mats, paperBoat } from './world.js';
import { ICONS } from './icons.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = t => new Date(t).toLocaleDateString('zh-TW');
let toastTimer; function toast(msg, ms = 2600) { const t = $('#toast'); t.innerHTML = msg; t.classList.remove('hidden'); t.style.animation = 'none'; t.offsetHeight; t.style.animation = ''; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), ms); }
function modal(html, wide = false) { $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); $('#modal .mcard').classList.toggle('wide', wide); }
const closeModal = () => { $('#modal').classList.add('hidden'); $('#modal').classList.remove('low'); };
$('#modalX').onclick = closeModal; $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
const daysSince = () => Math.floor((Date.now() - new Date(MET_DATE + 'T00:00:00+08:00')) / 864e5);

// ===== Renderer / Scene =====
const canvas = $('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#bfe6f2', 90, 220);
const camera = new THREE.PerspectiveCamera(45, 1, .1, 600); camera.position.set(0, 60, 90);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .45; controls.minDistance = 8; controls.maxDistance = 160; controls.enablePan = false;
const hemi = new THREE.HemisphereLight('#ffffff', '#9fdc7c', 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3d6', 2.0); sun.position.set(40, 70, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, far: 220 }); scene.add(sun);
const nightLights = []; for (const [x, z] of [[0, 0], [15, -8], [-6.5, -15], [ISLANDS.peach.x, ISLANDS.peach.z], [ISLANDS.maple.x, ISLANDS.maple.z], [ISLANDS.temple.x, ISLANDS.temple.z], [ISLANDS.mount.x, ISLANDS.mount.z]]) { const l = new THREE.PointLight('#ff9a4a', 0, 26, 1.4); l.position.set(x, 4, z); scene.add(l); nightLights.push(l); }
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const world = buildWorld(scene, {
  onAltar: () => openGacha(), onMemo: () => openMemo(), onPond: () => openWishForm(), onWishBoard: () => openWishBoard(),
  onDummy: () => goDummy(), onCrane: c => craneLoop(c), onMansion: () => openPhotoWall(), onBurner: () => openKick(),
});

// ===== Avatars =====
let me = null, player = null; const avatars = [];
function spawn(data, isMe = false) {
  const a = new Avatar(data); let [x, , z] = data.pos || [0, 0, 6];
  if (!walkable(x, z)) { const ang = Math.random() * 6.28; x = Math.cos(ang) * 10; z = Math.sin(ang) * 10; }
  a.root.position.set(x, heightAt(x, z), z); a.home = new THREE.Vector3(x, 0, z); a.isMe = isMe; scene.add(a.root); avatars.push(a);
  if (!isMe) a.nextAct = 2 + Math.random() * 5; return a;
}

// ===== Day / Night & Seasons =====
let night = (() => { const h = new Date().getHours(); return h >= 18 || h < 6; })(); let nightK = night ? 1 : 0;
const SEASONS = [{ n: '春', i: '🌸', grass: '#9fdc7c', peach: '#ffb7cf', p: '#ffc4d8' }, { n: '夏', i: '🌿', grass: '#7fd06a', peach: '#6cc070', p: null }, { n: '秋', i: '🍁', grass: '#d8c76a', peach: '#f39a4a', p: '#f07a3a' }, { n: '冬', i: '❄️', grass: '#eef5f7', peach: '#ffffff', p: '#ffffff' }];
let season = [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][new Date().getMonth()];
const petals = (() => { const n = 500, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * 160; p[i * 3 + 1] = Math.random() * 30; p[i * 3 + 2] = (Math.random() - .5) * 140; } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .45, color: '#ffc4d8' })); scene.add(pts); return pts; })();
function applySeason() { const s = SEASONS[season]; mats.grass.color.set(s.grass); mats.grass2.color.set(new THREE.Color(s.grass).multiplyScalar(.85)); mats.peach.color.set(s.peach);
  mats.maple.color.set(season === 3 ? '#f4eeee' : season === 0 ? '#ff8f7a' : season === 1 ? '#e8743c' : '#e2412b'); mats.maple2.color.set(season === 3 ? '#ffffff' : '#f7a23b');
  mats.pine.color.set(season === 3 ? '#cfe7dc' : '#4f9a6a');
  petals.visible = !!s.p; if (s.p) { petals.material.color.set(s.p); petals.material.size = season === 3 ? .6 : .45; }
  $('#seasonBtn').textContent = `${s.i} ${s.n}`; }
$('#seasonBtn').onclick = () => { season = (season + 1) % 4; applySeason(); toast(`季節變換：${SEASONS[season].n}`); };
$('#dayBtn').onclick = () => { night = !night; updDayBtn(); toast(night ? '夜幕降臨，汴京燈火亮起 🏮' : '天亮了 ☀️'); };
function updDayBtn() { $('#dayBtn').textContent = night ? '🌙 夜晚' : '☀️ 白天'; }
const daySky = new THREE.Color('#bfe6f2'), nightSky = new THREE.Color('#1c2350'), tmpC = new THREE.Color();
function updateEnv(dt, t) { nightK += ((night ? 1 : 0) - nightK) * Math.min(1, dt * 2);
  tmpC.copy(daySky).lerp(nightSky, nightK); scene.background = tmpC.clone(); scene.fog.color.copy(tmpC);
  sun.intensity = 2 - 1.7 * nightK; sun.color.set(nightK > .5 ? '#9fb0ff' : '#fff3d6'); hemi.intensity = 1.1 - .65 * nightK;
  mats.lantern.emissiveIntensity = nightK * 1.6 + .05; mats.window.emissiveIntensity = nightK * 1.1; nightLights.forEach(l => l.intensity = nightK * 120);
  world.gemGlow.intensity = 6 + Math.sin(t * 2) * 3 + nightK * 10; mats.water.color.set(nightK > .5 ? '#3a5a8a' : '#7fd3e8');
  const pa = petals.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { let y = pa.getY(i) - dt * (season === 3 ? 2 : 1.3); if (y < 0) y = 30; pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(t + i) * dt * .6); } pa.needsUpdate = true; }

// ===== 鑑石 gacha =====
const fireworks = [];
function firework(pos, color) { const n = 140, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), v = []; for (let i = 0; i < n; i++) { p.set([pos.x, pos.y, pos.z], i * 3); const d = new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 6); v.push(d); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.PointsMaterial({ size: .7, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, m); scene.add(pts); fireworks.push({ pts, v, life: 0 }); }
function updFireworks(dt) { for (let i = fireworks.length - 1; i >= 0; i--) { const f = fireworks[i]; f.life += dt; const pa = f.pts.geometry.attributes.position;
  for (let j = 0; j < f.v.length; j++) { f.v[j].y -= dt * 5; f.v[j].multiplyScalar(.985); pa.setXYZ(j, pa.getX(j) + f.v[j].x * dt, pa.getY(j) + f.v[j].y * dt, pa.getZ(j) + f.v[j].z * dt); } pa.needsUpdate = true;
  f.pts.material.opacity = Math.max(0, 1 - f.life / 2.2); if (f.life > 2.2) { scene.remove(f.pts); fireworks.splice(i, 1); } } }
function roll() { let r = Math.random() * 100; for (const g of GACHA) { if ((r -= g.p) < 0) return g; } return GACHA[GACHA.length - 1]; }
let gemSpin = 0;
async function openGacha(result) {
  const mine = await db.getDraws(me.id), all = await db.allDraws(), list = await db.listAvatars();
  const board = list.map(a => ({ a, d: all[a.id] || { count: 0, results: {} } })).filter(x => x.d.count).sort((x, y) => y.d.count - x.d.count);
  modal(`<h2>💎 鑑石</h2>
  ${result ? `<div class="gem">${result.icon}</div><div class="result ${result.rare ? 'rare' : ''}">${result.rare ? '✨ 恭喜！抽到 ' : '獲得 '}${result.name}${result.rare ? ' ✨' : ''}</div>` : '<p>注入靈力，鑑出奇珍！無限次數，盡情抽～</p>'}
  <p style="text-align:center"><button id="drawBtn">鑑定一次 ✦</button> <button id="draw10" class="ghost">十連鑑</button></p>
  <p>你已鑑定 <b>${mine.count}</b> 次</p><div class="stats">${GACHA.map(g => `<div>${g.icon} ${g.name}<br><b>${mine.results[g.name] || 0}</b> <small>(${g.p}%)</small></div>`).join('')}</div>
  <h3>江湖鑑石榜</h3><table><tr><th>俠客</th><th>次數</th><th>天賞石</th></tr>${board.map(x => `<tr><td>${esc(x.a.name)}${x.a.sample ? ' <small>(範例)</small>' : ''}</td><td>${x.d.count}</td><td>${x.d.results['天賞石'] || 0}</td></tr>`).join('')}</table>`);
  const draw = async n => { let best = null; for (let i = 0; i < n; i++) { const g = roll(); await db.recordDraw(me.id, g.name); if (!best || g.rare) best = g; if (g.rare) celebrate(); }
    gemSpin = 1.5; if (n > 1) toast(`十連結果中最佳：${best.icon} ${best.name}`); openGacha(best); };
  $('#drawBtn').onclick = () => draw(1); $('#draw10').onclick = () => draw(10);
}
function celebrate() { const base = new THREE.Vector3(0, 8, 0); const cols = ['#ffd84a', '#ff6b8a', '#6bdcff', '#b48cff', '#7dff9a'];
  for (let i = 0; i < 5; i++) setTimeout(() => firework(base.clone().add(new THREE.Vector3((Math.random() - .5) * 14, 4 + Math.random() * 6, (Math.random() - .5) * 14)), cols[i % 5]), i * 260); }
function openMemo() { modal(`<h2>🏮 相識紀念</h2><div class="result" style="font-size:40px">${daysSince()} 天</div><p style="text-align:center">從 ${MET_DATE} 在江湖相遇至今<br>感謝一路同行 ❤</p>`); }

// ===== 許願池 =====
async function refreshBoats() { const g = world.boatGroup; while (g.children.length) g.remove(g.children[0]);
  const ws = (await db.listWishes()).slice(0, 20);
  ws.forEach((w, i) => { const b = paperBoat(['#fffdf5', '#ffe3ec', '#e3f4ff', '#fff4c9'][i % 4]); const a = i / ws.length * 6.28 + i * .3, r = 1.2 + (i % 3) * 1;
    b.position.set(Math.cos(a) * r, .1, Math.sin(a) * r); b.rotation.y = -a; b.userData.wish = w; b.userData.a = a; b.userData.r = r; b.scale.setScalar(.8); b.traverse(o => o.userData.wish = w); g.add(b); }); }
function openWishForm() { modal(`<h2>🌸 桃溪許願池</h2><p>寫下願望，摺成紙船放進池裡～（最多50字）</p><div class="form">
  <textarea id="wishIn" maxlength="50" rows="3" placeholder="我希望…"></textarea><small id="wc" class="count">0/50</small>
  <label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="anon"> 匿名許願</label>
  <button id="wishGo">放紙船 ⛵</button></div><p><button class="ghost" id="toBoard">看願望榜 →</button></p>`);
  $('#wishIn').oninput = e => $('#wc').textContent = `${e.target.value.length}/50`;
  $('#toBoard').onclick = openWishBoard;
  $('#wishGo').onclick = async () => { const text = $('#wishIn').value.trim(); if (!text) return toast('願望不能是空的喔');
    const anon = $('#anon').checked; await db.addWish({ text, anon, name: anon ? '' : me.name, avatarId: me.id }); await refreshBoats(); closeModal(); toast('紙船已放入池中 ⛵'); }; }
async function openWishBoard() { const ws = await db.listWishes();
  modal(`<h2>📜 願望榜</h2><p>共 ${ws.length} 個願望（池中顯示最新 20 艘紙船）</p><div class="wishlist">${ws.map(w => `<div>${esc(w.text)}<br><small>— ${w.anon ? '匿名俠客' : esc(w.name)} ・ ${fmtDate(w.created)}</small></div>`).join('')}</div><p><button id="mk">我也要許願</button></p>`); $('#mk').onclick = openWishForm; }
function showWish(w) { modal(`<h2>⛵ 紙船上的願望</h2><div class="msgbubble">${esc(w.text)}</div><p style="text-align:right">— ${w.anon ? '匿名俠客' : esc(w.name)}</p>`); }

// ===== 三清山 =====
function craneLoop(c) { if (c.userData.loop > 0) return; c.userData.loop = 3; const q = JIANGHU_QUOTES[Math.floor(Math.random() * JIANGHU_QUOTES.length)]; setTimeout(() => toast(`🕊️ 仙鶴傳語：${esc(q)}`, 4200), 600); }
let pendingAttack = false; const dpos = world.dummy.pos; let dummyWobble = 0;
function goDummy() { const dir = player.root.position.clone().sub(dpos).setY(0); if (dir.length() < .1) dir.set(0, 0, 1); dir.setLength(2.2); setTarget(dpos.clone().add(dir)); pendingAttack = true; }
function nearDummy() { return player && player.root.position.distanceTo(dpos) < 3.6; }
function hitDummy() { player.root.lookAt(dpos.x, player.root.position.y, dpos.z); player.setState('attack');
  for (let i = 0; i < 6; i++) setTimeout(() => { dummyWobble = 1; dmgText(); }, 180 + i * 333); }
function dmgText() { const n = Math.floor(Math.random() * 9000 + 999); const s = makeTag(`-${n}`, Math.random() < .2 ? '#ff4a4a' : '#ffb84a'); s.position.copy(dpos).add(new THREE.Vector3((Math.random() - .5) * 1.5, 4, (Math.random() - .5) * 1.5)); s.userData.life = 0; scene.add(s); floaters.push(s); }
const floaters = [];

// ===== 磁州孔廟：踢醉落嫣紅進香爐 =====
const K = { st: 'idle', aim: 0, power: 0, charging: false, vel: new THREE.Vector3(), t: 0 }; const TP = world.temple;
const smoke = [];
function openKick() { if (K.st === 'fly') return; const p = TP.kickSpot; const behind = p.clone().add(new THREE.Vector3(0, 0, -2)); player.root.position.set(behind.x, 0, behind.z); player.target = null; player.root.rotation.y = 0;
  controls.target.set(p.x, 2, p.z + 3); camera.position.set(p.x - 6, 12, p.z - 12); K.st = 'aim'; K.aim = 0; K.power = 0; $('#kick').classList.remove('hidden'); updKickUI(); toast('左右調方向，按住「蓄力」放開即踢！'); }
function updKickUI() { $('#kpow').style.width = (K.power * 100) + '%'; $('#kang').textContent = `${Math.round(K.aim)}°`; }
$('#kL').onclick = () => { K.aim = Math.max(-30, K.aim - 3); updKickUI(); }; $('#kR').onclick = () => { K.aim = Math.min(30, K.aim + 3); updKickUI(); };
$('#kX').onclick = () => { $('#kick').classList.add('hidden'); K.st = 'idle'; };
const kb = $('#kCharge'); kb.addEventListener('pointerdown', e => { e.preventDefault(); if (K.st !== 'aim') return; K.charging = true; K.power = 0; K.dir = 1; });
addEventListener('pointerup', () => { if (!K.charging) return; K.charging = false; kickBall(); });
function kickBall() { const a = THREE.MathUtils.degToRad(K.aim); const v = 6 + K.power * 12; // 45°仰角
  K.vel.set(-Math.sin(a) * v * .72, v * .72, Math.cos(a) * v * .72); K.st = 'fly'; K.t = 0; player.setState('attack'); }
function updKick(dt) { const b = TP.ball; b.userData.tag.visible = K.st !== 'fly';
  if (K.charging) { K.power += K.dir * dt * .9; if (K.power > 1) { K.power = 1; K.dir = -1; } if (K.power < 0) { K.power = 0; K.dir = 1; } updKickUI(); }
  if (K.st === 'aim') { const a = THREE.MathUtils.degToRad(K.aim); aimLine.visible = true; aimLine.position.copy(b.position); aimLine.rotation.y = -a; } else aimLine.visible = false;
  if (K.st === 'fly') { K.t += dt; const prevY = b.position.y; K.vel.y -= 20 * dt; b.position.addScaledVector(K.vel, dt); b.rotation.x += dt * 10;
    const bp = TP.burnerPos, dh = Math.hypot(b.position.x - bp.x, b.position.z - bp.z);
    if (prevY >= TP.rimY && b.position.y < TP.rimY && K.vel.y < 0 && dh < TP.rimR) { K.st = 'done'; b.visible = false; offering(); return; }
    if (dh < 1.5 && b.position.y < TP.rimY && b.position.y > .4) { K.vel.x *= -.5; K.vel.z *= -.5; } // 撞到爐身彈開
    if (b.position.y < .55) { b.position.y = .55; K.vel.y = 0; K.vel.multiplyScalar(.9); }
    if (K.t > 2.2) { K.st = 'return'; toast(K.power < .6 ? '力道太小了…再試一次！' : K.power > .76 ? '踢太大力，飛過頭啦！' : '差一點點！調整方向再來～'); } }
  if (K.st === 'return') { b.position.lerp(TP.kickSpot, Math.min(1, dt * 3)); b.rotation.x -= dt * 6; if (b.position.distanceTo(TP.kickSpot) < .05) { b.position.copy(TP.kickSpot); K.st = 'aim'; K.power = 0; updKickUI(); } }
  for (let i = smoke.length - 1; i >= 0; i--) { const s = smoke[i]; s.userData.life += dt; s.position.y += dt * (3 + s.userData.life); s.position.x += Math.sin(s.userData.life * 2 + i) * dt * .8; s.scale.setScalar(.5 + s.userData.life * .6); s.material.opacity = Math.max(0, .85 - s.userData.life / 7); if (s.userData.life > 7) { scene.remove(s); smoke.splice(i, 1); } } }
const aimLine = (() => { const g = new THREE.Group(); for (let i = 1; i < 8; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.12), new THREE.MeshBasicMaterial({ color: '#ffd84a' })); d.position.z = i * .9; g.add(d); } g.visible = false; scene.add(g); return g; })();
function offering() { const bp = TP.burnerPos; let n = 0; const iv = setInterval(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(.9, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9, depthWrite: false }));
    s.position.set(bp.x + (Math.random() - .5) * .4, 2.8, bp.z + (Math.random() - .5) * .4); s.userData.life = 0; scene.add(s); smoke.push(s); if (++n > 70) clearInterval(iv); }, 80);
  controls.target.set(bp.x, 6, bp.z); camera.position.set(bp.x - 8, 8, bp.z - 18);
  setTimeout(() => { $('#modal').classList.add('low'); modal(`<h2 style="text-align:center">🙏 獻祭成功</h2><p style="text-align:center">醉落嫣紅化作一縷白煙，裊裊升天…<br>（放心，她等等就會回來）</p><p style="text-align:center"><button id="again">再踢一次</button></p>`); $('#again').onclick = () => { closeModal(); resetBall(); }; }, 1600);
  setTimeout(resetBall, 6000); }
function resetBall() { if (K.st !== 'done') return; const b = TP.ball; b.visible = true; b.position.copy(TP.kickSpot); b.rotation.set(0, 0, 0); K.st = 'aim'; K.power = 0; updKickUI(); }

// ===== 照片牆 =====
function compress(file) { return new Promise((res, rej) => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height, max = 1600; const c = document.createElement('canvas'); let q = .85, url;
  for (let tries = 0; tries < 12; tries++) { const k = Math.min(1, max / Math.max(w, h)); c.width = Math.round(w * k); c.height = Math.round(h * k); const g2 = c.getContext('2d'); g2.fillStyle = '#fff'; g2.fillRect(0, 0, c.width, c.height); g2.drawImage(img, 0, 0, c.width, c.height);
    url = c.toDataURL('image/jpeg', q); if (url.length * .75 <= 500 * 1024) break; if (q > .55) q -= .1; else max *= .8; }
  URL.revokeObjectURL(img.src); res(url); }; img.onerror = rej; img.src = URL.createObjectURL(file); }); }
async function openPhotoWall() { const ps = await db.listPhotos();
  modal(`<h2>🍁 楓林小駐・照片牆</h2><div class="form"><b>上傳回憶</b><input type="file" id="pf" accept="image/*"><input id="pt" maxlength="20" placeholder="標題（最多20字）"><textarea id="pc" maxlength="50" rows="2" placeholder="說明（最多50字，上傳後不可修改）"></textarea><small id="pcc" class="count">0/50</small><button id="pu">貼上照片牆 📌</button><small id="pst"></small></div>
  <p>共 ${ps.length} 張</p><div class="photos">${ps.map(p => `<div class="photo"><img src="${p.img}" data-id="${p.id}" loading="lazy"><b>${esc(p.title)}</b><p>${esc(p.caption)}</p><small>📷 ${esc(p.name)} ・ ${fmtDate(p.created)}</small></div>`).join('')}</div>`, true);
  $('#pc').oninput = e => $('#pcc').textContent = `${e.target.value.length}/50`;
  document.querySelectorAll('.photo img').forEach(im => im.onclick = () => window.open('').document.write(`<img src="${im.src}" style="max-width:100%">`));
  $('#pu').onclick = async () => { const f = $('#pf').files[0], title = $('#pt').value.trim(), caption = $('#pc').value.trim(); if (!f) return toast('請先選擇照片'); if (!title) return toast('請輸入標題');
    $('#pst').textContent = '壓縮中…'; try { const img = await compress(f); await db.addPhoto({ img, title, caption, name: me.name, avatarId: me.id }); toast(`已上傳（${Math.round(img.length * .75 / 1024)}KB）`); openPhotoWall(); } catch (e) { console.error(e); $('#pst').textContent = '上傳失敗：' + e.message; } }; }

// ===== 互動：點擊 / 移動 =====
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let down = null; let marker;
canvas.addEventListener('pointerdown', e => down = { x: e.clientX, y: e.clientY, t: performance.now() });
canvas.addEventListener('pointerup', e => { if (!down || !player) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (d > 8) return; click(e.clientX, e.clientY); });
function click(cx, cy) { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const objs = [...avatars.filter(a => !a.isMe).map(a => a.hit), ...world.boatGroup.children, ...world.clickables.map(c => c.obj)];
  const hit = ray.intersectObjects(objs, true)[0];
  if (hit) { let o = hit.object; if (o.userData.avatar) return showAvatar(o.userData.avatar); if (o.userData.wish) return showWish(o.userData.wish);
    while (o) { const c = world.clickables.find(c => c.obj === o); if (c) return c.fn(); o = o.parent; } }
  const p = new THREE.Vector3(); if (ray.ray.intersectPlane(ground, p) && walkable(p.x, p.z)) { setTarget(p); pendingAttack = false; } }
function setTarget(p) { player.target = p.clone(); player.setState('idle'); marker.position.set(p.x, heightAt(p.x, p.z) + .05, p.z); marker.visible = true; }
function showAvatar(a) { const c = a.cls, d = a.data; modal(`<h2><span class="tag" style="background:${c.color};color:${c.text || '#fff'}">${esc(d.name)}</span></h2><p>門派：${c.name} ・ 武器：${c.weapon}${d.sample ? ' ・ <small>範例角色</small>' : ''}</p><div class="msgbubble">💬 ${esc(d.message || '（這位俠客沒有留言）')}</div><small>留言於 ${fmtDate(d.created)}</small>`);
  a.root.lookAt(player.root.position.x, a.root.position.y, player.root.position.z); a.setState('wave'); }
const keys = {}; addEventListener('keydown', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
document.querySelectorAll('[data-emote]').forEach(b => b.onclick = () => { if (!player) return; const s = b.dataset.emote; player.target = null; if (s === 'attack') return hitDummy(); player.setState(player.state === s && (s === 'sit' || s === 'meditate') ? 'idle' : s); });
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const I = ISLANDS[b.dataset.go]; const off = b.dataset.go === 'main' ? 9 : b.dataset.go === 'temple' ? -11 : 7; const p = new THREE.Vector3(I.x + (b.dataset.go === 'mount' ? -off : 0), 0, I.z + (b.dataset.go === 'mount' ? 0 : off));
  const delta = p.clone().sub(player.root.position); player.root.position.copy(p); player.target = null; camera.position.add(delta); controls.target.add(delta); marker.visible = false; toast(`抵達 ${I.name}`); });
$('#helpBtn').onclick = () => modal(`<h2>❔ 玩法</h2><ul><li>點地面移動，或用 WASD／方向鍵</li><li>拖曳旋轉視角，滾輪／雙指縮放</li><li>點其他俠客看留言</li><li>汴京中央 <b>鑑石</b> 可無限抽獎；虹橋上的燈籠記錄相識天數</li><li>桃溪村許願池放紙船、願望榜看所有願望</li><li>三清山點仙鶴聽江湖小語，走到木樁旁按「攻擊」</li><li>楓林小駐點宅邸開照片牆</li><li>磁州孔廟點香爐，把醉落嫣紅踢進爐裡獻祭</li><li>右上切換晝夜與季節，右側做表情</li></ul><p><button class="ghost" id="rst">清除本機所有資料（測試用）</button></p>`) || ($('#rst').onclick = async () => { if (confirm('確定清除？')) { await db.resetAll(); location.reload(); } });

function moveAvatar(a, dt) { let dir = null;
  if (a.isMe) { const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0), r = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    if (f || r) { const fw = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize(), rt = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)); dir = fw.multiplyScalar(f).add(rt.multiplyScalar(r)).normalize(); a.target = null; marker.visible = false; pendingAttack = false; } }
  if (!dir && a.target) { const d = a.target.clone().sub(a.root.position).setY(0); if (d.length() < .25) { a.target = null; if (a.isMe) { marker.visible = false; if (pendingAttack) { pendingAttack = false; hitDummy(); } } } else dir = d.normalize(); }
  a.moving = !!dir; if (!dir) return;
  if (a.state !== 'idle' && a.state !== 'attack') a.setState('idle');
  const p = a.root.position, nx = p.x + dir.x * a.speed * dt, nz = p.z + dir.z * a.speed * dt;
  if (walkable(nx, nz)) { p.x = nx; p.z = nz; } else if (walkable(nx, p.z)) p.x = nx; else if (walkable(p.x, nz)) p.z = nz; else { a.target = null; a.moving = false; }
  p.y = heightAt(p.x, p.z); const ang = Math.atan2(dir.x, dir.z); let dA = ang - a.root.rotation.y; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); a.root.rotation.y += dA * Math.min(1, dt * 12); }
function npc(a, dt) { a.nextAct -= dt; if (a.nextAct > 0) return; a.nextAct = 3 + Math.random() * 6; const r = Math.random();
  if (r < .5) { const t = a.home.clone().add(new THREE.Vector3((Math.random() - .5) * 8, 0, (Math.random() - .5) * 8)); if (walkable(t.x, t.z)) a.target = t; }
  else a.setState(['wave', 'bow', 'sit', 'meditate', 'idle'][Math.floor(Math.random() * 5)]); }

// ===== Loop =====
const clock = new THREE.Clock(); let lastSave = 0, lastPlace = '';
function loop() { requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  updateEnv(dt, t); updFireworks(dt); updKick(dt); world.decor.update(dt, t);
  world.gem.rotation.y += dt * (1 + gemSpin * 8); gemSpin = Math.max(0, gemSpin - dt); world.gem.position.y = 5.6 + Math.sin(t * 2) * .2;
  world.memo.userData.tag.visible = true;
  world.boatGroup.children.forEach((b, i) => { const a = b.userData.a + t * .08; b.position.set(Math.cos(a) * b.userData.r, .12 + Math.sin(t * 2 + i) * .05, Math.sin(a) * b.userData.r); b.rotation.y = -a; b.rotation.z = Math.sin(t * 1.5 + i) * .08; });
  for (const c of world.cranes) { if (c.cloud) { c.cloud.position.x += dt * c.cloud.userData.spd; if (c.cloud.position.x > 150) c.cloud.position.x = -150; continue; }
    const g = c.crane, u = g.userData; let a = u.base + t * .3, r = u.r, h = u.h;
    if (u.loop > 0) { u.loop -= dt; const k = 1 - u.loop / 3; h += Math.sin(k * Math.PI * 2) * 4; r += Math.sin(k * Math.PI) * 3; a += k * Math.PI * 2; g.rotation.z = Math.sin(k * Math.PI * 2) * .9; } else g.rotation.z = .25;
    g.position.set(Math.cos(a) * r, h, Math.sin(a) * r); g.rotation.y = -a; u.wings.forEach((w, i) => w.rotation.z = (i ? -1 : 1) * Math.sin(t * (u.loop > 0 ? 14 : 6) + u.base) * .6); }
  if (dummyWobble > 0) { dummyWobble = Math.max(0, dummyWobble - dt * 2.5); world.dummy.post.rotation.x = Math.sin(dummyWobble * 20) * dummyWobble * .25; }
  for (let i = floaters.length - 1; i >= 0; i--) { const s = floaters[i]; s.userData.life += dt; s.position.y += dt * 1.5; s.material.opacity = 1 - s.userData.life; if (s.userData.life > 1) { scene.remove(s); floaters.splice(i, 1); } }
  for (const a of avatars) { if (!a.isMe) npc(a, dt); moveAvatar(a, dt); a.update(dt, t); }
  if (player && K.st === 'idle') { const before = controls.target.clone(); const goal = player.root.position.clone().add(new THREE.Vector3(0, 1.5, 0)); controls.target.lerp(goal, Math.min(1, dt * 5)); camera.position.add(controls.target.clone().sub(before));
  }
  if (player) {
    $('#attackBtn').classList.toggle('hidden', !nearDummy()); const pl = ISLANDS[islandAt(player.root.position.x, player.root.position.z)].name; if (pl !== lastPlace) { lastPlace = pl; $('#place').textContent = '📍 ' + pl; }
    if (t - lastSave > 5) { lastSave = t; const p = player.root.position; db.updateAppearance(me.id, { pos: [+p.x.toFixed(1), 0, +p.z.toFixed(1)] }); }
    marker.rotation.z += dt * 2; }
  controls.update(); renderer.render(scene, camera); }

// ===== 入口 / 捏臉 =====
const draft = { cls: null, hair: 'bun', outfit: 'robe', hairColor: HAIR_COLORS[0], outfitColor: OUTFIT_COLORS[0], skin: SKIN_COLORS[0] };
function buildEntry() { $('#classGrid').innerHTML = CLASSES.map(c => `<div class="cls" data-id="${c.id}"><svg viewBox="0 0 120 120" width="90" height="80">${ICONS[c.name].replaceAll('"C"', `"${c.color}"`)}</svg><span class="tagc" style="background:${c.color};color:${c.text || '#fff'}">${c.name}</span><span class="wp">${c.weapon}</span></div>`).join('');
  document.querySelectorAll('.cls').forEach(el => el.onclick = () => { draft.cls = el.dataset.id; $('#entry').classList.add('hidden'); $('#creator').classList.remove('hidden'); buildCreator(); }); }
let prev; function buildCreator() {
  const chips = (sel, arr, key) => { $(sel).innerHTML = arr.map(o => `<button data-v="${o.id}" class="${draft[key] === o.id ? 'on' : ''}">${o.n}</button>`).join(''); $(sel).querySelectorAll('button').forEach(b => b.onclick = () => { draft[key] = b.dataset.v; buildCreator(); }); };
  const sw = (sel, arr, key) => { $(sel).innerHTML = arr.map(c => `<i style="background:${c}" data-v="${c}" class="${draft[key] === c ? 'on' : ''}"></i>`).join(''); $(sel).querySelectorAll('i').forEach(b => b.onclick = () => { draft[key] = b.dataset.v; buildCreator(); }); };
  chips('#hairOpts', HAIRS, 'hair'); chips('#outfitOpts', OUTFITS, 'outfit'); sw('#hairColOpts', HAIR_COLORS, 'hairColor'); sw('#outfitColOpts', OUTFIT_COLORS, 'outfitColor'); sw('#skinOpts', SKIN_COLORS, 'skin');
  const c = classById(draft.cls), tag = $('#prevTag'); tag.textContent = ($('#nameIn').value || '你的名字') + ` ・ ${c.name}`; tag.style.background = c.color; tag.style.color = c.text || '#fff';
  if (!prev) { const r = new THREE.WebGLRenderer({ canvas: $('#previewCanvas'), antialias: true, alpha: true }); r.setPixelRatio(2); r.outputColorSpace = THREE.SRGBColorSpace; const s = new THREE.Scene(); s.add(new THREE.HemisphereLight('#fff', '#ccc', 1.4)); const dl = new THREE.DirectionalLight('#fff', 1.6); dl.position.set(3, 5, 6); s.add(dl);
    const cam = new THREE.PerspectiveCamera(32, 360 / 420, .1, 50); cam.position.set(0, 2.2, 8); cam.lookAt(0, 1.55, 0); prev = { r, s, cam, av: null };
    (function pl() { if ($('#creator').classList.contains('hidden')) return; requestAnimationFrame(pl); const t = performance.now() / 1000; if (prev.av) { prev.av.root.rotation.y = Math.sin(t * .7) * .8; prev.av.update(.016, t); } r.render(s, cam); })(); }
  if (prev.av) prev.s.remove(prev.av.root); prev.av = new Avatar({ ...draft, name: '' }); prev.av.tag.visible = false; prev.s.add(prev.av.root); }
$('#nameIn').oninput = () => buildCreator();
$('#msgIn').oninput = e => $('#msgCount').textContent = `${e.target.value.length}/50`;
$('#backBtn').onclick = () => { $('#creator').classList.add('hidden'); $('#entry').classList.remove('hidden'); };
$('#enterBtn').onclick = async () => { const name = $('#nameIn').value.trim(), message = $('#msgIn').value.trim(); if (!name) return toast('請輸入遊戲暱稱'); if (!message) return toast('寫一句話給大家吧～');
  const pin = $('#pinIn').value.trim(); if (!/^\d{4}$/.test(pin)) return toast('密語請輸入 4 位數字'); if (await db.nameTaken(name)) return toast('這個暱稱已經有人使用了，換一個吧');
  if (!confirm(`留言送出後無法修改喔！\n\n「${message}」\n\n確定踏入江湖？`)) return;
  try { me = await db.createAvatar({ ...draft, name, message, pin, pos: [0, 0, 10] }); } catch (e) { return toast('這個暱稱已經有人使用了'); } $('#creator').classList.add('hidden'); startWorld(); };

async function startWorld() { for (const a of await db.listAvatars()) { if (a.id === me.id) continue; spawn(a); }
  player = spawn(me, true); player.speed = 8;
  marker = new THREE.Mesh(new THREE.RingGeometry(.5, .75, 24), new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: .8, side: THREE.DoubleSide })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
  const p = player.root.position; controls.target.set(p.x, 1.5, p.z); camera.position.set(p.x + 10, 16, p.z + 24);
  $('#hud').classList.remove('hidden'); await refreshBoats(); toast(`歡迎 ${esc(me.name)} 踏入江湖！點地面移動 ✦`); }

$('#recoverBtn').onclick = () => { modal(`<h2>🔑 找回角色</h2><div class="form"><input id="rName" placeholder="遊戲暱稱"><input id="rPin" inputmode="numeric" maxlength="4" placeholder="4 位數密語"><button id="rGo">找回</button></div>`);
  $('#rGo').onclick = async () => { const a = await db.recover($('#rName').value.trim(), $('#rPin').value.trim()); if (!a) return toast('暱稱或密語不正確');
    me = a; closeModal(); $('#entry').classList.add('hidden'); startWorld(); }; };
applySeason(); updDayBtn(); buildEntry(); loop();
// 開場：慢慢環繞全景
controls.autoRotate = false;
me = await db.getMe(); if (me) { $('#entry').classList.add('hidden'); startWorld(); }
window.__nsh = { K, openKick, kickWith: (aim, p) => { K.aim = aim; K.power = p; kickBall(); }, db, scene, camera, controls, openGacha, openWishForm, openWishBoard, openPhotoWall, get player() { return player; }, setNight: v => { night = v; updDayBtn(); }, celebrate };
