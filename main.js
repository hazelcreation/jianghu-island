import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { CLASSES, classById, GACHA, HAIRS, OUTFITS, HAIR_COLORS, OUTFIT_COLORS, SKIN_COLORS, MET_DATE, JIANGHU_QUOTES } from './config.js';
import { db } from './data.js';
import { Avatar, makeTag } from './avatar.js';
import { buildWorld, ISLANDS, walkable, heightAt, islandAt, mats, paperBoat } from './world.js';
import { ICONS } from './icons.js';
import { connectRealtime } from './rt.js';

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
    const anon = $('#anon').checked; try { await db.addWish({ text, anon, name: anon ? '' : me.name, avatarId: me.id }); } catch (e) { return toast(e.message === 'RATE_LIMIT' ? '許願太快了，稍等一下' : e.message === 'NEED_LOGIN' || e.message === 'NOT_ALLOWED' ? '無法許願，請重新登島' : '連線失敗，請稍後再試'); } await refreshBoats(); closeModal(); toast('紙船已放入池中 ⛵'); }; }
async function openWishBoard() { const ws = await db.listWishes();
  modal(`<h2>📜 願望榜</h2><p>共 ${ws.length} 個願望（池中顯示最新 20 艘紙船）</p><div class="wishlist">${ws.map(w => `<div>${isAdmin ? `<button class="adel" data-wid="${w.id}" title="刪除">🗑</button>` : ''}${esc(w.text)}<br><small>— ${w.anon ? '匿名俠客' : esc(w.name)} ・ ${fmtDate(w.created)}</small></div>`).join('')}</div><p><button id="mk">我也要許願</button></p>`); $('#mk').onclick = openWishForm;
  bindAdminDel(openWishBoard); }
function showWish(w) { modal(`<h2>⛵ 紙船上的願望</h2><div class="msgbubble">${esc(w.text)}</div><p style="text-align:right">— ${w.anon ? '匿名俠客' : esc(w.name)}</p>${isAdmin ? `<p><button class="danger adel" data-wid="${w.id}">🗑 刪除此願望</button></p>` : ''}`); bindAdminDel(() => closeModal()); }

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
  setTimeout(() => { $('#modal').classList.add('low'); modal(`<h2 style="text-align:center">🙏 獻祭成功</h2><p style="text-align:center">醉落嫣紅化作一縷白煙，裊裊升天…<br>（放心，他等等就會回來）</p><p style="text-align:center"><button id="again">再踢一次</button></p>`); $('#again').onclick = () => { closeModal(); resetBall(); }; }, 1600);
  setTimeout(resetBall, 6000); }
function resetBall() { if (K.st !== 'done') return; const b = TP.ball; b.visible = true; b.position.copy(TP.kickSpot); b.rotation.set(0, 0, 0); K.st = 'aim'; K.power = 0; updKickUI(); }

// ===== 照片牆 =====
function compress(file) { return new Promise((res, rej) => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height, max = 1600; const c = document.createElement('canvas'); let q = .85, url;
  for (let tries = 0; tries < 12; tries++) { const k = Math.min(1, max / Math.max(w, h)); c.width = Math.round(w * k); c.height = Math.round(h * k); const g2 = c.getContext('2d'); g2.fillStyle = '#fff'; g2.fillRect(0, 0, c.width, c.height); g2.drawImage(img, 0, 0, c.width, c.height);
    url = c.toDataURL('image/jpeg', q); if (url.length * .75 <= 500 * 1024) break; if (q > .55) q -= .1; else max *= .8; }
  URL.revokeObjectURL(img.src); res(url); }; img.onerror = rej; img.src = URL.createObjectURL(file); }); }
let photoTab = 'all';
async function openPhotoWall() { const all = await db.listPhotos(); const ps = photoTab === 'hmx' ? all.filter(p => p.hmx) : all;
  modal(`<h2>🍁 楓林小駐・照片牆</h2><div class="form"><b>上傳回憶</b><input type="file" id="pf" accept="image/*"><input id="pt" maxlength="20" placeholder="標題（最多20字）"><textarea id="pc" maxlength="50" rows="2" placeholder="說明（最多50字，上傳後不可修改）"></textarea><small id="pcc" class="count">0/50</small><label class="chk"><input type="checkbox" id="phmx"> 花沐雪結義</label><button id="pu">貼上照片牆 📌</button><small id="pst"></small></div>
  <div class="ltabs ptabs"><button class="pill${photoTab === 'all' ? ' on' : ''}" data-pt="all">全部（${all.length}）</button><button class="pill${photoTab === 'hmx' ? ' on' : ''}" data-pt="hmx">花沐雪（${all.filter(p => p.hmx).length}）</button></div>
  ${ps.length ? '' : '<p class="lempty">還沒有照片</p>'}<div class="photos">${ps.map(p => `<div class="photo">${p.hmx ? '<span class="hmx">花沐雪</span>' : ''}${isAdmin ? `<button class="adel" data-pid="${p.id}" title="刪除">🗑</button>` : ''}<img src="${p.img}" data-id="${p.id}" loading="lazy"><b>${esc(p.title)}</b><p>${esc(p.caption)}</p><small>📷 ${esc(p.name)} ・ ${fmtDate(p.created)}</small></div>`).join('')}</div>`, true);
  $('#pc').oninput = e => $('#pcc').textContent = `${e.target.value.length}/50`;
  document.querySelectorAll('.ptabs button').forEach(b => b.onclick = () => { photoTab = b.dataset.pt; openPhotoWall(); });
  document.querySelectorAll('.photo img').forEach((im, i) => im.onclick = () => openLightbox(ps, i));
  bindAdminDel(openPhotoWall);
  $('#pu').onclick = async () => { const f = $('#pf').files[0], title = $('#pt').value.trim(), caption = $('#pc').value.trim(), huamuxue = $('#phmx').checked; if (!f) return toast('請先選擇照片'); if (!title) return toast('請輸入標題');
    $('#pst').textContent = '壓縮中…'; try { const img = await compress(f); await db.addPhoto({ img, title, caption, huamuxue, name: me.name, avatarId: me.id }); toast(`已上傳（${Math.round(img.length * .75 / 1024)}KB）`); openPhotoWall(); } catch (e) { console.error(e); $('#pst').textContent = '上傳失敗：' + (e.message === 'NOT_ALLOWED' || e.message === 'NEED_LOGIN' ? '請重新登島' : e.message); } }; }

// 島上俠客
const twTime = t => { if (!t) return ''; const d = new Date(t + 8 * 3600e3); const p = n => String(n).padStart(2, '0'); return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; };
function peopleList() { return avatars.filter(a => a.data?.id).map(a => ({ a, on: a.isMe || !!a.online })).sort((x, y) => (y.on - x.on) || ((x.a.data.created || 0) - (y.a.data.created || 0))); }
function updPeople() { const b = $('#peopleBtn'); if (b) b.innerHTML = `👥 島上俠客（${avatars.filter(a => a.data?.id).length}）`; }
function openPeople() { const L = peopleList(); const n = L.filter(x => x.on).length;
  modal(`<h2>👥 島上俠客</h2><p>共 ${L.length} 位・🟢 在線 ${n} 位</p><div class="llist plist">${L.map((x, i) => { const c = x.a.cls, d = x.a.data; return `<div class="litem prow" data-i="${i}"><span class="tag" style="background:${c.color};color:${c.text || '#fff'}">${esc(c.name)}</span><div class="pmain"><b>${esc(d.name)}</b>${x.a.isMe ? ' <small>（我）</small>' : ''}<br><small>🏝️ ${twTime(d.created)} 登島</small></div><span class="pon">${x.on ? '🟢 在線' : '<span style="opacity:.5">⚪ 離線</span>'}</span></div>`; }).join('')}</div>`);
  document.querySelectorAll('.prow').forEach(r => r.onclick = () => { const a = L[+r.dataset.i].a; if (!a.isMe) showAvatar(a); }); }
$('#peopleBtn').onclick = openPeople;
setInterval(updPeople, 3000);

// 燈箱
function openLightbox(list, idx) { document.querySelector('.lbx')?.remove(); const d = document.createElement('div'); d.className = 'lbx'; document.body.appendChild(d);
  const show = () => { const p = list[idx]; d.innerHTML = `<button class="lbx-x" aria-label="關閉">×</button>${list.length > 1 ? '<button class="lbx-nav lbx-p" aria-label="上一張">‹</button><button class="lbx-nav lbx-n" aria-label="下一張">›</button>' : ''}<figure><img src="${p.img}" alt=""><figcaption>${p.hmx ? '<span class="hmx">花沐雪</span> ' : ''}<b>${esc(p.title)}</b>${p.caption ? `<p>${esc(p.caption)}</p>` : ''}<small>📷 ${esc(p.name)} ・ ${fmtDate(p.created)}　${idx + 1}/${list.length}</small></figcaption></figure>`;
    d.querySelector('.lbx-x').onclick = close; d.querySelector('.lbx-p')?.addEventListener('click', e => { e.stopPropagation(); go(-1); }); d.querySelector('.lbx-n')?.addEventListener('click', e => { e.stopPropagation(); go(1); }); };
  const go = k => { idx = (idx + k + list.length) % list.length; show(); };
  const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
  function close() { d.remove(); removeEventListener('keydown', key, true); }
  d.onclick = e => { if (e.target === d || e.target.tagName === 'FIGURE') close(); };
  let sx = null; d.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true }); d.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40 && list.length > 1) go(dx < 0 ? 1 : -1); });
  addEventListener('keydown', key, true); show(); }

// ===== 管理員 =====
let isAdmin = false;
function confirmBox(text) { return new Promise(res => { const d = document.createElement('div'); d.className = 'cfm'; d.innerHTML = `<div class="mcard"><p>${text}</p><div class="row"><button class="ghost" data-v="0">取消</button><button class="danger" data-v="1">確定</button></div></div>`; document.body.appendChild(d);
  d.querySelectorAll('button').forEach(b => b.onclick = () => { d.remove(); res(b.dataset.v === '1'); }); }); }
function bindAdminDel(after) { if (!isAdmin) return;
  document.querySelectorAll('.adel[data-wid]').forEach(b => b.onclick = async e => { e.stopPropagation(); if (!await confirmBox('確定刪除這個願望？此動作無法復原。')) return;
    try { await db.adminCall('admin_delete_wish', me.name, { p_wish: b.dataset.wid }); toast('已刪除願望'); await refreshBoats(); after(); } catch (er) { toast('刪除失敗：' + er.message); } });
  document.querySelectorAll('.adel[data-pid]').forEach(b => b.onclick = async e => { e.stopPropagation(); if (!await confirmBox('確定刪除這張照片（含檔案）？此動作無法復原。')) return;
    try { await db.adminDeletePhoto(me.name, b.dataset.pid); toast('已刪除照片'); after(); } catch (er) { toast('刪除失敗：' + er.message); } }); }
let adminTab = 'players';
async function openAdmin(tab) { if (!isAdmin) return; if (typeof tab === 'string') adminTab = tab;
  modal(`<h2>🛡️ 管理</h2><div class="ltabs"><button class="pill${adminTab === 'players' ? ' on' : ''}" data-at="players">俠客</button><button class="pill${adminTab === 'wishes' ? ' on' : ''}" data-at="wishes">願望</button><button class="pill${adminTab === 'photos' ? ' on' : ''}" data-at="photos">照片</button></div><div class="llist" id="alist"><div class="lempty">載入中…</div></div>`, true);
  document.querySelectorAll('[data-at]').forEach(b => b.onclick = () => { adminTab = b.dataset.at; openAdmin(); });
  const L = $('#alist');
  try {
    if (adminTab === 'players') { const ps = await db.adminCall('admin_list_players', me.name);
      L.innerHTML = ps.map(p => `<div class="litem arow"><div><b>${esc(p.name)}</b>${p.is_admin ? ' 🛡️' : ''}${p.banned ? ' <span class="hmx ban">已封禁</span>' : ''}<br><small>${esc(p.message || '（無留言）')}</small></div><div class="abtns">${p.is_admin ? '' : `<button class="${p.banned ? 'ghost' : 'danger'}" data-ban="${p.id}" data-b="${p.banned ? 0 : 1}" data-n="${esc(p.name)}">${p.banned ? '解封' : '封禁'}</button>`}${p.message ? `<button class="ghost" data-clr="${p.id}" data-n="${esc(p.name)}">清除留言</button>` : ''}</div></div>`).join('') || '<div class="lempty">沒有俠客</div>';
      L.querySelectorAll('[data-ban]').forEach(b => b.onclick = async () => { const ban = b.dataset.b === '1'; if (!await confirmBox(`確定${ban ? '封禁' : '解封'}「${b.dataset.n}」？`)) return;
        try { await db.adminCall('admin_set_banned', me.name, { p_target: b.dataset.ban, p_banned: ban }); toast(ban ? '已封禁' : '已解封'); if (ban) removeAvatar(b.dataset.ban); else syncOthers(); openAdmin(); } catch (er) { toast('失敗：' + er.message); } });
      L.querySelectorAll('[data-clr]').forEach(b => b.onclick = async () => { if (!await confirmBox(`確定清除「${b.dataset.n}」的留言？`)) return;
        try { await db.adminCall('admin_clear_message', me.name, { p_target: b.dataset.clr }); const a = byId(b.dataset.clr); if (a) a.data.message = '（留言已被管理員清除）'; toast('已清除留言'); openAdmin(); } catch (er) { toast('失敗：' + er.message); } });
    } else if (adminTab === 'wishes') { const ws = await db.listWishes();
      L.innerHTML = ws.map(w => `<div class="litem arow"><div>${esc(w.text)}<br><small>— ${w.anon ? '匿名' : esc(w.name)} ・ ${fmtDate(w.created)}</small></div><div class="abtns"><button class="danger adel" data-wid="${w.id}">刪除</button></div></div>`).join('') || '<div class="lempty">沒有願望</div>'; bindAdminDel(openAdmin);
    } else { const ps = await db.listPhotos();
      L.innerHTML = ps.map(p => `<div class="litem arow"><img class="athumb" src="${p.img}" loading="lazy"><div style="flex:1">${p.hmx ? '<span class="hmx">花沐雪</span> ' : ''}<b>${esc(p.title)}</b><br><small>📷 ${esc(p.name)} ・ ${fmtDate(p.created)}</small></div><div class="abtns"><button class="danger adel" data-pid="${p.id}">刪除</button></div></div>`).join('') || '<div class="lempty">沒有照片</div>'; bindAdminDel(openAdmin); }
  } catch (er) { L.innerHTML = `<div class="lempty">載入失敗：${esc(er.message)}</div>`; } }
function removeAvatar(id) { const i = avatars.findIndex(a => a.data?.id === id && !a.isMe); if (i < 0) return; scene.remove(avatars[i].root); avatars.splice(i, 1); }
async function checkAdmin() { isAdmin = await db.isAdmin(me.name); $('#adminBtn').classList.toggle('hidden', !isAdmin); }
$('#adminBtn').onclick = () => openAdmin('players');
function kickBanned() { localStorage.removeItem('nsh_island_v2_me'); localStorage.removeItem('nsh_island_v2_ph'); alert('此角色已被管理員封禁，無法進入小島。'); location.reload(); }

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
  const p = new THREE.Vector3(); if (ray.ray.intersectPlane(ground, p) && walkable(p.x, p.z)) { setTarget(p); pendingAttack = false; pendingAct = null; } }
function setTarget(p) { player.target = p.clone(); player.setState('idle'); marker.position.set(p.x, heightAt(p.x, p.z) + .05, p.z); marker.visible = true; }
const ACTS = [['bow', '🙏 抱拳'], ['flower', '🌸 送花'], ['pat', '✋ 拍拍頭'], ['punch', '👊 打一拳'], ['meditate', '🧘 一起打坐'], ['spar', '⚔️ 比武']];
const ACT_MSG = { bow: '向你抱拳', flower: '送你一朵花 🌸', pat: '拍拍你的頭', punch: '打了你一拳 👊', meditate: '陪你一起打坐', spar: '找你比武 ⚔️' };
function showAvatar(a) { const c = a.cls, d = a.data; modal(`<h2><span class="tag" style="background:${c.color};color:${c.text || '#fff'}">${esc(d.name)}</span> ${a.online ? '<small style="color:#2fae55">● 在線</small>' : '<small style="color:#999">○ 離線</small>'}</h2><p>門派：${c.name} ・ 武器：${c.weapon}${a.flowers ? ` ・ 🌸 ${a.flowers}` : ''}</p><div class="msgbubble">💬 ${esc(d.message || '（這位俠客沒有留言）')}</div><small>留言於 ${fmtDate(d.created)}</small>
  <div class="actmenu" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">${ACTS.map(([k, n]) => `<button data-act="${k}">${n}</button>`).join('')}</div>`);
  document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { closeModal(); interact(a, b.dataset.act); });
  if (!a.online) { a.root.lookAt(player.root.position.x, a.root.position.y, player.root.position.z); a.setState('wave'); } }
let pendingAct = null;
function interact(a, type) { const tp = a.root.position; let dir = player.root.position.clone().sub(tp).setY(0); if (dir.length() < .1) dir.set(0, 0, 1);
  if (type === 'meditate') dir = new THREE.Vector3(dir.z, 0, -dir.x); dir.setLength(type === 'meditate' ? 1.7 : 1.5); let spot = tp.clone().add(dir);
  if (!walkable(spot.x, spot.z)) spot = tp.clone().add(dir.negate()); setTarget(spot); pendingAttack = false; pendingAct = { a, type }; }
async function doAct({ a, type }) { const p = player.root.position; playAct(player, a, type); rt?.bcast('act', { from: me.id, to: a.data.id, type, x: p.x, z: p.z });
  try { const ok = await db.sendInteraction(me.id, a.data.id, type); if (ok !== false) logAdd('out', a.data.name, type); } catch (e) { toast(e.message === 'RATE_LIMIT' ? '動作太頻繁了，休息一下吧～' : '連線失敗，互動未記錄'); } }
function floatText(target, txt, color, n = 1) { for (let i = 0; i < n; i++) setTimeout(() => { const s = makeTag(txt, color); s.scale.multiplyScalar(.7); s.position.copy(target.root.position).add(new THREE.Vector3((Math.random() - .5) * 1.4, 3.1 + Math.random() * .5, (Math.random() - .5) * 1.4)); s.userData.life = 0; scene.add(s); floaters.push(s); }, i * 220); }
function playAct(src, dst, type) { const face = (x, y) => { x.root.rotation.set(0, Math.atan2(y.root.position.x - x.root.position.x, y.root.position.z - x.root.position.z), 0); }; face(src, dst); src.target = null;
  switch (type) {
    case 'bow': src.setState('bow'); if (dst.state !== 'sit' && dst.state !== 'meditate' && !dst.isMe) { face(dst, src); dst.setState('bow'); } break;
    case 'flower': src.setState('wave'); floatText(dst, '✿', '#ff7fa8', 4); dst.setTag({ flowers: (dst.flowers || 0) + 1 }); break;
    case 'pat': src.setState('pat'); floatText(dst, '♥', '#ff6b8a', 3); break;
    case 'punch': src.setState('attack'); setTimeout(() => { dst.setState('hit'); floatText(dst, '★', '#ffd84a', 5); }, 350); setTimeout(() => src.state === 'attack' && src.setState('idle'), 700); break;
    case 'meditate': face(dst, src); src.setState('meditate'); dst.target = null; dst.setState('meditate'); break;
    case 'spar': face(dst, src); dst.target = null; src.sparOff = 0; dst.sparOff = .5; src.setState('spar'); dst.setState('spar'); floatText(dst, '★', '#ffd84a', 4); floatText(src, '★', '#ffd84a', 4); break;
  }
  if (dst.isMe) { toast(`<b>${esc(src.data.name)}</b> ${ACT_MSG[type]}`, 3500); logAdd('in', src.data.name, type); } }
const keys = {}; addEventListener('keydown', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
document.querySelectorAll('[data-emote]').forEach(b => b.onclick = () => { if (!player) return; const s = b.dataset.emote; player.target = null; if (s === 'attack') return hitDummy(); player.setState(player.state === s && (s === 'sit' || s === 'meditate') ? 'idle' : s); rt?.bcast('emote', { id: me.id, s: player.state, x: player.root.position.x, z: player.root.position.z }); });
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const I = ISLANDS[b.dataset.go]; const off = b.dataset.go === 'main' ? 9 : b.dataset.go === 'temple' ? -11 : 7; const p = new THREE.Vector3(I.x + (b.dataset.go === 'mount' ? -off : 0), 0, I.z + (b.dataset.go === 'mount' ? 0 : off));
  const delta = p.clone().sub(player.root.position); player.root.position.copy(p); player.target = null; camera.position.add(delta); controls.target.add(delta); marker.visible = false; toast(`抵達 ${I.name}`); });
$('#helpBtn').onclick = () => modal(`<h2>❔ 玩法</h2><ul><li>點地面移動，或用 WASD／方向鍵</li><li>拖曳旋轉視角，滾輪／雙指縮放</li><li>點其他俠客看留言</li><li>汴京中央 <b>鑑石</b> 可無限抽獎；虹橋上的燈籠記錄相識天數</li><li>桃溪村許願池放紙船、願望榜看所有願望</li><li>三清山點仙鶴聽江湖小語，走到木樁旁按「攻擊」</li><li>楓林小駐點宅邸開照片牆</li><li>磁州孔廟點香爐，把醉落嫣紅踢進爐裡獻祭</li><li>點「👥 島上俠客」看島上有誰（門派、登島時間、是否在線），點名字可看留言與互動</li><li>右上切換晝夜與季節，右側做表情</li></ul>`);

function moveAvatar(a, dt) { let dir = null;
  if (a.isMe) { const f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0), r = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    if (f || r) { const fw = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize(), rt = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)); dir = fw.multiplyScalar(f).add(rt.multiplyScalar(r)).normalize(); a.target = null; marker.visible = false; pendingAttack = false; pendingAct = null; } }
  let rem = Infinity; if (!dir && a.target) { const d = a.target.clone().sub(a.root.position).setY(0); rem = d.length(); if (rem < .25) { a.target = null; if (a.isMe) { marker.visible = false; if (pendingAttack) { pendingAttack = false; hitDummy(); } if (pendingAct) { const pa = pendingAct; pendingAct = null; doAct(pa); } } } else dir = d.normalize(); }
  a.moving = !!dir; if (!dir) { if (!a.isMe && a.netYaw != null && a.online) { const r = a.root.rotation; let d = a.netYaw - r.y; d = Math.atan2(Math.sin(d), Math.cos(d)); r.set(0, r.y + d * Math.min(1, dt * 8), 0); } return; }
  if (a.state !== 'idle' && a.state !== 'attack') a.setState('idle');
  const p = a.root.position, ox = p.x, oz = p.z, step = Math.min(a.speed * dt, rem), nx = p.x + dir.x * step, nz = p.z + dir.z * step;
  if (walkable(nx, nz)) { p.x = nx; p.z = nz; } else if (walkable(nx, p.z)) p.x = nx; else if (walkable(p.x, nz)) p.z = nz; else { a.target = null; a.moving = false; }
  p.y = heightAt(p.x, p.z); faceMotion(a, p.x - ox, p.z - oz, dt); }
// heading comes only from actual displacement; yaw-only (x/z forced 0) so Euler never flips to (π, π-y, π)
function faceMotion(a, dx, dz, dt) { if (dx * dx + dz * dz < 1e-8) return; const r = a.root.rotation, cur = Math.atan2(Math.sin(r.y), Math.cos(r.y)), ang = Math.atan2(dx, dz); let dA = ang - cur; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); r.set(0, cur + dA * Math.min(1, dt * 12), 0); }
function npc(a, dt) { if (a.online) return; a.nextAct -= dt; if (a.nextAct > 0) return; a.nextAct = 3 + Math.random() * 6; const r = Math.random();
  if (r < .5) { const t = a.home.clone().add(new THREE.Vector3((Math.random() - .5) * 8, 0, (Math.random() - .5) * 8)); if (walkable(t.x, t.z)) a.target = t; }
  else a.setState(['wave', 'bow', 'sit', 'meditate', 'idle'][Math.floor(Math.random() * 5)]); }

// ===== Loop =====
const clock = new THREE.Clock(); let lastBc = 0, lastSave = 0, lastPlace = '';
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
    if (rt && t - lastBc > (player.moving ? .2 : 1.5)) { lastBc = t; const p = player.root.position; rt.bcast('move', { id: me.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), tx: player.target ? +player.target.x.toFixed(2) : null, tz: player.target ? +player.target.z.toFixed(2) : null, r: +Math.atan2(Math.sin(player.root.rotation.y), Math.cos(player.root.rotation.y)).toFixed(3), s: player.state }); }
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
    const cam = new THREE.PerspectiveCamera(32, 360 / 420, .1, 50); cam.position.set(0, 2.2, 8); cam.lookAt(0, 1.55, 0); prev = { r, s, cam, av: null, running: false }; }
  if (!prev.running) { prev.running = true; const { r, s, cam } = prev;
    (function pl() { if ($('#creator').classList.contains('hidden')) { prev.running = false; return; } requestAnimationFrame(pl); const t = performance.now() / 1000; if (prev.av) { prev.av.root.rotation.y = window.__prevRot ?? Math.sin(t * .7) * .8; prev.av.update(.016, t); } r.render(s, cam); })(); }
  if (prev.av) prev.s.remove(prev.av.root); prev.av = new Avatar({ ...draft, name: '' }); prev.av.tag.visible = false; prev.s.add(prev.av.root); }
$('#nameIn').oninput = () => buildCreator();
$('#msgIn').oninput = e => $('#msgCount').textContent = `${e.target.value.length}/50`;
$('#backBtn').onclick = () => { $('#creator').classList.add('hidden'); $('#entry').classList.remove('hidden'); showPanel('pickCls'); };
$('#enterBtn').onclick = async () => { const name = $('#nameIn').value.trim(), message = $('#msgIn').value.trim(); if (!name) return toast('請輸入遊戲暱稱'); if (!message) return toast('寫一句話給大家吧～');
  const pin = $('#pinIn').value.trim(); if (!/^\d{4}$/.test(pin)) return toast('密語請輸入 4 位數字'); if (await db.nameTaken(name)) return toast('這個暱稱已經有人使用了，換一個吧');
  if (!confirm(`「${message}」\n\n（留言之後可隨時修改）確定踏入江湖？`)) return;
  try { me = await db.createAvatar({ ...draft, name, message, pin, pos: [0, 0, 10] }); } catch (e) { return toast(e.message === 'NAME_TAKEN' ? '這個暱稱已經有人使用了' : '連線失敗，請稍後再試'); } $('#creator').classList.add('hidden'); startWorld(); };

async function startWorld() { for (const a of await db.listAvatars()) { if (a.id === me.id || avatars.some(x => x.data?.id === a.id)) continue; spawn(a); }
  player = spawn(me, true); player.speed = 8;
  marker = new THREE.Mesh(new THREE.RingGeometry(.5, .75, 24), new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: .8, side: THREE.DoubleSide })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
  const p = player.root.position; controls.target.set(p.x, 1.5, p.z); camera.position.set(p.x + 10, 16, p.z + 24);
  $('#hud').classList.remove('hidden'); checkAdmin(); await refreshBoats(); toast(`歡迎 ${esc(me.name)} 踏入江湖！點地面移動 ✦`);
  await refreshFlowers(); startRealtime(); showInbox(); }
const byId = id => avatars.find(a => a.data?.id === id);
async function refreshFlowers() { try { const fc = await db.flowerCounts(); for (const a of avatars) { const n = fc[a.data.id] || 0; if (n !== (a.flowers || 0)) a.setTag({ flowers: n }); } } catch (e) { console.warn('flowers', e); } }
const ACT_OUT = { bow: n => `你向 <b>${n}</b> 抱拳`, flower: n => `你送 <b>${n}</b> 一朵花 🌸`, pat: n => `你拍拍 <b>${n}</b> 的頭`, punch: n => `你打了 <b>${n}</b> 一拳 👊`, meditate: n => `你陪 <b>${n}</b> 一起打坐`, spar: n => `你找 <b>${n}</b> 比武 ⚔️` };
let ilog = [], logTab = 'in';
function relTime(ts) { const s = Math.max(0, (Date.now() - new Date(ts)) / 1000); if (s < 60) return '剛剛'; if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`; if (s < 86400) return `${Math.floor(s / 3600)} 小時前`; if (s < 86400 * 30) return `${Math.floor(s / 86400)} 天前`; return new Date(ts).toLocaleDateString('zh-TW'); }
function updBadge() { const n = ilog.filter(x => x.dir === 'in' && !x.seen).length, b = $('#logBadge'); b.textContent = n > 99 ? '99+' : n; b.classList.toggle('hidden', !n); }
async function loadLog() { try { ilog = await db.interactionLog(me.id); } catch { } updBadge(); return ilog; }
function renderLog() { const rows = ilog.filter(x => x.dir === logTab);
  $('#llist').innerHTML = rows.length ? rows.map(x => { const n = esc(x.other_name || '（已離島）'); return `<div class="litem${x.dir === 'in' && !x.seen ? ' new' : ''}"><span class="lt">${x.dir === 'in' ? `<b>${n}</b> ${ACT_MSG[x.type] || x.type}` : (ACT_OUT[x.type] || (n => n))(n)}</span><span class="tm" title="${new Date(x.created_at).toLocaleString('zh-TW')}">${relTime(x.created_at)}</span></div>`; }).join('') : `<div class="lempty">${logTab === 'in' ? '還沒有人跟你互動，去島上走走吧～' : '你還沒跟別人互動過，點其他俠客試試看！'}</div>`;
  document.querySelectorAll('.ltabs button').forEach(b => b.classList.toggle('on', b.dataset.t === logTab)); }
async function openLog() { if (!me) return; if (!db.hasPin()) { toast('請重新登島（再次登島）後才能查看紀事'); return; }
  modal(`<h2>📜 江湖紀事</h2><div class="ltabs"><button class="pill" data-t="in">別人對我</button><button class="pill" data-t="out">我對別人</button></div><div class="llist" id="llist"><div class="lempty">載入中…</div></div>`);
  document.querySelectorAll('.ltabs button').forEach(b => b.onclick = () => { logTab = b.dataset.t; renderLog(); });
  await loadLog(); renderLog();
  if (ilog.some(x => x.dir === 'in' && !x.seen)) { db.markSeen(me.id).then(() => { ilog.forEach(x => { if (x.dir === 'in') x.seen = true; }); updBadge(); }).catch(() => {}); } }
$('#logBtn').onclick = openLog;
function logAdd(dir, otherName, type) { ilog.unshift({ id: 'live' + Date.now(), dir, other_name: otherName, type, created_at: new Date().toISOString(), seen: dir === 'out' }); updBadge(); if (!$('#modal').classList.contains('hidden') && $('#llist')) renderLog(); }
async function showInbox() { await loadLog(); const ib = ilog.filter(x => x.dir === 'in' && !x.seen); if (!ib.length) return;
  const lines = ib.slice(0, 8).map(x => `<b>${esc(x.other_name)}</b> ${ACT_MSG[x.type] || x.type}`); setTimeout(() => toast(`📬 你不在時：<br>${lines.join('<br>')}${ib.length > 8 ? `<br>…等共 ${ib.length} 則` : ''}<br><small>點「📜 江湖紀事」看全部</small>`, 7000), 2800); }
let rt = null;
function startRealtime() { rt = connectRealtime(me, {
  presence: ids => { for (const a of avatars) { if (a.isMe) continue; const on = ids.has(a.data.id); if (on !== !!a.online) { a.setTag({ online: on }); if (!on) a.home.copy(a.root.position); } } if ([...ids].some(id => !byId(id))) syncOthers(); },
  ready: () => { lastBc = -9; },
  move: m => { const a = byId(m.id); if (!a || a.isMe) return; if (!a.online) a.setTag({ online: true }); const p = a.root.position; a.speed = 8; if (m.r != null) a.netYaw = m.r;
    if (Math.hypot(p.x - m.x, p.z - m.z) > 6) { p.set(m.x, heightAt(m.x, m.z), m.z); a.target = null; if (m.r != null) a.root.rotation.set(0, m.r, 0); }
    // always walk (never teleport) toward the sender's target / reported position so facing follows real displacement
    a.target = m.tx != null ? new THREE.Vector3(m.tx, 0, m.tz) : (Math.hypot(p.x - m.x, p.z - m.z) > .05 ? new THREE.Vector3(m.x, 0, m.z) : null);
    if (!a.target && m.s && a.state !== m.s && ['sit', 'meditate'].includes(m.s)) a.setState(m.s); },
  emote: m => { const a = byId(m.id); if (!a || a.isMe) return; a.target = null; a.root.position.set(m.x, heightAt(m.x, m.z), m.z); a.setState(m.s); },
  act: m => { const s = byId(m.from), d = m.to === me.id ? player : byId(m.to); if (!s || !d) return; s.root.position.set(m.x, heightAt(m.x, m.z), m.z); s.target = null; playAct(s, d, m.type); },
}); }

const showPanel = id => ['choose', 'pickCls', 'loginPanel'].forEach(p => $('#' + p).classList.toggle('hidden', p !== id));
$('#newBtn').onclick = () => showPanel('pickCls'); $('#loginBtn').onclick = () => { showPanel('loginPanel'); $('#rName').focus(); };
document.querySelectorAll('.toChoose').forEach(b => b.onclick = () => showPanel('choose'));
$('#rGo').onclick = async () => { const name = $('#rName').value.trim(), pin = $('#rPin').value.trim();
  if (!name || !/^\d{4}$/.test(pin)) return toast('請輸入遊戲名稱與 4 位數密語');
  let a; try { a = await db.recover(name, pin); } catch (e) { return toast(e.message === 'TOO_MANY_ATTEMPTS' ? '嘗試太多次了，請 10 分鐘後再試' : e.message === 'BANNED' ? '此角色已被封禁' : '連線失敗，請稍後再試'); }
  if (!a) return toast('遊戲名稱或密語不正確');
  me = a; $('#entry').classList.add('hidden'); startWorld(); };
$('#rPin').onkeydown = e => { if (e.key === 'Enter') $('#rGo').click(); };
// 修改留言
$('#msgBtn').onclick = () => { if (!me) return; const need = !db.hasPin();
  modal(`<h2>✏️ 修改留言</h2><div class="form"><textarea id="emIn" maxlength="50" rows="3">${esc(me.message || '')}</textarea><small id="emc" class="count">${(me.message || '').length}/50</small>${need ? '<input id="emPin" type="password" inputmode="numeric" maxlength="4" placeholder="請輸入 4 位數密語">' : ''}<button id="emGo">儲存</button></div>`);
  $('#emIn').oninput = e => $('#emc').textContent = `${e.target.value.length}/50`;
  $('#emGo').onclick = async () => { const msg = $('#emIn').value.trim(); if (!msg) return toast('留言不能是空的喔'); const pin = $('#emPin')?.value.trim();
    if (need && !/^\d{4}$/.test(pin || '')) return toast('密語請輸入 4 位數字');
    try { me.message = await db.updateMessage(me.name, msg, pin); if (player) player.data.message = me.message; closeModal(); toast('留言已更新 ✦'); }
    catch (e) { toast(e.message === 'BAD_PIN' ? '密語不正確' + (need ? '' : '，請重新輸入') : e.message === 'TOO_MANY_ATTEMPTS' ? '嘗試太多次了，請 10 分鐘後再試' : '連線失敗，請稍後再試'); if (e.message === 'BAD_PIN' && !need) $('#msgBtn').click(); } }; };
// 每 15 秒同步其他俠客與紙船
async function syncOthers() { if (!me) return; try { const list = await db.listAvatars(); if (!list.some(a => a.id === me.id)) return kickBanned(); for (const a of [...avatars]) if (!a.isMe && a.data?.id && !list.some(x => x.id === a.data.id)) removeAvatar(a.data.id); const known = new Set(avatars.map(a => a.data?.id));
  for (const a of list) { if (a.id === me.id) continue; if (!known.has(a.id)) { known.add(a.id); spawn(a); } else { const av = avatars.find(x => x.data?.id === a.id); if (av) av.data.message = a.message; } }
  if (world.boatGroup.children.length !== (await db.listWishes()).slice(0, 20).length) await refreshBoats(); await refreshFlowers(); } catch (e) { console.warn('sync', e); } }
setInterval(syncOthers, 15000);
applySeason(); updDayBtn(); buildEntry(); loop();
// 開場：慢慢環繞全景
controls.autoRotate = false;
me = await db.getMe(); if (me?.banned) { me = null; kickBanned(); } if (me) { $('#entry').classList.add('hidden'); startWorld(); }
window.__nsh = { openPeople, openLightbox, openAdmin, openPhotoWall, get isAdmin() { return isAdmin; }, faceMotion, ilog: () => ilog, openLog, K, get rt() { return rt; }, byId, interact, get avatars() { return avatars; }, openKick, kickWith: (aim, p) => { K.aim = aim; K.power = p; kickBall(); }, db, scene, camera, controls, openGacha, openWishForm, openWishBoard, openPhotoWall, get player() { return player; }, setNight: v => { night = v; updDayBtn(); }, celebrate };
