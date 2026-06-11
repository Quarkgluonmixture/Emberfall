/**
 * Localization. UI chrome reads t(key); chronicle entries carry their template
 * kind + variant + params so stored history re-renders in any language without
 * touching simulation determinism (the English text in the save is canonical).
 */
import type { ChronicleEntry, Season } from '../core/types';
import { dayOfSeason, seasonOf, yearOf } from '../sim/time';

export type Lang = 'en' | 'zh';

const LANG_KEY = 'emberfall:lang';
let lang: Lang = (typeof localStorage !== 'undefined' && (localStorage.getItem(LANG_KEY) as Lang)) || 'en';
const listeners: Array<() => void> = [];

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* storage unavailable */
  }
  for (const fn of listeners) fn();
}

export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

// ── UI strings ──────────────────────────────────────────────────────

const UI: Record<string, { en: string; zh: string }> = {
  // HUD
  'hud.attract': { en: 'Attract', zh: '观赏' },
  'hud.attract.tip': { en: 'Attract mode: an automated cinematic tour (A)', zh: '观赏模式：自动运镜巡游 (A)' },
  'hud.cinema.tip': { en: 'Cinema mode: hide all UI for recording (C)', zh: '影院模式：隐藏全部界面 (C)' },
  'hud.screenshot.tip': { en: 'Save a screenshot of the canvas (P)', zh: '保存画面截图 (P)' },
  'hud.worlds': { en: 'Worlds', zh: '世界图鉴' },
  'hud.worlds.tip': { en: 'Seed gallery: curated worlds (G)', zh: '种子画廊：精选世界 (G)' },
  'hud.save.tip': { en: 'Save world to browser storage', zh: '保存世界到浏览器存储' },
  'hud.load.tip': { en: 'Load the most recent save (manual or autosave)', zh: '读取最近的存档（手动或自动）' },
  'hud.newWorld': { en: 'New World', zh: '新世界' },
  'hud.newWorld.tip': { en: 'Generate a fresh random world', zh: '生成一个全新的随机世界' },
  'hud.history.tip': { en: 'Toggle the historical record (H)', zh: '开关历史记录 (H)' },
  'hud.music.tip': { en: 'Toggle music (M)', zh: '开关音乐 (M)' },
  'hud.menu.tip': { en: 'Settings (Esc)', zh: '设置 (Esc)' },
  'hud.pause.tip': { en: 'Pause (Space)', zh: '暂停 (空格)' },
  'hud.speed.tip': { en: 'Speed', zh: '速度' },
  // Menu
  'menu.title': { en: 'Settings', zh: '设置' },
  'menu.language': { en: 'Language', zh: '语言' },
  'menu.fps': { en: 'Frame-rate cap', zh: '帧率上限' },
  'menu.fps.unlimited': { en: 'Unlimited', zh: '不限' },
  'menu.debug': { en: 'Debug overlay', zh: '调试面板' },
  'menu.music': { en: 'Music', zh: '音乐' },
  'menu.on': { en: 'On', zh: '开' },
  'menu.off': { en: 'Off', zh: '关' },
  'menu.resume': { en: 'Resume', zh: '继续' },
  'menu.keysTitle': { en: 'Keys', zh: '按键' },
  'menu.keys': {
    en: 'Space pause · 1/2/3 speed · A attract · C cinema · P screenshot · G worlds · H history · W story · M music · F3 debug',
    zh: '空格 暂停 · 1/2/3 速度 · A 观赏 · C 影院 · P 截图 · G 世界图鉴 · H 历史 · W 世界一览 · M 音乐 · F3 调试',
  },
  // Panels
  'civs.title': { en: 'CIVILIZATIONS', zh: '文明' },
  'civs.fell': { en: 'fell Y{n}', zh: '覆灭于第{n}年' },
  'history.title': { en: 'THE HISTORICAL RECORD', zh: '历史记录' },
  'history.year': { en: 'Year {n}', zh: '第 {n} 年' },
  'history.empty': {
    en: 'The world is young; nothing of note has happened yet.',
    zh: '世界尚且年轻；还没有值得记述的事。',
  },
  'inspector.owner': { en: 'Owner', zh: '归属' },
  'inspector.unclaimed': { en: 'Unclaimed', zh: '无主' },
  'inspector.elevation': { en: 'Elevation', zh: '海拔' },
  'inspector.moisture': { en: 'Moisture', zh: '湿度' },
  'inspector.temperature': { en: 'Temperature', zh: '气温' },
  'inspector.areaFood': { en: 'Area food', zh: '周边食物' },
  'inspector.areaWood': { en: 'Area wood', zh: '周边木材' },
  'inspector.areaStone': { en: 'Area stone', zh: '周边石料' },
  'inspector.tile': { en: 'Tile', zh: '地块' },
  'inspector.ruins': { en: 'Ruins', zh: '废墟' },
  'inspector.ruinsSub': { en: 'This place has been abandoned.', zh: '此地已被遗弃。' },
  'inspector.population': { en: 'Population', zh: '人口' },
  'inspector.food': { en: 'Food', zh: '食物' },
  'inspector.wood': { en: 'Wood', zh: '木材' },
  'inspector.stone': { en: 'Stone', zh: '石料' },
  'inspector.morale': { en: 'Morale', zh: '士气' },
  'inspector.afflictions': { en: 'Afflictions', zh: '灾厄' },
  'inspector.none': { en: 'none', zh: '无' },
  'inspector.of': { en: 'of', zh: '·' },
  'inspector.founded': { en: 'founded Y{n}', zh: '建于第{n}年' },
  'inspector.military': { en: 'Military', zh: '军力' },
  'inspector.knowledge': { en: 'Knowledge', zh: '知识' },
  'inspector.faith': { en: 'Faith', zh: '信仰' },
  'inspector.culture': { en: 'Culture', zh: '文化' },
  'inspector.settlements': { en: 'Settlements', zh: '聚落' },
  'inspector.stable': { en: 'Stable', zh: '安定' },
  'inspector.goldenAge': { en: 'Golden age', zh: '黄金时代' },
  'inspector.crisis': { en: 'Succession crisis', zh: '继承危机' },
  'inspector.fellInYear': { en: 'Fell in Year', zh: '覆灭于第' },
  'inspector.fellInYearSuffix': { en: '', zh: '年' },
  'inspector.readStory': { en: 'read their story', zh: '阅读传记' },
  'inspector.citizen': { en: 'Citizen', zh: '市民' },
  'inspector.citizenOf': { en: 'Citizen of', zh: '市民 ·' },
  'inspector.citizenSub': { en: 'A small life in a large world', zh: '大世界里的小人物' },
  'inspector.citizenGone': { en: 'They have wandered out of sight.', zh: '他们已走出视野。' },
  'inspector.doing': { en: 'Doing', zh: '正在' },
  'inspector.home': { en: 'Home', zh: '家园' },
  'inspector.lost': { en: 'lost', zh: '失所' },
  'inspector.fallen': { en: 'fallen', zh: '已覆灭' },
  'inspector.truce': { en: 'truce', zh: '停战' },
  'inspector.payingTribute': { en: 'paying tribute', zh: '纳贡中' },
  'inspector.owedTribute': { en: 'owed tribute', zh: '受贡中' },
  'inspector.plague': { en: 'plague', zh: '瘟疫' },
  'inspector.famine': { en: 'famine', zh: '饥荒' },
  'inspector.hungry': { en: 'hungry', zh: '饥饿' },
  // World story
  'story.ageOf': { en: 'the age of', zh: '当世之主：' },
  'story.uneasyPeace': { en: 'an uneasy peace', zh: '不安的和平' },
  'story.wars': { en: 'wars', zh: '场战争' },
  'story.war': { en: 'war', zh: '场战争' },
  'story.plagueIn': { en: 'plague in', zh: '处瘟疫' },
  'story.famineIn': { en: 'famine in', zh: '处饥荒' },
  'story.goldenAgeOf': { en: 'golden age of', zh: '的黄金时代' },
  'story.places': { en: 'places', zh: '' },
  'story.place': { en: 'place', zh: '' },
  // Biography
  'bio.risen': { en: 'Risen from the ruins in Year {n}', zh: '第{n}年自废墟中崛起' },
  'bio.firstPeople': { en: 'One of the first peoples', zh: '初民之一' },
  'bio.fate': { en: '{n} souls across', zh: '{n} 人 · 聚落' },
  'bio.settlements': { en: 'settlements', zh: '处' },
  'bio.settlement': { en: 'settlement', zh: '处' },
  'bio.fell': { en: 'Fell in Year {n}', zh: '覆灭于第{n}年' },
  'bio.unwritten': { en: 'Their story is yet unwritten.', zh: '他们的故事尚未写就。' },
  'bio.wars': { en: 'wars', zh: '场战争' },
  'bio.treaties': { en: 'treaties', zh: '份和约' },
  'bio.goldenAges': { en: 'golden ages', zh: '个黄金时代' },
  'bio.towns': { en: 'towns raised', zh: '座城镇' },
  'bio.colonies': { en: 'colonies', zh: '处殖民地' },
  // Weather
  'weather.clear': { en: 'clear', zh: '晴' },
  'weather.rain': { en: 'rain', zh: '雨' },
  'weather.snow': { en: 'snow', zh: '雪' },
  // Toasts
  'toast.saved': { en: 'The chronicle is preserved.', zh: '编年史已保存。' },
  'toast.saveFailed': { en: 'Saving failed — storage unavailable.', zh: '保存失败——存储不可用。' },
  'toast.noSave': { en: 'No saved world found.', zh: '没有找到存档。' },
  'toast.loaded': { en: 'The world remembers.', zh: '世界苏醒了。' },
  'toast.loadedAuto': { en: 'The world remembers (autosave).', zh: '世界苏醒了（自动存档）。' },
  'toast.loadFailed': { en: 'The saved world could not be read.', zh: '存档无法读取。' },
  'toast.newWorld': { en: 'A new world kindles (seed {n}).', zh: '新世界点燃了（种子 {n}）。' },
  'toast.travel': { en: 'Traveling to seed {n}…', zh: '正在前往种子 {n}…' },
  'toast.musicOff': { en: 'The minstrels rest.', zh: '乐师们歇下了。' },
  'toast.musicOn': { en: 'The minstrels play.', zh: '乐师们奏响了。' },
  'toast.screenshotSaved': { en: 'Saved {n}', zh: '已保存 {n}' },
  'toast.screenshotFailed': { en: 'Screenshot failed.', zh: '截图失败。' },
};

export function t(key: string, n?: string | number): string {
  const e = UI[key];
  let s = e ? e[lang] : key;
  if (n !== undefined) s = s.replace('{n}', String(n));
  return s;
}

// ── Game vocabulary ─────────────────────────────────────────────────

const SEASONS_ZH = ['春', '夏', '秋', '冬'];
const SEASONS_EN = ['Spring', 'Summer', 'Autumn', 'Winter'];

export function seasonName(season: Season): string {
  return lang === 'zh' ? SEASONS_ZH[season] : SEASONS_EN[season];
}

export function dateText(day: number): string {
  if (lang === 'zh') return `第${yearOf(day)}年 · ${SEASONS_ZH[seasonOf(day)]} · 第${dayOfSeason(day)}日`;
  return `Year ${yearOf(day)} · ${SEASONS_EN[seasonOf(day)]} · Day ${dayOfSeason(day)}`;
}

const TERRAIN_ZH: Record<string, string> = {
  Ocean: '海洋',
  Coast: '海岸',
  Grassland: '草原',
  Forest: '森林',
  Mountain: '山脉',
  River: '河流',
  Swamp: '沼泽',
  Desert: '荒漠',
  Tundra: '苔原',
};

export function terrainName(en: string): string {
  return lang === 'zh' ? (TERRAIN_ZH[en] ?? en) : en;
}

const TIERS_ZH = ['营地', '村庄', '城镇'];
const TIERS_EN = ['Camp', 'Village', 'Town'];

export function tierName(tier: number): string {
  return lang === 'zh' ? TIERS_ZH[tier] : TIERS_EN[tier];
}

const TRAITS_ZH: Record<string, string> = {
  industrious: '勤勉',
  devout: '虔信',
  scholarly: '尚学',
  warlike: '尚武',
  seafaring: '航海',
  nomadic: '游牧',
  proud: '高傲',
  hardy: '坚韧',
};

export function traitName(en: string): string {
  return lang === 'zh' ? (TRAITS_ZH[en] ?? en) : en;
}

const RELATIONS_ZH: Record<string, string> = {
  war: '战争',
  rivalry: '敌对',
  neutral: '中立',
  trade: '通商',
  alliance: '同盟',
};

export function relationName(en: string): string {
  return lang === 'zh' ? (RELATIONS_ZH[en] ?? en) : en;
}

const AGENT_STATES_ZH: Record<string, string> = {
  idle: '闲逛',
  walking: '赶路',
  gathering: '采集',
  building: '修建',
  farming: '务农',
  trading: '行商',
  fleeing: '逃难',
  resting: '歇息',
  fighting: '作战',
};

export function agentStateName(en: string): string {
  return lang === 'zh' ? (AGENT_STATES_ZH[en] ?? en) : en;
}

// ── Chronicle templates (zh) ────────────────────────────────────────
// Variant counts MUST match src/sim/chronicle.ts exactly: the simulation
// picks the variant index with its own RNG and we re-render that index here.

type P = NonNullable<ChronicleEntry['params']>;
type Tpl = (p: P) => string;

const FLAVOR_ZH: Record<string, string> = {
  'stonecraft and song': '石艺与歌谣',
  'star-charts and silver': '星图与白银',
  'harvest and festival': '丰收与节庆',
  'letters and law': '文字与律法',
  'weaving and wonder': '织造与奇观',
};

const ZH: Record<string, Tpl[]> = {
  founding: [
    (p) => `${p.civ}的人民在${p.name}点燃了他们的第一堆篝火。`,
    (p) => `流浪的岁月结束了，${p.civ}在${p.name}打下第一根木桩。`,
  ],
  village: [
    (p) => `${p.name}已成长为村庄；木墙在暮色中立起。`,
    (p) => `新屋顶挤满了${p.name}的巷道——无论怎么算，这都是一座村庄了。`,
  ],
  town: [
    (p) => `钟声响彻${p.name}——如今已是拥有${p.pop}人的城镇。`,
    (p) => `${p.name}筑起石墙与集市广场——终成一座真正的城镇。`,
  ],
  famine: [
    (p) => `饥荒攫住了${p.name}；粮仓空空如也。`,
    (p) => `饥饿在${p.name}游荡。老人与孩童最先消逝。`,
  ],
  famineEnd: [(p) => `丰收归来，${p.name}的饥荒缓解了。`],
  plague: [
    (p) => `一场悄无声息的瘟疫潜入了${p.name}。`,
    (p) => `疫病在${p.name}蔓延；门上画起了灰印。`,
  ],
  plagueEnd: [(p) => `${p.name}的瘟疫终于燃尽了。`],
  migration: [
    (p) => `怀着饥饿与希望，${p.name}的移民启程，建立了${p.other}。`,
    (p) => `长长的车队驶出${p.name}；旅途尽头，他们建起了${p.other}。`,
  ],
  skirmish: [
    (p) => `${p.civ}与${p.otherCiv}的边境燃起冲突。`,
    (p) => `掠袭者袭击了${p.name}附近的农庄；${p.civ}与${p.otherCiv}以血还血。`,
  ],
  capture: [(p) => `${p.name}落入${p.civ}的旗下。`],
  warDeclared: [(p) => `${p.civ}向${p.otherCiv}宣战。烽火沿边境燃起。`],
  peace: [(p) => `厌倦了战争，${p.civ}与${p.otherCiv}放下了刀兵。`],
  treatySigned: [
    (p) => `白旗之下，${p.otherCiv}接受了${p.civ}的条款：纳贡，并立誓和平。`,
    (p) => `使节在界石旁缔结条约；${p.otherCiv}将向${p.civ}派出纳贡的商队。`,
  ],
  tributeEnds: [(p) => `最后一支纳贡商队驶离${p.civ}；欠${p.otherCiv}的债已还清。`],
  alliance: [(p) => `${p.civ}与${p.otherCiv}在老橡树下立誓结盟。`],
  tradeOpened: [(p) => `商队开始往返于${p.civ}与${p.otherCiv}之间；贸易兴盛。`],
  rivalry: [(p) => `${p.civ}与${p.otherCiv}之间言语生寒；敌意生根。`],
  relationsCooled: [(p) => `${p.civ}与${p.otherCiv}的关系归于戒备的中立。`],
  succession: [
    (p) => `老首领之死令${p.civ}陷入继承危机。`,
    (p) => `争位的继承人撕扯着${p.civ}的议事篝火。`,
  ],
  schism: [
    (p) => `异端撕裂了${p.civ}的神殿；信仰分崩离析。`,
    (p) => `新先知在${p.civ}崛起，旧日的神龛就此分裂。`,
  ],
  wildfire: [(p) => `野火席卷${p.name}附近的森林。`],
  wildfireWild: [() => `野火在荒林中肆虐，数里之外亦如红色黎明。`],
  flood: [(p) => `河水在${p.name}决堤；田野没入浊浪之下。`],
  goldenAge: [(p) => `${p.civ}步入${FLAVOR_ZH[p.flavor ?? ''] ?? p.flavor}的黄金时代。`],
  collapse: [
    (p) => `${p.name}被遗弃了；如今只有乌鸦看守它的街道。`,
    (p) => `最后一户人家闩上门，把${p.name}留给了青苔。`,
  ],
  civFell: [(p) => `${p.civ}最后的炉火熄灭了。他们的故事归于传说。`],
  rebirth: [
    (p) => `青苔覆盖的废墟上燃起新火——${p.civ}在${p.name}诞生。`,
    (p) => `流浪者聚集在古老的石垣旁；他们建起${p.name}，自称${p.civ}。`,
  ],
  resettleRuin: [
    (p) => `${p.name}的移民在长满青苔的旧石上架起新梁，是为${p.other}。`,
    (p) => `${p.other}附近的废墟再度响起锤声；${p.name}送来了它的年轻人。`,
  ],
  incidentBad: [
    (p) => `${p.civ}的狩猎队在${p.otherCiv}的林中遇害。`,
    (p) => `${p.civ}与${p.otherCiv}的渔夫为渔获大打出手。`,
  ],
  incidentGood: [
    (p) => `${p.civ}的使节为${p.otherCiv}带来琥珀之礼。`,
    (p) => `一场联姻结合了${p.civ}与${p.otherCiv}的家族；欢宴数日不息。`,
  ],
};

/** Render a chronicle entry in the current language. */
export function entryText(e: ChronicleEntry): string {
  if (lang === 'zh' && e.params && e.variant !== undefined) {
    const tpl = ZH[e.kind]?.[e.variant];
    if (tpl) return tpl(e.params);
  }
  return e.text;
}
