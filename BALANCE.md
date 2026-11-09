# Meteor Bastion — current balance and regression

State after the campaign expansion and the combat system rework, 2026-11-08. **All values below are parameters of our game**. Similarity to Galaxy Defense: Fortress TD does not mean these are the original's official numbers.

## Campaign

| Stages | Number of stages | Waves per stage | HP growth between stages | Speed between stages |
|---|---:|---:|---|---|
| Sector I, 1–3 | 3 | 20 | ×1.00 → ×1.65 | ×1.00 → ×1.06 |
| Sector II, 4–8 | 5 | 25 | ×2.05 → ×4.60 | ×1.09 → ×1.19 |
| Sector III, 9–12 | 4 | 30 | ×5.50 → ×9.10 | ×1.21 → ×1.25 |

In every campaign the boss is in the last wave; stage progress carries over to the next playthrough. The saved `unlocked` maximum is no longer capped at the former three stages: old save v1 files still load.

## Current base numbers

| System | Value |
|---|---|
| Field / base | `420×760`, base line `y=720` |
| Armament | 4 turret slots + a movable Guardian |
| Base | 1000 HP, no shield (before Chips bonuses) |
| Healing | +2 base HP per enemy killed, capped at the maximum |
| First card thresholds | 2, 4, 6, 9 points; then 14 + 10 per next pick + 2.5 per cleared wave |
| Waves | `8 + round(2.8 × wave) + (stage−1)×2`; Elite adds enemies |
| Spawn interval | `max(0.18,0.60 − wave×0.006)` s, then a small random variation |
| HP multiplier per wave | `0.78 × (1 + (wave−1)×0.06)`, on top of the stage multiplier |
| Boss HP multiplier per wave | `0.88 × 1.1 × (1 + (wave−1)×0.07)`, on top of the stage |
| Guardian | 12 damage (−8% from 13, a small round 4 nerf), 4 attacks/s, fires from both hands alternately; the triple burst is a tight group (3px spacing, one hand for the whole burst) |
| Turret visibility top (VIS_TOP) | y=30 — enemies above the line (just below the HUD row) are not targeted; spawning (y=-30) is unchanged |
| Turret and Guardian sprite scale | ×0.88 — the level label under the unit is not scaled |
| Turret damage factor | ×1.60 on the turret's configured damage at R&D 1 (not applied to the Guardian) |
| Live enemies | at most 72 regular enemies; the queue is not lost when full |
| Energy | 5 per run, regenerates 1 per 12 minutes, maximum 30 |
| Meta R&D | Lv. 1–45, +8% base damage per level, stepped CD and secondary stat |
| Global Crit DMG bonus | at most +100% |
| Elite (on top of Stage) | HP ×1.68, speed ×1.10, contact damage ×1.18; separate champions |
| Elite rewards | ×1.6 coins, materials and components; victories tracked separately from Normal |

For the exact HP/speed of the 11 enemies and the attacks of the 11 turrets, use `src/js/00-config.js` — it is the **single source of truth**. This table must not diverge from the code.

## Mechanics added in this cycle

- **Gravity Vortex Gun:** pulls enemies into a temporary field with tick damage, with a weakened effect on champions and the boss.
- **Phase scout:** periodically cloaks. Some turrets cannot pick a cloaked target unless it is revealed. Laser/Disruption/Firewheel have ways to reveal it.
- **Charger:** accelerating dashes toward the fortress.
- **Sky Guard:** impact and explosion are counted separately; the R&D chain adds thermal damage.
- **Laser:** a pulse with a 7.8 s cooldown between pulses (was 5.2 s; the cooldown is a constant in `fireLaser`, and the Laser turret's `attackSpeed` does not affect it), reflection/refraction, Deflect/Sweep, stacking vulnerability. The beam goes from the turret through the target to the edge of the field in the firing direction; damage does not depend on the beam length. **The beam does not track its target after firing:** the direction and aim point are locked when the pulse starts (the target's position at the start of the channel) and do not follow it until the channel ends; each tick, damage is computed for enemies on the locked line.
- **Beam:** ticks of 145% ATK at a 0.2 s interval, base CD 10 s, focusing and Stacking Damage with R&D upgrades.
- **Aeroblast is a medium-range shotgun.** Activation range **540** (was 200): it now fires at enemies from **y≥180**, not only from y≥520. A volley has 5 pellets of 10 base damage each; projectile speed **520 px/s** (was 380), fire rate 0.8/s, knockback 12 per hit. The spread's angular step is `min(0.14, 14/max(90, dist))` rad: up close the shotgun stays wide, far away neighboring pellets bunch up more tightly (about 14px between trajectories at the target distance). Extra projectiles from cards keep adding pellets to the spread. The "Impact radius" R&D scales the **splash**, not the targeting range. In the original Galaxy Defense, Aeroblast deals a direct hit + a directional cone explosion, and Shotgun Barrage is a separate card; here the current simplified shotgun mechanic is kept, but its ineffectiveness at range is fixed. Source for comparison: https://gd-community.fun/guides/aeroblast .
- **Hive:** wasps are released within the hive's radius but look for targets on their own across the **whole field**; the Swarm Echo R&D chain limits repeated wasp replication. Wasps fly out in an upward fan from the turret (spread 10–14px from it, a 0.25 s launch phase at 120 px/s), then home in at 240 px/s; damage is dealt on touching the enemy's bottom edge (the wasp is under the enemy, not at its center). **Wasp lifetime 8.5 s** (was 5.5 s), echo wasps 6.5 s (was 4.3 s). **At most 2 wasps per target:** wasps are distributed across targets when choosing and retargeting, the rest take other enemies; if all targets are taken, the least loaded one is chosen.
- **Firewheel:** a single long-lived bouncing disc (radius 14, lifetime 10 s; a second disc after the "Second Firefly" card, mod `wheelCount`); burning areas and duration.
- **Tesla:** a direct hit (0.8×), an area explosion (0.65×, radius 55), a flash ring of 170, 12 particles; the charge damage is unchanged. **Bounce instead of "double charge":** after a hit, the discharge jumps from the target to the nearest enemy not yet hit within 150px, and so on along the chain (bounces = multiCount−1, 2 by default); bounce damage falls off: 0.7×, 0.5×, 0.35×, 0.25×, 0.2×. The old simultaneous hit on several targets around the first one is removed entirely; the "Secondary Arc" card is replaced by "Discharge Bounce" (one more bounce), and the "Overvoltage" super bounces across 6 targets.
- **No scatter:** extra turret projectiles fly **in parallel** with the main one (7px lateral offset), not in a spread — the "Twin Barrel", "Cluster Salvo", "Shockwave" cards and the "Rocket Barrage" super no longer scatter the fire. The Laser's sweeping beam hits the second target **deterministically** — the toughest of the remaining ones, not a random one. The only spread in the game is the pellet spread of the Aeroblast shotgun itself (its design, not a card).
- **Railgun, Disruption, Thunderbolt:** distinct effects and T1/T2/T3 chains.
- **Combos:** including Gravity + Firewheel, Gravity + Hive, Railgun + Tesla. R&D requirements are tied to meta progression, not only to random battle cards.
- **Chips:** levels 0–5 for `core` (+3% turret damage per step), `speed` (+2% fire rate), `fort` (+40 to the base's maximum HP), paid in components using the formula `4 + 4×current level`. Liveries change only the appearance.
- **Base HP:** a single arc above the dome (same center as the dome: W/2, BASEY+22) — HP (r=112), arc length ∝ the HP fraction, symmetric around the apex. The full arc angle is 120° (±60° from the apex): at full HP the ends are ~48px above the deck and don't drop down between the Guardian and the turrets. The exact HP is shown as a small number centered above the dome. The base has no shield: breaches damage HP directly; the "Fortress Shield" module was replaced by "Fortress Repair" (+250 HP).
- **Notifications:** there are no pop-up notifications (toasts) in the game — not for super cards, patrol, or boss/champion warnings. The toast element and its styles were removed from the markup.
- **HUD:** a single row on a transparent background (no dark backing, wave progress bar or purple card metrics): stage, wave, average DPS, kills, timer. The font is fitted to the field width (11px → 8.5px).

## Aeroblast usefulness check (round 5)

| Stage 1 Normal, R&D 1, 4 starting turrets (Sky Guard, Aeroblast, Hive, Laser), no new card picks, seed | Aeroblast before | Aeroblast after |
|---|---:|---:|
| 42 | 2172 | 5442 |
| 777 | 1375 | 5361 |
| 3121 | 1712 | 6088 |

The comparison above was obtained in identical headless scenarios (all 4 turrets available from the start, **no cards granted**), so it is **not** a standard game run and not an indicator of win chance. All three scenarios ended in defeat both before and after; a stronger Aeroblast may distribute targets differently and knock enemies out of other turrets' areas. These numbers reflect an increase in useful damage, not a guaranteed win-rate improvement.

## Battle checks

Below are **selected reproducible headless runs**, not on-device measurements and not a statistical win-rate estimate:

| Conditions | Result | Breaches | Base at the end | Duration |
|---|---|---:|---:|---:|
| Stage 1, Normal, R&D 1, seed 101, sensible card picks | Victory, wave 20 | 8 | 180 HP | ~508 s |
| Stage 1, Normal, R&D 1, seed 303, sensible card picks | Victory, wave 20 | 6 | 803 HP | ~512 s |
| Stage 1, Elite, R&D 5, seed 303 | Defeat, wave 13 | 11 | 0 HP | ~293 s |
| Stage 4, Normal, R&D 12, seed 303 | Victory, wave 25 | 2 | 1000 HP | ~834 s |
| Stage 9, Normal, R&D 30, seed 303 | Victory, wave 30 | 5 | 1000 HP | ~1341 s |
| Stage 12, Normal, R&D 45, seed 303 | Victory, wave 30 | 2 | 1000 HP | ~1490 s |

Check parameters may change slightly with later weapon edits; the table records a pass made during balance tuning. Battles apply healing of +2 HP per kill, so 1000 HP at the finish does not mean there were no breaches. **The table rows were recorded before the shield was removed (round 3, 2026-11-08).** After the shield removal, a fresh account (R&D 1) loses on Stage 1: the "first card" policy reaches wave 10 (seed 3121, 125 kills, 23 breaches) and wave 7 (seed 777, 65 kills, 13 breaches); random cards reach wave 17 (seed 3121, 334 kills, 25 breaches) and wave 15 (seed 777, 267 kills, 17 breaches). The victories in the table above use sensible card picks; a fresh account without upgrades became noticeably weaker after the shield removal (−150 effective HP at fort 0).

**Round 4 goal (2026-11-08): the first clear of Stage 1 Normal on a fresh account (R&D 1) should come no earlier than the 3rd attempt.** Measured with the headless run `~/workspace/meteor-bastion/balance-attempts.cjs` (12 attempts, a fresh account each time, seeds 3121, 777, 42, 1234, 9999, 2026, 555, 8888, 31415, 2718, 1618, 4242): the "sensible player" policy (super > strong new turret > upgrade top damage dealer > chain > damage mod) — **first victory on the 3rd attempt** (2 wins out of 12: seed 42, 615 kills, HP 866; seed 31415, 583 kills, HP 383); the "first card" policy — first victory on the 8th attempt (1 out of 12); random cards — 0 out of 3. **There is no gate in the code:** no attempt counters and no locks — the goal is achieved purely through balance (wave density 5 + round(2.0×wave), Guardian nerf 13→12). The measurement is noisy (seeds are not comparable across edits — the random number stream diverges), so the target is a sensible-player win rate of ~17–33%, not an exact attempt number in one series.

Running the tests from a **clean checkout**:

```sh
node tests/smoke.cjs
```

The tests concatenate the source JS by `src/order.txt` without `index.html`. They cover v1 saves, the Guardian, 12 stages and final waves, Firewheel, Hive, Gravity, Phase, Charger, R&D T1/T2/T3, Chips, Liveries, the meta economy and breaches; **53 tests**, including regressions from rounds 4–5: Aeroblast (5 pellets, increased range, adaptive spread, hits on moving targets, range boundary, splash R&D), wasps (lifetime ≥8 s, max 2 per target), the guardian's tight triple burst, Tesla's sequential bounce with damage falloff, deterministic laserSweep, parallel extra projectiles, as well as bug regressions: Gravity does not "teleport" freshly spawned enemies, burn DPS resets after the burn ends, card text matches the effect, the ×2 label resets between battles, rewards are credited immediately, and all models (Guardian, 11 turrets, 11 enemies) render in every state. To produce a single self-contained HTML release, run `python3 build.py`. Additionally, `node tests/balance.cjs` runs 12 games for each of the two policies; GitHub Actions runs smoke, balance and the build.

## Known limitations and next iterations

1. The original's commercial/inventory subsystems are not reproduced — Chips/Liveries are simplified here, and there is no full rarity and equipment grid yet.
2. There is no statistically significant balance estimate over ≥100 seeds for each of the 12 stages and the Elite modes separately. Mass runs and tuning of the required R&D level are needed.
3. Live tests on Android Chrome/Pixel are needed (FPS, menu responsiveness, touch focus, placement of panels).
4. Reproducing Galaxy Defense's balance exactly would require measurements of a specific version of the original: its hidden HP, resistances, CD cooldowns, card tables. Here we use **public descriptions of the mechanics** and our own number tuning.

## Visuals and density from the screenshots (2026-11-08; calibration)

Rollout plan: phases 1–5 from the document "Screenshot plan for Meteor Bastion.md". The decorative dome has no HP and does not absorb damage; Disruption still slows inside a circle of radius `splash`, but is displayed as a full-width band (56–96px high). The visual models of turrets, enemies and projectiles, the atmospheric background, and the base HP indicator were updated.

Preliminary density tuning: `MAX_ENEMIES=110`, `waveStart=8`, `waveGrowth=2.8`, `spawnBase=0.60`, `spawnReduction=0.006`, `spawnMin=0.18`; enemy HP multiplier `0.78`, `waveHpGrowth=0.06`; boss `0.88`, `bossHpGrowth=0.07`; normal speed `0.85`, range `stage.spdMul=1.00..1.25`. Swarm small fry deal ×0.8 contact damage; `draftGrowth=10`, `draftWaveGrowth=2.5` compensate for the extra XP. Spawning in clusters/wedges/scatters and diagonal patterns with pauses, own `vy>=0`; Gravity can pull upward separately.

Compatibility: `meteor-bastion-save-v1` and `v:1` are unchanged; the Aeroblast range of 540, pellet speed of 520 and adaptive spread from the new commit `264338c7` are kept. Phase 6 (crab, mines, active skills) was not done.

### Verified Stage 1 calibration (GitHub Actions, 2026-11-08)

Check: [CI run 42515633650](https://github.com/DGolgovsky/meteor-bastion/actions/runs/42515633650) — **43 smoke tests, 24 headless runs (12 × 2 strategies), a 173,598-byte build from 9 modules**, all commands succeeded. To reproduce: `node tests/smoke.cjs && node tests/balance.cjs && python3 build.py`. Profile: fresh R&D 1, Stage 1 Normal; 12 fixed seeds, simulation step 0.05 s. This is balance tuning, **not an estimate of the win probability**.

| Metric (over waves reached) | Sensible picks | First card |
|---|---:|---:|
| First victory along the seed sequence | 3rd attempt | 4th |
| Victories out of 12 | 4 | 2 |
| Average base HP after wave 10 | 679.5 | 544.3 |
| Average base HP after wave 20 | 691.0 | 663.3 |
| Average breaches per run | 20.8 | 25.1 |
| Average healing per run | 335.3 HP | 388.4 HP |
| Wave 1: visible enemies, average / peak | 4.3 / 8.0 | 4.5 / 8.2 |
| Wave 10: visible enemies, average / peak | 9.2 / 18.8 | 11.5 / 22.0 |
| Wave 20: visible enemies, average / peak | 11.6 / 22.0 | 13.7 / 25.7 |

**Acceptance criterion §2.5 for average density is not met:** the targets are 8, 28 and 40 simultaneously visible enemies on waves 1/10/20, and the actual averages are substantially lower. Even the peak values fall short of the late-wave targets. The plan's formulas raised enemy count and density versus the previous version, but not enough for the specified visual reference. An experimental reduction of the interval between swarms to 2.5 s gave the sensible strategy its first victory on the very 1st attempt; it was rejected to keep the "no earlier than the 3rd" goal. The next pass requires joint calibration of wave pace/HP/DPS and a visual check on a device.

**Not verified on a real phone:** Pixel 10a performance with 50 enemies, a minimum fps ≥45, an exact match with the screenshots, working without scrolling. GitHub CI checks code execution and the build, but not mobile rendering.
