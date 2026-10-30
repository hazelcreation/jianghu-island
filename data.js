// 資料層：Supabase（PostgREST + Storage，用 fetch）。
import { SUPABASE_URL as U, SUPABASE_KEY as K } from './supabase-config.js';
const P = 'nsh_island_v2_';
const H = { apikey: K, Authorization: `Bearer ${K}` };
const local = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(P + k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem(P + k, JSON.stringify(v)) };
async function api(path, opt = {}) {
  const r = await fetch(`${U}/rest/v1/${path}`, { ...opt, headers: { ...H, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  const txt = await r.text(); const body = txt ? JSON.parse(txt) : null;
  if (!r.ok) { const e = new Error(body?.message || r.statusText); e.code = body?.code; e.msg = body?.message || ''; throw e; }
  return body;
}
const rpc = (fn, args) => api(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
const CHAR_COLS = 'id,name,cls,appearance,message,created_at';
const toAv = c => { const pos = local.get('pos', {})[c.id]; return { id: c.id, name: c.name, cls: c.cls, ...(c.appearance || {}), message: c.message, created: Date.parse(c.created_at), ...(pos ? { pos } : {}) }; };
const norm = n => n.trim().toLowerCase();
const photo = x => ({ id: x.id, title: x.title, caption: x.caption, name: x.uploader, img: `${U}/storage/v1/object/public/photos/${x.storage_path}`, created: Date.parse(x.created_at) });

export const db = {
  remote: true,
  async getMe() { const id = local.get('me', null); if (!id) return null;
    try { const r = await api(`characters?select=${CHAR_COLS}&id=eq.${encodeURIComponent(id)}`); return r[0] ? toAv(r[0]) : null; } catch { return null; } },
  async hashPin(name, pin) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nsh-island:' + norm(name) + ':' + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); },
  async nameTaken(name) { return !!(await rpc('name_taken', { p_name: name })); },
  async recover(name, pin) {
    let r; try { r = await rpc('recover_character', { p_name: name, p_pin_hash: await this.hashPin(name, pin) }); }
    catch (e) { if (/TOO_MANY/.test(e.msg)) throw new Error('TOO_MANY_ATTEMPTS'); throw e; }
    if (!r?.length) return null; local.set('me', r[0].id); local.set('ph', await this.hashPin(name, pin)); return toAv(r[0]); },
  async createAvatar(a) {
    const { pin, name, message, cls, pos, id: _i, created: _c, ...appearance } = a;
    let r; try { r = await rpc('create_character', { p_name: name, p_cls: cls, p_appearance: appearance, p_message: (message || '').slice(0, 50), p_pin_hash: await this.hashPin(name, pin) }); }
    catch (e) { if (/NAME_TAKEN/.test(e.msg) || e.code === '23505') throw new Error('NAME_TAKEN'); throw e; }
    const av = toAv(r[0]); local.set('me', av.id); local.set('ph', await this.hashPin(name, pin)); if (pos) await this.updateAppearance(av.id, { pos }); return { ...av, pos }; },
  hasPin() { return !!local.get('ph', null); },
  async updateMessage(name, message, pin) { const ph = pin ? await this.hashPin(name, pin) : local.get('ph', null); if (!ph) throw new Error('NEED_PIN');
    let r; try { r = await rpc('update_message', { p_name: name, p_pin_hash: ph, p_message: message.slice(0, 50) }); } catch (e) { if (/TOO_MANY/.test(e.msg)) throw new Error('TOO_MANY_ATTEMPTS'); throw e; }
    if (r == null) { local.set('ph', null); throw new Error('BAD_PIN'); } local.set('ph', ph); return r; },
  async updateAppearance(id, patch) { if (patch.pos) { const p = local.get('pos', {}); p[id] = patch.pos; local.set('pos', p); } return null; },
  async listAvatars() { return (await api(`characters?select=${CHAR_COLS}&order=created_at.asc&limit=500`)).map(toAv); },
  async recordDraw(id, result) { const r = await rpc('record_draw', { p_character_id: id, p_result: result }); return r[0]; },
  async getDraws(id) { const r = await api(`draws?select=count,results&character_id=eq.${id}`); return r[0] || { count: 0, results: {} }; },
  async allDraws() { const r = await api('draws?select=character_id,count,results&limit=1000'); return Object.fromEntries(r.map(d => [d.character_id, { count: d.count, results: d.results }])); },
  async addWish(w) { const anon = !!w.anon; const r = await api('wishes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ text: w.text.slice(0, 50), anonymous: anon, author: anon ? null : (w.name || null) }) });
    return { id: r[0].id, text: r[0].text, anon, name: r[0].author || '', created: Date.parse(r[0].created_at) }; },
  async listWishes() { return (await api('wishes?select=id,text,anonymous,author,created_at&order=created_at.desc&limit=100')).map(w => ({ id: w.id, text: w.text, anon: w.anonymous, name: w.author || '', created: Date.parse(w.created_at) })); },
  async addPhoto(p) {
    const blob = await (await fetch(p.img)).blob(); const path = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}.jpg`;
    const up = await fetch(`${U}/storage/v1/object/photos/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: blob });
    if (!up.ok) throw new Error('上傳失敗：' + (await up.text()));
    const r = await api('photos', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ storage_path: path, title: p.title.slice(0, 20), caption: (p.caption || '').slice(0, 50), uploader: (p.name || '').slice(0, 12) }) });
    return photo(r[0]); },
  async listPhotos() { return (await api('photos?select=id,storage_path,title,caption,uploader,created_at&order=created_at.desc&limit=100')).map(photo); },
  async resetAll() { localStorage.removeItem(P + 'ph'); Object.keys(localStorage).filter(k => k.startsWith(P)).forEach(k => localStorage.removeItem(k)); },
};
