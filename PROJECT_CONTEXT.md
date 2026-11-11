# Meteor Bastion — project context for a new session

> Updated 2026-11-11. When starting a new session, **always fetch the HEAD of the `master` branch again**: the information below is a recorded snapshot, not a substitute for checking the current repository. After round 5 and the rollout of the screenshot plan, new checks were added; always get the exact SHA from GitHub, not from this snapshot.

## 1. Goal and scope

**Meteor Bastion** is a mobile, portrait-orientation browser tower-defense / roguelite whose gameplay reference is **Galaxy Defense: Fortress TD**. The goal is a battle feel, balance, specialized turret mechanics, R&D chains, HUD, upgrade screen and stage selection as close to the reference as possible, but with our own implementation, our own graphics and the project's own names.

The user asks not to stop at advice: **study the current code, fix bugs, measure balance, change mechanics, add content, run tests and push the result**. They previously pointed out that enemies never managed to reach the base at all; after changes, check for real **breaches of the base**, not just a nice-looking DPS. Don't break what has already been fixed, e.g. Hive and Firewheel.

## 2. Repository and technology

- GitHub: https://github.com/DGolgovsky/meteor-bastion
- Working branch: **`master`** (read and push access was confirmed in the chat; re-check on every new connection).
- **HTML5 + CSS + plain JavaScript, Canvas 2D.** The game release is **a single self-contained `index.html`**. No npm, Vite, webpack, Phaser, TS compilation, Unity/Godot/APK for this project without a separate decision by the user.
- The code is now **modular**: `src/shell.html`, `src/js/*.js`, `src/order.txt`. The **`python3 build.py`** script assembles a single `index.html`.
- The built `index.html` is **not stored in Git** (excluded via `.gitignore`). **Edit only `src/`**; don't try to fix the missing `index.html` through GitHub.
- Running tests: **`node tests/smoke.cjs`** (116 tests) and **`node tests/balance.cjs`** (12 × 2 seeded runs) — no npm; the tests assemble the code from `src/` in memory. GitHub Actions checks these commands and the build.
- `BALANCE.md` holds the current numeric parameters, `README.md` the overview. In case of contradictions, **the source of truth is the current `src/js/00-config.js` and the other sources**, then the tests, then the documentation. Update the documents when things change.

**Concatenation order from `src/order.txt`:** `00-config.js` → `01-state.js` → `02-units.js` → `04-waves.js` → `03-combat.js` → `03b-effects.js` → `05-update.js` → `06-render.js` → `07-cards.js` → `07-ui.js` → `08-main.js`. **Do not sort** the modules by name.

## 3. The current game (verify against HEAD)

- **12 stages**: one continuous enemy stream each; 1–3 run **20 virtual waves**, 4–8 run **25**, 9–12 run **30** (internal pacing counters, never shown to the player). The boss joins at 60% of the stream and descends on the fortress; a victory unlocks the next stage.
- **4 turret slots** filled in the order "far left → far right → center left → center right"; a horizontally movable Guardian. A battle starts with the Guardian, and towers are granted through cards. The Guardian fires from both hands; recent changes concerned the compact triple burst.
- **11 turrets**: Sky Guard, Laser, Disruption Drone, Aeroblast, Thunderbolt, Beam, Firewheel Drone, Hive, Railgun, Tesla Coil, Gravity Vortex Gun. There are **15 enemy types** with twelve themed stage rosters. Four meteor classes collide; all insects and the boss stop at per-caste firing stations and shoot. See `docs/enemies.md` and the current pass below.
- **Pick-1-of-3 cards** for battle points (card system rework 2026-11-10, see the section below), R&D levels up to 45, Combo, fortress modules.
- **Normal / Elite** have different stream compositions, champions and multipliers. Rewards/clears are tracked separately per mode.
- **Chips** are bought with components (damage, fire rate, base survivability). **Liveries** Classic/Arctic/Ember are cosmetic. Patrol, energy, rewards, the main menu and the mobile HUD are in place.
- **Local save: `meteor-bastion-save-v1`, format `v:1`**. Keep backward compatibility with early saves. **No ads and no watch-an-ad-to-double mechanics.**

## 4. Current combat focus and recent changes

- **Don't treat outdated descriptions as the source of the current logic.** The project has an old attached file "Meteor Bastion — current mechanics.md" describing the early `index.html` (back then there were 3 stages, different HP/speeds and single-use wasps). For new work it is only a **historical snapshot**.
- Last verified HEAD `93911a7` (Round 4): **denser waves**; the Guardian was weakened to **12 DMG** and fires 4 times/s, with a tighter triple burst; **Aeroblast is a close-range shotgun with 5 pellets**; **Hive**: wasps live ~12.75 s (50% longer since 2026-11-12), echo wasps ~6.5 s, at most 2 wasps per target; **Tesla**: sequential discharge ricochets with falling damage instead of hitting all targets at once; extra projectiles fly **in parallel**, not in a spread; Laser does not turn to follow its target during a pulse.
- **Hive is a critical invariant:** the hive's range limits **only the release of wasps**. Released wasps move and look for enemies **across the whole field**, even outside the turret's range, with correct retargeting. Don't bring back single-use kamikaze wasps.
- **Laser:** a time-limited pulse, **the direction is locked at the moment of firing**; the beam visually reaches the edge of the field, but only damages along its line; the base CD is currently **7.8 s** (check the current code).
- **Beam** differs from Laser: sequential focused ticks on a target, with damage stacking and upgrades; **Sky Guard** has separate impact and explosion; **Firewheel** is a long-lived bouncing disc, not a regular projectile; **Gravity** is a field that pulls enemies in and deals tick damage; **Disruption** is control/fields.
- **Current parameters in `src/js/00-config.js` at the last check (2026-11-12, owner order: enemies 5x HP, 62.5% slower, one continuous stream):** `waveStart:24`, `waveGrowth:8.4`, `spawnBase:0.20`, `spawnReduction:0.002`, `spawnMin:0.06`, `formationCd:1.33`, `enemyHpMul:4.25` (0.85 before), `waveHpGrowth:0.13` (0.06 before the 2026-11-10 card rework, 0.14 until the 2026-11-11 reference set), `enemySpdMul:0.375` (1 before; 0.75 until the extra 50% slowdown the same day), `turretBasePower:1.6`, `MAX_ENEMIES:330`; field `420×820` including underground scenery, unchanged combat/base line `y=720`. These values are **ours**, not official Galaxy Defense parameters. Stages raise HP/speed; Elite is harder than Normal.
- The latest `BALANCE.md` states that the base has **1000 HP and no separate shield; Chips add max HP** — this has changed compared with earlier versions. Always check the current values against `newBattle()`.

## 5. What was found about the original and how to use it

Gameplay reference points of the original discussed in the chat: the Guardian is movable; the 4 slots are filled in a fixed order; turrets have different firing cycles and their own T1/T2/T3 / Breakthrough / Combo chains; R&D gates when they appear; **Sky Guard: impact + explosion**, **Laser: beam, reflection, sweeping**, **Beam: focused ticks (guides say ~145% ATK, 0.2 s, 20 ticks, base CD 10 s)**, **Hive: autonomous swarm**, **Firewheel: bouncing disc**, **Tesla: charge, arcs, matrix**, **Gravity: pulling enemies together**. The enemy roster, resistances and card order also matter.

**Don't present Meteor Bastion's numbers as the original's.** The universal "+8%/level", draft thresholds, enemy HP and intervals, Elite multipliers and the economy are current game settings and/or partially confirmed reference information, not proof of Galaxy Defense's exact balance. When checking third-party guides, distinguish game versions and update dates. Visual references are the 5 screenshots attached to the original chat in the project (meta panel, Defeat, gameplay, three Level Up cards).

## 6. Verification status and priorities for the next session

- After the plan rollout, `tests/smoke.cjs` has **116 regression tests**; **don't claim they all pass** until a test run has been done on the **newest** state.
- Check **`python3 build.py`**, **`node tests/smoke.cjs`**, the absence of JS errors and behavior in a mobile browser. If no runtime is available, honestly separate syntax checks, headless simulations and live mobile testing.
- Main unfinished directions: **mass balance simulations** across the 12 stages and Elite (including several R&D profiles), measuring win rate, number of breaches, cards received, stream times and DPS; **manual visual checks** on Android, of the interface and FPS; further comparison with the exact version of the original.
- The player should **sometimes take base damage already in the early stream**, but not lose by default before defensive turrets unlock. At high stages real meta progression matters. Avoid both extremes ("all enemies die at the spawn" and "defeat at the start with any build").
- **Don't lose accepted decisions** from the user's later edits: the geometry and the top visibility boundary, the 120° base HP arc, the compact HUD, the Hive radius applying only to release, the locked Laser, long-lived wasps/Firewheel, parallel shots.

## Results of the screenshot plan, 2026-11-08

- Implemented: a visual elliptical dome (atmosphere only, not a shield), base HP with a thick arc and flash, a full-width Disruption band (the slow still applies inside a circle), turret and shot rendering, enemy shapes, a dark city, aggregation of damage numbers.
- Waves reworked: `MAX_ENEMIES=330`, clusters/wedges/scatters, 32/108/192 enemies on waves 1/10/20 of Stage 1 before the per-stage bonus (×3 versus round 5); reduced HP and speed, movement with sideways drift and pauses, spontaneous upward flight removed. Base breaches are measured headless.
- Level rewards cut tenfold (2026-11-09, owner decision): coins, components, account XP and materials in `endBattle` are divided by 10; gems are untouched.
- Results screen shows every material grant, biggest first (2026-11-09 fix): the old first-3-in-line-order hid grants (Hive's 40 of 134 in the owner's Stage 1 win); zero grants stay hidden.
- Game loop hardened (2026-11-09): a frame that throws no longer kills the RAF loop (the next RAF was scheduled only after update+draw returned, so one bad frame froze the field forever with no error shown — reported by the owner mid-battle, HUD missing from the frozen frame). The error is now recorded in B.loopError and shown in a dismissible red banner. The trigger was NOT reproduced: 25 headless full battles (fresh + developed accounts, all 11 turrets, Elite, boss waves, x2 speed, draw() every frame) ran clean, and every while-loop in the code is bounded. First live catch 2026-11-11 (cloud app, owner's screenshot): IndexSizeError, arc radius -0.338 — a backward RAF timestamp (app switch / vsync restart) made the frame delta negative, and a shockwave ring's radius went negative with it. Fixed: frame delta clamped at 0 in loop(), ring arc radius clamped at 0.01 in draw(); the smoke harness arc now throws on a negative radius like a real canvas, with two regression tests (72 total).
- The Aeroblast range of 540 and adaptive spread from round 5 are kept; Hive, Firewheel, Laser and the `meteor-bastion-save-v1` save format have no regressions.
- CI: [GitHub Actions](https://github.com/DGolgovsky/meteor-bastion/actions) runs 116 smoke checks, two sets of 12 headless runs and `build.py`. Observation over 12 seeds (master 72766b32): the first victory for the sensible draft comes on attempt 3, for "first card" on attempt 4. With ×3 (2026-11-09): 0 victories out of 12 for either strategy.
- **Continuous stream (2026-11-12, owner order): enemies 5x HP, 62.5% slower, no waves.** Each stage is one non-stop stream (2,244 enemies on Stage 1 Normal); `B.wave` survives only as an internal "virtual wave" counter for HP scaling, ecology gates, elite champions, the recon ramp, spawn pacing and rewards — the player never sees a wave, a pause or a wave draft; drafts come only from points. The HUD shows enemies remaining in the stream, the lobby shows the stream total with "non-stop", the boss joins at 60% of the stream and descends on the fortress. Fresh-account headless sims after the change: **0/12 smart, 0/12 first-card — every run dies on virtual wave ~5 at ~34 s with ~36 leaks and ~27 kills (smart)**. Control probe with HP back at 0.85 (stream + 0.75 speed kept): smart 1/3, first victory on attempt 3 — so the collapse is the 5x HP alone, not the stream. The old "first win no earlier than the 3rd attempt" target no longer applies; `--check-balance` now pins 0/3 on the fixed triplet.
- **Open balance issue:** density ×3 meets the targets (14.0/29.6 visible on waves 1/10 versus ≥8/≥28). Fresh-account headless sims say Stage 1 is unwinnable (0 victories out of 24, sensible strategy dies on waves 6–11) — but the owner cleared it on the FIRST attempt himself (2026-11-09: 2521 kills, 8:24, 31 cards), so the sims understate a developed account plus human drafts. Scratch-copy compensations: a 2000 HP base does not help (0/12); +50% turret power (2.4) restores victories, first one on the 6th–7th attempt. The owner approved ×3 as-is. On the Pixel 10a phone, FPS checks and screenshot acceptance are still needed.
- Don't start phase 6 (crab, mines, ×1.5 speed, active abilities) without separate agreement.

## Card system rework, 2026-11-10 (owner decisions)

- Source: the owner's screenshots of the reference "Selected Cards Overview" screen. One declarative `CARDS` table in `src/js/07-cards.js`; `cardDesc()` (text) and `applyCardDef()` (effect) both read the same `fx` ops, so a card's text cannot drift from its effect (smoke-tested).
- **Removed:** generic cards (`up` +18%, Power Module, Crit Scope, Accelerator, Twin Barrel, Coil+, Armor Piercer as a generic, Fragmentation Charge…) and the SUPER-every-5-levels rule. **Kept:** combos (now fill a pip) and fortress modules; a repeatable "Field Patch" (+120 HP) only fills a draft when no other card is left.
- **Levels 1–3, 4 pips:** a built turret is Lv.1 with 0/4 pips; each normal (teal) unit card fills a pip; after 3 pips the unit's purple card is **guaranteed in every draft until taken** (never random; survives a reroll) and fills the 4th pip, raising the level (+25% DMG, `BALANCE.levelUpDmg`). Lv.1 purple = evolution (Wasp Evolution II, Beam Penetration, High-Energy Pulse, Impact Multiplier, Shotgun Evolution; non-reference turrets got a migrated tier card as their evolution), Lv.2 purple = the existing SUPER (still gated by `rdTierUnlock`). Lv.3 is the maximum. The card badge 1/2 is the minimum unit level for the card.
- **R&D gates kept:** migrated T1 cards R&D 2, level-2 cards R&D 6/10/14 (as their old tiers), SUPER `rdTierUnlock`; Lv.1 purple cards need no R&D so a fresh account can level up.
- **Guardian = the reference bullet turret** (Bullets Boost, Volley Shot, Piercing Bullet, Shotgun Evolution, Flame Bullet). **Shotgun Evolution uses a real spread: the one documented exception to the "extra projectiles fly parallel" rule** (Aeroblast's own pellet fan is not a card).
- Card numbers are exactly the reference ones (+50%, +200%…); enemies were retuned instead: `waveHpGrowth` 0.06 → 0.14.
- UI: draft with the 5-slot level/pip row (field order: far left, center left, Guardian, center right, far right), teal/purple cards with level badges, the Selected Cards Overview overlay (`ov-cards`) from draft/pause/results, 4 pips under every unit on the field.

## Reference card set, 2026-11-11 (owner decisions)

- **Source of truth:** `docs/turrets-reference.md` (11 turrets + the Guardian as section 12). All 270 cards are implemented in `07-cards.js` with the reference names, tiers and numbers; the shared mechanics live in `03b-effects.js` with entity caps (`FX_CAP`) for mobile. A smoke test parses the reference file and checks every card (tier, Extra, R&D gate, every number in the text) and that no card is invented.
- **Mapping:** Star Tier N = in-run level N pool; Extra = purple (levels the unit up; at Lv.3 a mastery cycle); Super Mode is automatic at Lv.3 with R&D ≥ `rdTierUnlock` (no SUPER cards). 🔒 Lv.X = R&D X; the Lv.2/6/10 unlock table = R&D 2/6/10; Guardian locks 61/71/101/121 are scaled to 23/26/38/45. Lv.4/12 meta bumps = secondary +20% (Hive ATK count +1, Railgun Penetration +1), Lv.8 = Cooldown Speed +5%.
- **Owner rules from this round:** every laser fires from the turret (forks/reflections do not start at the target); laser ray width scales with its damage; Firewheel is bigger (r 20) and slower (200 px/s); Beam is drawn as a thick visible stream. Guardian uses the official card set; Shotgun Evolution keeps its real spread; Laser Shot starts at the Guardian.
- Cards were not changed for balance; enemies were (`enemyHpMul` 0.76, `waveHpGrowth` 0.13), plus base compensations for reworked behaviors (Gravity tick 2.2×, Firewheel contact 3×, the Tesla cooldown runs during its charge). See BALANCE.md for numbers and approximations.

## Models in `06-render.js`

- **Guardian** — `drawGuardian()`: the hands hold the rifle, facing the target (`t.facing`, hysteresis near vertical), the head is drawn after the rifle. **Turrets** — the `TURRET_DRAW[id]` table; each head rotates around a real axis on the pedestal (`aimed()` includes the head recoil from `t.recoil`). Shared helpers: `drawPad`, `pedestal`, `metal`, `glowDot`, `rrPath`.
- **Enemies** — `drawEnemy()` → `drawEnemyBody()` by `cfg.id`/`kind`: each of the 15 types has its own silhouette (`eMeteor`, `eFast`, `eArmored`, `eFlyer`, `eSplitter`, `eHealer`, `eElite`, `ePhase`, `eCharger`, `eBoss`). The shape comes from `e.seed` (set lazily from the initial phase, **without** extra `Math.random()` calls — otherwise simulation reproducibility would shift) and is cached in `e.shp`.
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


## Fortress screenshot pass, 2026-11-11

- `TURRET_X=[52,368,96,324]`: same outer-left/outer-right/inner-left/inner-right build order, now two 44px turret pairs. The Guardian is still free to move horizontally.
- `W=420,H=820,LINE_Y=BASEY=720`. The additional 60px is underground scenery, not extra enemy travel. CSS and backing-store fitting use the same aspect ratio, and the canvas is constrained by viewport height as well as width. Pointer activation uses logical y rather than a fraction of the extended canvas.
- `FORTRESS` is the source of deck/dome/HP geometry. Canvas bunker replaces the castle emoji; charcoal city, broad pale dome, five passive emitter fittings, empty-mount floodlights and dark structural ribs match the supplied reference's base composition. The emitters are decorative and add no gameplay slots or abilities. HP keeps its 120° arc, now radius 48 above the bunker, inside the dome.
- Fixed HUD text/timer overlap and minute formatting from 10:00 onward. Recoil is advanced by `update(dt)`, not `drawUnit`, and paused redraws leave it unchanged. Screen shake no longer calls `Math.random()` during rendering. Hive/Beam/Firewheel descriptions now describe their actual mechanics; README's stale shield-reserve wording and BALANCE's stale wave/cap table were corrected.
- Verification: 78 smoke checks; 24 seeded Stage 1 runs before and after (sensible 4→5 wins/12; first-card 2→2/12); build/syntax checks and native Canvas raster inspection. Android performance and browser viewport acceptance remain device checks.


## Artillery, card rarity and laser performance pass, 2026-11-11

This pass supersedes the historical guaranteed-Extra rules and all-enemies-fall movement descriptions above.

- Cards: one unchanged 270-card reference set. `CARD_DROP` weights Tier 1/2/3 = 1/.5/.25, Extra additionally ×.2, bonus modules/combos .8 instead of3. Three pips unlock random Extras; they are not forced and reroll is fresh. Exhausting normal cards still permits progression. Levels/mastery/Super/R&D/save v1 remain intact.
- Only meteor/fast/armored/charger collide with the base. Other types hold distinct individual stations and charge locked-target volleys. Added Acid Spitter, Needle Wasp, Shell Beetle and Prism Moth. Twelve `STAGE_ECOLOGY` rosters constrain formations as well as single spawns; the stage preview shows the real roster and stream total from shared helpers.
- Hostile ammunition: cap64, TTL8s, HP3–18, interceptable by ordinary player projectiles, no kill/XP/heal credit. Disruption slows ammunition. The stage end waits for fired ammunition even if its owner died. Damage metrics: `meteorDamage`, `enemyShotDamage`, `enemyShotHits`, `enemyShotsFired`, `enemyShotsIntercepted`. Stun/slow/displacement affect siege attacks; external overshoot cannot put an insect inside the bunker.
- Laser: one cached visual per ray (not one per frame), tick-only line scans, stable one-pass reflection selection, no long shadowBlur strokes. Locked direction, turret origins, width scaling, targets/damage/tick sequence are preserved. `tests/laser-perf.cjs` reproduces the 330-target workload at 60/120 Hz; optional `--raster` is CPU raster, not Android FPS.
- Current calibration: `enemyHpMul=4.25`, `waveHpGrowth=.13`, `enemySpdMul=.75` (2026-11-12, owner order). Fresh S1 Normal fixed triplet3121/777/42: smart0/3, first-card0/3 — every run dies on virtual wave 4 at ~19 s. The explicit `--check-balance` CI option requires0/3 smart wins on this fixed profile; it is not a game handicap or human win-rate estimate. All modes/stages use real `startBattle` in the test harness; victory requires an actually killed boss. Final full matrix is in BALANCE.md.
- Checks: 116 smoke tests, build/syntax, bounded laser benchmark and native Canvas inspection. Browser layout/Android FPS are still device checks.

- Late-sector opening correction: `CAMPAIGN_OPENING` applies only to stages4–12. Stage extra count grows0/.35/.7/1 over waves1–4; spawn/formation interval multiplier is stage-scaled, up to2.7/1.9/1.3/1 in S12. Wave1 uses `ecology.recon`; Elite respects heavy unlocks on waves1–2, then resumes one-wave-early castes. Stage1–3 pacing/RNG is preserved. `waveEnemyPool(stage?,wave?,elite?,counts?)` also drives accurate stage preview without an active battle. This fixes max-R&D Normal S12 dying before a build, rather than masking it with free HP/turrets.

- Elite retuned for rarer Extras: HP ×1.4 (was1.68); speed/contact/champions/extra counts/boss multipliers retained. Late-sector Elite opening additionally spaces spawns by1.5/1⅓/1⅙ over waves1–3; full cadence atwave4. See the final paired matrix in BALANCE.md; no-Chips S12/R&D45 Elite has a real boss-kill win in the control triplet.
