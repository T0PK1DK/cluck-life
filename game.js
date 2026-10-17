(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CluckLife = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TRAIN_ENERGY = 12;
  const FEED_COST = 15;
  const FEED_ENERGY = 50;
  const FIGHT_ENERGY = 20;
  const MIN_BET = 5;
  const REST_ENERGY = 25;
  const SCRAP_COINS = 5;
  const TRAIN_TYPES = { peck: 'atk', run: 'spd', dodge: 'def' };

  function createChicken() {
    return {
      level: 1,
      xp: 0,
      xpNeed: 100,
      coins: 100,
      energy: 100,
      hp: 100,
      atk: 10,
      def: 5,
      spd: 5,
      points: 0,
    };
  }

  function parseBet(raw) {
    const bet = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(bet) || bet < MIN_BET) {
      return { ok: false, reason: 'Bet must be at least ' + MIN_BET + ' coins' };
    }
    return { ok: true, bet };
  }

  function gainXP(chicken, n) {
    const leveled = [];
    chicken.xp += n;
    while (chicken.xp >= chicken.xpNeed) {
      chicken.xp -= chicken.xpNeed;
      chicken.level += 1;
      chicken.points += 3;
      chicken.hp += 15;
      chicken.xpNeed = Math.floor(chicken.xpNeed * 1.35);
      leveled.push(chicken.level);
    }
    return leveled;
  }

  function addPoint(chicken, stat) {
    if (chicken.points <= 0) return { ok: false, reason: 'No points to spend' };
    if (stat !== 'atk' && stat !== 'def' && stat !== 'spd') {
      return { ok: false, reason: 'Unknown stat' };
    }
    chicken.points -= 1;
    chicken[stat] += 1;
    return { ok: true };
  }

  function canFeed(chicken) {
    return chicken.coins >= FEED_COST && chicken.energy < 100;
  }

  function feed(chicken) {
    if (chicken.coins < FEED_COST) return { ok: false, reason: "Need 15 coins to feed" };
    if (chicken.energy >= 100) return { ok: false, reason: "Energy is already full" };
    chicken.coins -= FEED_COST;
    chicken.energy = Math.min(100, chicken.energy + FEED_ENERGY);
    return { ok: true, message: 'Fed chicken. Energy restored.' };
  }

  function canTrain(chicken) {
    return chicken.energy >= TRAIN_ENERGY;
  }

  function train(chicken, type, rng) {
    const roll = rng || Math.random;
    if (!TRAIN_TYPES[type]) return { ok: false, reason: 'Unknown training' };
    if (chicken.energy < TRAIN_ENERGY) return { ok: false, reason: 'Need more energy!' };
    chicken.energy -= TRAIN_ENERGY;
    const bonus = 0.8 + roll() * 0.6;
    chicken[TRAIN_TYPES[type]] += bonus;
    const xp = 20 + Math.floor(roll() * 15);
    const levels = gainXP(chicken, xp);
    return { ok: true, type: type, bonus: bonus, xp: xp, levels: levels };
  }

  function canRest(chicken) {
    return chicken.energy < 100;
  }

  function rest(chicken) {
    if (chicken.energy >= 100) return { ok: false, reason: 'Energy is already full' };
    chicken.energy = Math.min(100, chicken.energy + REST_ENERGY);
    let coins = 0;
    if (chicken.coins < SCRAP_COINS) {
      coins = SCRAP_COINS - chicken.coins;
      chicken.coins = SCRAP_COINS;
    }
    return { ok: true, energy: REST_ENERGY, coins: coins };
  }

  function canFight(chicken, bet) {
    const parsed = parseBet(bet);
    return parsed.ok && chicken.coins >= parsed.bet && chicken.energy >= FIGHT_ENERGY;
  }

  function fight(chicken, rawBet, rng) {
    const roll = rng || Math.random;
    const parsed = parseBet(rawBet);
    if (!parsed.ok) return parsed;
    if (chicken.coins < parsed.bet) return { ok: false, reason: 'Not enough coins' };
    if (chicken.energy < FIGHT_ENERGY) return { ok: false, reason: 'Need more energy!' };

    chicken.coins -= parsed.bet;
    chicken.energy -= FIGHT_ENERGY;

    const ai = {
      hp: 90 + chicken.level * 10,
      atk: 9 + chicken.level * 1.5,
      def: 5 + chicken.level * 0.6,
      spd: 5 + chicken.level * 0.5,
    };

    let pHp = chicken.hp;
    let aHp = ai.hp;
    const log = [];
    let turns = 0;
    while (pHp > 0 && aHp > 0 && turns < 30) {
      turns += 1;
      let dmg = Math.max(1, (chicken.atk - ai.def * 0.4) * (0.8 + roll() * 0.5));
      aHp -= dmg;
      log.push({ who: 'you', dmg: dmg });
      if (aHp <= 0) break;
      dmg = Math.max(1, (ai.atk - chicken.def * 0.4) * (0.8 + roll() * 0.5));
      pHp -= dmg;
      log.push({ who: 'ai', dmg: dmg });
    }

    const won = pHp > 0;
    let reward = 0;
    let levels = [];
    if (won) {
      reward = Math.floor(parsed.bet * 1.8) + 25;
      chicken.coins += reward;
      levels = gainXP(chicken, 40 + chicken.level * 8);
    } else if (chicken.coins < SCRAP_COINS) {
      chicken.coins = SCRAP_COINS;
    }

    return {
      ok: true,
      won: won,
      bet: parsed.bet,
      reward: reward,
      turns: turns,
      pHp: pHp,
      aHp: aHp,
      log: log,
      levels: levels,
    };
  }

  function actionAvailability(chicken, rawBet) {
    return {
      feed: canFeed(chicken),
      train: canTrain(chicken),
      rest: canRest(chicken),
      fight: canFight(chicken, rawBet),
      points: chicken.points > 0,
    };
  }

  return {
    TRAIN_ENERGY: TRAIN_ENERGY,
    FEED_COST: FEED_COST,
    FIGHT_ENERGY: FIGHT_ENERGY,
    MIN_BET: MIN_BET,
    REST_ENERGY: REST_ENERGY,
    SCRAP_COINS: SCRAP_COINS,
    createChicken: createChicken,
    parseBet: parseBet,
    gainXP: gainXP,
    addPoint: addPoint,
    canFeed: canFeed,
    feed: feed,
    canTrain: canTrain,
    train: train,
    canRest: canRest,
    rest: rest,
    canFight: canFight,
    fight: fight,
    actionAvailability: actionAvailability,
  };
});
