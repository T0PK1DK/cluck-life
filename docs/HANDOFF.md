# Handoff

## What this pass did

Cluck Life is still the same raise / train / fight chicken game. It is now a **cozy low-poly 3D farm** in the browser, plus a small garden and a few bug/perf fixes.

### World

- `world.js` draws the yard (barn, coop, fence, feeder, dummy, track, dodge posts, trees, flowers) and a fight ring offset to the side.
- Chickens are authored from shared primitives (no GLTF, no downloaded art).
- Camera eases between yard and ring. Drag to glance around (pitch/yaw clamped).
- Phone path: lower pixel ratio, no shadows, fewer instances, no antialias. If frames stay slow, quality drops to phone on its own. ✨ / 📱 in the header locks it.
- Hidden tabs stop the render loop.
- Training stations and garden plots are clickable.

### Rules (`game.js`)

- Save version 2. Old `cluck-life-save-v1` files still load.
- **Garden**: 3 plots, plant 8 coins, 45s grow, harvest 18 coins + 15 energy.
- **Looks**: 6 colorways, cosmetic only.
- **`estimateWinChance`**: closed-form odds so the Fight tab does not run 150 live simulations on every refresh (that hitch was bad on phones).
- Mid-fight coin chip now shows the ante (`coinsBefore - bet`) instead of `coins - reward`, which lied on scrap-coin losses.
- Game stays **open**. No passcode, no shop, no account.

### Tests and CI

- `game.test.js` covers the old loop plus looks, garden timing, odds vs Monte Carlo, and “no passcode”.
- `.github/workflows/ci.yml` runs `npm test` and `npm run build`.

### Docs

- [RESEARCH.md](RESEARCH.md) — Roblox farm / pet / life sims, Duck Life, sources, borrowed features.
- README links those games and the run commands.

## What is next

1. **More farm life** without turning it into a tycoon: a second crop, or a coop that slowly lays a coin egg.
2. **Care that you can see** (Adopt Me–style hunger/sleepy as *animation only*, not new soft-locks).
3. **Rival preview** in the ring when the Fight tab is open, so the card is not just a color swatch.
4. **Compress Three.js** or tree-shake a custom build if the 690KB vendor file is too heavy for first paint.
5. **A real champion ceremony** (confetti already exists; a short camera beat would land better).
6. **Accessibility**: a “reduce motion” flag that skips fight playback.
7. Do **not** add a passcode, shop, or paywall. Do **not** deploy from this agent unless asked.

## Prompt for the next model

Copy this into a new chat:

```
You are continuing Cluck Life, a phone-first browser game.

Read README.md, docs/RESEARCH.md, and docs/HANDOFF.md first.

Rules live in game.js (UMD, used by game.test.js and the page).
The 3D farm is world.js (Three.js r170 ESM from vendor/three.module.min.js).
UI/save/sound is app.js. index.html is the shell.

Invariants:
- No passcode, no shop, no personal names in public text.
- Do not copy Roblox or Duck Life assets.
- Keep npm test and npm run build green. The page must be served over HTTP (ES modules).
- Phone performance matters: shared geometries, instancing, capped DPR, pause when hidden, estimateWinChance instead of Monte Carlo in the UI.

Pick up the next item in docs/HANDOFF.md (farm life, visible care, rival preview, or reduce-motion). Add tests for any new rules. Do not deploy.
```

## Local check

```bash
npm test
npm run build
npm start   # then open http://127.0.0.1:8765
```
