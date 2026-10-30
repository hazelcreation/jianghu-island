import * as THREE from './vendor/three.module.js';
import { classById } from './config.js';

const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });
const M = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };
const rot = (m, x = 0, y = 0, z = 0) => { m.rotation.set(x, y, z); return m; };
const darken = (hex, f = .8) => new THREE.Color(hex).multiplyScalar(f);

export function makeTag(text, color, textColor = '#fff', opts = {}) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = 'bold 44px "Noto Sans TC","Noto Serif CJK TC",sans-serif';
  const extra = opts.flowers ? ` ✿${opts.flowers}` : ''; const dot = opts.online ? 34 : 0;
  g.font = font; const w = Math.ceil(g.measureText(text + extra).width) + 56 + dot; c.width = w + 8; c.height = 76;
  g.font = font;
  g.fillStyle = '#5a3b2e'; rr(g, 2, 6, w + 4, 66, 33); g.fill();
  g.fillStyle = color; rr(g, 6, 4, w - 4, 60, 30); g.fill();
  if (dot) { g.fillStyle = '#fff'; g.beginPath(); g.arc(40, 34, 15, 0, 7); g.fill(); g.fillStyle = '#3ddc6a'; g.beginPath(); g.arc(40, 34, 11, 0, 7); g.fill(); }
  g.fillStyle = textColor; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, (w + 8 + dot) / 2 - (extra ? g.measureText(extra).width / 2 : 0), 36);
  if (extra) { g.fillStyle = '#ffe3ec'; g.textAlign = 'right'; g.fillText(extra, w - 22, 36); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(c.width / 120, c.height / 120, 1); s.renderOrder = 10; return s;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function weapon(cls, color, parts) {
  const brown = toon('#5a3b2e'), gold = toon('#f2c14e'), steel = toon('#e8eef8');
  const c = toon(color);
  const back = new THREE.Group(); back.position.set(0, 1.0, -0.42); parts.torso.add(back);
  const hand = new THREE.Group(); hand.position.set(0, -0.62, 0); parts.armR.add(hand);
  const handL = new THREE.Group(); handL.position.set(0, -0.62, 0); parts.armL.add(handL);
  switch (cls) {
    case 'suwen': { // 絲帶：環繞身體的飄帶
      const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2.4; pts.push(new THREE.Vector3(Math.cos(a) * .75, .2 + i / 40 * 1.1 + Math.sin(a * 2) * .1, Math.sin(a) * .75)); }
      const rib = M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .05, 6), toon(color, { side: THREE.DoubleSide }));
      rib.scale.set(1, 1, 1); parts.root.add(rib); parts.ribbon = rib;
      hand.add(M(new THREE.SphereGeometry(.1), gold)); break; }
    case 'suimeng': { const g = new THREE.Group(); g.add(M(new THREE.BoxGeometry(.1, 1.5, .04), steel, 0, .9, 0)); g.add(M(new THREE.BoxGeometry(.36, .07, .12), c, 0, .14, 0)); g.add(M(new THREE.CylinderGeometry(.05, .05, .34), c, 0, -.06, 0)); g.rotation.x = Math.PI / 2.3; hand.add(g); break; }
    case 'jiuling': { // 魂燈：背在背上的大燈籠
      const g = new THREE.Group(); g.position.set(.42, .45, -.1); g.rotation.set(-.1, 0, -.28); g.scale.setScalar(1.35); back.add(g);
      g.add(M(new THREE.CylinderGeometry(.025, .025, .9), brown, 0, .1, .02)); // 背架
      g.add(M(new THREE.ConeGeometry(.42, .2, 10), c, 0, .66, 0));
      g.add(M(new THREE.SphereGeometry(.07, 8, 6), gold, 0, .8, 0));
      const lamp = M(new THREE.SphereGeometry(.42, 16, 12), new THREE.MeshBasicMaterial({ color: '#eee4ff', transparent: true, opacity: .92 }), 0, .3, 0); lamp.scale.y = 1.15; lamp.castShadow = false; g.add(lamp);
      for (let i = 0; i < 6; i++) { const r = M(new THREE.TorusGeometry(.43, .015, 4, 20), c, 0, .3, 0); r.rotation.y = i * Math.PI / 6; r.scale.y = 1.15; g.add(r); }
      g.add(M(new THREE.SphereGeometry(.17, 12, 10), new THREE.MeshBasicMaterial({ color: '#a8d8ff' }), 0, .3, 0));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(.55, 16, 12), new THREE.MeshBasicMaterial({ color: '#cdb8ff', transparent: true, opacity: .12, depthWrite: false })); halo.position.y = .3; g.add(halo);
      g.add(M(new THREE.CylinderGeometry(.22, .28, .1, 10), c, 0, -.1, 0));
      for (const x of [-.12, 0, .12]) g.add(M(new THREE.CylinderGeometry(.025, .01, .38, 5), toon('#d9c8ff'), x, -.34, 0));
      const pl = new THREE.PointLight('#c9b6ff', 1.2, 3); pl.position.y = .3; g.add(pl);
      parts.lamp = g; parts.lampHalo = halo; break; }
    case 'tieyi': { for (const h of [hand, handL]) { h.add(M(new THREE.BoxGeometry(.36, .32, .36), c)); for (let i = -1; i <= 1; i++) h.add(M(new THREE.SphereGeometry(.06), brown, i * .11, -.16, .12)); } break; }
    case 'xuehe': { const g = new THREE.Group(); g.add(M(new THREE.CylinderGeometry(.04, .04, 2.6), brown, 0, .5, 0)); g.add(M(new THREE.ConeGeometry(.1, .4, 6), steel, 0, 1.98, 0)); g.add(M(new THREE.SphereGeometry(.12, 8, 6), c, 0, 1.72, 0)); g.rotation.x = Math.PI / 2.2; hand.add(g); break; }
    case 'shenxiang': { const q = new THREE.Group(); q.add(M(new THREE.BoxGeometry(.5, 1.3, .1), c)); for (let i = -2; i <= 2; i++) q.add(M(new THREE.BoxGeometry(.015, 1.2, .02), gold, i * .08, 0, .06)); q.rotation.z = .5; back.add(q); break; }
    case 'longyin': { const s = new THREE.Group(); s.add(M(new THREE.BoxGeometry(.07, 1.0, .03), steel, 0, .62, 0)); s.add(M(new THREE.BoxGeometry(.26, .05, .08), c, 0, .12, 0)); s.add(M(new THREE.CylinderGeometry(.04, .04, .26), c)); s.rotation.x = Math.PI / 2.3; hand.add(s);
      const h = new THREE.Group(); h.add(M(new THREE.BoxGeometry(.3, 1.3, .06), steel, 0, .2, 0)); h.add(M(new THREE.BoxGeometry(.5, .08, .12), c, 0, -.48, 0)); h.add(M(new THREE.CylinderGeometry(.05, .05, .3), c, 0, -.66, 0)); h.rotation.z = -.5; back.add(h); break; }
    case 'xuanji': { const wings = []; for (const sd of [-1, 1]) { const w = new THREE.Group(); for (let i = 0; i < 4; i++) { const f = M(new THREE.BoxGeometry(.9 - i * .14, .14, .05), i % 2 ? toon('#e8d27a') : c, sd * (.45 - i * .07), .3 - i * .17, 0); f.rotation.z = sd * (.35 - i * .2); w.add(f); }
      w.add(M(new THREE.SphereGeometry(.09), gold)); w.position.x = sd * .12; back.add(w); wings.push(w); } parts.wings = wings; break; }
    case 'chaoguang': { const pearl = M(new THREE.SphereGeometry(.2, 16, 12), new THREE.MeshToonMaterial({ color: '#bff5f2', emissive: color, emissiveIntensity: .4, gradientMap: grad }));
      parts.root.add(pearl); parts.pearl = pearl; pearl.add(M(new THREE.TorusGeometry(.28, .025, 6, 20), c)); break; }
  }
}

export class Avatar {
  constructor(data) {
    this.data = data; this.cls = classById(data.cls);
    this.root = new THREE.Group(); this.root.userData.avatar = this;
    this.state = 'idle'; this.stateT = 0; this.moving = false; this.target = null; this.speed = 6;
    this.build();
  }
  build() {
    const d = this.data, root = this.root;
    while (root.children.length) root.remove(root.children[0]);
    const skin = toon(d.skin), hairM = toon(d.hairColor), cloth = toon(d.outfitColor), trim = toon(this.cls.color), dark = toon('#2b1d16'), shoe = toon('#5a3b2e');
    const body = new THREE.Group(); root.add(body); this.body = body;
    const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-.17, .55, 0); legR.position.set(.17, .55, 0);
    for (const l of [legL, legR]) { l.add(M(new THREE.CylinderGeometry(.11, .12, .45, 8), d.outfit === 'short' ? toon(darken(d.outfitColor, .7)) : cloth, 0, -.22, 0)); l.add(M(new THREE.SphereGeometry(.15, 8, 6), shoe, 0, -.46, .04)); body.add(l); }
    const torso = new THREE.Group(); torso.position.y = .55; body.add(torso);
    const robeLen = d.outfit === 'robe' ? .85 : .6;
    const robe = M(new THREE.CylinderGeometry(.3, d.outfit === 'robe' ? .52 : .4, robeLen, 12), cloth, 0, .62 - robeLen / 2 + .25, 0); torso.add(robe);
    torso.add(M(new THREE.CylinderGeometry(.33, .33, .1, 12), trim, 0, .48, 0)); // 腰帶
    torso.add(M(new THREE.BoxGeometry(.08, .3, .02), trim, 0, .72, .29)); // 衣襟
    if (d.outfit === 'cape') { const cape = M(new THREE.CylinderGeometry(.42, .62, .95, 12, 1, true, Math.PI * .6, Math.PI * .8), toon(darken(d.outfitColor, .6), { side: THREE.DoubleSide }), 0, .45, 0); torso.add(cape); torso.add(rot(M(new THREE.TorusGeometry(.33, .07, 6, 14), trim, 0, .9, 0), Math.PI / 2)); }
    const arm = sd => { const a = new THREE.Group(); a.position.set(sd * .36, .9, 0); a.add(M(new THREE.CylinderGeometry(.1, .13, .5, 8), cloth, 0, -.25, 0)); a.add(M(new THREE.SphereGeometry(.11, 8, 6), skin, 0, -.55, 0)); a.rotation.z = sd * .25; torso.add(a); return a; };
    const armL = arm(-1), armR = arm(1);
    const head = new THREE.Group(); head.position.y = 1.62; torso.add(head);
    head.add(M(new THREE.SphereGeometry(.62, 20, 16), skin));
    for (const sd of [-1, 1]) { const e = M(new THREE.SphereGeometry(.085, 10, 8), dark, sd * .22, -.02, .56); e.scale.set(1, 1.3, .6); head.add(e); head.add(M(new THREE.SphereGeometry(.03), toon('#ffffff'), sd * .2 + .02, .03, .62));
      const b = M(new THREE.SphereGeometry(.09, 8, 6), toon('#ff9fb0', { transparent: true, opacity: .7 }), sd * .36, -.18, .48); b.scale.set(1, .5, .4); head.add(b); }
    head.add(rot(M(new THREE.TorusGeometry(.06, .018, 6, 10, Math.PI), dark, 0, -.2, .58), 0, 0, Math.PI));
    // 頭髮
    const cap = M(new THREE.SphereGeometry(.66, 20, 14, 0, Math.PI * 2, 0, Math.PI * .5), hairM, 0, .02, -.03); cap.rotation.x = -.25; head.add(cap);
    const bang = M(new THREE.SphereGeometry(.3, 10, 8), hairM, 0, .38, .38); bang.scale.set(1.5, .5, .6); head.add(bang);
    const back = M(new THREE.SphereGeometry(.6, 16, 12), hairM, 0, -.05, -.12); back.scale.set(1.02, 1, .9); head.add(back);
    switch (d.hair) {
      case 'bun': head.add(M(new THREE.SphereGeometry(.28, 12, 10), hairM, 0, .7, -.12)); head.add(rot(M(new THREE.TorusGeometry(.2, .04, 6, 14), trim, 0, .58, -.1), Math.PI / 2)); break;
      case 'twin': for (const sd of [-1, 1]) { head.add(M(new THREE.SphereGeometry(.22, 12, 10), hairM, sd * .48, .48, -.05)); head.add(M(new THREE.SphereGeometry(.07), trim, sd * .4, .36, .12)); } break;
      case 'pony': { head.add(M(new THREE.SphereGeometry(.12), trim, 0, .5, -.5)); const p = M(new THREE.ConeGeometry(.22, 1.0, 10), hairM, 0, .1, -.78); p.rotation.x = -2.6; head.add(p); this.pony = p; break; }
      case 'long': { const l = M(new THREE.CylinderGeometry(.5, .62, 1.2, 14, 1, true, Math.PI * .5, Math.PI), hairM, 0, -.45, -.08); l.material = toon(d.hairColor, { side: THREE.DoubleSide }); head.add(l); head.add(M(new THREE.BoxGeometry(.9, .06, .06), trim, 0, .45, -.35)); break; }
      case 'short': for (let i = -2; i <= 2; i++) { const s = M(new THREE.ConeGeometry(.12, .3, 6), hairM, i * .2, .5, .3); s.rotation.x = .9; head.add(s); } break;
    }
    this.parts = { root, body, torso, head, armL, armR, legL, legR };
    weapon(this.cls.id, this.cls.color, this.parts);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(.6, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .18 })); sh.rotation.x = -Math.PI / 2; sh.position.y = .02; root.add(sh);
    this.aura = new THREE.Mesh(new THREE.TorusGeometry(.9, .04, 8, 40), new THREE.MeshBasicMaterial({ color: this.cls.color, transparent: true, opacity: .7 })); this.aura.rotation.x = Math.PI / 2; this.aura.visible = false; root.add(this.aura);
    this.tag = makeTag(d.name, this.cls.color, this.cls.text || '#fff'); this.tag.position.y = 3.35; root.add(this.tag);
    // 點擊用碰撞體
    this.hit = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 3, 8), new THREE.MeshBasicMaterial({ visible: false })); this.hit.position.y = 1.5; this.hit.userData.avatar = this; root.add(this.hit);
    root.traverse(o => { if (o.isMesh && o !== this.hit) o.userData.avatar = this; });
  }
  setTag(opts) { Object.assign(this, opts); const vis = this.tag.visible; this.root.remove(this.tag); this.tag.material.map.dispose(); this.tag.material.dispose();
    this.tag = makeTag(this.data.name, this.cls.color, this.cls.text || '#fff', { online: this.online, flowers: this.flowers }); this.tag.position.y = 3.35; this.tag.visible = vis; this.root.add(this.tag); }
  setState(s) { this.state = s; this.stateT = 0; }
  update(dt, t) {
    const p = this.parts; this.stateT += dt; const st = this.stateT;
    // 重設姿勢
    p.body.position.y = 0; p.body.rotation.set(0, 0, 0); p.torso.rotation.set(0, 0, 0); p.head.rotation.set(0, 0, 0);
    p.armL.rotation.set(0, 0, -.25); p.armR.rotation.set(0, 0, .25); p.legL.rotation.set(0, 0, 0); p.legR.rotation.set(0, 0, 0);
    this.aura.visible = false;
    if (this.moving) {
      const s = Math.sin(t * 14); p.legL.rotation.x = s * .7; p.legR.rotation.x = -s * .7; p.armL.rotation.x = -s * .6; p.armR.rotation.x = s * .6; p.body.position.y = Math.abs(s) * .1;
    } else switch (this.state) {
      case 'idle': p.body.position.y = Math.sin(t * 2.5) * .03; p.head.rotation.z = Math.sin(t * 1.3) * .05; break;
      case 'bow': { const k = Math.min(1, st * 4); p.armL.rotation.set(-1.35 * k, -.6 * k, .45 * k); p.armR.rotation.set(-1.35 * k, .6 * k, -.45 * k); p.torso.rotation.x = .25 * k * (st < 1.6 ? 1 : 0); if (st > 2.2) this.setState('idle'); break; }
      case 'wave': p.armR.rotation.set(0, 0, 2.6 + Math.sin(st * 12) * .35); p.head.rotation.z = -.1; if (st > 2.2) this.setState('idle'); break;
      case 'sit': p.body.position.y = -.42; p.legL.rotation.x = p.legR.rotation.x = -1.5; p.armL.rotation.x = p.armR.rotation.x = -.4; p.head.rotation.z = Math.sin(t) * .06; break;
      case 'meditate': p.body.position.y = -.38 + Math.sin(t * 2) * .06 + .12; p.legL.rotation.set(-1.4, .9, 0); p.legR.rotation.set(-1.4, -.9, 0);
        p.armL.rotation.set(-.9, 0, -.55); p.armR.rotation.set(-.9, 0, .55); this.aura.visible = true; this.aura.scale.setScalar(1 + Math.sin(t * 3) * .1); this.aura.material.opacity = .4 + Math.sin(t * 3) * .25; break;
      case 'pat': p.armR.rotation.set(-2.3, 0, .2 + Math.sin(st * 14) * .25); p.head.rotation.z = -.1; if (st > 2) this.setState('idle'); break;
      case 'hit': p.body.rotation.z = Math.sin(st * 30) * .25 * Math.max(0, 1 - st); p.body.rotation.x = -.15 * Math.max(0, 1 - st); p.head.rotation.z = Math.sin(st * 20) * .2; if (st > 1.4) this.setState('idle'); break;
      case 'spar': { const ph = (st * 2.2 + (this.sparOff || 0)) % 1; p.armR.rotation.set(ph < .5 ? -2.4 * ph * 2 : -2.4 + 3.4 * (ph - .5) * 2, 0, .3); p.armL.rotation.set(-1, 0, -.6); p.body.position.y = Math.abs(Math.sin(st * 7)) * .15; p.torso.rotation.y = Math.sin(st * 4.4) * .35; if (st > 3.2) this.setState('idle'); break; }
      case 'attack': { const ph = (st * 3) % 1; const sw = ph < .4 ? -2.8 * (ph / .4) : -2.8 + 3.8 * Math.min(1, (ph - .4) / .2);
        p.armR.rotation.set(sw, 0, .3); p.torso.rotation.y = ph < .4 ? .3 : -.4; p.body.rotation.x = ph > .4 && ph < .7 ? .12 : 0; if (st > 2) this.setState('idle'); break; }
    }
    if (p.lampHalo) { p.lampHalo.material.opacity = .1 + Math.sin(t * 2.5) * .04; p.lamp.rotation.z = Math.sin(t * 2) * .04; }
    if (p.ribbon) p.ribbon.rotation.y = t * .8;
    if (p.pearl) p.pearl.position.set(Math.cos(t * 2) * .9, 1.6 + Math.sin(t * 3) * .15, Math.sin(t * 2) * .9);
    if (p.wings) p.wings.forEach((w, i) => w.rotation.y = (i ? -1 : 1) * (.2 + Math.sin(t * 3) * .15));
    if (this.pony) this.pony.rotation.z = Math.sin(t * 3) * .1;
  }
}
