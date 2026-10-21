# Handoff

## What this pass did

Overnight add-on pass on top of the cozy 3D farm. Same raise / train / fight loop. Still open — no passcode, no shop, no account, no deploy.

### Feature (Egg Case Farm–style nest)

- The unused coop now **lays one coin egg every 60 seconds**.
- Collect 6 coins. Only one egg waits, so it never becomes an AFK tycoon.
- Grows while the tab is closed. Click the nest in the yard or the Train-tab button.
- Save version 3. Old v2 saves start a fresh lay timer instead of granting a free egg.

### Bugs and feel

- **Drag no longer trains.** Looking around the farm used to fire a click on the dummy / track / posts.
- **Garden buttons no longer rebuild every second** (that stole focus and flickered).
- **Champion rematch** highlights King Comb instead of hiding the last rematch chip.
- **Unused shadow maps** on “high” quality were costing GPU with no casters. Fake blob shadows stay; real maps stay off.
- Cloud drift no longer walks every `root` child each frame.

### Polish

- **Rival preview**: open the Fight tab and the camera eases to the ring so you can see the next bird, not just a color swatch.
- **Care poses** (Adopt Me–style, animation only): sleepy lean under 20 energy, hungrier pecks under 50, perkier hop at 80+. `careMood()` is the rule helper.
- **Reduce motion**: 🎞️ / ⏸️ in the header. Follows `prefers-reduced-motion` until you override. Skips fight playback, snaps the camera.
- **Champion ceremony**: after a crown, a short camera beat on the barn star.
- Plant / harvest / egg collect walk the chicken to the station.

### Tests and CI

- `game.test.js` covers the nest (timer, one-egg cap, old saves, round-trip) and `careMood`.
- CI is unchanged: `npm test` + `npm run build`.

## What is next

1. A **second crop** (wheat?) that trades slower grow for more coins — still three plots, no mutations.
2. **Hats or a comb style** on the look picker (cosmetic only, still free).
3. Compress or tree-shake `vendor/three.module.min.js` if first paint is still heavy.
4. Nameplate over the chicken in the yard.
5. A tiny “last fight recap” line on the Fight tab (crits / dodges) without replaying.
6. Do **not** add a passcode, shop, or paywall. Do **not** deploy from this agent unless asked.

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
- Phone performance matters: shared geometries, instancing, capped DPR, pause when hidden, estimateWinChance instead of Monte Carlo in the UI, no unused shadow maps.
- Farm extras stay small: one waiting egg, three plots. No AFK tycoon, no mutations, no trading.

Pick up the next item in docs/HANDOFF.md (second crop, cosmetic comb/hat, Three.js weight, nameplate, or fight recap). Add tests for any new rules. Do not deploy.
```

## Local check

```bash
npm test
npm run build
npm start   # then open http://127.0.0.1:8765
```
