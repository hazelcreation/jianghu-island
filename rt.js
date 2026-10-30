// 即時同步：Supabase Realtime（Phoenix websocket，broadcast + presence）
import { SUPABASE_URL as U, SUPABASE_KEY as K } from './supabase-config.js';
const TOPIC = 'realtime:jianghu-island';
export function connectRealtime(me, handlers) {
  let ws, ref = 0, joinRef = null, hb, alive = true, retry = 1000; const online = new Map();
  const send = (event, payload, topic = TOPIC) => { if (ws?.readyState === 1) ws.send(JSON.stringify({ topic, event, payload, ref: String(++ref), join_ref: joinRef })); };
  const sync = () => handlers.presence?.(new Set(online.keys()));
  function open() {
    ws = new WebSocket(`${U.replace('https', 'wss')}/realtime/v1/websocket?apikey=${K}&vsn=1.0.0`);
    ws.onopen = () => { retry = 1000; joinRef = String(++ref);
      ws.send(JSON.stringify({ topic: TOPIC, event: 'phx_join', ref: joinRef, join_ref: joinRef, payload: { config: { broadcast: { self: false }, presence: { key: me.id }, private: false } } }));
      hb = setInterval(() => send('heartbeat', {}, 'phoenix'), 25000); };
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.topic !== TOPIC) return;
      if (m.event === 'phx_reply' && m.ref === joinRef && m.payload?.status === 'ok') { send('presence', { type: 'presence', event: 'track', payload: { id: me.id, name: me.name } }); handlers.ready?.(); }
      else if (m.event === 'presence_state') { online.clear(); for (const k in m.payload) if (k !== me.id) online.set(k, 1); sync(); }
      else if (m.event === 'presence_diff') { for (const k in m.payload.joins || {}) if (k !== me.id) online.set(k, 1); for (const k in m.payload.leaves || {}) online.delete(k); sync(); }
      else if (m.event === 'broadcast') handlers[m.payload.event]?.(m.payload.payload); };
    ws.onclose = () => { clearInterval(hb); online.clear(); sync(); if (alive) setTimeout(open, retry = Math.min(retry * 2, 30000)); };
  }
  open();
  return { online, bcast: (event, payload) => send('broadcast', { type: 'broadcast', event, payload }), close: () => { alive = false; ws?.close(); } };
}
