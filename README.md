# Cluck Life

A phone-first raise-and-fight chicken game. Train your bird on a **cozy 3D farm**, plant a little corn, and climb a ladder of 8 rivals. Everything is earned by playing — no shop, no passcode, no account.

Play it as a static site from `dist/` or from this folder.

## How it plays

- **Train** (12 energy): Peck = attack, Run = speed, Dodge = defense. Tap when the needle is in the green for a Perfect (1.5×). You can also tap the dummy, track, or dodge posts in the yard.
- **Feed** (15 coins) for +50 energy. **Nap** is free (+25 energy) when you are too tired to fight.
- **Garden**: pick a seed. Corn costs 8 coins, is ready in 45 seconds, and pays 18 coins plus a sip of energy. Wheat costs 14, takes 2 minutes, and pays 40. Crops grow even if you leave the tab. **Tend all** harvests whatever is ready and replants the empty plots in one tap. Still three plots.
- **Coop nest**: one coin egg every 60 seconds. Collect 6 coins. Only one egg waits, so it never becomes an AFK farm.
- **Looks** on the Chicken tab are cosmetic only. The Fight tab previews the rival in the ring.
- **Fight** (20 energy) the next rival with a coin bet. The faster chicken pecks first; speed also helps dodges. Win = bet back ×2 + the purse.
- **Rival mode**: Rusty, a red rooster, waits by the fence when he wants a bout. Tap him, or use Fight → 🔥 Rival. No bet. A win pays his purse and he returns a rank tougher, cycling brawler / sprinter / tank. A loss costs only energy and he eases off a rank. He needs 90 seconds between bouts.
- **Cage fights**: every bout plays in the CLUCK FC cage under the lights, with a crowd, a referee, a tale of the tape, and betting lines. Up to 5 rounds of 8 exchanges with the bell between rounds, live commentary, and a slow-motion finish. Fights end by KO (finishing crit), TKO, or a judges' decision with three scorecards. You don't control the fight: odds and results come from your trained stats.
- **Cartoon gore** is on by default: feathers fly, blood splats stain the mat, and wounds build up on both birds; a knocked-out bird gets X eyes and dizzy stars. Turn it off on the Chicken tab (feathers and scuffs only).
- After **King Comb**, take a tougher champion tier. You keep your chicken, coins, and record.
- Sound is made in code. 🔊 mutes it. ✨ / 📱 switches high vs phone graphics. 🎞️ skips fight playback (also follows your system reduce-motion setting).
- Progress saves in the browser (`localStorage`). Old saves still load.

Drag the farm to look around.

## Run

```bash
npm test        # rules: betting, energy, ladder, crops, tend all, nest, rival mode, looks, odds, save/load
npm run build   # static site into dist/
npm start       # http://127.0.0.1:8765
```

The page needs a local server (ES modules). Opening `index.html` as a file will not load Three.js.

## Files

- `game.js` — rules (pure functions, shared by the page and the tests)
- `world.js` — Three.js farm, chickens, cage fights, and effects
- `models.js` — free low-poly models built in code (cage, crowd, referee, rooster tail, crown, windmill, scarecrow, well, pumpkins, hay rolls, mailbox); static props baked to one draw call
- `app.js` — UI, save, sound
- `index.html` — layout
- `vendor/three.module.min.js` — [Three.js r170](https://threejs.org/) (MIT)
- `game.test.js` — node tests
- `docs/RESEARCH.md` — comparable games and what we borrowed
- `docs/HANDOFF.md` — what changed and what is next

## Genre neighbors (not copies)

Cluck Life keeps its own art, code, and loop. These are the games we studied:

- [Duck Life (Wix Games)](https://games.wixgames.co.uk/game.php?id=ducklife1) — train, feed, contest
- [Grow a Garden](https://www.roblox.com/games/126884695634066/Grow-a-Garden) — a plot that grows while you are away
- [Adopt Me!](https://www.roblox.com/games/920587237/Adopt-Me) — care you can see
- [Brookhaven RP](https://www.roblox.com/games/4924922222/Brookhaven-RP) — walk into a place with no gate
- [Three.js](https://threejs.org/) — the 3D engine

See [docs/RESEARCH.md](docs/RESEARCH.md) for sources and the exact feature list.
