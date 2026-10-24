# Handoff

## What this pass did

Farm loop, rival mode, and phone polish. Still open: no passcode, no shop, no account, no deploy. Save version 4. v3 saves load: old plots stay corn, and the rivalry starts at rank 0.

### Better farm loop

- **Second crop: wheat.** 14 coins, 2 minutes, pays 40 coins and 5 energy. Corn is unchanged (8 coins, 45s, pays 18 plus 15 energy). Coins per minute stay within 20% of each other, and a test checks this, so neither crop is a must-pick.
- **Seed picker** (Corn / Wheat) on the Train tab, remembered per device.
- **Tend all**: one tap harvests every ready plot, then replants the empty plots with the chosen seed while coins allow. Still three plots: no mutations, no automation.
- Plot buttons show a live progress bar and m:ss timers. In 3D, sprouts grow with the timer, wheat has its own golden stalks, and plots pop when they change.

### Rival mode (Rusty)

- A recurring nemesis with his own rank curve (`nemesisFor(rank)` in game.js). His stats don't mirror yours, so training still matters. Rank 0 is beatable by a fresh chicken; each rank sits roughly one rung up the ladder.
- **No bet.** A win pays `15 + 8·rank`, gives XP, and ranks him up; his style cycles Brawler → Sprinter → Tank. A loss costs only 20 energy, and he drops a rank. A 90s cooldown follows every bout. Throwing fights earns less than playing straight, so the mode can't be farmed. His record is separate from the ladder.
- He stands at the yard fence with a "!" when ready; tapping him opens Fight → Rival. The red dots on the Fight tab and the Rival toggle only appear when a bout is actually possible (ready and 20⚡), so the badge clears when you're tired instead of nagging every 90 seconds.

### Phone polish and small animations

- **Pre-existing bugs fixed:** the chicken's eyes stretched into tall black spikes (a blink set `scale.y = 1` instead of the eye's own height). Portrait phones saw only a thin slice of the yard: the FOV now widens to keep a 50° horizontal view. The header overflowed sideways at 390px.
- Shorter stage on phones (46vh), safe-area padding, compact header (brand word hides under 375px).
- Animations: pane fade-in, segmented controls with a sliding thumb, the coin chip bumps or dips, coins fly from the chicken to the chip, ready plots and the nest pulse, the result banner pops, the points badge bounces, the energy bar pulses when it's too low to fight, a toast spring, and press feedback. Short haptic ticks on supported phones follow the 🔊 toggle.
- 🎞️ / reduce-motion now also adds `body.calm`, which turns off every CSS animation, the coin flight, and the haptics.

### Research behind the UI

Compressed design recon (Mobbin plus 21st.dev): an in-world call to action (Tolan), growth tied to the timer (Forest), challenge cards with rules and time left (Duolingo, Apple Games), and the sliding-thumb segmented control most component libraries share. The rival stakes went through a deliberate review; the one change it produced was gating the dots on energy.

### Cage fights (follow-up in the same PR)

- **Arena**: an octagon cage replaces the dirt ring. Chain-link panels use an alpha-tested canvas texture, so no sorting is needed. There's a CLUCK FC mat logo, a light rig, three tiers of stands with an instanced crowd coloured per seat, a striped referee, and a spotlight. The scene fades to night in the cage and back to sky in the yard.
- **Presentation only, the math is unchanged:** `simulate` now tags each beat with its exchange (`ex`). `roundOf` splits the 40 exchanges into 5 rounds of 8; `moveName` names the move for commentary; `fightSummary` returns the finish (KO / TKO / unanimous or split decision with three cards that never contradict the result); `moneyline` prints betting lines. All are tested.
- **Fight flow**: walkout, then a ROUND 1 card and the bell, then beats with commentary, a break with a round card between rounds, a slow-motion push-in on the finishing blow, the referee stepping in beside the winner, and a crowd roar.
- **Cartoon gore** (Chicken tab toggle, on by default, stored per device): feather bursts on every hit; blood particles and mat stains (pooled, capped 12 on phones / 24 on high); wounds in three stages as health drops; X eyes and dizzy stars on a KO. With gore off, wounds become brown scuffs and there are no blood particles or stains.
- **Fight tab**: a tale of the tape with red and blue corners and both betting lines; odds words are now favourite / underdog.
- **Free models** (`models.js`): all built from primitives with canvas textures. No downloads, no GLTF, no image files. `bake()` merges static props into one vertex-coloured mesh per prop set. Farm props: windmill (spinning), scarecrow, well, pumpkins, hay rolls, mailbox. Rusty gets a rooster tail in the yard and in the cage. Champions wear a crown.

### Tests and CI

- New tests: crop balance and wheat timing, `tendAll`, rival win/loss/cooldown, rival save/load and forged saves. 31 tests total (4 more for rounds, betting lines, move names, and fight summaries).
- CI unchanged: `npm test` + `npm run build`.
- Screenshots in `docs/screenshots/` (headless Chromium, SwiftShader).

## What is next

1. A tiny **Rusty taunt line** (speech bubble text) when he appears, picked from a short list.
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
- Phone performance matters: shared geometries, instancing, baked static props (models.js bake), capped DPR, pause when hidden, estimateWinChance instead of Monte Carlo in the UI, no unused shadow maps.
- Gore stays cartoonish and toggleable. Fights stay train-and-watch: no player input mid-fight, outcomes from stats.
- Farm extras stay small: one waiting egg, three plots, two crops. No AFK tycoon, no mutations, no trading.
- Rival mode stays betless with a cooldown; notification dots only when a bout is possible.

Pick up the next item in docs/HANDOFF.md (Rusty taunt line, cosmetic comb/hat, Three.js weight, nameplate, or fight recap). Add tests for any new rules. Do not deploy.
```

## Local check

```bash
npm test
npm run build
npm start   # then open http://127.0.0.1:8765
```
