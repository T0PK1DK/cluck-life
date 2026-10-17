# Cluck Life

A phone-first raise-and-fight chicken game inspired by **Duck Life**. Train your chicken, level it up, and beat a ladder of 8 rivals to become champion. Everything is earned by playing (no shop, no pay-to-win).

## How it plays
- **Train** (12 energy each): Peck = attack, Run = speed, Dodge = defense. Each session gives XP.
- **Feed** (15 coins) for +50 energy. **Nap** is free (+25 energy) but only when you are too tired to fight.
- **Level up**: +3 points to spend and +15 health.
- **Fight** (20 energy) the next rival with a coin bet. Fights play out as an animated, beat-by-beat brawl with HP bars. The faster chicken strikes first, speed also gives dodges, and a much faster chicken gets a bonus peck. Win = bet back ×2 + the rival's purse. Beaten rivals can be rematched for a quarter purse to farm coins.
- The Fight tab shows your stats vs the rival and your odds, so you know when to train more.
- Progress saves automatically in the browser (localStorage).

## Files
- `game.js` – all game rules (pure functions, shared by the page and the tests)
- `index.html` – UI, canvas yard/arena and fight animation
- `gate.js` – preview passcode gate (stores only a salted hash)
- `game.test.js` – node tests

```bash
npm test        # rules: betting, energy, ladder, speed, fight timeline, save/load
npm run build   # copies the static site into dist/
npm start       # local server at http://127.0.0.1:8765
```

Deploy: `dist/` is a static site (Cloudflare Pages project `cluck-life`).
