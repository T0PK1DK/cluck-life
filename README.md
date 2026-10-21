# Cluck Life

A phone-first raise-and-fight chicken game. Train your bird on a **cozy 3D farm**, plant a little corn, and climb a ladder of 8 rivals. Everything is earned by playing — no shop, no passcode, no account.

Play it as a static site from `dist/` or from this folder.

## How it plays

- **Train** (12 energy): Peck = attack, Run = speed, Dodge = defense. Tap when the needle is in the green for a Perfect (1.5×). You can also tap the dummy, track, or dodge posts in the yard.
- **Feed** (15 coins) for +50 energy. **Nap** is free (+25 energy) when you are too tired to fight.
- **Garden**: plant corn for 8 coins. It is ready in 45 seconds, even if you leave the tab. Harvest for 18 coins and a sip of energy.
- **Looks** on the Chicken tab are cosmetic only.
- **Fight** (20 energy) the next rival with a coin bet. The faster chicken pecks first; speed also helps dodges. Win = bet back ×2 + the purse.
- After **King Comb**, take a tougher champion tier. You keep your chicken, coins, and record.
- Sound is made in code. 🔊 mutes it. ✨ / 📱 switches high vs phone graphics.
- Progress saves in the browser (`localStorage`). Old saves still load.

Drag the farm to look around.

## Run

```bash
npm test        # rules: betting, energy, ladder, garden, looks, odds, save/load
npm run build   # static site into dist/
npm start       # http://127.0.0.1:8765
```

The page needs a local server (ES modules). Opening `index.html` as a file will not load Three.js.

## Files

- `game.js` — rules (pure functions, shared by the page and the tests)
- `world.js` — Three.js farm, chickens, and fight ring
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
