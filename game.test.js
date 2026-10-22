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

test('wheat grows slower than corn and pays more; old corn plots still load', () => {
  const corn = game.CROPS.corn;
  const wheat = game.CROPS.wheat;
  assert.ok(wheat.growMs > corn.growMs);
  assert.ok(wheat.coins - wheat.cost > corn.coins - corn.cost);
  // Neither crop is a must-pick: coins per minute stay within 20%.
  const rate = (c) => (c.coins - c.cost) / c.growMs;
  assert.ok(Math.abs(rate(wheat) - rate(corn)) / rate(corn) < 0.2);

  const chicken = game.createChicken();
  const garden = game.createGarden();
  const t0 = 1000000;
  assert.equal(game.plant(chicken, garden, 0, t0, 'wheat').ok, true);
  assert.equal(chicken.coins, 100 - wheat.cost);
  assert.equal(game.plotState(garden.plots[0], t0 + corn.growMs), 'growing');
  assert.ok(game.plotProgress(garden.plots[0], t0 + wheat.growMs / 2) > 0.45);
  assert.equal(game.plotState(garden.plots[0], t0 + wheat.growMs), 'ready');
  const r = game.harvest(chicken, garden, 0, t0 + wheat.growMs);
  assert.equal(r.ok, true);
  assert.equal(r.crop, 'wheat');
  assert.equal(r.coins, wheat.coins);

  // Unknown seeds fall back to corn; a v3 save with crop:'corn' still works.
  assert.equal(game.cropFor('mutant-melon').id, 'corn');
  const g = game.loadGame(JSON.stringify({ chicken: game.createChicken(), garden: { plots: [{ crop: 'corn', plantedAt: 5 }, { crop: 'wheat', plantedAt: 6 }, { crop: '??', plantedAt: 7 }] } }));
  assert.deepEqual(g.garden.plots.map((p) => p.crop), ['corn', 'wheat', 'corn']);
  assert.equal(game.cropFor('__proto__').id, 'corn');
});

test('tend all harvests ready plots and replants while coins allow, still three plots', () => {
  const chicken = game.createChicken();
  const garden = game.createGarden();
  const t0 = 50000;
  game.plant(chicken, garden, 0, t0, 'corn');
  game.plant(chicken, garden, 1, t0, 'corn');
  const later = t0 + game.CROPS.corn.growMs;
  chicken.coins = 0;
  const r = game.tendAll(chicken, garden, 'wheat', later);
  assert.equal(r.ok, true);
  assert.deepEqual(r.harvested, [0, 1]);
  // 36 coins from corn buys two wheat (14 each), not three.
  assert.deepEqual(r.planted, [0, 1]);
  assert.equal(chicken.coins, 36 - 28);
  assert.equal(r.coins, 36 - 28);
  assert.equal(garden.plots.length, game.PLOT_COUNT);
  assert.equal(garden.plots[2], null);
  assert.equal(game.canTend(chicken, garden, 'wheat', later), false);
  const none = game.tendAll(chicken, garden, 'wheat', later);
  assert.equal(none.ok, false);
  // 8 coins left is exactly one corn seed for the last plot.
  assert.equal(game.canTend(chicken, garden, 'corn', later), true);
  chicken.coins = 7;
  assert.equal(game.canTend(chicken, garden, 'corn', later), false);
});

test('rival mode: Rusty starts beatable, ranks up on a win, eases off on a loss', () => {
  const g = game.createGame('Test');
  const now = 1e9;
  g.rivalry = game.createRivalry(now);
  assert.equal(game.canFightNemesis(g, now), true);
  const first = game.nemesisFor(0);
  assert.ok(game.estimateWinChance(g.chicken, first) > 0.5, 'a fresh chicken should usually beat rank 0');
  assert.ok(game.nemesisFor(5).hp > game.nemesisFor(1).hp);
  assert.notEqual(game.nemesisFor(0).style, game.nemesisFor(1).style);

  const win = game.fightNemesis(g, fixedRng([0.99, 0.0, 0.5]), now);
  assert.equal(win.ok, true);
  assert.equal(win.mode, 'nemesis');
  assert.equal(win.won, true);
  assert.equal(win.bet, 0);
  assert.equal(g.rivalry.rank, 1);
  assert.equal(g.rivalry.wins, 1);
  assert.equal(g.chicken.coins, 100 + first.purse);
  assert.equal(g.chicken.energy, 100 - game.FIGHT_ENERGY);
  // Ladder record is separate from the rivalry.
  assert.equal(g.wins, 0);
  assert.equal(g.beaten, 0);

  // Cooldown: no back-to-back farming.
  assert.equal(game.canFightNemesis(g, now + 1000), false);
  assert.equal(game.fightNemesis(g, Math.random, now + 1000).ok, false);
  assert.equal(game.nemesisReadyIn(g.rivalry, now + 1000), game.NEMESIS_COOLDOWN_MS - 1000);

  const later = now + game.NEMESIS_COOLDOWN_MS;
  g.chicken.hp = 1; g.chicken.atk = 0;
  const coins = g.chicken.coins;
  const loss = game.fightNemesis(g, fixedRng([0.99, 0.5]), later);
  assert.equal(loss.won, false);
  assert.equal(g.chicken.coins, coins, 'losing to Rusty never costs coins');
  assert.equal(g.rivalry.rank, 0);
  assert.equal(g.rivalry.losses, 1);
  assert.equal(game.fightNemesis(g, fixedRng([0.5]), later).ok, false, 'cooldown after a loss too');

  g.chicken.energy = 5;
  assert.equal(game.canFightNemesis(g, later + game.NEMESIS_COOLDOWN_MS), false);
});

test('rival mode saves, and old or tampered saves stay fair', () => {
  const now = Date.now();
  const g = game.createGame('Saver');
  g.rivalry = { rank: 3, wins: 4, losses: 1, readyAt: now + 5000 };
  const back = game.loadGame(game.saveGame(g));
  assert.equal(back.rivalry.rank, 3);
  assert.equal(back.rivalry.wins, 4);
  assert.equal(back.rivalry.losses, 1);
  assert.ok(back.rivalry.readyAt > now);

  const v3 = game.loadGame(JSON.stringify({ version: 3, chicken: game.createChicken() }));
  assert.equal(v3.rivalry.rank, 0);
  assert.equal(game.canFightNemesis(v3), true);

  const forged = game.normalizeRivalry({ rank: 9999, wins: -3, readyAt: now + 1e12 }, now);
  assert.equal(forged.rank, game.NEMESIS_MAX_RANK);
  assert.equal(forged.wins, 0);
  assert.ok(forged.readyAt <= now + game.NEMESIS_COOLDOWN_MS);
});

test('cage rounds: 40 exchanges play as 5 rounds of 8', () => {
  assert.equal(game.FIGHT_ROUNDS, 5);
  assert.equal(game.roundOf(1), 1);
  assert.equal(game.roundOf(8), 1);
  assert.equal(game.roundOf(9), 2);
  assert.equal(game.roundOf(40), 5);
  assert.equal(game.roundOf(999), 5);
  const sim = game.simulate(game.RIVALS[3], game.RIVALS[3], fixedRng([0.5, 0.9, 0.3]));
  sim.beats.forEach((b) => assert.ok(b.ex >= 1 && b.ex <= 40));
});

test('moneyline: favourites negative, underdogs positive, even is -100', () => {
  assert.equal(game.moneyline(0.5), -100);
  assert.equal(game.moneyline(0.8), -400);
  assert.equal(game.moneyline(0.2), 400);
  assert.equal(game.moneylineText(0.25), '+300');
  assert.equal(game.moneylineText(0.75), '-300');
  assert.ok(Number.isFinite(game.moneyline(1)) && Number.isFinite(game.moneyline(0)));
});

test('move names are deterministic commentary for each beat kind', () => {
  const b = { kind: 'crit', dmg: 30, ex: 4 };
  assert.equal(game.moveName(b, 3), game.moveName(b, 3));
  assert.ok(['flying spur kick', 'spinning wing slap', 'beak uppercut', 'takedown and ground peck'].includes(game.moveName(b, 3)));
  assert.ok(game.moveName({ kind: 'dodge', dmg: 0, ex: 1 }, 0).length > 0);
});

test('fight summary: KO on a crit finish, TKO on a hit, decisions never contradict the result', () => {
  const ko = game.fightSummary({ won: true, log: [{ who: 'you', kind: 'crit', dmg: 50, youHp: 40, foeHp: 0, ex: 10 }] });
  assert.equal(ko.method, 'KO');
  assert.equal(ko.round, 2);
  const tko = game.fightSummary({ won: false, log: [{ who: 'foe', kind: 'hit', dmg: 5, youHp: 0, foeHp: 9, ex: 3 }] });
  assert.equal(tko.method, 'TKO');
  assert.equal(tko.winner, 'foe');

  // Two tanks that can barely hurt each other go the distance.
  const tank = { hp: 900, atk: 4, def: 9, spd: 10 };
  for (const seed of [0.1, 0.4, 0.7]) {
    const sim = game.simulate(tank, tank, fixedRng([seed, 0.5, 0.95, 0.2]));
    const r = { won: sim.won, log: sim.beats };
    const s = game.fightSummary(r);
    assert.equal(s.method, 'DEC');
    assert.equal(s.cards.length, 3);
    const forWinner = s.cards.filter((c) => (sim.won ? c[0] > c[1] : c[1] > c[0])).length;
    assert.ok(forWinner >= 2, 'at least two judges agree with the result');
    s.cards.forEach((c) => assert.ok(c[0] <= 50 && c[1] <= 50));
  }
});
