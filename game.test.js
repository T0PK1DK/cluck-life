const { test } = require('node:test');
const assert = require('node:assert/strict');
const game = require('./game.js');

function fixedRng(values) {
  let i = 0;
  return function () {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

test('parseBet rejects negative, tiny, and junk bets', () => {
  assert.equal(game.parseBet(-50).ok, false);
  assert.equal(game.parseBet(0).ok, false);
  assert.equal(game.parseBet(4).ok, false);
  assert.equal(game.parseBet('abc').ok, false);
  assert.deepEqual(game.parseBet('20'), { ok: true, bet: 20 });
  assert.deepEqual(game.parseBet(5), { ok: true, bet: 5 });
});

test('negative bets do not grant coins', () => {
  const chicken = game.createChicken();
  const before = chicken.coins;
  const result = game.fight(chicken, -50, fixedRng([0.5]));
  assert.equal(result.ok, false);
  assert.equal(chicken.coins, before);
  assert.equal(chicken.energy, 100);
});

test('rest recovers a broke chicken so play can continue', () => {
  const chicken = game.createChicken();
  chicken.coins = 0;
  chicken.energy = 0;

  assert.equal(game.canFeed(chicken), false);
  assert.equal(game.canTrain(chicken), false);
  assert.equal(game.canFight(chicken, 5), false);
  assert.equal(game.canRest(chicken), true);

  const recovered = game.rest(chicken);
  assert.equal(recovered.ok, true);
  assert.equal(chicken.energy, game.REST_ENERGY);
  assert.equal(chicken.coins, game.SCRAP_COINS);
  assert.equal(game.canTrain(chicken), true);
  assert.equal(game.canFight(chicken, 5), chicken.energy >= game.FIGHT_ENERGY);
});

test('losing with no coins leaves scrap coins instead of a soft-lock', () => {
  const chicken = game.createChicken();
  chicken.coins = 5;
  chicken.hp = 1;
  chicken.atk = 1;
  chicken.def = 0;
  const result = game.fight(chicken, 5, fixedRng([0]));
  assert.equal(result.ok, true);
  assert.equal(result.won, false);
  assert.equal(chicken.coins, game.SCRAP_COINS);
});

test('feed and train keep the original costs and effects', () => {
  const chicken = game.createChicken();
  chicken.energy = 40;
  const fed = game.feed(chicken);
  assert.equal(fed.ok, true);
  assert.equal(chicken.coins, 85);
  assert.equal(chicken.energy, 90);

  const trained = game.train(chicken, 'peck', fixedRng([0, 0]));
  assert.equal(trained.ok, true);
  assert.equal(chicken.atk, 10.8);
  assert.equal(chicken.energy, 78);
  assert.equal(chicken.xp, 20);
});

test('actionAvailability disables spent points and full-energy rest', () => {
  const chicken = game.createChicken();
  const ready = game.actionAvailability(chicken, 20);
  assert.equal(ready.feed, false);
  assert.equal(ready.train, true);
  assert.equal(ready.rest, false);
  assert.equal(ready.fight, true);
  assert.equal(ready.points, false);

  chicken.points = 1;
  assert.equal(game.addPoint(chicken, 'spd').ok, true);
  assert.equal(chicken.spd, 6);
  assert.equal(chicken.points, 0);
});

function seeded(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('the faster chicken strikes first', () => {
  const fast = { hp: 100, atk: 10, def: 5, spd: 20 };
  const slow = { hp: 100, atk: 10, def: 5, spd: 4 };
  assert.equal(game.simulate(fast, slow, seeded(1)).firstSide, 'you');
  assert.equal(game.simulate(slow, fast, seeded(1)).firstSide, 'foe');
  assert.equal(game.simulate(slow, fast, seeded(1)).beats[0].who, 'foe');
});

test('speed raises dodge chance, capped', () => {
  assert.ok(game.dodgeChance(15, 5) > game.dodgeChance(5, 5));
  assert.ok(game.dodgeChance(5, 15) < game.dodgeChance(5, 5));
  assert.equal(game.dodgeChance(999, 0), 0.4);
  assert.equal(game.dodgeChance(0, 999), 0.04);
});

test('speed actually changes fight outcomes', () => {
  const foe = game.RIVALS[1];
  function winRate(spd) {
    const rng = seeded(42);
    let wins = 0;
    for (let i = 0; i < 400; i += 1) {
      if (game.simulate({ hp: 110, atk: 12, def: 6, spd: spd }, foe, rng).won) wins += 1;
    }
    return wins / 400;
  }
  assert.ok(winRate(16) > winRate(4) + 0.15);
});

test('fight beats are a playable timeline that ends the fight', () => {
  const chicken = game.createChicken();
  const result = game.fight(chicken, 10, seeded(7), game.RIVALS[0]);
  assert.equal(result.ok, true);
  assert.ok(result.log.length >= 3);
  for (const beat of result.log) {
    assert.ok(beat.who === 'you' || beat.who === 'foe');
    assert.ok(['hit', 'crit', 'dodge'].includes(beat.kind));
    if (beat.kind === 'dodge') assert.equal(beat.dmg, 0);
    else assert.ok(beat.dmg >= 1);
  }
  const lastBeat = result.log[result.log.length - 1];
  assert.equal(lastBeat.foeHp, result.aHp);
  assert.equal(lastBeat.youHp, result.pHp);
});

test('a fresh chicken can beat Pip but not Nugget', () => {
  const rng = seeded(3);
  let pip = 0;
  let nugget = 0;
  for (let i = 0; i < 200; i += 1) {
    if (game.simulate(game.createChicken(), game.RIVALS[0], rng).won) pip += 1;
    if (game.simulate(game.createChicken(), game.RIVALS[1], rng).won) nugget += 1;
  }
  assert.ok(pip > 180);
  assert.ok(nugget < 20);
});

test('beating the next rival unlocks the one after; rematches pay less and do not advance', () => {
  const g = game.createGame('Test');
  const win = game.fightRival(g, 10, seeded(5));
  assert.equal(win.won, true);
  assert.equal(g.beaten, 1);
  assert.equal(win.unlocked, 'Nugget');
  assert.equal(g.chicken.coins, 100 - 10 + 10 * 2 + game.RIVALS[0].purse);

  g.chicken.energy = 100;
  const coins = g.chicken.coins;
  const re = game.fightRival(g, 10, seeded(5), 0);
  assert.equal(re.rematch, true);
  assert.equal(re.won, true);
  assert.equal(g.beaten, 1);
  assert.equal(g.chicken.coins, coins - 10 + 20 + Math.floor(game.RIVALS[0].purse / 4));

  assert.equal(game.fightRival(g, 10, seeded(5), 3).ok, false);
});

test('beating the last rival makes you champion', () => {
  const g = game.createGame('Champ');
  g.beaten = game.RIVALS.length - 1;
  Object.assign(g.chicken, { hp: 5000, atk: 500, def: 200, spd: 200 });
  const r = game.fightRival(g, 5, seeded(9));
  assert.equal(r.won, true);
  assert.equal(r.newChampion, true);
  assert.equal(g.beaten, game.RIVALS.length);
});

test('nap is only free when too tired to fight', () => {
  const chicken = game.createChicken();
  chicken.energy = 60;
  assert.equal(game.canRest(chicken), false);
  assert.equal(game.rest(chicken).ok, false);
  chicken.energy = 10;
  assert.equal(game.canRest(chicken), true);
  assert.equal(game.rest(chicken).ok, true);
  assert.equal(chicken.energy, 35);
});

test('save and load round-trip, junk saves fall back safely', () => {
  const g = game.createGame('Nugs');
  game.train(g.chicken, 'run', seeded(2));
  g.beaten = 3;
  g.wins = 4;
  const back = game.loadGame(game.saveGame(g));
  assert.deepEqual(back.chicken, g.chicken);
  assert.equal(back.beaten, 3);
  assert.equal(back.wins, 4);
  assert.equal(back.name, 'Nugs');

  assert.equal(game.loadGame('not json'), null);
  assert.equal(game.loadGame(null), null);
  assert.equal(game.loadGame('{}'), null);
  const bad = game.loadGame(JSON.stringify({ chicken: { coins: -50, energy: 900, atk: 'x' }, beaten: 99, name: '<b>' }));
  assert.equal(bad.chicken.coins, 0);
  assert.equal(bad.chicken.energy, 100);
  assert.equal(bad.chicken.atk, 10);
  assert.equal(bad.beaten, game.RIVALS.length);
  assert.equal(bad.name, 'b');
});

test('tap timing: perfect beats good beats miss, default stays good', () => {
  assert.equal(game.gradeTap(0.5), 'perfect');
  assert.equal(game.gradeTap(0.62), 'good');
  assert.equal(game.gradeTap(0.05), 'miss');
  assert.equal(game.gradeTap('junk'), 'miss');
  const gains = {};
  for (const q of ['perfect', 'good', 'miss', undefined]) {
    const c = game.createChicken();
    const r = game.train(c, 'run', fixedRng([0.5, 0.5]), q);
    gains[String(q)] = { spd: c.spd, xp: r.xp };
  }
  assert.ok(gains.perfect.spd > gains.good.spd && gains.good.spd > gains.miss.spd);
  assert.ok(gains.perfect.xp > gains.good.xp && gains.good.xp > gains.miss.xp);
  assert.deepEqual(gains.undefined, gains.good);
});

test('champion tiers: only after the crown, tougher rivals, bigger purses, saved', () => {
  const g = game.createGame('Champ');
  assert.equal(game.canPromote(g), false);
  assert.equal(game.promote(g).ok, false);
  g.beaten = game.RIVALS.length;
  assert.equal(game.promote(g).ok, true);
  assert.equal(g.tier, 1);
  assert.equal(g.beaten, 0);
  const t1 = game.rivalsForTier(1);
  assert.equal(t1.length, game.RIVALS.length);
  assert.ok(t1[0].hp > game.RIVALS[0].hp && t1[0].purse > game.RIVALS[0].purse);
  assert.match(t1[0].name, /★/);
  // the first tier-1 rival is tougher than the tier-0 one
  Object.assign(g.chicken, { hp: 100, atk: 10, def: 5, spd: 5 });
  let wins0 = 0, wins1 = 0;
  for (let i = 0; i < 200; i++) {
    if (game.simulate(g.chicken, game.RIVALS[0], seeded(i)).won) wins0++;
    if (game.simulate(g.chicken, t1[0], seeded(i)).won) wins1++;
  }
  assert.ok(wins1 < wins0);
  const back = game.loadGame(game.saveGame(g));
  assert.equal(back.tier, 1);
  assert.equal(game.loadGame(JSON.stringify({ chicken: {}, tier: 999 })).tier, game.MAX_TIER);
  assert.equal(game.loadGame(JSON.stringify({ chicken: {} })).tier, 0);
});

test('looks are cosmetic and persist through save', () => {
  const g = game.createGame('Snow');
  assert.equal(g.chicken.lookId, 0);
  assert.equal(game.setLook(g.chicken, 99).ok, false);
  assert.equal(game.setLook(g.chicken, 4).ok, true);
  assert.equal(g.chicken.lookId, 4);
  assert.equal(game.lookFor(4).name, 'Ink');
  const back = game.loadGame(game.saveGame(g));
  assert.equal(back.chicken.lookId, 4);
  const old = game.loadGame(JSON.stringify({ chicken: { level: 2 }, beaten: 0 }));
  assert.equal(old.chicken.lookId, 0);
  assert.equal(old.garden.plots.length, game.PLOT_COUNT);
});

test('garden: plant costs coins, harvest pays after the grow timer', () => {
  const g = game.createGame('Farmer');
  const t0 = 1_000_000;
  assert.equal(game.canPlant(g.chicken, g.garden, 0), true);
  assert.equal(game.plant(g.chicken, g.garden, 0, t0).ok, true);
  assert.equal(g.chicken.coins, 92);
  assert.equal(game.plotState(g.garden.plots[0], t0 + 1000), 'growing');
  assert.equal(game.harvest(g.chicken, g.garden, 0, t0 + 1000).ok, false);
  const ready = game.harvest(g.chicken, g.garden, 0, t0 + game.GROW_MS);
  assert.equal(ready.ok, true);
  assert.equal(g.chicken.coins, 92 + game.HARVEST_COINS);
  assert.equal(g.chicken.energy, 100);
  assert.equal(g.garden.plots[0], null);
  assert.equal(game.plant(g.chicken, g.garden, 7, t0).ok, false);
  g.chicken.coins = 0;
  assert.equal(game.plant(g.chicken, g.garden, 1, t0).ok, false);
});

test('estimateWinChance tracks simulate without running a Monte Carlo on the UI thread', () => {
  function rate(you, foe, n) {
    const rng = seeded(11);
    let w = 0;
    for (let i = 0; i < n; i += 1) if (game.simulate(you, foe, rng).won) w += 1;
    return w / n;
  }
  const chick = game.createChicken();
  const pip = rate(chick, game.RIVALS[0], 240);
  const nug = rate(chick, game.RIVALS[1], 240);
  const ePip = game.estimateWinChance(chick, game.RIVALS[0]);
  const eNug = game.estimateWinChance(chick, game.RIVALS[1]);
  assert.ok(ePip > 0.7 && eNug < 0.35);
  assert.ok(Math.abs(ePip - pip) < 0.2);
  assert.ok(Math.abs(eNug - nug) < 0.2);
  const strong = { hp: 400, atk: 40, def: 20, spd: 30 };
  assert.ok(game.estimateWinChance(strong, game.RIVALS[0]) > 0.9);
});

test('the game stays open: createGame needs no passcode or gate', () => {
  const g = game.createGame('Clucky');
  assert.equal(g.name, 'Clucky');
  assert.equal(g.chicken.coins, 100);
  assert.equal(g.beaten, 0);
  assert.ok(game.canTrain(g.chicken));
  assert.ok(game.canFight(g.chicken, 10));
});

test('careMood is animation-only and never locks energy or fights', () => {
  assert.equal(game.careMood(100), 'perky');
  assert.equal(game.careMood(80), 'perky');
  assert.equal(game.careMood(60), 'idle');
  assert.equal(game.careMood(40), 'hungry');
  assert.equal(game.careMood(10), 'sleepy');
  assert.equal(game.careMood('nope'), 'idle');
  const c = game.createChicken();
  c.energy = 10;
  assert.equal(game.careMood(c.energy), 'sleepy');
  assert.equal(game.canRest(c), true);
  assert.equal(game.canFight(c, 10), false);
  assert.equal(game.canTrain(c), false);
});

test('coop nest: one egg at a time, pays after the lay timer, old saves start laying', () => {
  const g = game.createGame('Farmer');
  const t0 = 2_000_000;
  g.coop = game.createCoop(t0);
  assert.equal(game.coopState(g.coop, t0), 'laying');
  assert.equal(game.canCollectEgg(g.coop, t0), false);
  assert.equal(game.collectEgg(g.chicken, g.coop, t0).ok, false);
  assert.equal(g.chicken.coins, 100);
  assert.equal(game.coopReadyIn(g.coop, t0 + 1000) > 0, true);
  assert.equal(game.coopState(g.coop, t0 + game.LAY_MS), 'ready');
  const first = game.collectEgg(g.chicken, g.coop, t0 + game.LAY_MS);
  assert.equal(first.ok, true);
  assert.equal(first.coins, game.EGG_COINS);
  assert.equal(g.chicken.coins, 100 + game.EGG_COINS);
  // still only one egg — collecting resets the clock
  assert.equal(game.canCollectEgg(g.coop, t0 + game.LAY_MS), false);
  assert.equal(game.collectEgg(g.chicken, g.coop, t0 + game.LAY_MS).ok, false);
  assert.equal(g.chicken.coins, 100 + game.EGG_COINS);
  const later = game.collectEgg(g.chicken, g.coop, t0 + game.LAY_MS * 2);
  assert.equal(later.ok, true);
  assert.equal(g.chicken.coins, 100 + game.EGG_COINS * 2);

  const old = game.loadGame(JSON.stringify({ chicken: { coins: 40 }, beaten: 0 }));
  assert.ok(old.coop);
  assert.equal(game.coopState(old.coop, Date.now()), 'laying');
  const future = Date.now() + 999999;
  const tamper = game.normalizeCoop({ lastCollectAt: future }, 5_000_000);
  assert.ok(tamper.lastCollectAt <= 5_000_000);

  g.coop.lastCollectAt = t0;
  const saved = game.loadGame(game.saveGame(g));
  assert.equal(saved.coop.lastCollectAt, t0);
  assert.equal(game.collectEgg(saved.chicken, saved.coop, t0 + game.LAY_MS).ok, true);
});
