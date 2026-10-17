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
