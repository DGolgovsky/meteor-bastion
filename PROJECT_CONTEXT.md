# Meteor Bastion — project context for a new session

> Updated 2026-11-08. When starting a new session, **always fetch the HEAD of the `master` branch again**: the information below is a recorded snapshot, not a substitute for checking the current repository. After round 5 and the rollout of the screenshot plan, new checks were added; always get the exact SHA from GitHub, not from this snapshot.

## 1. Goal and scope

**Meteor Bastion** is a mobile, portrait-orientation browser tower-defense / roguelite whose gameplay reference is **Galaxy Defense: Fortress TD**. The goal is a battle feel, balance, specialized turret mechanics, R&D chains, HUD, upgrade screen and stage selection as close to the reference as possible, but with our own implementation, our own graphics and the project's own names.

The user asks not to stop at advice: **study the current code, fix bugs, measure balance, change mechanics, add content, run tests and push the result**. They previously pointed out that enemies never managed to reach the base at all; after changes, check for real **breaches of the base**, not just a nice-looking DPS. Don't break what has already been fixed, e.g. Hive and Firewheel.

## 2. Repository and technology

- GitHub: https://github.com/DGolgovsky/meteor-bastion
- Working branch: **`master`** (read and push access was confirmed in the chat; re-check on every new connection).
- **HTML5 + CSS + plain JavaScript, Canvas 2D.** The game release is **a single self-contained `index.html`**. No npm, Vite, webpack, Phaser, TS compilation, Unity/Godot/APK for this project without a separate decision by the user.
- The code is now **modular**: `src/shell.html`, `src/js/*.js`, `src/order.txt`. The **`python3 build.py`** script assembles a single `index.html`.
- The built `index.html` is **not stored in Git** (excluded via `.gitignore`). **Edit only `src/`**; don't try to fix the missing `index.html` through GitHub.
- Running tests: **`node tests/smoke.cjs`** (55 tests) and **`node tests/balance.cjs`** (12 × 2 seeded runs) — no npm; the tests assemble the code from `src/` in memory. GitHub Actions checks these commands and the build.
- `BALANCE.md` holds the current numeric parameters, `README.md` the overview. In case of contradictions, **the source of truth is the current `src/js/00-config.js` and the other sources**, then the tests, then the documentation. Update the documents when things change.

**Concatenation order from `src/order.txt`:** `00-config.js` → `01-state.js` → `02-units.js` → `04-waves.js` → `03-combat.js` → `05-update.js` → `06-render.js` → `07-ui.js` → `08-main.js`. **Do not sort** the modules by name.

## 3. The current game (verify against HEAD)

- **12 stages**: 1–3 with **20 waves** each; 4–8 with **25 waves**; 9–12 with **30 waves**. A boss in the last wave; a victory unlocks the next stage.
- **4 turret slots** filled in the order "far left → far right → center left → center right"; a horizontally movable Guardian. A battle starts with the Guardian, and towers are granted through cards. The Guardian fires from both hands; recent changes concerned the compact triple burst.
- **11 turrets**: Sky Guard, Laser, Disruption Drone, Aeroblast, Thunderbolt, Beam, Firewheel Drone, Hive, Railgun, Tesla Coil, Gravity Vortex Gun. There are **11 enemy types**, resistances by damage type, splitting golems, healing of neighbors, cloaking scouts, accelerating assault meteors, Elite champions.
- **Pick-1-of-3 cards** for battle points, R&D levels up to 45, **36 chained T1/T2/T3 cards** with R&D and previous-tier requirements, Combo, Super, separate unit upgrades.
- **Normal / Elite** have different wave compositions, champions and multipliers. Rewards/clears are tracked separately per mode.
- **Chips** are bought with components (damage, fire rate, base survivability). **Liveries** Classic/Arctic/Ember are cosmetic. Patrol, energy, rewards, the main menu and the mobile HUD are in place.
- **Local save: `meteor-bastion-save-v1`, format `v:1`**. Keep backward compatibility with early saves. **No ads and no watch-an-ad-to-double mechanics.**

## 4. Current combat focus and recent changes

- **Don't treat outdated descriptions as the source of the current logic.** The project has an old attached file "Meteor Bastion — current mechanics.md" describing the early `index.html` (back then there were 3 stages, different HP/speeds and single-use wasps). For new work it is only a **historical snapshot**.
- Last verified HEAD `93911a7` (Round 4): **denser waves**; the Guardian was weakened to **12 DMG** and fires 4 times/s, with a tighter triple burst; **Aeroblast is a close-range shotgun with 5 pellets**; **Hive**: wasps live ~8.5 s, echo wasps ~6.5 s, at most 2 wasps per target; **Tesla**: sequential discharge ricochets with falling damage instead of hitting all targets at once; extra projectiles fly **in parallel**, not in a spread; Laser does not turn to follow its target during a pulse.
- **Hive is a critical invariant:** the hive's range limits **only the release of wasps**. Released wasps move and look for enemies **across the whole field**, even outside the turret's range, with correct retargeting. Don't bring back single-use kamikaze wasps.
- **Laser:** a time-limited pulse, **the direction is locked at the moment of firing**; the beam visually reaches the edge of the field, but only damages along its line; the base CD is currently **7.8 s** (check the current code).
- **Beam** differs from Laser: sequential focused ticks on a target, with damage stacking and upgrades; **Sky Guard** has separate impact and explosion; **Firewheel** is a long-lived bouncing disc, not a regular projectile; **Gravity** is a field that pulls enemies in and deals tick damage; **Disruption** is control/fields.
- **Current parameters in `src/js/00-config.js` at the last check (×3, 2026-11-09):** `waveStart:24`, `waveGrowth:8.4`, `spawnBase:0.20`, `spawnReduction:0.002`, `spawnMin:0.06`, `formationCd:1.33`, `waveHpGrowth:0.06`, `turretBasePower:1.6`, `MAX_ENEMIES:330`; field `420×760`, bottom base line `y=720`. These values are **ours**, not official Galaxy Defense parameters. Stages raise HP/speed; Elite is harder than Normal.
- The latest `BALANCE.md` states that the base has **1000 HP and no separate shield until Chips** — this has changed compared with earlier versions. Always check the current values against `newBattle()`.

## 5. What was found about the original and how to use it

Gameplay reference points of the original discussed in the chat: the Guardian is movable; the 4 slots are filled in a fixed order; turrets have different firing cycles and their own T1/T2/T3 / Breakthrough / Combo chains; R&D gates when they appear; **Sky Guard: impact + explosion**, **Laser: beam, reflection, sweeping**, **Beam: focused ticks (guides say ~145% ATK, 0.2 s, 20 ticks, base CD 10 s)**, **Hive: autonomous swarm**, **Firewheel: bouncing disc**, **Tesla: charge, arcs, matrix**, **Gravity: pulling enemies together**. The enemy roster, resistances and card order also matter.

**Don't present Meteor Bastion's numbers as the original's.** The universal "+8%/level", draft thresholds, wave HP and intervals, Elite multipliers and the economy are current game settings and/or partially confirmed reference information, not proof of Galaxy Defense's exact balance. When checking third-party guides, distinguish game versions and update dates. Visual references are the 5 screenshots attached to the original chat in the project (meta panel, Defeat, gameplay, three Level Up cards).

## 6. Verification status and priorities for the next session

- After the plan rollout, `tests/smoke.cjs` has **53 regression tests**; **don't claim they all pass** until a test run has been done on the **newest** state.
- Check **`python3 build.py`**, **`node tests/smoke.cjs`**, the absence of JS errors and behavior in a mobile browser. If no runtime is available, honestly separate syntax checks, headless simulations and live mobile testing.
- Main unfinished directions: **mass balance simulations** across the 12 stages and Elite (including several R&D profiles), measuring win rate, number of breaches, cards received, wave times and DPS; **manual visual checks** on Android, of the interface and FPS; further comparison with the exact version of the original.
- The player should **sometimes take base damage already in the early waves**, but not lose by default before defensive turrets unlock. At high stages real meta progression matters. Avoid both extremes ("all enemies die at the spawn" and "defeat on wave 2 with any build").
- **Don't lose accepted decisions** from the user's later edits: the geometry and the top visibility boundary, the 120° base HP arc, the compact HUD, the Hive radius applying only to release, the locked Laser, long-lived wasps/Firewheel, parallel shots.

## Results of the screenshot plan, 2026-11-08

- Implemented: a visual elliptical dome (atmosphere only, not a shield), base HP with a thick arc and flash, a full-width Disruption band (the slow still applies inside a circle), turret and shot rendering, enemy shapes, a dark city, aggregation of damage numbers.
- Waves reworked: `MAX_ENEMIES=330`, clusters/wedges/scatters, 32/108/192 enemies on waves 1/10/20 of Stage 1 before the per-stage bonus (×3 versus round 5); reduced HP and speed, movement with sideways drift and pauses, spontaneous upward flight removed. Base breaches are measured headless.
- Level rewards cut tenfold (2026-11-09, owner decision): coins, components, account XP and materials in `endBattle` are divided by 10; gems are untouched.
- The Aeroblast range of 540 and adaptive spread from round 5 are kept; Hive, Firewheel, Laser and the `meteor-bastion-save-v1` save format have no regressions.
- CI: [GitHub Actions](https://github.com/DGolgovsky/meteor-bastion/actions) runs smoke 55, two sets of 12 headless runs and `build.py`. Observation over 12 seeds (master 72766b32): the first victory for the sensible draft comes on attempt 3, for "first card" on attempt 4. With ×3 (2026-11-09): 0 victories out of 12 for either strategy.
- **Open balance issue:** density ×3 meets the targets (14.0/29.6 visible on waves 1/10 versus ≥8/≥28), but Stage 1 is now unwinnable: 0 victories out of 24, the sensible strategy dies on waves 6–11. Scratch-copy compensations: a 2000 HP base does not help (0/12); +50% turret power (2.4) restores victories, first one on the 6th–7th attempt. The owner approved ×3 as-is. On the Pixel 10a phone, FPS checks and screenshot acceptance are still needed.
- Don't start phase 6 (crab, mines, ×1.5 speed, active abilities) without separate agreement.

## Models in `06-render.js`

- **Guardian** — `drawGuardian()`: the hands hold the rifle, facing the target (`t.facing`, hysteresis near vertical), the head is drawn after the rifle. **Turrets** — the `TURRET_DRAW[id]` table; each head rotates around a real axis on the pedestal (`aimed()` includes the head recoil from `t.recoil`). Shared helpers: `drawPad`, `pedestal`, `metal`, `glowDot`, `rrPath`.
- **Enemies** — `drawEnemy()` → `drawEnemyBody()` by `cfg.id`/`kind`: each of the 11 types has its own silhouette (`eMeteor`, `eFast`, `eArmored`, `eFlyer`, `eSplitter`, `eHealer`, `eElite`, `ePhase`, `eCharger`, `eBoss`). The shape comes from `e.seed` (set lazily from the initial phase, **without** extra `Math.random()` calls — otherwise simulation reproducibility would shift) and is cached in `e.shp`.
- **Performance:** enemies have no gradients, `shadowBlur` or `clip()` — volume comes from a dark body + an offset light layer (`blobE`, `lightOff`). Don't bring back `clip()`/`evenodd` on enemies: in a measurement it cost ~+20 ms per frame with 72 enemies in the software rasterizer.
- The owner's decisions are kept: `visualScale`, the pink elite ✕, the assault meteor ring, the cloaking "vapor", the boss HP bar and HP number, champion rims, and the slow ring now on all types.

## 7. Standard agent workflow

1. Read the **latest HEAD of `master`**, the latest commit/diff, `README.md`, `BALANCE.md`, the relevant `src/js/*` and tests.
2. Match the request against the actual mechanics **in the code** (not against an outdated summary).
3. Fix the sources in `src/`; extend regression tests and balance metrics if game logic changes.
4. Build `index.html` from the modules and run the available tests/headless runs. After the edits, make sure `save v1` still loads.
5. If you have write access, push the result to **`master`** (unless the user says otherwise) and check the new commit SHA.
6. In the report, briefly list **the specific changes, tests/runs, commit SHA and known limitations**. Don't report a successful push without a confirmed commit.

## 8. Handy prompt for a new chat

> Continue developing Meteor Bastion. First read `PROJECT_CONTEXT.md`, then the current `README.md`, `BALANCE.md`, `src/` and the latest `master` commit at `https://github.com/DGolgovsky/meteor-bastion`. Don't use the old document "Meteor Bastion — current mechanics.md" as a current source. Check the current state and move on to the next task; change code in `src/`, run the tests and, after verification, push to `master`.
