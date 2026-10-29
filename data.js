// 資料層：目前以 localStorage 模擬後端。之後換 Supabase 只要改這個檔案，
// 介面全部是 async，呼叫端不需變動。
const P = 'nsh_island_v1_';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(P + k)) ?? d; } catch { return d; } };
const write = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
let _db;
function idbOpen() { return _db ||= new Promise((res, rej) => { const r = indexedDB.open(P + 'db', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idb(mode, fn) { const d = await idbOpen(); return new Promise((res, rej) => { const t = d.transaction('photos', mode); const q = fn(t.objectStore('photos')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---- 範例資料（SAMPLE，正式上線請移除） ----
function samplePhoto(bg, fg, emoji) {
  const c = document.createElement('canvas'); c.width = 400; c.height = 300;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, bg); gr.addColorStop(1, fg);
  g.fillStyle = gr; g.fillRect(0, 0, 400, 300);
  g.font = '120px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 200, 140);
  g.font = 'bold 22px sans-serif'; g.fillStyle = '#fff'; g.fillText('範例照片 SAMPLE', 200, 265);
  return c.toDataURL('image/jpeg', .8);
}
function seed() {
  if (read('seeded', false)) return;
  const t = Date.now();
  write('avatars', [
    { id:'s1', sample:true, name:'桃花醉', cls:'suwen', hair:'twin', outfit:'robe', hairColor:'#2b1d16', outfitColor:'#f6d6de', skin:'#ffe3d0', message:'【範例】大家今晚記得來幫派打本喔～', pos:[-34,0,30], created:t-86400e3*5 },
    { id:'s2', sample:true, name:'夜行刀', cls:'suimeng', hair:'pony', outfit:'cape', hairColor:'#3a3f58', outfitColor:'#3a3f58', skin:'#f7d0b5', message:'【範例】刀在人在，碎夢永不退坑！', pos:[6,0,8], created:t-86400e3*4 },
    { id:'s3', sample:true, name:'鐵壁阿伯', cls:'tieyi', hair:'short', outfit:'short', hairColor:'#5a3b2e', outfitColor:'#fbe7a1', skin:'#e8b896', message:'【範例】我坦，你們輸出就好。', pos:[30,0,-30], created:t-86400e3*3 },
    { id:'s4', sample:true, name:'琴心', cls:'shenxiang', hair:'long', outfit:'robe', hairColor:'#e8d8c0', outfitColor:'#bfe3f5', skin:'#ffe3d0', message:'【範例】一曲高山流水，送給各位知音。', pos:[-8,0,-6], created:t-86400e3*2 },
    { id:'s5', sample:true, name:'小機關', cls:'xuanji', hair:'bun', outfit:'short', hairColor:'#a0522d', outfitColor:'#d8f0c8', skin:'#f7d0b5', message:'【範例】翅膀借你們飛一下！', pos:[-40,0,-34], created:t-86400e3 },
  ]);
  write('wishes', [
    { id:'w1', sample:true, text:'【範例】希望這次抽到天賞石！', name:'桃花醉', anon:false, created:t-7200e3 },
    { id:'w2', sample:true, text:'【範例】願大家身體健康，一直一起玩。', name:'', anon:true, created:t-3600e3 },
    { id:'w3', sample:true, text:'【範例】想要一套新時裝 QQ', name:'小機關', anon:false, created:t-600e3 },
  ]);
  write('photos', [
    { id:'p1', sample:true, title:'【範例】汴京夜遊', caption:'第一次一起逛汴京燈會', name:'琴心', img:samplePhoto('#2a2f5a','#d65a6a','🏮'), created:t-86400e3*3 },
    { id:'p2', sample:true, title:'【範例】楓林合照', caption:'楓葉超美，大家都擺好姿勢', name:'夜行刀', img:samplePhoto('#f2a65a','#b8432f','🍁'), created:t-86400e3*2 },
    { id:'p3', sample:true, title:'【範例】首通紀念', caption:'打了十次終於過了！', name:'鐵壁阿伯', img:samplePhoto('#7cc6a4','#2f6d6a','⚔️'), created:t-86400e3 },
  ]);
  write('draws', { s1:{ count:12, results:{ '天賞石':2, '煙火':3, '螺黛染':2, '輕容染':1, '玉華染':2, '內功肥料':2 } } });
  write('seeded', true);
}
seed();

export const db = {
  async getMe() { const id = read('me', null); return id ? (read('avatars', []).find(a => a.id === id) || null) : null; },
  async hashPin(name, pin) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nsh-island:' + name + ':' + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); },
  async nameTaken(name) { return read('avatars', []).some(a => a.name === name); },
  // 找回角色：暱稱 + 4 位數密語（只比對雜湊）
  async recover(name, pin) { const a = read('avatars', []).find(x => x.name === name); if (!a || !a.pinHash) return null;
    if (a.pinHash !== await this.hashPin(name, pin)) return null; write('me', a.id); return a; },
  async createAvatar(a) {
    const list = read('avatars', []);
    if (list.some(x => x.name === a.name)) throw new Error('NAME_TAKEN');
    const { pin, ...rest } = a; a = { ...rest, pinHash: await this.hashPin(a.name, pin) };
    const av = { ...a, id: uid(), created: Date.now(), message: (a.message || '').slice(0, 50) };
    list.push(av); write('avatars', list); write('me', av.id); return av;
  },
  async updateAppearance(id, patch) { // 訊息不可修改：只允許外觀/位置
    const { message, id: _i, ...safe } = patch;
    const list = read('avatars', []); const a = list.find(x => x.id === id);
    if (a) Object.assign(a, safe); write('avatars', list); return a;
  },
  async listAvatars() { return read('avatars', []); },
  async recordDraw(avatarId, result) {
    const d = read('draws', {}); const r = d[avatarId] ||= { count: 0, results: {} };
    r.count++; r.results[result] = (r.results[result] || 0) + 1; write('draws', d); return r;
  },
  async getDraws(avatarId) { return read('draws', {})[avatarId] || { count: 0, results: {} }; },
  async allDraws() { return read('draws', {}); },
  async addWish(w) { const l = read('wishes', []); const x = { ...w, text: w.text.slice(0, 50), id: uid(), created: Date.now() }; l.push(x); write('wishes', l); return x; },
  async listWishes() { return read('wishes', []).sort((a, b) => b.created - a.created); },
  // 照片較大（~100 張 × 500KB），localStorage 放不下，改存 IndexedDB
  async addPhoto(p) { const x = { ...p, title: p.title.slice(0, 20), caption: p.caption.slice(0, 50), id: uid(), created: Date.now() }; await idb('readwrite', s => s.put(x)); return x; },
  async listPhotos() {
    const seedP = read('photos', []);
    if (seedP.length) { for (const p of seedP) await idb('readwrite', s => s.put(p)); write('photos', []); }
    const all = await idb('readonly', s => s.getAll()); return all.sort((a, b) => b.created - a.created);
  },
  async resetAll() { Object.keys(localStorage).filter(k => k.startsWith(P)).forEach(k => localStorage.removeItem(k)); indexedDB.deleteDatabase(P + 'db'); },
};
