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
  const MAX_ROUNDS = 40;
  const SAVE_VERSION = 1;
  const TRAIN_TYPES = { peck: 'atk', run: 'spd', dodge: 'def' };

  // The rival ladder. Beat each one to unlock the next. Stats are fixed, so
  // the only way up is to train and level your own chicken (no shortcuts).
  const RIVALS = [
    { name: 'Pip', color: '#f2d16b', comb: '#e04848', hp: 70, atk: 8, def: 3, spd: 4, purse: 20 },
    { name: 'Nugget', color: '#d9a35b', comb: '#d12f2f', hp: 110, atk: 12, def: 6, spd: 7, purse: 40 },
    { name: 'Scratch', color: '#8a8f99', comb: '#c22', hp: 160, atk: 17, def: 9, spd: 11, purse: 65 },
    { name: 'Drumstick', color: '#b5652b', comb: '#e33', hp: 220, atk: 22, def: 13, spd: 15, purse: 95 },
    { name: 'Feather Fury', color: '#e8e8e8', comb: '#ff3b6b', hp: 290, atk: 28, def: 17, spd: 20, purse: 130 },
    { name: 'Iron Beak', color: '#4b5563', comb: '#f43f5e', hp: 370, atk: 34, def: 22, spd: 24, purse: 175 },
    { name: 'Thunder Hen', color: '#3b3f8f', comb: '#facc15', hp: 460, atk: 41, def: 27, spd: 29, purse: 230 },
    { name: 'King Comb', color: '#1f1f1f', comb: '#ffd700', hp: 580, atk: 50, def: 33, spd: 35, purse: 350 },
  ];

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

  function createGame(name) {
    return {
      version: SAVE_VERSION,
      name: cleanName(name),
      chicken: createChicken(),
      beaten: 0, // how many rivals on the ladder you have beaten
      wins: 0,
      losses: 0,
    };
  }

  function cleanName(name) {
    const s = String(name == null ? '' : name).replace(/[^\w \-']/g, '').trim().slice(0, 14);
    return s || 'Clucky';
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
    if (chicken.coins < FEED_COST) return { ok: false, reason: 'Need 15 coins to feed' };
    if (chicken.energy >= 100) return { ok: false, reason: 'Energy is already full' };
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
    const stat = TRAIN_TYPES[type];
    chicken[stat] = Math.round((chicken[stat] + bonus) * 10) / 10;
    const xp = 20 + Math.floor(roll() * 15);
    const levels = gainXP(chicken, xp);
    return { ok: true, type: type, stat: stat, bonus: bonus, xp: xp, levels: levels };
  }

  // Napping is the free fallback: only when you are too tired to fight,
  // so feeding (coins) stays the fast way to get energy back.
  function canRest(chicken) {
    return chicken.energy < FIGHT_ENERGY;
  }

  function rest(chicken) {
    if (chicken.energy >= FIGHT_ENERGY) return { ok: false, reason: 'Not tired yet' };
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

  function rivalFor(beaten) {
    return RIVALS[Math.max(0, Math.min(RIVALS.length - 1, beaten | 0))];
  }

  // Dodge chance grows when the defender is faster than the attacker.
  function dodgeChance(defSpd, atkSpd) {
    return Math.max(0.04, Math.min(0.4, 0.08 + (defSpd - atkSpd) * 0.025));
  }

  function hitDamage(atk, def, roll) {
    return Math.max(1, (atk - def * 0.5) * 1.6 * (0.85 + roll * 0.3));
  }

  // Simulates a whole fight as a list of beats the UI can animate.
  // Each round the faster chicken (speed) moves first. Speed also gives
  // dodges, and a much faster chicken gets a bonus peck every few rounds.
  function simulate(you, foe, rng) {
    const roll = rng || Math.random;
    const a = { side: 'you', hp: you.hp, max: you.hp, atk: you.atk, def: you.def, spd: you.spd };
    const b = { side: 'foe', hp: foe.hp, max: foe.hp, atk: foe.atk, def: foe.def, spd: foe.spd };
    const beats = [];
    const first = a.spd >= b.spd ? a : b;
    const second = first === a ? b : a;

    function swing(att, def) {
      const r1 = roll();
      if (r1 < dodgeChance(def.spd, att.spd)) {
        beats.push({ who: att.side, kind: 'dodge', dmg: 0, youHp: a.hp, foeHp: b.hp });
        return;
      }
      const crit = roll() < 0.1;
      let dmg = hitDamage(att.atk, def.def, roll());
      if (crit) dmg *= 1.6;
      dmg = Math.max(1, Math.round(dmg));
      def.hp = Math.max(0, def.hp - dmg);
      beats.push({ who: att.side, kind: crit ? 'crit' : 'hit', dmg: dmg, youHp: a.hp, foeHp: b.hp });
    }

    let rounds = 0;
    while (a.hp > 0 && b.hp > 0 && rounds < MAX_ROUNDS) {
      rounds += 1;
      swing(first, second);
      if (second.hp <= 0) break;
      swing(second, first);
      if (first.hp <= 0) break;
      // Bonus peck for a chicken that is at least 40% faster, every 3rd round.
      if (rounds % 3 === 0) {
        const fast = first.spd >= second.spd * 1.4 ? first : null;
        if (fast) {
          swing(fast, second);
          if (second.hp <= 0) break;
        }
      }
    }
    let won;
    if (a.hp <= 0) won = false;
    else if (b.hp <= 0) won = true;
    else won = a.hp / a.max > b.hp / b.max; // time out: better health share wins, ties lose
    return { won: won, rounds: rounds, firstSide: first.side, beats: beats, youHp: a.hp, foeHp: b.hp };
  }

  // fight(chicken, bet, rng, rival, isRematch)
  function fight(chicken, rawBet, rng, rival, isRematch) {
    const roll = rng || Math.random;
    const parsed = parseBet(rawBet);
    if (!parsed.ok) return parsed;
    if (chicken.coins < parsed.bet) return { ok: false, reason: 'Not enough coins' };
    if (chicken.energy < FIGHT_ENERGY) return { ok: false, reason: 'Need more energy!' };

    const foe = rival || RIVALS[0];
    chicken.coins -= parsed.bet;
    chicken.energy -= FIGHT_ENERGY;

    const sim = simulate(chicken, foe, roll);
    let reward = 0;
    let levels = [];
    if (sim.won) {
      // Bet comes back doubled, plus the rival's purse (a quarter on rematches).
      const purse = isRematch ? Math.floor(foe.purse / 4) : foe.purse;
      reward = parsed.bet * 2 + purse;
      chicken.coins += reward;
      levels = gainXP(chicken, (isRematch ? 15 : 40) + Math.floor(foe.hp / 5));
    } else {
      levels = gainXP(chicken, 10);
      if (chicken.coins < SCRAP_COINS) chicken.coins = SCRAP_COINS;
    }

    return {
      ok: true,
      won: sim.won,
      bet: parsed.bet,
      reward: reward,
      turns: sim.rounds,
      firstSide: sim.firstSide,
      pHp: sim.youHp,
      aHp: sim.foeHp,
      log: sim.beats,
      levels: levels,
      foe: foe,
    };
  }

  // Fight the next rival on the ladder (or rematch an already-beaten one).
  function fightRival(game, rawBet, rng, index) {
    const top = Math.min(game.beaten, RIVALS.length - 1);
    const idx = index == null ? top : index | 0;
    if (idx < 0 || idx > top) return { ok: false, reason: 'That rival is locked' };
    const rematch = idx < game.beaten;
    const result = fight(game.chicken, rawBet, rng, RIVALS[idx], rematch);
    if (!result.ok) return result;
    result.rivalIndex = idx;
    result.rematch = rematch;
    result.newChampion = false;
    if (result.won) {
      game.wins += 1;
      if (!rematch && idx === game.beaten) {
        game.beaten = Math.min(RIVALS.length, game.beaten + 1);
        result.unlocked = game.beaten < RIVALS.length ? RIVALS[game.beaten].name : null;
        result.newChampion = game.beaten === RIVALS.length;
      }
    } else {
      game.losses += 1;
    }
    return result;
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

  function num(v, fallback, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  // Turns stored JSON back into a safe game. Bad or missing data falls
  // back to a fresh chicken instead of breaking the page.
  function loadGame(raw) {
    let data;
    try {
      data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return null;
    }
    if (!data || typeof data !== 'object' || !data.chicken || typeof data.chicken !== 'object') return null;
    const base = createGame(data.name);
    const c = data.chicken;
    const d = base.chicken;
    base.chicken = {
      level: Math.floor(num(c.level, d.level, 1, 999)),
      xp: Math.floor(num(c.xp, d.xp, 0, 1e9)),
      xpNeed: Math.floor(num(c.xpNeed, d.xpNeed, 1, 1e12)),
      coins: Math.floor(num(c.coins, d.coins, 0, 1e9)),
      energy: num(c.energy, d.energy, 0, 100),
      hp: num(c.hp, d.hp, 1, 1e6),
      atk: num(c.atk, d.atk, 0, 1e6),
      def: num(c.def, d.def, 0, 1e6),
      spd: num(c.spd, d.spd, 0, 1e6),
      points: Math.floor(num(c.points, d.points, 0, 1e6)),
    };
    base.beaten = Math.floor(num(data.beaten, 0, 0, RIVALS.length));
    base.wins = Math.floor(num(data.wins, 0, 0, 1e9));
    base.losses = Math.floor(num(data.losses, 0, 0, 1e9));
    return base;
  }

  function saveGame(game) {
    return JSON.stringify({
      version: SAVE_VERSION,
      name: game.name,
      chicken: game.chicken,
      beaten: game.beaten,
      wins: game.wins,
      losses: game.losses,
    });
  }

  return {
    TRAIN_ENERGY: TRAIN_ENERGY,
    FEED_COST: FEED_COST,
    FIGHT_ENERGY: FIGHT_ENERGY,
    MIN_BET: MIN_BET,
    REST_ENERGY: REST_ENERGY,
    SCRAP_COINS: SCRAP_COINS,
    TRAIN_TYPES: TRAIN_TYPES,
    RIVALS: RIVALS,
    createChicken: createChicken,
    createGame: createGame,
    cleanName: cleanName,
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
    rivalFor: rivalFor,
    dodgeChance: dodgeChance,
    simulate: simulate,
    fight: fight,
    fightRival: fightRival,
    actionAvailability: actionAvailability,
    loadGame: loadGame,
    saveGame: saveGame,
  };
});
