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
  // Cage presentation: the 40 exchanges play as 5 rounds of 8. Only the
  // pacing and the scorecards use this; the fight math is unchanged.
  const ROUND_EXCHANGES = 8;
  const FIGHT_ROUNDS = MAX_ROUNDS / ROUND_EXCHANGES;
  const SAVE_VERSION = 4;
  const TRAIN_TYPES = { peck: 'atk', run: 'spd', dodge: 'def' };
  // Tap-timing training: how well you timed the tap scales the gain.
  const TRAIN_QUALITY = { perfect: 1.5, good: 1, miss: 0.6 };
  const MAX_TIER = 20;
  const PLOT_COUNT = 3;
  const PLANT_COST = 8;
  const GROW_MS = 45000;
  const HARVEST_COINS = 18;
  const HARVEST_ENERGY = 15;
  // Crops on the same three plots. Wheat trades a slower grow for a bigger
  // harvest, so it suits leaving the tab; corn is the quick snack between
  // fights. Coins per minute stay close so neither is a must-pick.
  const CROPS = {
    corn: { id: 'corn', name: 'Corn', icon: '🌽', cost: PLANT_COST, growMs: GROW_MS, coins: HARVEST_COINS, energy: HARVEST_ENERGY },
    wheat: { id: 'wheat', name: 'Wheat', icon: '🌾', cost: 14, growMs: 120000, coins: 40, energy: 5 },
  };
  // Coop nest: one coin egg at a time, like a tiny Egg Case Farm loop.
  // Cap of one waiting egg so it never becomes an AFK tycoon.
  const LAY_MS = 60000;
  const EGG_COINS = 6;
  // Looks are cosmetic only. Colors are authored here so the 3D chicken
  // and the save file stay in sync without shipping image assets.
  const LOOKS = [
    { id: 0, name: 'Snow', body: '#fff4e0', comb: '#ff3b3b' },
    { id: 1, name: 'Honey', body: '#f2d16b', comb: '#e04848' },
    { id: 2, name: 'Cocoa', body: '#b5652b', comb: '#d12f2f' },
    { id: 3, name: 'Storm', body: '#8a8f99', comb: '#c22424' },
    { id: 4, name: 'Ink', body: '#2a2a2e', comb: '#ffd700' },
    { id: 5, name: 'Sky', body: '#7eb6ff', comb: '#ff6b9d' },
  ];

  // Rival mode: one recurring nemesis who drops by the fence. No bet, a
  // short cooldown between bouts, and a rank that rises when you win and
  // slips when you lose, so it stays a close fight without becoming a farm.
  const NEMESIS = { name: 'Rusty', color: '#c8553d', comb: '#ffd34d' };
  const NEMESIS_COOLDOWN_MS = 90000;
  const NEMESIS_MAX_RANK = 40;
  const NEMESIS_STYLES = [
    { id: 'brawler', label: 'Brawler', hp: 1, atk: 1.25, def: 0.85, spd: 0.9 },
    { id: 'sprinter', label: 'Sprinter', hp: 0.95, atk: 0.9, def: 0.85, spd: 1.3 },
    { id: 'tank', label: 'Tank', hp: 1.2, atk: 0.9, def: 1.3, spd: 0.8 },
  ];

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
      lookId: 0,
    };
  }

  function createGarden() {
    const plots = [];
    for (let i = 0; i < PLOT_COUNT; i += 1) plots.push(null);
    return { plots: plots };
  }

  function createCoop(now) {
    return { lastCollectAt: now == null ? Date.now() : now };
  }

  function createRivalry(now) {
    return { rank: 0, wins: 0, losses: 0, readyAt: now == null ? Date.now() : now };
  }

  function createGame(name) {
    return {
      version: SAVE_VERSION,
      name: cleanName(name),
      chicken: createChicken(),
      garden: createGarden(),
      coop: createCoop(),
      rivalry: createRivalry(),
      beaten: 0, // how many rivals on the ladder you have beaten
      tier: 0, // champion tier: 0 = first ladder, +1 each time you go for a new crown
      wins: 0,
      losses: 0,
    };
  }

  // Adopt Me–style mood for animation only. Never locks play.
  function careMood(energy) {
    const e = Number(energy);
    if (!Number.isFinite(e)) return 'idle';
    if (e < 20) return 'sleepy';
    if (e < 50) return 'hungry';
    if (e >= 80) return 'perky';
    return 'idle';
  }

  function lookFor(id) {
    const n = Math.floor(num(id, 0, 0, LOOKS.length - 1));
    return LOOKS[n];
  }

  function setLook(chicken, id) {
    const look = LOOKS[id];
    if (!look) return { ok: false, reason: 'Unknown look' };
    chicken.lookId = look.id;
    return { ok: true, look: look };
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

  // Grade a tap on the timing bar. pos is where the marker was (0..1).
  // The sweet spot sits in the middle of the bar.
  function gradeTap(pos) {
    const d = Math.abs(Number(pos) - 0.5);
    if (!Number.isFinite(d)) return 'miss';
    if (d <= 0.07) return 'perfect';
    if (d <= 0.2) return 'good';
    return 'miss';
  }

  function train(chicken, type, rng, quality) {
    const roll = rng || Math.random;
    const q = TRAIN_QUALITY[quality] || 1;
    if (!TRAIN_TYPES[type]) return { ok: false, reason: 'Unknown training' };
    if (chicken.energy < TRAIN_ENERGY) return { ok: false, reason: 'Need more energy!' };
    chicken.energy -= TRAIN_ENERGY;
    const bonus = Math.round((0.8 + roll() * 0.6) * q * 10) / 10;
    const stat = TRAIN_TYPES[type];
    chicken[stat] = Math.round((chicken[stat] + bonus) * 10) / 10;
    const xp = Math.round((20 + Math.floor(roll() * 15)) * q);
    const levels = gainXP(chicken, xp);
    return { ok: true, type: type, stat: stat, bonus: bonus, xp: xp, levels: levels, quality: TRAIN_QUALITY[quality] ? quality : 'good' };
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

  function normalizeGarden(raw) {
    const garden = createGarden();
    const src = raw && typeof raw === 'object' ? raw.plots : null;
    if (!Array.isArray(src)) return garden;
    for (let i = 0; i < PLOT_COUNT; i += 1) {
      const p = src[i];
      if (p && typeof p === 'object' && Number.isFinite(Number(p.plantedAt))) {
        garden.plots[i] = { crop: cropFor(p.crop).id, plantedAt: Math.floor(Number(p.plantedAt)) };
      }
    }
    return garden;
  }

  // Unknown or missing crop ids fall back to corn (old saves only had corn).
  function cropFor(id) {
    return Object.prototype.hasOwnProperty.call(CROPS, id) ? CROPS[id] : CROPS.corn;
  }

  function plotState(plot, now) {
    if (!plot) return 'empty';
    const t = (now == null ? Date.now() : now) - plot.plantedAt;
    if (t >= cropFor(plot.crop).growMs) return 'ready';
    return 'growing';
  }

  function plotReadyIn(plot, now) {
    if (!plot) return 0;
    const left = cropFor(plot.crop).growMs - ((now == null ? Date.now() : now) - plot.plantedAt);
    return Math.max(0, left);
  }

  // 0..1 for the growing animation (sprout height, button fill).
  function plotProgress(plot, now) {
    if (!plot) return 0;
    const grow = cropFor(plot.crop).growMs;
    return Math.max(0, Math.min(1, 1 - plotReadyIn(plot, now) / grow));
  }

  function canPlant(chicken, garden, slot, crop) {
    const i = slot | 0;
    return !!garden && i >= 0 && i < PLOT_COUNT && !garden.plots[i] && chicken.coins >= cropFor(crop).cost;
  }

  function plant(chicken, garden, slot, now, crop) {
    const i = slot | 0;
    const c = cropFor(crop);
    if (!garden || i < 0 || i >= PLOT_COUNT) return { ok: false, reason: 'No such plot' };
    if (garden.plots[i]) return { ok: false, reason: 'Plot is already planted' };
    if (chicken.coins < c.cost) return { ok: false, reason: 'Need ' + c.cost + ' coins to plant ' + c.name.toLowerCase() };
    chicken.coins -= c.cost;
    garden.plots[i] = { crop: c.id, plantedAt: now == null ? Date.now() : now };
    return { ok: true, slot: i, crop: c.id, growMs: c.growMs };
  }

  function harvest(chicken, garden, slot, now) {
    const i = slot | 0;
    if (!garden || i < 0 || i >= PLOT_COUNT) return { ok: false, reason: 'No such plot' };
    const plot = garden.plots[i];
    if (!plot) return { ok: false, reason: 'Nothing planted' };
    if (plotState(plot, now) !== 'ready') return { ok: false, reason: 'Still growing' };
    const c = cropFor(plot.crop);
    garden.plots[i] = null;
    chicken.coins += c.coins;
    const before = chicken.energy;
    chicken.energy = Math.min(100, chicken.energy + c.energy);
    return { ok: true, slot: i, crop: c.id, coins: c.coins, energy: chicken.energy - before };
  }

  // One-tap farm round for phones: harvest everything that is ready, then
  // replant every empty plot with the chosen seed while coins allow.
  function tendAll(chicken, garden, crop, now) {
    if (!garden) return { ok: false, reason: 'No garden' };
    const t = now == null ? Date.now() : now;
    const harvested = [];
    const planted = [];
    let coins = 0;
    let energy = 0;
    for (let i = 0; i < PLOT_COUNT; i += 1) {
      if (plotState(garden.plots[i], t) !== 'ready') continue;
      const r = harvest(chicken, garden, i, t);
      harvested.push(i);
      coins += r.coins;
      energy += r.energy;
    }
    for (let i = 0; i < PLOT_COUNT; i += 1) {
      if (!canPlant(chicken, garden, i, crop)) continue;
      const r = plant(chicken, garden, i, t, crop);
      planted.push(i);
      coins -= cropFor(r.crop).cost;
    }
    if (!harvested.length && !planted.length) {
      const empty = garden.plots.some((p) => !p);
      return { ok: false, reason: empty ? 'Need ' + cropFor(crop).cost + ' coins to plant' : 'Nothing ready yet' };
    }
    return { ok: true, harvested: harvested, planted: planted, coins: coins, energy: energy };
  }

  function canTend(chicken, garden, crop, now) {
    if (!garden) return false;
    for (let i = 0; i < PLOT_COUNT; i += 1) {
      if (plotState(garden.plots[i], now) === 'ready') return true;
      if (canPlant(chicken, garden, i, crop)) return true;
    }
    return false;
  }

  function normalizeCoop(raw, now) {
    const t = now == null ? Date.now() : now;
    if (raw && typeof raw === 'object' && Number.isFinite(Number(raw.lastCollectAt))) {
      return { lastCollectAt: Math.min(t, Math.floor(Number(raw.lastCollectAt))) };
    }
    return createCoop(t);
  }

  function coopState(coop, now) {
    if (!coop) return 'laying';
    return coopReadyIn(coop, now) <= 0 ? 'ready' : 'laying';
  }

  function coopReadyIn(coop, now) {
    const t = now == null ? Date.now() : now;
    const last = coop && Number.isFinite(Number(coop.lastCollectAt)) ? Number(coop.lastCollectAt) : t;
    return Math.max(0, LAY_MS - (t - last));
  }

  function canCollectEgg(coop, now) {
    return coopState(coop, now) === 'ready';
  }

  function collectEgg(chicken, coop, now) {
    if (!chicken || !coop) return { ok: false, reason: 'No nest' };
    if (!canCollectEgg(coop, now)) return { ok: false, reason: 'No egg yet' };
    chicken.coins += EGG_COINS;
    coop.lastCollectAt = now == null ? Date.now() : now;
    return { ok: true, coins: EGG_COINS };
  }

  // Closed-form win chance so the Fight tab does not run 150 full
  // simulations on every UI refresh (that hitch is ugly on phones).
  function estimateWinChance(you, foe) {
    function swingDmg(att, def) {
      const dodge = dodgeChance(def.spd, att.spd);
      const raw = hitDamage(att.atk, def.def, 0.5);
      // 10% crit at 1.6×, matching simulate().
      return (1 - dodge) * raw * 1.06;
    }
    const youHit = Math.max(0.35, swingDmg(you, foe));
    const foeHit = Math.max(0.35, swingDmg(foe, you));
    let youSwings = foe.hp / youHit;
    let foeSwings = you.hp / foeHit;
    // Faster bird pecks first; a 40% speed gap also gets a bonus peck
    // every 3rd round, which we fold in as extra effective swings.
    if (you.spd >= foe.spd) youSwings -= 0.45;
    else foeSwings -= 0.45;
    if (you.spd >= foe.spd * 1.4) youSwings *= 0.88;
    else if (foe.spd >= you.spd * 1.4) foeSwings *= 0.88;
    const delta = foeSwings - youSwings;
    const p = 1 / (1 + Math.exp(-0.55 * delta));
    return Math.max(0.01, Math.min(0.99, p));
  }

  function rivalFor(beaten) {
    return RIVALS[Math.max(0, Math.min(RIVALS.length - 1, beaten | 0))];
  }

  // Champion tiers: after you win the crown you can start a tougher ladder.
  // Same rivals, every stat and purse scaled up. Fixed numbers, so the
  // only way through is more training (no shortcuts).
  function tierScale(tier) {
    const t = Math.max(0, Math.min(MAX_TIER, tier | 0));
    return { stat: 1 + t * 0.45, purse: 1 + t * 0.6 };
  }
  function rivalsForTier(tier) {
    const t = Math.max(0, Math.min(MAX_TIER, tier | 0));
    if (t === 0) return RIVALS;
    const k = tierScale(t);
    return RIVALS.map(function (r) {
      return {
        name: r.name + ' ' + '★'.repeat(Math.min(t, 3)) + (t > 3 ? t : ''),
        color: r.color, comb: r.comb,
        hp: Math.round(r.hp * k.stat), atk: Math.round(r.atk * k.stat),
        def: Math.round(r.def * k.stat), spd: Math.round(r.spd * k.stat),
        purse: Math.round(r.purse * k.purse),
      };
    });
  }
  function canPromote(game) {
    return game.beaten >= RIVALS.length && (game.tier | 0) < MAX_TIER;
  }
  // Start the next champion tier: the ladder resets with tougher rivals.
  // You keep your chicken, coins and record.
  function promote(game) {
    if (!canPromote(game)) return { ok: false, reason: 'Beat the whole ladder first' };
    game.tier = (game.tier | 0) + 1;
    game.beaten = 0;
    return { ok: true, tier: game.tier };
  }

  function nemesisStyle(rank) {
    const r = Math.max(0, rank | 0);
    return NEMESIS_STYLES[r % NEMESIS_STYLES.length];
  }

  // Rusty's stats come from his rank, not from yours, so training still
  // pays off. The curve starts just under a fresh chicken and climbs
  // roughly as fast as the ladder does.
  function nemesisFor(rank) {
    const r = Math.max(0, Math.min(NEMESIS_MAX_RANK, rank | 0));
    const style = nemesisStyle(r);
    return {
      name: NEMESIS.name,
      color: NEMESIS.color,
      comb: NEMESIS.comb,
      rank: r,
      style: style.id,
      styleLabel: style.label,
      hp: Math.round((85 + 45 * r) * style.hp),
      atk: Math.round((9 + 4.5 * r) * style.atk),
      def: Math.round((4 + 3 * r) * style.def),
      spd: Math.round((5 + 3.2 * r) * style.spd),
      purse: 15 + 8 * r,
    };
  }

  function normalizeRivalry(raw, now) {
    const t = now == null ? Date.now() : now;
    const base = createRivalry(t);
    if (!raw || typeof raw !== 'object') return base;
    base.rank = Math.floor(num(raw.rank, 0, 0, NEMESIS_MAX_RANK));
    base.wins = Math.floor(num(raw.wins, 0, 0, 1e9));
    base.losses = Math.floor(num(raw.losses, 0, 0, 1e9));
    // A save from the future (clock change) cannot lock the rival out for long.
    base.readyAt = Math.floor(num(raw.readyAt, t, 0, t + NEMESIS_COOLDOWN_MS));
    return base;
  }

  function nemesisReadyIn(rivalry, now) {
    const t = now == null ? Date.now() : now;
    if (!rivalry) return 0;
    return Math.max(0, Number(rivalry.readyAt || 0) - t);
  }

  function canFightNemesis(game, now) {
    return !!game.rivalry && nemesisReadyIn(game.rivalry, now) <= 0 && game.chicken.energy >= FIGHT_ENERGY;
  }

  // A bout with the nemesis. No bet: winning pays his purse and ranks him
  // up; losing costs only energy and he eases off a rank.
  function fightNemesis(game, rng, now) {
    const t = now == null ? Date.now() : now;
    if (!game.rivalry) game.rivalry = createRivalry(t);
    const rv = game.rivalry;
    const chicken = game.chicken;
    if (nemesisReadyIn(rv, t) > 0) return { ok: false, reason: NEMESIS.name + ' is catching his breath' };
    if (chicken.energy < FIGHT_ENERGY) return { ok: false, reason: 'Need more energy!' };
    const foe = nemesisFor(rv.rank);
    chicken.energy -= FIGHT_ENERGY;
    const sim = simulate(chicken, foe, rng || Math.random);
    let reward = 0;
    let xp = 10;
    if (sim.won) {
      reward = foe.purse;
      chicken.coins += reward;
      xp = 30 + 5 * foe.rank;
      rv.wins += 1;
      rv.rank = Math.min(NEMESIS_MAX_RANK, rv.rank + 1);
    } else {
      rv.losses += 1;
      rv.rank = Math.max(0, rv.rank - 1);
    }
    const levels = gainXP(chicken, xp);
    rv.readyAt = t + NEMESIS_COOLDOWN_MS;
    return {
      ok: true,
      mode: 'nemesis',
      won: sim.won,
      bet: 0,
      reward: reward,
      turns: sim.rounds,
      firstSide: sim.firstSide,
      pHp: sim.youHp,
      aHp: sim.foeHp,
      log: sim.beats,
      levels: levels,
      xp: xp,
      foe: foe,
      rank: rv.rank,
      rematch: false,
      newChampion: false,
    };
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
        beats.push({ who: att.side, kind: 'dodge', dmg: 0, youHp: a.hp, foeHp: b.hp, ex: rounds });
        return;
      }
      const crit = roll() < 0.1;
      let dmg = hitDamage(att.atk, def.def, roll());
      if (crit) dmg *= 1.6;
      dmg = Math.max(1, Math.round(dmg));
      def.hp = Math.max(0, def.hp - dmg);
      beats.push({ who: att.side, kind: crit ? 'crit' : 'hit', dmg: dmg, youHp: a.hp, foeHp: b.hp, ex: rounds });
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

  // Which cage round (1..5) an exchange falls in.
  function roundOf(ex) {
    const e = Math.max(1, ex | 0);
    return Math.min(FIGHT_ROUNDS, Math.floor((e - 1) / ROUND_EXCHANGES) + 1);
  }

  // Betting-line odds from a win chance, the way fight cards print them.
  // Favourites are negative (bet that much to win 100), underdogs positive.
  function moneyline(p) {
    const q = Math.max(0.01, Math.min(0.99, Number(p) || 0.5));
    if (q >= 0.5) return -Math.round((100 * q) / (1 - q));
    return Math.round((100 * (1 - q)) / q);
  }
  function moneylineText(p) {
    const m = moneyline(p);
    return m > 0 ? '+' + m : String(m);
  }

  const MOVES = {
    hit: ['jab peck', 'wing slap', 'spur kick', 'body peck', 'head peck', 'leg kick'],
    crit: ['flying spur kick', 'spinning wing slap', 'beak uppercut', 'takedown and ground peck'],
    dodge: ['slips the peck', 'hops back', 'ducks under it', 'checks the kick'],
  };
  // Commentary name for a beat. Deterministic, so a replay reads the same.
  function moveName(beat, i) {
    const list = MOVES[beat && beat.kind] || MOVES.hit;
    const seed = ((i | 0) * 7 + ((beat && beat.dmg) | 0) * 3 + ((beat && beat.ex) | 0)) >>> 0;
    return list[seed % list.length];
  }

  // How the fight ended, plus three judges' cards when it went the distance.
  // A round goes 10-9 to whoever did more damage (10-8 when it was double),
  // 10-10 when even. Judges 2 and 3 score close rounds a touch differently
  // so split decisions can happen.
  function fightSummary(result) {
    const log = (result && result.log) || [];
    const last = log[log.length - 1];
    const won = !!(result && result.won);
    const lastRound = last ? roundOf(last.ex) : 1;
    const finished = !!last && (last.youHp <= 0 || last.foeHp <= 0);
    if (finished) {
      return {
        method: last.kind === 'crit' ? 'KO' : 'TKO',
        round: lastRound,
        winner: won ? 'you' : 'foe',
        cards: null,
        text: (last.kind === 'crit' ? 'KO' : 'TKO') + ' · round ' + lastRound,
      };
    }
    const dmg = [];
    for (let r = 0; r < FIGHT_ROUNDS; r += 1) dmg.push({ you: 0, foe: 0 });
    log.forEach((b) => { if (b.dmg) dmg[roundOf(b.ex) - 1][b.who] += b.dmg; });
    const rounds = dmg.slice(0, lastRound);
    const cards = [0, 1, 2].map((j) => {
      let you = 0;
      let foe = 0;
      rounds.forEach((d, r) => {
        const total = d.you + d.foe;
        let diff = total ? (d.you - d.foe) / total : 0;
        // Judges 2 and 3 lean a little on alternate rounds.
        if (j > 0) diff += ((r + j) % 2 ? 0.08 : -0.08);
        if (Math.abs(diff) < 0.05) { you += 10; foe += 10; }
        else if (diff > 0) { you += 10; foe += diff > 0.33 ? 8 : 9; }
        else { foe += 10; you += -diff > 0.33 ? 8 : 9; }
      });
      return [you, foe];
    });
    // The winner is decided by the rules (health share); the cards are
    // flavour, so make sure they never contradict the result.
    const forWinner = cards.filter((c) => (won ? c[0] > c[1] : c[1] > c[0])).length;
    if (forWinner < 2) {
      for (let j = 0; j < 3 && cards.filter((c) => (won ? c[0] > c[1] : c[1] > c[0])).length < 2; j += 1) {
        const c = cards[j];
        if (won ? c[0] <= c[1] : c[1] <= c[0]) {
          // Take a point off the loser rather than give one past 10 a round.
          if (won) c[1] = c[0] - 1; else c[0] = c[1] - 1;
        }
      }
    }
    const agree = cards.filter((c) => (won ? c[0] > c[1] : c[1] > c[0])).length;
    const kind = agree === 3 ? 'Unanimous' : 'Split';
    return {
      method: 'DEC',
      round: lastRound,
      winner: won ? 'you' : 'foe',
      cards: cards,
      text: kind + ' decision · ' + cards.map((c) => (won ? c[0] + '-' + c[1] : c[1] + '-' + c[0])).join(', '),
    };
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
    let xp = 10;
    if (sim.won) {
      // Bet comes back doubled, plus the rival's purse (a quarter on rematches).
      const purse = isRematch ? Math.floor(foe.purse / 4) : foe.purse;
      reward = parsed.bet * 2 + purse;
      chicken.coins += reward;
      xp = (isRematch ? 15 : 40) + Math.floor(foe.hp / 5);
      levels = gainXP(chicken, xp);
    } else {
      levels = gainXP(chicken, xp);
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
      xp: xp,
      foe: foe,
    };
  }

  // Fight the next rival on the ladder (or rematch an already-beaten one).
  function fightRival(game, rawBet, rng, index) {
    const top = Math.min(game.beaten, RIVALS.length - 1);
    const idx = index == null ? top : index | 0;
    if (idx < 0 || idx > top) return { ok: false, reason: 'That rival is locked' };
    const rematch = idx < game.beaten;
    const ladder = rivalsForTier(game.tier);
    const result = fight(game.chicken, rawBet, rng, ladder[idx], rematch);
    if (!result.ok) return result;
    result.rivalIndex = idx;
    result.rematch = rematch;
    result.newChampion = false;
    if (result.won) {
      game.wins += 1;
      if (!rematch && idx === game.beaten) {
        game.beaten = Math.min(RIVALS.length, game.beaten + 1);
        result.unlocked = game.beaten < RIVALS.length ? ladder[game.beaten].name : null;
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
      lookId: Math.floor(num(c.lookId, 0, 0, LOOKS.length - 1)),
    };
    base.garden = normalizeGarden(data.garden);
    base.coop = normalizeCoop(data.coop);
    base.rivalry = normalizeRivalry(data.rivalry);
    base.beaten = Math.floor(num(data.beaten, 0, 0, RIVALS.length));
    base.tier = Math.floor(num(data.tier, 0, 0, MAX_TIER));
    base.wins = Math.floor(num(data.wins, 0, 0, 1e9));
    base.losses = Math.floor(num(data.losses, 0, 0, 1e9));
    return base;
  }

  function saveGame(game) {
    return JSON.stringify({
      version: SAVE_VERSION,
      name: game.name,
      chicken: game.chicken,
      garden: game.garden || createGarden(),
      coop: game.coop || createCoop(),
      rivalry: game.rivalry || createRivalry(),
      beaten: game.beaten,
      tier: game.tier | 0,
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
    TRAIN_QUALITY: TRAIN_QUALITY,
    MAX_TIER: MAX_TIER,
    PLOT_COUNT: PLOT_COUNT,
    PLANT_COST: PLANT_COST,
    GROW_MS: GROW_MS,
    HARVEST_COINS: HARVEST_COINS,
    HARVEST_ENERGY: HARVEST_ENERGY,
    LAY_MS: LAY_MS,
    EGG_COINS: EGG_COINS,
    LOOKS: LOOKS,
    CROPS: CROPS,
    ROUND_EXCHANGES: ROUND_EXCHANGES,
    FIGHT_ROUNDS: FIGHT_ROUNDS,
    roundOf: roundOf,
    moneyline: moneyline,
    moneylineText: moneylineText,
    moveName: moveName,
    fightSummary: fightSummary,
    NEMESIS: NEMESIS,
    NEMESIS_COOLDOWN_MS: NEMESIS_COOLDOWN_MS,
    NEMESIS_MAX_RANK: NEMESIS_MAX_RANK,
    cropFor: cropFor,
    plotProgress: plotProgress,
    tendAll: tendAll,
    canTend: canTend,
    createRivalry: createRivalry,
    nemesisFor: nemesisFor,
    normalizeRivalry: normalizeRivalry,
    nemesisReadyIn: nemesisReadyIn,
    canFightNemesis: canFightNemesis,
    fightNemesis: fightNemesis,
    careMood: careMood,
    gradeTap: gradeTap,
    tierScale: tierScale,
    rivalsForTier: rivalsForTier,
    canPromote: canPromote,
    promote: promote,
    RIVALS: RIVALS,
    createChicken: createChicken,
    createGarden: createGarden,
    createCoop: createCoop,
    createGame: createGame,
    lookFor: lookFor,
    setLook: setLook,
    normalizeGarden: normalizeGarden,
    plotState: plotState,
    plotReadyIn: plotReadyIn,
    canPlant: canPlant,
    plant: plant,
    harvest: harvest,
    normalizeCoop: normalizeCoop,
    coopState: coopState,
    coopReadyIn: coopReadyIn,
    canCollectEgg: canCollectEgg,
    collectEgg: collectEgg,
    estimateWinChance: estimateWinChance,
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
