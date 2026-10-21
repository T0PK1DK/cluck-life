import { createWorld } from './world.js';

const CL = window.CluckLife;
const SAVE_KEY = 'cluck-life-save-v1';
const MUTE_KEY = 'cluck-life-muted';
const QUAL_KEY = 'cluck-life-quality';
const MOTION_KEY = 'cluck-life-motion';
const $ = (id) => document.getElementById(id);

let game = null;
try { game = CL.loadGame(localStorage.getItem(SAVE_KEY)); } catch (e) { game = null; }
const isNew = !game;
if (!game) game = CL.createGame('Clucky');
if (!game.garden) game.garden = CL.createGarden();
if (!game.coop) game.coop = CL.createCoop();
let bet = 10;
let rematchIdx = null;
let displayCoins = game.chicken.coins;
let world = null;

function ladder() { return CL.rivalsForTier(game.tier); }
function stars(t) { return t > 0 ? ' ' + '★'.repeat(Math.min(t, 3)) + (t > 3 ? t : '') : ''; }
function save() { try { localStorage.setItem(SAVE_KEY, CL.saveGame(game)); } catch (e) {} }
function fmt(n) { return (Math.round(n * 10) / 10).toString(); }

const sfx = (function () {
  let ac = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}
  function ctx() {
    if (muted) return null;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
    return ac;
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp) {
    const a = ctx(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 800;
    s.buffer = buf; g.gain.value = vol || 0.12;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  return {
    get muted() { return muted; },
    setMuted(m) { muted = !!m; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {} if (!muted) ctx(); },
    tap() { tone(660, 0.05, 'square', 0.04); },
    cluck() { tone(520, 0.07, 'square', 0.06, 380); tone(700, 0.06, 'square', 0.05, 500, 0.08); },
    perfect() { [660, 880, 1320].forEach((f, i) => tone(f, 0.09, 'triangle', 0.08, null, i * 0.06)); },
    miss() { tone(220, 0.18, 'sawtooth', 0.05, 140); },
    hit() { noise(0.08, 0.14, 1200); tone(160, 0.1, 'square', 0.07, 90); },
    crit() { noise(0.14, 0.2, 600); tone(120, 0.18, 'sawtooth', 0.1, 60); },
    dodge() { tone(400, 0.14, 'sine', 0.06, 1200); },
    coin() { tone(988, 0.06, 'square', 0.05); tone(1319, 0.12, 'square', 0.05, null, 0.06); },
    nap() { tone(330, 0.3, 'sine', 0.05, 220); },
    bell() { tone(1046, 0.4, 'triangle', 0.07); tone(1568, 0.3, 'sine', 0.04); },
    level() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.06, null, i * 0.08)); },
    win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.13, 'square', 0.06, null, i * 0.1)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, 'triangle', 0.07, null, i * 0.16)); },
  };
})();

function paintMute() {
  $('muteBtn').textContent = sfx.muted ? '🔇' : '🔊';
  $('muteBtn').setAttribute('aria-pressed', sfx.muted ? 'true' : 'false');
}
paintMute();
$('muteBtn').addEventListener('click', () => { sfx.setMuted(!sfx.muted); paintMute(); if (!sfx.muted) sfx.tap(); });

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200);
}

function floatAt(pt, text, color) {
  if (!pt) return;
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.color = color || '#fff';
  el.style.left = pt.x + 'px';
  el.style.top = pt.y + 'px';
  el.style.fontSize = text.length > 8 ? '14px' : '18px';
  $('fx').appendChild(el);
  const t0 = performance.now();
  function step(now) {
    const p = (now - t0) / 900;
    if (p >= 1) { el.remove(); return; }
    el.style.top = (pt.y - p * 36) + 'px';
    el.style.opacity = String(1 - p);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showBanner(b) {
  const box = $('banner');
  if (!b) { box.className = ''; box.classList.remove('on'); return; }
  box.classList.add('on');
  box.classList.toggle('bad', b.good === false);
  $('bannerTtl').textContent = b.text;
  $('bannerSub').textContent = b.sub || '';
  $('bannerTap').textContent = b.tap ? 'Tap the ring to continue' : '';
}

function setHp(you, foe) {
  const hud = $('hpHud');
  if (you == null) { hud.classList.remove('on'); return; }
  hud.classList.add('on');
  $('hpYou').style.width = Math.max(0, Math.min(100, you * 100)) + '%';
  $('hpFoe').style.width = Math.max(0, Math.min(100, foe * 100)) + '%';
}

function currentFoe() {
  const L = ladder();
  const idx = rematchIdx == null ? Math.min(game.beaten, L.length - 1) : rematchIdx;
  return { idx, foe: L[idx], rematch: idx < game.beaten };
}

function paintLook() {
  const look = CL.lookFor(game.chicken.lookId);
  if (world) world.setLook(look.body, look.comb);
}

let plotButtons = null;
function paintGarden() {
  const now = Date.now();
  const states = game.garden.plots.map((p) => CL.plotState(p, now));
  if (world) {
    world.setGarden(states);
    world.setEgg(CL.canCollectEgg(game.coop, now));
    world.setCare(game.chicken.energy);
  }
  const box = $('plots');
  if (!plotButtons || plotButtons.length !== CL.PLOT_COUNT + 1) {
    box.innerHTML = '';
    plotButtons = [];
    for (let i = 0; i < CL.PLOT_COUNT; i += 1) {
      const b = document.createElement('button');
      b.className = 'plot';
      b.addEventListener('click', () => {
        const st = CL.plotState(game.garden.plots[i]);
        if (st === 'empty') doPlant(i);
        else if (st === 'ready') doHarvest(i);
      });
      box.appendChild(b);
      plotButtons.push(b);
    }
    const nest = document.createElement('button');
    nest.className = 'plot nest';
    nest.addEventListener('click', doCollectEgg);
    box.appendChild(nest);
    plotButtons.push(nest);
  }
  const locked = !!busy();
  for (let i = 0; i < CL.PLOT_COUNT; i += 1) {
    const b = plotButtons[i];
    const st = states[i];
    b.classList.toggle('glow', st === 'ready');
    if (st === 'empty') {
      b.innerHTML = '<b>🌱</b>Plant 8🪙';
      b.disabled = locked || !CL.canPlant(game.chicken, game.garden, i);
    } else if (st === 'growing') {
      const sec = Math.ceil(CL.plotReadyIn(game.garden.plots[i], now) / 1000);
      b.innerHTML = '<b>🌽</b>' + sec + 's';
      b.disabled = true;
    } else {
      b.innerHTML = '<b>✨</b>Harvest';
      b.disabled = locked;
    }
  }
  const nest = plotButtons[CL.PLOT_COUNT];
  const eggReady = CL.canCollectEgg(game.coop, now);
  nest.classList.toggle('glow', eggReady);
  if (eggReady) {
    nest.innerHTML = '<b>🥚</b>Collect ' + CL.EGG_COINS + '🪙';
    nest.disabled = locked;
  } else {
    const sec = Math.ceil(CL.coopReadyIn(game.coop, now) / 1000);
    nest.innerHTML = '<b>🪺</b>Egg in ' + sec + 's';
    nest.disabled = true;
  }
}

function busy() {
  const f = world && world.fighting && world.fighting();
  return !!(f && !f.done) || !!timing;
}

const BET_CHIPS = [5, 10, 25, 50, 100];
function renderBets() {
  const box = $('bets');
  box.innerHTML = '<span class="lbl">Bet</span>';
  const coins = game.chicken.coins;
  const chips = BET_CHIPS.slice();
  if (coins > 100) chips.push('max');
  chips.forEach((v) => {
    const b = document.createElement('button');
    b.className = 'bet';
    const val = v === 'max' ? coins : v;
    b.textContent = v === 'max' ? 'All ' + coins : String(v);
    b.disabled = val > coins || !!busy();
    if (val === bet) b.classList.add('on');
    b.onclick = () => { bet = val; updateUI(); };
    box.appendChild(b);
  });
}

function paintLooks() {
  const box = $('looks');
  box.innerHTML = '';
  CL.LOOKS.forEach((look) => {
    const b = document.createElement('button');
    b.className = 'look' + (look.id === game.chicken.lookId ? ' on' : '');
    b.style.background = look.body;
    b.style.boxShadow = 'inset 0 -10px 0 ' + look.comb;
    b.title = look.name;
    b.setAttribute('aria-label', look.name);
    b.disabled = !!busy();
    b.onclick = () => {
      CL.setLook(game.chicken, look.id);
      paintLook();
      save();
      updateUI();
      sfx.tap();
    };
    box.appendChild(b);
  });
}

function updateUI() {
  const c = game.chicken;
  const fight = world && world.fighting && world.fighting();
  const mid = !!(fight && !fight.done);
  $('goal').style.display = fight ? 'none' : 'block';
  if (mid) {
    document.querySelectorAll('.panel button:not(.tab)').forEach((b) => { b.disabled = true; });
    $('coinChip').textContent = '🪙 ' + displayCoins;
    $('energyTxt').textContent = Math.round(c.energy) + '/100';
    $('energyFill').style.width = c.energy + '%';
    return;
  }
  if (bet > c.coins) bet = Math.max(CL.MIN_BET, BET_CHIPS.filter((v) => v <= c.coins).pop() || CL.MIN_BET);
  $('lvlChip').textContent = 'Lv ' + c.level;
  $('coinChip').textContent = '🪙 ' + c.coins;
  $('energyTxt').textContent = Math.round(c.energy) + '/100';
  $('energyFill').style.width = c.energy + '%';
  $('xpTxt').textContent = c.xp + '/' + c.xpNeed;
  $('xpFill').style.width = Math.min(100, c.xp / c.xpNeed * 100) + '%';
  const champ = game.beaten >= CL.RIVALS.length;
  const L = ladder();
  $('goal').innerHTML = (champ ? '👑 <b>Champion' + stars(game.tier) + '</b> · ' + game.name : 'Goal: beat <b>' + L[L.length - 1].name + '</b> · rival ' + (game.beaten + 1) + '/' + L.length);
  if (world) world.setChampion(champ);

  $('tAtk').textContent = 'ATK ' + fmt(c.atk);
  $('tSpd').textContent = 'SPD ' + fmt(c.spd);
  $('tDef').textContent = 'DEF ' + fmt(c.def);
  const lock = !!fight;
  document.querySelectorAll('[data-train]').forEach((b) => { b.disabled = lock || !CL.canTrain(c); });
  $('feedBtn').disabled = lock || !CL.canFeed(c);
  $('napBtn').disabled = lock || !CL.canRest(c);

  const { idx, foe, rematch } = currentFoe();
  $('ladder').innerHTML = L.map((r, i) => '<i class="' + (i < game.beaten ? 'done' : i === game.beaten ? 'now' : '') + '" title="' + r.name + '"></i>').join('');
  $('rivalName').textContent = foe.name + (rematch ? ' (rematch)' : '');
  $('rivalSub').textContent = 'Rival ' + (idx + 1) + ' of ' + CL.RIVALS.length + ' · purse ' + (rematch ? Math.floor(foe.purse / 4) : foe.purse) + '🪙';
  $('rivalPic').style.background = foe.color;
  const rows = [['❤️ HP', c.hp, foe.hp], ['🥊 ATK', c.atk, foe.atk], ['🛡️ DEF', c.def, foe.def], ['💨 SPD', c.spd, foe.spd]];
  $('vsTable').innerHTML = '<tr><td></td><td>' + game.name + '</td><td>' + foe.name + '</td></tr>' + rows.map((r) => '<tr><td>' + r[0] + '</td><td class="' + (r[1] >= r[2] ? 'up' : 'down') + '">' + fmt(r[1]) + '</td><td>' + r[2] + '</td></tr>').join('');
  const p = CL.estimateWinChance(c, foe);
  const word = p >= 0.75 ? 'Easy' : p >= 0.5 ? 'Even fight' : p >= 0.25 ? 'Risky' : p > 0.02 ? 'Very tough' : 'Way too strong, train more';
  $('oddsTxt').textContent = 'Odds: ' + word + ' (' + Math.round(p * 100) + '%)';
  $('oddsFill').style.width = Math.max(4, p * 100) + '%';
  $('oddsFill').style.background = p >= 0.5 ? 'var(--green)' : p >= 0.25 ? 'var(--gold)' : 'var(--red)';
  renderBets();
  $('fightBtn').disabled = lock || !CL.canFight(c, bet);
  $('fightBtn').textContent = c.energy < CL.FIGHT_ENERGY ? 'Too tired (needs 20⚡)' : c.coins < bet ? 'Not enough coins' : 'FIGHT! bet ' + bet + '🪙';
  const rm = $('rematch');
  rm.innerHTML = '';
  if (game.beaten > 0) {
    const selected = rematchIdx == null ? (champ ? L.length - 1 : null) : rematchIdx;
    const mk = (label, val) => { const b = document.createElement('button'); b.textContent = label; if (val === selected) b.classList.add('on'); b.disabled = lock; b.onclick = () => { rematchIdx = val; updateUI(); }; rm.appendChild(b); };
    if (!champ) mk('Next: ' + L[game.beaten].name, null);
    for (let i = 0; i < Math.min(game.beaten, L.length); i++) mk('Rematch ' + L[i].name, i);
  }
  syncPreview();
  $('champBox').style.display = CL.canPromote(game) ? 'block' : 'none';
  $('champNext').textContent = 'Tier' + stars(game.tier + 1);
  $('promoteBtn').disabled = lock;

  $('sHp').textContent = fmt(c.hp);
  $('sAtk').textContent = fmt(c.atk);
  $('sDef').textContent = fmt(c.def);
  $('sSpd').textContent = fmt(c.spd);
  $('sRec').textContent = game.wins + '-' + game.losses;
  $('ptsNum').textContent = c.points;
  $('ptsBox').style.display = c.points > 0 ? 'block' : 'none';
  $('ptsBadge').style.display = c.points > 0 ? 'block' : 'none';
  $('ptsBadge').textContent = c.points;
  document.querySelectorAll('.plus').forEach((b) => { b.disabled = lock || c.points <= 0; });
  $('renameBtn').disabled = lock; $('resetBtn').disabled = lock;
  paintLooks();
  paintGarden();
}

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
  document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + t.dataset.tab));
  syncPreview();
}));

function fightTabOn() {
  const t = document.querySelector('.tab[data-tab="fight"]');
  return !!(t && t.classList.contains('on'));
}

let holdPreviewUntil = 0;
function syncPreview() {
  if (!world) return;
  const f = world.fighting && world.fighting();
  if (f) return;
  if (Date.now() < holdPreviewUntil) return;
  if (fightTabOn()) {
    const { foe } = currentFoe();
    world.showRival(foe.color, foe.comb);
  } else {
    world.hideRival();
  }
}

function afterLevels(levels) {
  if (levels && levels.length) {
    if (world) { world.play('level'); world.burstAtMe('#ffd34d', 14); }
    toast('⭐ Level up! +3 points, +15 health');
    sfx.level();
  }
}

const STAT_NAME = { atk: 'ATK', def: 'DEF', spd: 'SPD' };
const TIMING_SPEED = 1.15;
const TIMING_LIMIT = 3.2;
let timing = null;

function openTiming(type) {
  if (timing || busy()) return;
  if (!CL.canTrain(game.chicken)) { toast('Need more energy!'); return; }
  sfx.tap();
  timing = { type, t0: performance.now(), pos: 0 };
  $('timingLabel').textContent = { peck: '🥊 Peck', run: '💨 Run', dodge: '🛡️ Dodge' }[type] + ': tap in the green!';
  $('timing').classList.add('on');
  document.querySelectorAll('[data-train]').forEach((x) => { x.disabled = true; });
  if (window.innerWidth < 860) document.querySelector('.stage').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  requestAnimationFrame(stepTiming);
}
function stepTiming(now) {
  if (!timing) return;
  const el = (now - timing.t0) / 1000;
  const ph = (el * TIMING_SPEED) % 2;
  timing.pos = ph < 1 ? ph : 2 - ph;
  $('needle').style.left = (timing.pos * 100) + '%';
  if (el > TIMING_LIMIT) { closeTiming('miss'); return; }
  requestAnimationFrame(stepTiming);
}
function closeTiming(forced) {
  if (!timing) return;
  const t = timing; timing = null;
  $('timing').classList.remove('on');
  doTrain(t.type, forced || CL.gradeTap(t.pos));
}
function doTrain(type, grade) {
  const r = CL.train(game.chicken, type, undefined, grade);
  if (!r.ok) { toast(r.reason); updateUI(); return; }
  if (world) world.play(type);
  const gw = { perfect: ['PERFECT!', '#ffd34d'], good: ['GOOD', '#ffffff'], miss: ['MISS', '#ff8a8e'] }[r.quality];
  const pt = world ? world.meScreen() : { x: 80, y: 80 };
  floatAt(pt, gw[0], gw[1]);
  floatAt({ x: pt.x, y: pt.y + 22 }, '+' + r.bonus.toFixed(1) + ' ' + STAT_NAME[r.stat], '#4cd17b');
  if (r.quality === 'perfect') { sfx.perfect(); if (world) world.burstAtMe('#ffd34d', 10); }
  else if (r.quality === 'miss') sfx.miss();
  else sfx.cluck();
  afterLevels(r.levels);
  save(); updateUI();
}

function doPlant(slot) {
  if (busy()) return;
  const r = CL.plant(game.chicken, game.garden, slot);
  if (!r.ok) { toast(r.reason); return; }
  sfx.coin();
  if (world) world.play('plot', { slot: slot });
  toast('Corn planted — back in 45 seconds');
  save(); updateUI();
}
function doHarvest(slot) {
  if (busy()) return;
  const r = CL.harvest(game.chicken, game.garden, slot);
  if (!r.ok) { toast(r.reason); return; }
  sfx.coin();
  if (world) { world.play('plot', { slot: slot }); world.burstAtMe('#ffd34d', 8); }
  const pt = world ? world.meScreen() : { x: 80, y: 80 };
  floatAt(pt, '+' + r.coins + '🪙', '#ffd34d');
  save(); updateUI();
}
function doCollectEgg() {
  if (busy()) return;
  const r = CL.collectEgg(game.chicken, game.coop);
  if (!r.ok) { toast(r.reason); return; }
  sfx.coin();
  if (world) { world.play('egg'); world.burstAtMe('#fff6e8', 8); }
  const pt = world ? world.meScreen() : { x: 80, y: 80 };
  floatAt(pt, '+' + r.coins + '🪙', '#ffd34d');
  toast('Warm egg from the nest');
  save(); updateUI();
}

$('timing').addEventListener('pointerdown', (e) => { e.preventDefault(); closeTiming(); });
document.addEventListener('keydown', (e) => {
  if (timing && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); closeTiming(); }
});
document.querySelectorAll('[data-train]').forEach((b) => b.addEventListener('click', () => openTiming(b.dataset.train)));
$('feedBtn').addEventListener('click', () => {
  const r = CL.feed(game.chicken);
  if (!r.ok) { toast(r.reason); return; }
  if (world) world.play('eat');
  sfx.coin();
  save(); updateUI();
});
$('napBtn').addEventListener('click', () => {
  const r = CL.rest(game.chicken);
  if (!r.ok) { toast(r.reason); return; }
  if (world) world.play('nap');
  sfx.nap();
  if (r.coins) toast('Found ' + r.coins + ' coins in the hay');
  save(); updateUI();
});
document.querySelectorAll('.plus').forEach((b) => b.addEventListener('click', () => {
  const r = CL.addPoint(game.chicken, b.dataset.stat);
  if (!r.ok) { toast(r.reason); return; }
  sfx.tap();
  save(); updateUI();
}));
$('fightBtn').addEventListener('click', startBrawl);
function startBrawl() {
  if (busy() || (world && world.fighting && world.fighting())) return;
  const coinsBefore = game.chicken.coins;
  const r = CL.fightRival(game, bet, undefined, rematchIdx == null ? undefined : rematchIdx);
  if (!r.ok) { toast(r.reason); return; }
  displayCoins = Math.max(0, coinsBefore - r.bet);
  if (r.won && !r.rematch) rematchIdx = null;
  save();
  sfx.bell();
  r.youMax = game.chicken.hp;
  if (world) {
    world.startFight(r);
    if (!(world.getReduceMotion && world.getReduceMotion())) $('skipBtn').style.display = 'block';
    $('hpFoeName').firstChild.textContent = r.foe.name + ' ';
    setHp(1, 1);
  }
  updateUI();
  if (window.innerWidth < 860) document.querySelector('.stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('renameBtn').addEventListener('click', () => {
  const n = prompt('Name your chicken', game.name);
  if (n == null) return;
  game.name = CL.cleanName(n); save(); updateUI();
});
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Start over with a new chicken? Your progress will be lost.')) return;
  game = CL.createGame(game.name); rematchIdx = null; bet = 10; displayCoins = game.chicken.coins;
  paintLook(); save(); updateUI();
  toast('A new chick hatched 🐣');
});
$('promoteBtn').addEventListener('click', () => {
  if (busy()) return;
  const r = CL.promote(game);
  if (!r.ok) { toast(r.reason); return; }
  rematchIdx = null; save(); updateUI(); sfx.level();
  toast('👑 Tier' + stars(r.tier) + ' started! The rivals got tougher. Train up.');
});
$('skipBtn').addEventListener('click', () => { if (world) world.skipFight(); });

function onFightOver(r) {
  $('skipBtn').style.display = 'none';
  if (r.won) {
    showBanner({ text: r.newChampion ? 'CHAMPION! 👑' : 'VICTORY!', sub: '+' + r.reward + ' coins · +' + r.xp + ' XP' + (r.unlocked ? ' · ' + r.unlocked + ' unlocked' : ''), good: true, tap: true });
    sfx.win();
  } else {
    showBanner({ text: 'DEFEAT', sub: 'Lost ' + r.bet + ' coins · +' + r.xp + ' XP · train and try again', good: false, tap: true });
    sfx.lose();
  }
  updateUI();
  if (r.levels && r.levels.length) setTimeout(() => toast('⭐ Level ' + r.levels[r.levels.length - 1] + '! Spend your points in Chicken'), 600);
}
function onContinue() {
  const f = world && world.fighting && world.fighting();
  if (!f || !f.done) return;
  const champWin = !!(f.result && f.result.newChampion);
  world.leaveFight();
  showBanner(null);
  setHp(null, null);
  displayCoins = game.chicken.coins;
  if (champWin && world && world.celebrateChampion) {
    world.celebrateChampion();
    holdPreviewUntil = Date.now() + 2400;
  }
  updateUI();
}

try {
  world = createWorld($('stage'), {
    onPick(kind, slot) {
      if (kind === 'peck' || kind === 'run' || kind === 'dodge') openTiming(kind);
      else if (kind === 'feed') $('feedBtn').click();
      else if (kind === 'egg') doCollectEgg();
      else if (kind === 'plot') {
        const st = CL.plotState(game.garden.plots[slot]);
        if (st === 'empty') doPlant(slot);
        else if (st === 'ready') doHarvest(slot);
      }
    },
    onContinue,
    onBanner: showBanner,
    onHp: setHp,
    onSfx(name) { if (sfx[name]) sfx[name](); },
    onFloat: floatAt,
    onFightOver,
  });
} catch (err) {
  $('bootFail').style.display = 'block';
}

(function qualityToggle() {
  let q = 'auto';
  try { q = localStorage.getItem(QUAL_KEY) || 'auto'; } catch (e) {}
  function apply() {
    const use = q === 'high' ? 'high' : q === 'phone' ? 'phone' : (world && world.getQuality());
    if (world && (q === 'high' || q === 'phone')) world.setQuality(q);
    $('qualBtn').textContent = (use === 'phone') ? '📱' : '✨';
    $('qualBtn').title = use === 'phone' ? 'Phone graphics (tap for high)' : 'High graphics (tap for phone)';
  }
  apply();
  $('qualBtn').addEventListener('click', () => {
    const now = (world && world.getQuality()) === 'phone' ? 'high' : 'phone';
    q = now;
    try { localStorage.setItem(QUAL_KEY, q); } catch (e) {}
    apply();
    sfx.tap();
  });
})();

(function motionToggle() {
  let reduce = false;
  try {
    const saved = localStorage.getItem(MOTION_KEY);
    if (saved === '1' || saved === '0') reduce = saved === '1';
    else reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {}
  function apply() {
    if (world && world.setReduceMotion) world.setReduceMotion(reduce);
    $('motionBtn').textContent = reduce ? '⏸️' : '🎞️';
    $('motionBtn').title = reduce ? 'Motion off (tap to animate fights)' : 'Motion on (tap to skip fight playback)';
    $('motionBtn').setAttribute('aria-pressed', reduce ? 'true' : 'false');
  }
  apply();
  $('motionBtn').addEventListener('click', () => {
    reduce = !reduce;
    try { localStorage.setItem(MOTION_KEY, reduce ? '1' : '0'); } catch (e) {}
    apply();
    sfx.tap();
  });
})();

setInterval(() => { if (!document.hidden) paintGarden(); }, 1000);
updateUI();
if (isNew) setTimeout(() => toast('Train up, then beat 8 rivals to become champion. Start with Pip!'), 400);
save();

window.__cluck = { game: () => game, world: () => world, timing: () => timing };
