// ===== 可調整設定 =====
// 相識紀念日
export const MET_DATE = '2024-12-08';

// 江湖小語
export const JIANGHU_QUOTES = [
  '江湖路遠，有你同行便不遠。',
  '今日不練功，明日被木樁打。',
  '一壺清酒，半生知己。',
  '天賞石會有的，麵包也會有的。',
  '所有江湖偶遇都是宿命相逢',
  '音有形而不散，是為羽碎',
];

export const CLASSES = [
  { id:'suwen',   name:'素問', weapon:'絲帶',     color:'#F27BA5' },
  { id:'suimeng', name:'碎夢', weapon:'長刀',     color:'#4FB3E8' },
  { id:'jiuling', name:'九靈', weapon:'魂燈',     color:'#9B59D0' },
  { id:'tieyi',   name:'鐵衣', weapon:'鐵拳套',   color:'#E0892B' },
  { id:'xuehe',   name:'血河', weapon:'長槍',     color:'#D63A3A' },
  { id:'shenxiang',name:'神相',weapon:'琴',       color:'#4A5FC1' },
  { id:'longyin', name:'龍吟', weapon:'輕重劍',   color:'#3FAE7A' },
  { id:'xuanji',  name:'玄機', weapon:'機關翼',   color:'#B5A82A', text:'#5a3b2e' },
  { id:'chaoguang',name:'潮光',weapon:'海珠',     color:'#1FB5B0' },
];
export const classById = id => CLASSES.find(c => c.id === id) || CLASSES[0];

// 鑑石抽獎機率（總和 100）
export const GACHA = [
  { name:'天賞石',   p:15, rare:true, icon:'💎' },
  { name:'煙火',     p:17, icon:'🎆' },
  { name:'螺黛染',   p:17, icon:'🎨' },
  { name:'輕容染',   p:17, icon:'🎨' },
  { name:'玉華染',   p:17, icon:'🎨' },
  { name:'內功肥料', p:17, icon:'🌱' },
];

export const HAIRS   = [{id:'bun',n:'丸子頭'},{id:'twin',n:'雙髻'},{id:'pony',n:'高馬尾'},{id:'long',n:'飄逸長髮'},{id:'short',n:'俐落短髮'}];
export const OUTFITS = [{id:'robe',n:'長袍'},{id:'short',n:'短打勁裝'},{id:'cape',n:'斗篷俠客'}];
export const HAIR_COLORS = ['#2b1d16','#5a3b2e','#a0522d','#e8d8c0','#c0c0d0','#d9667a'];
export const OUTFIT_COLORS = ['#ffffff','#f6d6de','#bfe3f5','#d8f0c8','#fbe7a1','#e7d3f7','#3a3f58','#c94a4a'];
export const SKIN_COLORS = ['#ffe3d0','#f7d0b5','#e8b896','#c98e6b'];
