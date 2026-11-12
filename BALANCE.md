# Meteor Bastion — current balance and regression

Current parameters updated 2026-11-12; historical measurements below retain their original dates. **All values below are parameters of our game**. Similarity to Galaxy Defense: Fortress TD does not mean these are the original's official numbers.

## Campaign

| Stages | Number of stages | Virtual waves per stage (internal pacing only) | HP growth between stages | Speed between stages |
|---|---:|---:|---|---|
| Sector I, 1–3 | 3 | 20 | ×1.00 → ×1.65 | ×1.00 → ×1.06 |
| Sector II, 4–8 | 5 | 25 | ×2.05 → ×4.60 | ×1.09 → ×1.19 |
| Sector III, 9–12 | 4 | 30 | ×5.50 → ×9.10 | ×1.21 → ×1.25 |

In every campaign the boss joins at 60% of the stage stream and descends on the fortress (if it arrives: 90% of base max HP); stage progress carries over to the next playthrough. Since 2026-11-12 (owner order) each stage is **one continuous stream, no waves**: enemies arrive non-stop, the player never sees a wave counter, a pause or a wave draft, and the stage ends only when the whole stream has spawned, the boss has been killed or has hit the dome, and the field is clear of enemies and hostile ammunition. `B.wave` survives only as an internal "virtual wave" counter (HP scaling, ecology gates, elite champions, recon ramp, spawn pacing, draft costs, rewards). The saved `unlocked` maximum is no longer capped at the former three stages: old save v1 files still load.

## Combat and progression checks, 2026-11-12

The combat pass starts from `69082d2`. Stage 1 Normal still contains 1,750 regular spawns. The first three smart-policy seeds (3121, 777, 42) form the fresh-account CI guard. The progression probe keeps the account and its RNG across attempts. It spends the rewards through the production R&D cost rules and advances the energy clock between battles.

| Profile | Fixed runs | Victories |
|---|---:|---:|
| Stage 1 Normal, R&D 1, zero chips, smart picks | 12 fresh accounts | 0 |
| Stage 1 Normal, R&D 1, zero chips, first card | 12 fresh accounts | 0 |
| Stage 1 Normal, R&D purchases between attempts, smart picks | 6 accounts, up to 5 attempts each | 5 accounts cleared on attempts 2–5 |
| Stage 9 Elite, R&D 30, zero chips, smart picks | 3 | 2 |
| Stage 12 Normal, R&D 45, zero chips, smart picks | 3 | 3 |
| Stage 12 Elite, R&D 45, zero chips, smart picks | 12 | 1 |
| Stage 12 Elite, R&D 45, all three chips at level 5, smart picks | 6 | 1 |

The first clear in the progression probe occurred on attempts 3, 2, 2, beyond 5, 3 and 5 for seeds 3121, 777, 42, 1234, 9999 and 2026 respectively. The same six accounts on `69082d2` cleared 4/6 within five attempts. A separate ten-attempt run for seed 1234 reached victory on attempt 6.

The continuous-stream simulator now budgets 2,400 / 3,000 / 3,600 simulated seconds for 20 / 25 / 30 virtual waves. The explicit `--max-seconds` override and the timeout assertion still apply. Victory requires a surviving fortress, one resolved Tyrant, no live enemies and no incoming ammunition. These checks exercise fixed automated card choices.

At 330 targets and 90 wasps, one Hive target search read 90 swarm assignments, down from 29,700 on `69082d2`. In `node tests/laser-perf.cjs --compare /path/to/69082d2 --raster --repeats 7`, the upgraded two-second channel took 43.0 ms of simulation time at 120 Hz before and 19.1 ms after (Node, median of seven runs). All four base/upgraded and 60/120 Hz combinations preserved their ordered hit, damage and timestamp checksums. The upgraded channel recorded 3,185 hits with at most 17 live ray visuals. On pause, card selection and results, the canvas renders on state or size changes.

### Turret emitter checks, 2026-11-12

Firing and collision geometry now starts at the visible outlets. In the 12-seed fresh Stage 1 Normal comparison, smart and first-card policies each won 1/12 on the new geometry and 0/12 on `bbcc71d`. Both versions recorded zero smart wins on the three CI seeds. With R&D purchases between attempts, 3/6 accounts cleared within five attempts on the new geometry (5/6 previously). The remaining three seeds cleared on attempts 6, 10 and 6 when allowed ten attempts. On the 330-target laser fixture, the upgraded channel recorded 3,206 hits at both 60 and 120 Hz, with at most 17 live rays.

## Current base numbers

| System | Value |
|---|---|
| Field / base | `420×820` including underground scenery; combat/base line stays `y=720` |
| Turret positions / order | `x=52,368,96,324`: outer left, outer right, inner left, inner right; 44px between paired turrets |
| Armament | 4 turret slots + a movable Guardian |
| Base | 1000 HP, no shield (before Chips bonuses) |
| Healing | +2 base HP per enemy killed, capped at the maximum |
| First card thresholds | 2, 4, 6, 9 points; then 14 + 10 per next pick + 2.5 per virtual wave |
| Virtual-wave totals (one continuous stream) | `14 + round(7 × wave) + round((stage−1)×6×openingBonus)`; Elite adds enemies. Stages 4–12 openingBonus: 0/.35/.7/1 across virtual waves 1–4; otherwise 1. A stage's stream total is the sum over its virtual waves (Stage 1 Normal: 1,750; was 24 + round(8.4 × wave), 2,244, before experiment round 1, 2026-11-12) |
| Spawn interval | `max(0.06,0.20 − wave×0.002)` s, then a ×0.7–1.3 random variation; formation cooldown 1.33 s; both multiplied by the late-sector opening cadence (see `CAMPAIGN_OPENING`) |
| HP multiplier per virtual wave | `4.25 × (1 + (wave−1)×0.13)`, on top of the stage multiplier (`enemyHpMul`, `waveHpGrowth`; 0.85/0.13 before the 2026-11-12 owner order — enemies 5x HP; 0.78/0.14 before the 2026-11-11 reference card set, growth 0.06 before the 2026-11-10 card rework) |
| Boss HP multiplier per virtual wave | `13.2 × 1.1 × (1 + (wave−1)×0.07)`, on top of the stage (0.88 before the 2026-11-12 owner order — the boss is 15x HP, its own number) |
| Enemy speed | `×0.1875` on top of the stage multiplier (`enemySpdMul`, 1 before the 2026-11-12 owner order — enemies 25% slower, then another 50% (0.75×0.5), then another 50% (0.375×0.5, experiment round 1, 2026-11-12); the boss has its own `×0.25` (75% slower, not stacked with the general slowdown); the jam module ×0.85 stacks on top |
| Guardian | 12 damage (−8% from 13, a small round 4 nerf), 4 attacks/s, fires from both hands alternately; the triple burst is a tight group (3px spacing, one hand for the whole burst) |
| Turret visibility top (VIS_TOP) | y=30 — enemies above the line (just below the HUD row) are not targeted; spawning (y=-30) is unchanged |
| Turret and Guardian sprite scale | ×0.88 — the level label under the unit is not scaled |
| Turret damage factor | ×1.60 on the turret's configured damage at R&D 1 (not applied to the Guardian) |
| Live enemies | at most 330 total enemies (including the boss); the queue is not lost when full |
| Energy | 5 per run, regenerates 1 per 12 minutes, maximum 30 |
| Meta R&D | Lv. 1–45, +8% base damage per level, stepped CD and secondary stat |
| Global Crit DMG bonus | at most +100% |
| Elite (on top of Stage) | HP ×1.4, speed ×1.10, contact damage ×1.18; separate champions |
| Elite rewards | ×1.6 coins, materials and components; victories tracked separately from Normal |

For the exact HP/speed of the 15 enemies and the attacks of the 11 turrets, use `src/js/00-config.js` — it is the **single source of truth**. This table must not diverge from the code.

## Mechanics added in this cycle

- **Gravity Vortex Gun:** pulls enemies into a temporary field with tick damage, with a weakened effect on champions and the boss.
- **Phase scout:** periodically cloaks. Some turrets cannot pick a cloaked target unless it is revealed. Laser/Disruption/Firewheel have ways to reveal it.
- **Charger:** accelerating dashes toward the fortress.
- **Sky Guard:** impact and explosion are counted separately; the R&D chain adds thermal damage.
- **Laser:** a pulse with a 7.8 s cooldown between pulses (was 5.2 s; the cooldown is a constant in `fireLaser`, and the Laser turret's `attackSpeed` does not affect it), reflection/refraction, Deflect/Sweep, stacking vulnerability. The beam goes from the turret through the target to the edge of the field in the firing direction; **every laser, including extra and reflected ones, starts at the turret** (2026-11-11), and the ray width grows with its damage; damage does not depend on the beam length. **The beam does not track its target after firing:** the direction and aim point are locked when the pulse starts (the target's position at the start of the channel) and do not follow it until the channel ends; each tick, damage is computed for enemies on the locked line.
- **Beam:** ticks of 145% ATK at a 0.2 s interval, base CD 10 s, focusing and Stacking Damage with R&D upgrades.
- **Aeroblast is a medium-range shotgun.** Activation range **540** (was 200): it now fires at enemies from **y≥180**, not only from y≥520. A volley has 5 pellets of 10 base damage each; projectile speed **520 px/s** (was 380), fire rate 0.8/s, knockback 12 per hit. The spread's angular step is `min(0.14, 14/max(90, dist))` rad: up close the shotgun stays wide, far away neighboring pellets bunch up more tightly (about 14px between trajectories at the target distance). Extra projectiles from cards keep adding pellets to the spread. The "Impact radius" R&D scales the **splash**, not the targeting range. In the original Galaxy Defense, Aeroblast deals a direct hit + a directional cone explosion, and Shotgun Barrage is a separate card; here the current simplified shotgun mechanic is kept, but its ineffectiveness at range is fixed. Source for comparison: https://gd-community.fun/guides/aeroblast .
- **Hive:** wasps are released within the hive's radius but look for targets on their own across the **whole field**; the Swarm Echo R&D chain limits repeated wasp replication. Wasps fly in an upward fan from three visible hive exits (a 0.25 s launch phase at 120 px/s), then home in at 240 px/s; damage is dealt on touching the enemy's bottom edge (the wasp is under the enemy, not at its center). **Base wasp lifetime 12.75 s**, echo wasps 6.5 s. **At most 2 wasps per target:** wasps are distributed across targets when choosing and retargeting, the rest take other enemies; if all targets are taken, the least loaded one is chosen.
- **Firewheel:** a single standalone bouncing disc (radius 20, speed 200, lifetime 10 s); see the reference card set below.
- **Tesla:** a direct hit (0.8×), an area explosion (0.65×, radius 55), a flash ring of 170, 12 particles; the charge damage is unchanged. **Bounce instead of "double charge":** after a hit, the discharge jumps from the target to the nearest enemy not yet hit within 150px, and so on along the chain (bounces = multiCount−1, 2 by default); bounce damage falls off: 0.7×, 0.5×, 0.35×, 0.25×, 0.2×. The old simultaneous hit on several targets around the first one is removed entirely; the "Secondary Arc" card is replaced by "Discharge Bounce" (one more bounce), and the "Overvoltage" super bounces across 6 targets.
- **No scatter:** (card names in this bullet are from the pre-reference set) extra turret projectiles fly **in parallel** from their model’s ports (Sky Guard tube pitch 7px, extra missiles cycle through the four tubes), not in a spread — the "Twin Barrel", "Cluster Salvo", "Shockwave" cards and the "Rocket Barrage" super no longer scatter the fire. The Laser's sweeping beam hits the second target **deterministically** — the toughest of the remaining ones, not a random one. The only spreads in the game are the pellet spread of the Aeroblast shotgun itself (its design, not a card) and, since 2026-11-10, the Guardian's **Shotgun Evolution** card (each shot scatters into 2 extra bullets at ±0.12 rad) — an explicit owner-approved exception.
- **Railgun, Disruption, Thunderbolt:** distinct effects and T1/T2/T3 chains.
- **Combos:** including Gravity + Firewheel, Gravity + Hive, Railgun + Tesla. R&D requirements are tied to meta progression, not only to random battle cards.
- **Chips:** levels 0–5 for `core` (+3% turret damage per step), `speed` (+2% fire rate), `fort` (+40 to the base's maximum HP), paid in components using the formula `4 + 4×current level`. Liveries change only the appearance.
- **Base HP:** a compact arc above the central bunker, inside the dome; center `(W/2, BASEY+14)`, radius 48, angle 120° (±60° from the apex). Arc length is proportional to HP, symmetric around the apex. Exact HP is centered 11px above the arc. The dome is scenery: an ellipse with radii 260/112 at the deck, not a second HP bar. The base has no shield: breaches damage HP directly; the "Fortress Shield" module was replaced by "Fortress Repair" (+250 HP).
- **Notifications:** there are no pop-up notifications (toasts) in the game — not for super cards, patrol, or boss/champion warnings. The toast element and its styles were removed from the markup.
- **HUD:** one transparent row: mode/stage, enemies remaining in the stream, average DPS, kills, timer. Labels shorten before the font shrinks (10.5 → 9px); the measured timer column is always reserved. Minutes display correctly after 10:00.

## Battle cards: the reference set (2026-11-11)

Source of truth: [`docs/turrets-reference.md`](docs/turrets-reference.md) (11 turrets plus the Guardian, Russian effect text, English card names). Code: `src/js/07-cards.js` (all 270 cards), `src/js/03b-effects.js` (shared systems), `genCards`/`applyCard` in `src/js/07-ui.js`. The smoke test `every reference card exists…` parses the reference file and fails if a card is missing, if one was invented, or if its tier, Extra flag, R&D gate or **any number** from the reference text is not in the card text.

| Rule | Value |
|---|---|
| Star Tier N | in-run unit level N: the draft pool holds the unit's normal cards with tier ≤ its level (1–3, `MAX_RUN_LV`) |
| Extra (purple) | eligible only at 3 pips, then enters the same weighted random pool. No forced offers or reroll retention. A purple card levels the unit up (pips → 0, damage ×1.25 `BALANCE.levelUpDmg`). At Lv.3, a purple starts a **mastery** cycle (pips reset, `u.mastery++`) |
| Pips | normal unit cards and combos fill pips 1–3 |
| Super Mode | automatic on reaching Lv.3 when R&D ≥ `rdTierUnlock` (Laser/Aeroblast/Gravity/Firewheel 10, Sky Guard/Railgun 14, others 18); recorded in the pick list as "SUPER MODE: …". There are no SUPER cards any more |
| 🔒 Lv.X | the card needs turret R&D ≥ X |
| Lv.2/6/10 unlock table | the named cards need R&D 2/6/10 |
| Guardian locks | Lv.61/71/101/121 exceed our R&D cap of 45 and are scaled ×45/121: **23 / 26 / 38 / 45** |
| Lv.4/8/12 meta bumps | Lv.4 and Lv.12 (then 24/32/44): the secondary stat +20% (Hive: Wasp ATK count +1 per step, Railgun: Penetration +1 per step); Lv.8: Cooldown Speed +5% (later 16/28/36 keep −7.5% each). Secondary names: Gravity field radius, Field duration (Disruption), Strike width (Thunderbolt) |
| Cross-turret cards | e.g. Tesla "Firewheel Thunder", Gravity "Hive Gravity", Beam "Bee Wave": they work only while the referenced unit is on the field |
| Draft weights | unit base `18/max(3, eligible normal count)`; Star Tier 1/2/3 ×1/0.5/0.25; Extra another ×0.2; module/combo 0.8 (was 3). These are relative weights, not fixed percentages |
| Empty draft guard | "Field Patch" (+120 HP, repeatable) fills the draft only when nothing else is left |

**Entity caps for mobile** (`FX_CAP` in `03b-effects.js`): mines 30, pulse waves 24, Thunderbolt bolts 8, black holes 6, portals 4, spinners 4, mini drones 12, delayed strikes 30, projectiles 400, fields 56, Ripping Lasers 10/s, wasps 90. The full-card stress test checks them.

**Base behavior changed by the owner (2026-11-11), not by cards:**
- **Laser fires only from the turret.** Every extra laser (deflected ±0.3·k rad, sweeping, reflected, refracted, Graviton/Emberrail/Convergence) starts at the turret, not at the target. Reflections are extra rays from the turret at 0.8^k damage. The direction still locks at pulse start. **Ray width depends on damage:** `3 × clamp(√power, 1, 3) × band`, where power is the ray's damage relative to the base tick (High-Energy Pulse doubles the band).
- **Firewheel:** a bigger, slower disc: radius 20 (Size Boost +25% → 25), speed 200 (was 14 and 290). Its cooldown (2 s minus Killing Charge) starts only after the disc is gone. Contact damage went from 1.15× ATK + guaranteed burn to **3× ATK**, because burn is now the Ignition card (20%) / Inferno.
- **Beam** is drawn as a thick wavy stream with flowing particles (`drawBeamStreams`).
- **Gravity** is a field flying from the turret toward the target (95 px/s, range 260, "Extended Range" ×2) and pulling enemies along. Its tick damage went from 0.65× to **2.2× ATK** so DPS stays at the HEAD level (single-turret bench at R&D 1: 72 vs 73 dmg/s).
- **Teslacoil** charges 0.3 s before each discharge (Cooperative Beam / Charged Shock act during the charge). The cooldown runs during the charge.
- **Thunderbolt** strikes a vertical column (half-width 14 px × Strike width), targeting the enemy closest to the base, range 560.

**Numbers the reference does not state (our values):**
- **Paralyze / Immobilize:** 1 s base (Laser 0.6 s); bosses ×0.3, champions ×0.5; 1 s immunity afterwards.
- **Teleport:** pushes the enemy back 120 px, or to the start for "rewind" effects; bosses are immune. Teleport Damage = min(3% max HP, 60000 × ATK).
- **Disruption:** max 3 stacks (Overcharged: 5, power ×2). The detonation at max stacks deals 2× ATK; Burst adds 6×, the area version hits within 50 px. The Disruption Field deals 0.6× every 0.5 s for 3 s × Field duration.
- **Small strikes:** Small Thunderbolt every 0.6 s at 0.5×; Chain Lightning 0.6× (jumps within 120 px).
- **Mines and pulses:** Floating Mine arms after 0.3 s; Pulse Wave 0.6×; Ripping Laser is a 240 px tearing ray.
- **Charge mechanics:** Charge Blast = 30% of volleys, or every volley while the Guardian is in Charged State. Guardian Charge Activation: 60 charge points → 20 charged shots at 1.5× fire rate. Killing Charge shortens the Firewheel downtime.
- **Mirror Guardian:** a clone 40 px aside whose bullets deal 50%.
- **Other cards:** Volley Wasp = an extra sting on a nearby enemy. Aeroblast per-volley effects run on the central "main" pellet. Weak Spot is capped at ×1.5. Split shells fly at small fragment angles (±0.35 rad).
- **Carried over:** Wasp II +50% sting, Wasp III ×2; Impact Reinforcement small missile = 50% (impact only); Electro-Wasps shock = 60% of the sting to 2 enemies within 80 px; Shotgun Evolution bullets = full damage at ±0.12 rad (the only real spread besides the Aeroblast pellets).

**Guardian** uses the official 22-card set (section 12 of the reference). It replaces the old bespoke Guardian cards (Explosive Rounds, Guardian Overdrive, Legendary Marksman). No stats table exists for it, so its base stats did not change. Shotgun Evolution keeps the real spread. Laser Shot's ripping laser starts at the Guardian.

Full card list (generated from `CARDS` via `cardDesc`):

**Sky Guard** — 23 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Volley Missile | 1 | normal | 1 | Sky Guard missiles +1, DMG -15%. |
| Sky Guard Boost | 1 | normal | 1 | Sky Guard missile DMG +50%. |
| Explosion Spread | 1 | normal | 1 | Explosion range +30%. |
| Impact Reinforcement | 1 | normal | 1 | After hitting a target, a Sky Guard missile launches 3 small missiles that deal impact damage only. |
| Ignition | 1 | normal | 2 | Enemies hit by Sky Guard missiles get [Burn]. |
| Volley Missile+ | 1 | normal | 26 | Sky Guard missiles +1. |
| Sky Guard Boost+ | 1 | normal | 34 | Sky Guard missile DMG +100%. |
| Explosion Spread+ | 1 | normal | 42 | Explosion range +45%. |
| Burning Area | 1 | Extra (purple) | 1 | After exploding, Sky Guard missiles leave a burning area for 5 s. |
| Impact Multiplier | 1 | Extra (purple) | 1 | All Sky Guard missiles: Impact DMG +200%. |
| Missile Amplification | 2 | normal | 1 | Sky Guard small missiles +3. |
| Ignition Amplification | 2 | normal | 6 | [Burn] DMG +100%. |
| Thermal Warhead | 2 | normal | 22 | Sky Guard small missiles have a 60% chance to explode on hitting an enemy. |
| Collapse Explosion | 2 | normal | 1 | After a Sky Guard missile explodes, a small black hole appears. |
| Shock Thunder Blast | 2 | normal | 30 | All missiles have a 20% chance to leave a Floating Mine when dealing impact damage. |
| Strong Impact | 2 | Extra (purple) | 1 | Sky Guard missiles +2. |
| Close-range Explosion | 2 | Extra (purple) | 14 | After hitting a target, a Sky Guard missile triggers an extra strong explosion nearby. |
| Chain Reaction | 3 | normal | 1 | Sky Guard small missiles have a 60% chance to launch one more small missile on hitting an enemy. |
| Death Ignition | 3 | normal | 10 | An enemy dying under [Burn] explodes. |
| Detonation Thunderbolt | 3 | normal | 1 | When Sky Guard missiles kill an enemy, a stationary small Thunderbolt appears for 5 s. |
| Path Strike | 3 | normal | 1 | Sky Guard missiles deal impact damage to enemies along their path. |
| Impact Cleave | 3 | normal | 38 | All missiles fire a Ripping Laser when dealing impact damage. |
| Fire Transmission | 3 | Extra (purple) | 1 | Sky Guard missiles inflict [Burn] on enemies they fly through. |

**Laser** — 23 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Laser Amplification | 1 | normal | 1 | Laser DMG +50%. |
| Stable Energy | 1 | normal | 1 | Laser duration +40%. |
| Laser Reflection | 1 | normal | 1 | DMG -20% per reflection. Laser reflections +1. |
| Additional Sweep | 1 | normal | 1 | Fires 1 additional Sweeping Laser from the turret. |
| Energy Surge | 1 | normal | 2 | Fires 2 additional Deflected Lasers from the turret. |
| Laser Amplification+ | 1 | normal | 26 | Laser DMG +100%. |
| Laser Reflection+ | 1 | normal | 34 | Laser reflections +1. |
| Stable Energy+ | 1 | normal | 42 | Laser duration +60%. |
| High-Energy Pulse | 1 | Extra (purple) | 1 | Laser DMG range +100%. |
| Multi-Strike | 1 | Extra (purple) | 1 | Laser duration +100%, Cooldown speed +20%. |
| Vulnerable Laser | 2 | normal | 1 | Enemies hit by Sweeping Lasers get [Vulnerable]. |
| Slow Laser | 2 | normal | 6 | Enemies hit by Deflected Lasers get [Slow]. |
| Energy Paralysis | 2 | normal | 1 | Enemies hit by the laser get [Paralyze]. |
| Graviton Laser | 2 | normal | 22 | Lasers pull nearby enemies in. |
| Emberrail Laser | 2 | normal | 38 | While active, the piercing laser leaves a Flame Trail. |
| Energy Overload | 2 | Extra (purple) | 1 | Duration of all laser debuffs +100%. |
| Tear Explosion | 2 | Extra (purple) | 1 | A laser hit has a 20% chance to fire a Ripping Laser from the turret. |
| Energy Boost | 2 | Extra (purple) | 18 | Laser DMG +60% for every debuff on the enemy (max 300%). |
| Sweep Boost | 3 | normal | 1 | The Sweeping Laser sweeps one more time. |
| Deflected Laser Reflection | 3 | normal | 14 | Deflected laser reflections +1. |
| Energy Detonation | 3 | normal | 1 | All lasers trigger an Ignition Explosion when hitting enemies with [Burn]. |
| Convergence Trigger | 3 | normal | 1 | A laser hit has a 30% chance to create a Refracted Beam from the turret. |
| Disruption Laser | 3 | normal | 30 | When dealing damage, the laser has a 10% chance to apply 1 stack of [Disruption]. |

**Disruption Drone** — 24 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Field Amplification | 1 | normal | 1 | Disruption Field DMG +50%. |
| Field Duration | 1 | normal | 1 | Disruption Field duration +30%. |
| Field Expansion | 1 | normal | 1 | Disruption Field DMG area +30%. |
| Disruption Force | 1 | normal | 1 | Each time the Disruption Field deals damage, it applies 1 stack of [Disruption]. |
| Random Disturbance | 1 | normal | 2 | Enemies hit by the Disruption Field have a 5% chance to teleport back some distance. |
| Field Amplification+ | 1 | normal | 26 | Disruption Field DMG +100%. |
| Field Expansion+ | 1 | normal | 34 | Disruption Field DMG area +45%. |
| Field Duration+ | 1 | normal | 42 | Disruption Field duration +45%. |
| Final Blast | 1 | Extra (purple) | 1 | When the Disruption Field ends, it deals explosion damage. |
| Stasis Field | 1 | Extra (purple) | 1 | Each time enemies take Disruption Field damage, their [Slow] grows by 10% (max 90%). |
| Disruption Burst | 2 | normal | 1 | When [Disruption] reaches max stacks, it deals 1 powerful one-time hit. |
| Rewind Teleport | 2 | normal | 6 | Enemies hit by the Disruption Field have a 2.5% chance to teleport back to their starting point. |
| Overcharged Disruption | 2 | normal | 22 | [Disruption] DMG +100%, max stacks become 5. |
| Small Laser | 2 | normal | 1 | A Sweeping Laser appears in the center of each Disruption Field. |
| Electric Field | 2 | normal | 1 | Enemies hit by the Disruption Field have a 30% chance to get [Paralyze]. |
| Interference Thunder Core | 2 | normal | 30 | Enemies dying in the Disruption Field have a 30% chance to create a small Thunderbolt. |
| Quick Cooldown | 2 | Extra (purple) | 1 | Disruption Drone DMG interval -30%, Cooldown speed +30%. |
| Field Suppression | 2 | Extra (purple) | 1 | Enemies in the Disruption Field take extra damage based on their slow strength (max +200%). |
| Area Disruption | 3 | normal | 1 | When [Disruption] reaches max stacks, it deals 1 extra area hit. |
| Teleport Damage | 3 | normal | 10 | A teleport out of the Disruption Field deals 3% of the target's max HP (max 60000 × ATK). |
| Fortress Support | 3 | normal | 1 | An extra set of Disruption Drones launches above the fortress. |
| Field Replication | 3 | normal | 1 | A Railgun shell entering a Disruption Field for the first time splits with a 100% chance (+1 Railgun shell). |
| Disruption Shotgun | 3 | normal | 38 | While a Disruption Field is active, the drones fire Penetrating Shotgun Shells into it. |
| Converging Field | 3 | Extra (purple) | 18 | Every damage tick pulls enemies to the field center. Disruption Drone DMG +100%. |

**Aeroblast** — 23 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Powerful Blast | 1 | normal | 1 | Aeroblast projectile DMG +50%. |
| Multiple Blast | 1 | normal | 1 | Aeroblast projectiles +1, DMG -15%. |
| Impact Enhancement | 1 | normal | 1 | Knockback +50%, DMG +30%. |
| Shotgun Barrage | 1 | normal | 1 | After firing, Aeroblast releases 5 Penetrating Shotgun Shells. |
| Floating Mine | 1 | normal | 2 | On explosion, the Aeroblast projectile leaves 2 Floating Mines in the blast area. |
| Powerful Blast+ | 1 | normal | 26 | Aeroblast projectile DMG +100%. |
| Multiple Blast+ | 1 | normal | 34 | Aeroblast fires 1 extra time. |
| Impact Enhancement+ | 1 | normal | 42 | Knockback +75%, DMG +30%. |
| Massive Explosion | 1 | Extra (purple) | 1 | Aeroblast explosion radius +70%. |
| Central Blast | 1 | Extra (purple) | 1 | Aeroblast projectiles also detonate a high-energy blast at the center of the area. |
| Extra Loading | 2 | normal | 1 | For each enemy killed, Aeroblast fires 1 extra Penetrating Shotgun Shell (max 10). |
| Wide Minefield | 2 | normal | 6 | Floating Mines +2, Mine explosion DMG +25%. |
| Mine Shockwave | 2 | normal | 14 | Floating Mines +2, Mine knockback +100%. |
| Piercing Blast | 2 | normal | 1 | Aeroblast projectile penetration +1. |
| Firewheel Summon | 2 | normal | 1 | Every enemy hit by an Aeroblast explosion summons a small Firewheel drone. |
| Bouncing Barrage | 2 | normal | 30 | Aeroblast projectile bounces +1. |
| Chain Explosion | 2 | Extra (purple) | 1 | Explosion DMG +20% for every enemy hit by the Aeroblast explosion (max 200%). |
| Range Extension | 2 | Extra (purple) | 1 | Aeroblast range +70%. |
| Secondary Explosion | 2 | Extra (purple) | 18 | Enemies hit by an Aeroblast projectile cause an extra explosion after 1 s. |
| Shotgun Penetration | 3 | normal | 1 | Shotgun Shell DMG +50%, range +70%. |
| Gravity Bomb | 3 | normal | 1 | The projectile pulls enemies to the center before exploding. Aeroblast projectile DMG +100%. |
| Shatter Impact | 3 | normal | 22 | On hit, the Aeroblast projectile creates 2 extra Ripping Lasers. |
| Charge Blast | 3 | normal | 38 | 30% chance to fire Charge Shots, and keeps firing them while the Guardian is in Charged State. |

**Thunderbolt** — 23 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Continuous Strike | 1 | normal | 1 | Thunderbolts +1, Lightning strike DMG -15%. |
| Swift Strike | 1 | normal | 1 | Lightning strike cooldown speed +10%, DMG +30%. |
| Lightning Boost | 1 | normal | 1 | Lightning strike DMG +50%. |
| Lightning Paralysis | 1 | normal | 1 | Enemies hit by a lightning strike get [Paralyze]. |
| Chain Lightning | 1 | normal | 2 | A lightning strike launches 1 Chain Lightning on hit (max 5 targets). |
| Lightning Boost+ | 1 | normal | 26 | Lightning strike DMG +100%. |
| Continuous Strike+ | 1 | normal | 34 | Thunderbolts +1. |
| Swift Strike+ | 1 | normal | 42 | Lightning strike cooldown speed +20%, DMG +30%. |
| Lightning Expansion | 1 | Extra (purple) | 1 | Lightning strike width +100%. |
| Slaughtering Lightning | 1 | Extra (purple) | 1 | When a lightning strike kills an enemy, there is a 60% chance to create a stationary small Thunderbolt. |
| Paralysis Extension | 2 | normal | 1 | Thunderbolt [Paralyze] duration +100%. |
| Chain Expansion | 2 | normal | 6 | Chain Lightning targets +4. |
| Paralyzing Shock | 2 | normal | 22 | While Thunderbolt's [Paralyze] lasts, a small lightning strike hits the enemy every 1 s. |
| Lightning Aftershock | 2 | normal | 1 | A Thunderbolt hit has a 50% chance to create 1 Floating Mine. |
| Lightning Trail | 2 | normal | 1 | A lightning strike leaves a fire trail along its path. |
| Stormcall Laser | 2 | normal | 30 | After each lightning strike, the Lightning Orb fires a Secondary Beam. |
| Extra Strike | 2 | Extra (purple) | 1 | A lightning strike has a 50% chance to strike 1 more time. |
| Thunder Chain | 2 | Extra (purple) | 1 | Enemies hit by a lightning strike launch a small Chain Lightning whenever they take damage (lasts 2 s, interval 0.5 s). |
| Chain Strike | 2 | Extra (purple) | 18 | Enemies hit by Chain Lightning have a 25% chance to call a small lightning strike. |
| Life Erosion | 3 | normal | 1 | A lightning strike that applies [Paralyze] also deals 1% of the target's max HP (max 20000 × ATK). |
| Chain Interference | 3 | normal | 10 | Enemies hit by Chain Lightning get [Paralyze]; Chain Lightning DMG +100%. |
| Lightning Teleportation | 3 | normal | 1 | Enemies hit by a lightning strike or Chain Lightning have a 50% chance to teleport back some distance. |
| Lightning Strike Burst | 3 | normal | 38 | A lightning strike has a 10% chance to cause an explosion on hit. |

**Beam** — 22 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Beam Boost | 1 | normal | 1 | Beam DMG +50%. |
| High-Frequency Beam | 1 | normal | 1 | Beam cooldown speed +30%. |
| Damage Increase | 1 | normal | 1 | Beam DMG on the same target keeps growing (max 200%). |
| Efficient Beam | 1 | normal | 1 | Beam duration +40%. |
| Beam Refraction | 1 | normal | 2 | On hit, the beam creates Refracted Beams. Refractions +2. |
| Beam Boost+ | 1 | normal | 26 | Beam DMG +100%. |
| High-Frequency Beam+ | 1 | normal | 34 | Beam cooldown speed +45%. |
| Efficient Beam+ | 1 | normal | 42 | Beam duration +60%. |
| DMG Multiplier | 1 | Extra (purple) | 1 | Beam DMG interval -40%. |
| Beam Penetration | 1 | Extra (purple) | 1 | All beams inflict [Vulnerable] on their targets. |
| Stacking Damage | 2 | normal | 1 | The accumulated damage bonus is kept when the beam switches targets. |
| Refraction Pull | 2 | normal | 6 | Refracted beams pull the hit target to the center. Refractions +2. |
| Target Explosion | 2 | normal | 1 | Every beam hit causes an explosion. |
| Disruptive Beam | 2 | normal | 22 | Targets hit by the beam create a small Disruption Field. |
| Black Hole Spotlight | 2 | normal | 38 | A black hole appears at the ends of all beams. |
| Slaughtering Beam | 2 | Extra (purple) | 1 | Beam duration +10% for every enemy killed by the beam (max 100%). |
| Extra Beam | 2 | Extra (purple) | 1 | Fires an additional Secondary Beam. |
| Extreme Focus | 3 | normal | 1 | The damage-growth cap rises to 400%. |
| Refraction Explosion | 3 | normal | 10 | Every Refracted Beam hit causes an explosion. |
| Beam Lightning | 3 | normal | 1 | Every beam hit has a 30% chance to launch 1 Chain Lightning. |
| Matrix Resonance | 3 | normal | 14 | On hit, the beam releases an expanding Electric Matrix. |
| Power-Accumulating Bee Wave | 3 | normal | 30 | When charged beams deal damage, there is a 40% chance to release a Pulse Wave. |

**Railgun** — 22 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Ammo Boost | 1 | normal | 1 | Railgun shell DMG +50%. |
| Shell Salvo | 1 | normal | 1 | Railgun shells +1, DMG -15%. |
| Railgun Upgrade | 1 | normal | 1 | Railgun shell DMG +30%, Penetration +1. |
| Basic Split | 1 | normal | 1 | On hitting the first enemy, the Railgun shell splits into 2 small shells, with a 20% chance of 2 more. |
| Explosive Shells | 1 | normal | 2 | The Railgun shell explodes on hit. |
| Ammo Boost+ | 1 | normal | 26 | Railgun shell DMG +100%. |
| Shell Salvo+ | 1 | normal | 34 | Railgun shells +1. |
| Railgun Upgrade+ | 1 | normal | 42 | Penetration +1, Railgun shell DMG +60%. |
| Power Penetration | 1 | Extra (purple) | 1 | Penetration +3, Knockback +100%. |
| Weak Spot Strike | 1 | Extra (purple) | 1 | Railgun shell DMG grows with the target's HP (max 150%). |
| Piercing Enhancement | 2 | normal | 1 | On hitting the first enemy, a small Railgun shell splits into 2 mini shells, with a 20% chance of 2 more. |
| Impact Spread | 2 | normal | 6 | Railgun explosion radius +20% per penetration. |
| Impact Boost | 2 | normal | 10 | Railgun explosion DMG +30% per penetration. |
| Piercing Mark | 2 | normal | 1 | Enemies hit by any Railgun shell get [Physical Vulnerable]. |
| Surge Pierce | 2 | normal | 22 | When a Railgun shell kills an enemy, there is a 50% chance to release a high-voltage shock. |
| Armor Piercing Pulse | 2 | normal | 38 | Firing a Railgun shell creates a Pulse Wave. |
| Shell Crit Boost | 2 | Extra (purple) | 1 | All Railgun shell DMG +40%, Crit chance +30%. |
| Execution Penetration | 2 | Extra (purple) | 1 | Railgun shell penetration +1 per kill (max +5). |
| Split Mastery | 3 | normal | 1 | Split chance of all Railgun shells +40%. |
| Secondary Minefield | 3 | normal | 1 | A Railgun shell leaves 1 Floating Mine on hit. |
| Piercing Ricochet | 3 | normal | 18 | Penetration +1, Ricochets +1. |
| Armor-Piercing Light Split | 3 | normal | 30 | Enemies hit by any Railgun shell have a 10% chance to fire a Ripping Laser. |

**Teslacoil** — 22 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Electro Boost | 1 | normal | 1 | Teslacoil DMG +50%. |
| Electro Chain | 1 | normal | 1 | Bounces +1, DMG -15%. |
| Electro Acceleration | 1 | normal | 1 | Teslacoil cooldown speed +30%. |
| Charge Expansion | 1 | normal | 1 | DMG radius grows with charge time. Charge time +0.5 s. |
| Trap Matrix | 1 | normal | 2 | Teslacoil releases an Electric Matrix in the explosion area that deals extra damage and applies [Slow] for 2 s. |
| Electro Boost+ | 1 | normal | 26 | Teslacoil DMG +100%. |
| Electro Chain+ | 1 | normal | 34 | Bounces +1. |
| Electro Acceleration+ | 1 | normal | 42 | Teslacoil cooldown speed +45%. |
| Electric Chain Surge | 1 | Extra (purple) | 1 | On hit, Teslacoil releases up to 5 high-voltage shocks at the nearest enemies. |
| Electro Interference | 1 | Extra (purple) | 1 | The Teslacoil explosion and Electric Matrix apply [Paralyze]. Teslacoil explosion radius +30%. |
| Charge Destruction | 2 | normal | 1 | DMG grows with charge time. Charge time +0.5 s. |
| Enhanced Matrix | 2 | normal | 6 | Electric Matrix DMG +100%, duration +1 s. |
| Cooperative Beam | 2 | normal | 1 | While charging, Teslacoil fires 2 Refracted Beams. |
| Wasp Mirage | 2 | normal | 22 | A Teslacoil hit summons an Echo Wasp. |
| Electromagnetic Fission | 2 | normal | 30 | The Teslacoil explosion splits into 2 small Teslacoils. |
| Expanded Shockwave | 2 | Extra (purple) | 1 | Teslacoil explosion radius is increased; damage in the outer part is halved. |
| Charged Shock | 2 | Extra (purple) | 1 | While charging, Teslacoil releases up to 2 high-voltage shocks at the nearest enemies every 0.25 s. |
| Charge Delayed | 3 | normal | 1 | Charge time +1 s. |
| Matrix Thunderbolt | 3 | normal | 10 | Every 0.5 s the Electric Matrix creates a stationary small Thunderbolt that lasts 5 s. |
| Highvolt Trigger | 3 | normal | 1 | The Teslacoil explosion launches 1 Chain Lightning through the enemies hit (max 5). |
| Spinning Laser | 3 | normal | 14 | On hit, Teslacoil fires 1 Spinning Laser. |
| Magnetic Storm Flare | 3 | normal | 38 | After hitting an enemy, Teslacoil creates 3 small Firewheel drones. |

**Gravity Vortex Gun** — 22 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| High Power Field | 1 | normal | 1 | Gravity field DMG +50%. |
| Wide Field | 1 | normal | 1 | Gravity field radius +25%. |
| Extended Field | 1 | normal | 1 | Gravity field flight range +30%. |
| Static Wormhole | 1 | normal | 1 | On hitting the first enemy, the field opens a portal that for 3 s moves enemies to where the field ends. |
| Small Black Hole | 1 | normal | 2 | When the field ends, a small black hole appears and pulls enemies for 5 s. |
| High Power Field+ | 1 | normal | 26 | Gravity field DMG +100%. |
| Wide Field+ | 1 | normal | 34 | Gravity field radius +40%. |
| Extended Field+ | 1 | normal | 42 | Gravity field flight range +50%. |
| Extended Pull | 1 | Extra (purple) | 1 | The farther the gravity field flies, the bigger its radius. |
| Field Amplification | 1 | Extra (purple) | 1 | Gravity field DMG +80%, Pull +100%. |
| Wormhole Enhancement | 2 | normal | 1 | Portal duration (entry and exit) +100%. |
| Wormhole Expansion | 2 | normal | 1 | Portal entry radius +100%. |
| Black Hole Expansion | 2 | normal | 6 | Small black hole radius +50%, pull +50%. |
| Field Reflection | 2 | normal | 1 | All gravity fields can bounce off walls. |
| Field Disruption | 2 | normal | 1 | The gravity field applies [Disruption] on hit. |
| Gravity Lightning | 2 | normal | 38 | Every 0.5 s the gravity field releases 4 high-voltage shocks. |
| Extra Field | 2 | Extra (purple) | 1 | Gravity fields +1. |
| Extended Range | 2 | Extra (purple) | 1 | Gravity field flight range +100%. |
| Destructive Black Hole | 3 | normal | 14 | Small black hole DMG +250%. |
| Double Fission | 3 | normal | 18 | At the end of its flight, the gravity field splits into 2 small fields. |
| Binary Stars | 3 | normal | 22 | The gravity field splits into a pair of orbiting binary stars. |
| Gravity Increase | 3 | normal | 30 | The farther the gravity field flies, the stronger its pull and damage. |

**Hive** — 23 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Swarm Assault | 1 | normal | 1 | Wasp DMG +50%. |
| Rapid Barrage | 1 | normal | 1 | Wasp attack count +2. |
| Dense Swarm | 1 | normal | 1 | Wasps +2, DMG -15%. |
| Contact Pulse | 1 | normal | 1 | On its first hit, a wasp releases 1 Pulse Wave. |
| Swarm Echo | 1 | normal | 2 | On a kill, a wasp spawns 1 Echo Wasp I (max 1). |
| Swarm Assault+ | 1 | normal | 26 | Wasp DMG +100%. |
| Rapid Barrage+ | 1 | normal | 34 | Wasp attack count +2, DMG +30%. |
| Dense Swarm+ | 1 | normal | 42 | Wasps +2. |
| Wasp Evolution II | 1 | Extra (purple) | 1 | A Wasp I evolves into Wasp II after 3 attacks. |
| Hive Mutation II | 1 | Extra (purple) | 1 | After every 2 volleys, the Hive releases a Wasp II. |
| Amplified Pulse | 2 | normal | 1 | Pulse Waves apply [Slow] on hit. Pulse Wave DMG radius +30%. |
| Final Resonance | 2 | normal | 1 | At the end of its life, a wasp releases 1 Pulse Wave. |
| Echo Upgrade II | 2 | normal | 6 | Echo wasps evolve into Echo Wasp II. |
| Electro-Wasps | 2 | normal | 1 | Each wasp attack has a 50% chance to release a high-voltage shock at the nearest enemies. |
| Aero Split | 2 | normal | 22 | A wasp hit has a 60% chance to split into 3 small Railgun shells. |
| Bee-Bomb Incineration Domain | 2 | normal | 30 | A destroyed wasp self-detonates and leaves a burning area. |
| Wasp Evolution III | 2 | Extra (purple) | 1 | A Wasp II evolves into Wasp III after 3 attacks. |
| Hive Mutation III | 2 | Extra (purple) | 1 | After every 2 volleys, the Hive has a 50% chance to release a Wasp III. |
| Wasp Retrieval | 2 | Extra (purple) | 14 | Destroyed wasps have a 50% chance to return to the Hive (up to 5 stored). |
| Echo Upgrade III | 3 | normal | 10 | Echo wasps evolve into Echo Wasp III. |
| Volley Wasp | 3 | normal | 1 | Wasp bullets +1. |
| Swarm Fury | 3 | normal | 1 | After each attack, wasp DMG +30%. |
| Wasp Immobilize | 3 | normal | 38 | A wasp attack has a 20% chance to apply [Immobilize]. |

**Firewheel Drone** — 21 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Firewheel Boost | 1 | normal | 1 | Firewheel Drone DMG +50%. |
| Size Boost | 1 | normal | 1 | Firewheel Drone size +25%. |
| Duration Extension | 1 | normal | 1 | Firewheel Drone duration +30%. |
| Mini Drones | 1 | normal | 1 | Every 3 s the Firewheel Drone summons 2 mini Firewheel drones. |
| Flame Trail | 1 | normal | 2 | In flight, the Firewheel Drone leaves a fire trail for 2 s. |
| Firewheel Boost+ | 1 | normal | 26 | Firewheel Drone DMG +100%. |
| Size Boost+ | 1 | normal | 34 | Firewheel Drone size +40%. |
| Duration Extension+ | 1 | normal | 42 | Firewheel Drone duration +45%. |
| Smart Acceleration | 1 | Extra (purple) | 1 | Firewheel Drone DMG +60% and speed +80% while it is not dealing damage. |
| Hold the Ground | 1 | Extra (purple) | 1 | When its time runs out, the Firewheel Drone stays for 10 s more. |
| Killing Array | 2 | normal | 1 | For every 2 enemies killed directly by the Firewheel Drone, 2 mini Firewheel drones are summoned. |
| Blazing Trail | 2 | normal | 6 | Fire trail DMG +60%. |
| Firewheel Ignition | 2 | normal | 1 | The Firewheel Drone has a 20% chance to apply [Burn]. |
| Vortex Firewheel | 2 | normal | 18 | The Firewheel Drone pulls nearby enemies in. |
| Killing Charge | 2 | Extra (purple) | 1 | For every 2 enemies killed directly by the Firewheel Drone, its cooldown -0.5 s (max 5 s). |
| Combo Boost | 2 | Extra (purple) | 1 | Every 20 Firewheel Drone hits, its DMG +20% (max +200%). |
| Mini Size Boost | 3 | normal | 1 | Mini Firewheel DMG +50%, duration +50%. |
| Extended Trail | 3 | normal | 14 | Fire trail duration +2 s. |
| Extra Barrage | 3 | normal | 1 | Every 15 Firewheel Drone hits, it fires a ring of penetrating bullets. |
| Blazing Pulse | 3 | normal | 22 | The Firewheel Drone releases a Pulse Wave every 1.5 s. |
| Flame Power Surge | 3 | normal | 38 | Firewheel Drone DMG grows over time, up to 500%. |

**Guardian (bullet turret)** — 22 cards

| Card | Tier | Kind | R&D | Effect |
|---|---:|---|---:|---|
| Volley Shot | 1 | normal | 1 | Bullets +1, DMG -15%. |
| Bullets Boost | 1 | normal | 1 | Bullet DMG +50%. |
| Piercing Bullet | 1 | normal | 1 | Penetration +1. |
| Bullet Explosion | 1 | normal | 1 | A bullet has a 10% chance to explode on hit. |
| Charge Activation | 1 | normal | 1 | The Guardian enters Charged State, gaining Charge Points by firing bullets. |
| Volley Shot+ | 1 | normal | 23 | Bullets +1. |
| Rapid Fire | 1 | normal | 26 | Fire rate +20%. |
| Shotgun Evolution | 1 | Extra (purple) | 1 | Each shot scatters 2 additional sub-bullets in a real spread. |
| Splitting Bullet | 1 | Extra (purple) | 1 | Bullets split into 1 sub-bullet; 2 sub-bullets in Charged State. |
| Impact Bullet | 1 | Extra (purple) | 1 | Bullets gain a weak knockback; knockback +200% in Charged State. Bullet DMG +100%. |
| Explosion Expansion | 2 | normal | 1 | Explosion range +50%. |
| Quick Charge | 2 | normal | 1 | Charge Points from bullets +100%. |
| Sustained Charge | 2 | normal | 1 | Shots fired in Charged State +100%. |
| Flame Bullet | 2 | normal | 1 | Bullets become flame bullets and add extra fire DMG on hit. |
| Electric Bullet | 2 | normal | 1 | When a bullet kills an enemy, there is a 50% chance to trigger a small lightning strike. |
| Counterburst Scatter | 2 | normal | 38 | After every 40 shots, fires a wave of Penetrating Shotgun Shells at enemies near the Fortress. |
| Penetration Boost | 2 | Extra (purple) | 1 | Penetration of all bullets +2. |
| Reflection Boost | 2 | Extra (purple) | 1 | Reflections of all bullets +2. |
| Explosion Boost | 3 | normal | 1 | Explosion DMG +60%, explosion chance +10%. |
| Laser Shot | 3 | normal | 1 | Bullet hits have a 20% chance to fire a Ripping Laser from the Guardian, doubled in Charged State. |
| Disruption Fire | 3 | normal | 1 | Every bullet hit has a 10% chance to inflict 1 stack of [Disruption]. |
| Mirror Guardian | 3 | normal | 45 | Creates a clone guardian that deals 50% of the Guardian's DMG. |

### Stage 1 balance after the reference card set (`node tests/balance.cjs`, fresh R&D 1)

Enemies were retuned, cards were not: `enemyHpMul` 0.78 → **0.76**, `waveHpGrowth` 0.14 → **0.13**.

| Measurement | Sensible picks | First card |
|---|---:|---:|
| CI seeds (12), old enemy numbers, before the compact-pairs merge | 2/12 | 2/12 |
| CI seeds (12), **current** (`node tests/balance.cjs`, after merging d1b763f compact turret pairs) | **4/12** (first win on the 3rd attempt) | **3/12** (1st) |
| 72 seeds (CI 12 + 60 extra), **current** | **21/72 ≈ 3.5/12** | **14/72 ≈ 2.3/12** |
| 72 seeds, old enemy numbers (with the turret compensation above, before the merge) | 18/72 | 10/72 |

The measurement is very noisy (values from 0.70 to 0.78 scatter between 6 and 17 wins out of 36). Outcomes stay bimodal: runs collapse on waves 5–9 or win cleanly. Spot checks with developed meta (6 seeds, current numbers, sensible / first card): Stage 4 R&D 12 — 6/6, 4/6; Stage 9 R&D 30 — 5/6, 3/6; Stage 12 R&D 45 — 4/6, 3/6 (HEAD before this change: 5/6, 2/6 at Stage 12). Stage 12 losses happen on wave 1, when the headless policy picks a module instead of a second turret.

### Stage 1 balance after the 2026-11-12 owner order (5x HP, 25% slower, continuous stream)

`enemyHpMul` 0.85 → **4.25**, boss 0.88 → **13.2** (15x HP), `enemySpdMul` 1 → **0.75** (boss its own ×0.25, 75% slower); no waves — one non-stop stream per stage, drafts only from points. Boss joins at 60% of the stream and descends on the fortress: 90% of base max HP if it arrives. Later the same day: enemies another 50% slower (`enemySpdMul` 0.75 → **0.375**, boss untouched at ×0.25). Beam retargeted to the enemies closest to the base (`target:"closestBase"`); spawn pace ramps with stream progress (5x slower at the start, full pace at the end); enemy damage ×0.8 (`enemyDmgMul`). Disruption slow fields widened (radius 34 → 80 — the field was too small to matter in a swarm). Enemies impact on the dome surface (`domeY(x)`) instead of the deck line, so nothing passes behind the dome; displaced insects are clamped to the same surface. Wasps live 50% longer at base (8.5 → 12.75 s). Measured after the batch (fresh R&D 1, Stage 1 Normal, 12 seeds): smart 0/12, first-card 0/12, first victory null; the ramp stretches mean survival to 108.4 s (was ~34 s) with 43.8 mean leaks and 1137.9 mean meteor damage; wave 1 ends at full 1000 HP — the opening is now gentle, the wall is virtual waves 2–3. Experiment round 1 (2026-11-12, owner order, LOCAL only — no repo push until final): enemies another 50% slower (`enemySpdMul` 0.375 → **0.1875**, boss still its own ×0.25); fewer enemies in the first waves and a smaller total (`waveStart` 24 → 14, `waveGrowth` 8.4 → 7; Stage 1 stream 2,244 → 1,750, wave 1: 32 → 21). Bug found by the round-1 smoke run and fixed in the same round: the dome clamp (f3840189) could put an insect's station deeper than the dome surface at its x — the insect then parked at the dome in "approach" forever and never fired (bulwark, deep dist draw: standY 629 vs dome cap 602 at x=210). `initEnemyStation` now clamps the station to the dome surface (`domeY(x) − r`), re-applied as the insect drifts sideways; the station-bounds test accepts a station at the dome. Smoke pins updated to the new numbers (stream total is now checked against the live wave formula, not 2,000; speed pin 0.1875; wave totals 21/84/154; the caste windup budget 900 → 1,800 steps, same 2x margin at half speed). New measurement tool `tests/progression-probe.cjs`: sequential attempts with carry-over — after each loss it buys R&D levels with the real economy (greedy, top damage dealer first, exact `upCost` rules) and reports the first-win attempt per seed (target: attempt 3–5). Round-1 measurements (12-seed balance, post-fix): smart 0/12, first-card 0/12, first victory null; mean survival 372.3 s smart / 307.7 s first-card (was 108.4 s at 0.375), mean leaks 19.2/18.8, mean meteor damage 848.2/865.4; wave 1: 11.5 mean alive, 19.3 peak. The pre-fix run gave byte-identical numbers — verified, not a stale run: Stage 1 Normal dies on virtual waves 8–19 before any bulwark spawns (spawn totals across all 24 runs: meteor 7,895, fast 4,360, flyer 1,857, armored 2,566, needle 550, boss 19; no spitter/bulwark/healer/elite/phase/moth/splitter), so the station fix cannot move these aggregates; it matters for later waves and stages, where deep-station insects do appear. Progression probe (6 seeds, 5 attempts each, smart policy, real economy): **0 wins in 5 attempts on all 6 seeds** — the target (first win on attempt 3–5) is NOT met. Progression works (laser reaches Lv 5–8, aeroblast 3–4, soldier 2–3, hive/firewheel/beam 2–5 by attempt 5; attempts stretch 175 s → ~600 s and reach wave 19–20 on seeds 3121/42/2026), but the late wall holds: seeds 3121/42/2026 die on virtual waves 19–20 with 0 leaks and 0 meteor damage, i.e. to the boss and/or ranged fire at the very end of the stream; seeds 777/9999 never get past wave 15. Round 1 is insufficient — the next round must move the late wall (boss and/or the last virtual waves), not the opening. Experiment round 2 (2026-11-12, LOCAL only): the diagnostic probe (boss/ranged breakdown per attempt) showed the late wall is the boss — but not one boss: **3–4 Tyrants per stage**. Root cause: `startWave` reset `B.bossSpawned=false` on every virtual wave, and in the stream model virtual waves advance silently, so once the stage queue passed 60% every new wave re-armed the spawn (balance runs showed bossSpawns 3–4, never 1; late probe attempts took bossDamage 1800 = two 900 arrivals, plus ranged). The design intent is exactly one boss per stage (the balance harness asserts `bossSpawns===1` on victory — it never ran because there were 0 wins). Fix: `startWave` no longer touches `bossSpawned` (it is set once per battle in `newBattle`); `bossDamage:0` initialized in `newBattle` for clean reporting. New smoke test: the Tyrant spawns exactly once per stage across all 20 virtual waves. Smoke 122/122. Round-2 measurements (12-seed balance + 6-seed progression probe) running; results pending. Round-2 probe (6 seeds × 5 attempts, smart): **4/6 seeds win within 5 attempts — first wins on attempts 2 (3121), 3 (42), 4 (1234), 4 (2026)**; every winning run ends at full 1000 HP with exactly one boss arrival (900) and small ranged damage. 777 reaches wave 15 by attempt 5 (laser → Lv 5, likely wins ~attempt 6–7); 9999 is the outlier, stuck at waves 9–12 across all attempts (leaks 17–23 + ranged 140–655 mid-stream). Target (first win on attempt 3–5) met for 4/6 seeds; the two non-winning seeds are the weakest RNG draws, and headless sims understate Dmitry's real play (he cleared Stage 1 on the first attempt when sims said 0/24). Balance re-run pending; if it stays 0 wins flat, the boss fix alone is the round-2 change. Balance re-run (12 seeds, flat fresh R&D 1): **smart 0/12, first 0/12** — identical to round 1 (mean survival 369.6 s smart / 307.7 s first, leaks 19.3/18.8, meteor damage 853.3/870.6), as expected: the flat runs die before the boss, so the boss fix cannot move them. Attempt 1 is still unwinnable headless. Round 2 is the result — no round 3: the winning runs end at full HP, so further easing risks overshooting for Dmitry's real play (he cleared Stage 1 on the first attempt when sims said 0/24). Final local change set: round-1 knobs (speed ×0.1875, waveStart 14, waveGrowth 7, Stage 1 total 1,750) + bulwark station fix + boss-once-per-stage fix + smoke updates (122/122) + progression-probe tool + BALANCE.md. Nothing pushed; awaiting his morning check.

| Measurement | Sensible picks | First card |
|---|---:|---:|
| CI seeds (12), **current** (`node tests/balance.cjs`) | **0/12** (no first victory) | **0/12** (no first victory) |
| Fixed triplet (3121, 777, 42), **current** | **0/3** | **0/3** |

Every run dies on virtual wave ~5 at ~34 s with ~36 leaks and ~27 kills smart / ~14 first-card (mean): a fresh R&D 1 Guardian (12 DMG, 4 shots/s) needs ~23 hits per meteor at 276 HP and cannot keep up with the spawn rate, so the base takes ~36 meteor impacts in the first ~35 seconds. This is a measured finding, not a bug — the game was **not** retuned to recover the old numbers. The extra 50% slowdown the same day (enemySpdMul 0.375) roughly doubled survival time (19 s → 34 s) and kills, but wins are still 0/12.

Control probe (same stream, same 0.75 speed, HP back at 0.85 via the in-memory calibration override): smart **1/3, first victory on attempt 3** (seed 42 wins at 304 s, 2,245 kills, 0 leaks) — the old target still holds without the 5x HP, so the collapse is the HP alone, not the stream. The old "first win no earlier than the 3rd attempt" target no longer applies; `--check-balance` now pins **0/3** on the fixed triplet so any future rebalancing shows up as a change.

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

**Round 4 goal (2026-11-08): the first clear of Stage 1 Normal on a fresh account (R&D 1) should come no earlier than the 3rd attempt.** Measured with the headless run `~/workspace/meteor-bastion/balance-attempts.cjs` (12 attempts, a fresh account each time, seeds 3121, 777, 42, 1234, 9999, 2026, 555, 8888, 31415, 2718, 1618, 4242): the "sensible player" policy (super > strong new turret > upgrade top damage dealer > chain > damage mod) — **first victory on the 3rd attempt** (2 wins out of 12: seed 42, 615 kills, HP 866; seed 31415, 583 kills, HP 383); the "first card" policy — first victory on the 8th attempt (1 out of 12); random cards — 0 out of 3. **There is no gate in the code:** no attempt counters and no locks — the goal is achieved purely through balance (wave density 5 + round(2.0×wave), Guardian nerf 13→12). The measurement is noisy (seeds are not comparable across edits — the random number stream diverges), so the target is a sensible-player win rate of ~17–33%, not an exact attempt number in one series. **Superseded 2026-11-12 by the owner order (5x HP, continuous stream): fresh-account sims now win 0/12 — see the section above.**

Running the tests from a **clean checkout**:

```sh
node tests/smoke.cjs
```

The tests concatenate the source JS by `src/order.txt` without `index.html`. They cover v1 saves, the Guardian, 12 stages and final waves, Firewheel, Hive, Gravity, Phase, Charger, R&D T1/T2/T3, Chips, Liveries, the meta economy and breaches; **116 tests** (2026-11-12), including regressions from rounds 4–5, ×3 enemies (wave totals 32/108/192, cap 330, spawn pace ×3) and level rewards cut tenfold (except gems): Aeroblast (5 pellets, increased range, adaptive spread, hits on moving targets, range boundary, splash R&D), wasps (lifetime ≥8 s, max 2 per target), the guardian's tight triple burst, Tesla's sequential bounce with damage falloff, deterministic laserSweep, parallel extra projectiles, as well as bug regressions: Gravity does not "teleport" freshly spawned enemies, burn DPS resets after the burn ends, card text matches the effect, the ×2 label resets between battles, rewards are credited immediately, a backward RAF timestamp cannot drive ring radii negative, and a ring with a negative radius still draws, and all models (Guardian, 11 turrets, 15 enemies) render in every state. To produce a single self-contained HTML release, run `python3 build.py`. Additionally, `node tests/balance.cjs` runs 12 games for each of the two policies; GitHub Actions runs smoke, balance and the build.

## Known limitations and next iterations

1. The original's commercial/inventory subsystems are not reproduced — Chips/Liveries are simplified here, and there is no full rarity and equipment grid yet.
2. There is no statistically significant balance estimate over ≥100 seeds for each of the 12 stages and the Elite modes separately. Mass runs and tuning of the required R&D level are needed.
3. Live tests on Android Chrome/Pixel are needed (FPS, menu responsiveness, touch focus, placement of panels).
4. Reproducing Galaxy Defense's balance exactly would require measurements of a specific version of the original: its hidden HP, resistances, CD cooldowns, card tables. Here we use **public descriptions of the mechanics** and our own number tuning.

## Visuals and density from the screenshots (2026-11-08; calibration)

Rollout plan: phases 1–5 from the document "Screenshot plan for Meteor Bastion.md". The decorative dome has no HP and does not absorb damage; Disruption still slows inside a circle of radius `splash`, but is displayed as a full-width band (56–96px high). The visual models of turrets, enemies and projectiles, the atmospheric background, and the base HP indicator were updated.

Projectile rendering (visual only, no balance effect): every projectile draws a tapered, gradient motion trail and a gradient glow head instead of flat strokes and `shadowBlur`. `update()` records a render-only position history on each projectile (`pr.tr`, x/y/t triplets, pruned by age to `PROJ_TRAIL_T` = 0.34 s, so trail length is independent of frame rate and ×2 speed; the last triplet is a live head on the projectile) and each weapon in `draw()` uses a slice of it: rocket 0.30 s, Firewheel 0.22, Tesla 0.20, Beam 0.16, Aeroblast/Railgun 0.13–0.14, Guardian tracer 0.10. No RNG is consumed by the history or by projectile drawing, so seeded balance runs are byte-identical to before.

Density tuning ×3 (2026-11-09, owner order): `MAX_ENEMIES=330`, `waveStart=24`, `waveGrowth=8.4`, `spawnBase=0.20`, `spawnReduction=0.002`, `spawnMin=0.06`, `formationCd=1.33`; enemy HP multiplier `0.78`, `waveHpGrowth=0.06`; boss `0.88`, `bossHpGrowth=0.07`; normal speed `0.85`, range `stage.spdMul=1.00..1.25`. Swarm small fry deal ×0.8 contact damage; `draftGrowth=10`, `draftWaveGrowth=2.5` compensate for the extra XP. Spawning in clusters/wedges/scatters and diagonal patterns with pauses, own `vy>=0`; Gravity can pull upward separately.

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

### ×3 measurement (local, 2026-11-09)

`node tests/balance.cjs` + `balance-attempts.cjs` on the same profile (fresh R&D 1, Stage 1 Normal, 12 seeds): **0 victories out of 24** (sensible picks 0/12, first card 0/12), no first victory in 12 attempts for either strategy; the sensible strategy dies on waves 6–11 and nobody reaches wave 20. Average base HP after wave 10: 500 (sensible) / 0 (first card); average breaches 27.6 / 35.0; healing 395.2 / 263.7 HP.

Density now meets the targets: visible enemies average **14.0 / 29.6** on waves 1/10 (sensible; peaks 27.2 / 62.5) against targets of 8 / 28. Wave 20 was not measured — nobody got there.

Compensations tested on scratch copies (not in the tree): base 1000 → 2000 HP — still 0/12; turret power 1.6 → 2.4 (+50%) — victories return (1/12 and 2/12), first victory on the 6th–7th attempt, ~31 visible on wave 20. The owner approved the ×3 build as-is ("Нормально", 2026-11-09) and ordered level rewards cut tenfold: coins, components, account XP and materials in `endBattle` are divided by 10; gems are untouched (only 0–3 per battle — dividing would zero them).

Owner's own playthrough, 2026-11-09 (b56e1e6b): cleared Stage 1 on the FIRST attempt — 2521 kills, 8:24, 31 cards, 1786 HP restored; rewards 626 coins / 16 XP / 2 gems / 10 components (formula check: floor((2521×2.2+220+500)/10)=626 ✓). Headless fresh-account sims (0/24) badly understate a developed account plus human drafts — the "first win on the 3rd attempt" target is a fresh-account target, not the owner's experience. Results-screen fix (2026-11-09): all material grants now shown, biggest first — previously only the first 3 fighters' grants appeared, so Hive's 40 of 134 total materials was invisible; zero grants stay hidden.

**Not verified on a real phone:** Pixel 10a performance with 50 enemies, a minimum fps ≥45, an exact match with the screenshots, working without scrolling. GitHub CI checks code execution and the build, but not mobile rendering.


### Fortress screenshot pass, 2026-11-11

- Four turrets now form two 44px pairs (`52/96` and `324/368`), freeing the central bunker lane; placement order, damage, ranges, enemy speeds and breach line are unchanged. Canvas height grows only below the deck (`760 → 820`), and the scene fits the viewport without stretching.
- Bunker, mount floodlights, passive dome emitters and underground structure use Canvas primitives; no external images or font-dependent castle emoji. Recoil decays at 66 units/s in simulation time. Screen shake uses time-based offsets, so redrawing cannot consume combat randomness.
- Regression: **78 smoke checks**, including slot construction, native-resolution sizing/touch mapping, HUD bounds, long timers, pause/FPS recoil and random-free rendering. Canvas raster checks cover empty/full mounts, liveries, damaged HP and a busy battlefield; these are not Android/browser layout or FPS measurements.
- Same R&D 1 Stage 1 Normal benchmark, 12 fixed seeds per policy, before → after: sensible picks **4/12 → 5/12** victories (first victory stays attempt 3), first-card **2/12 → 2/12**. Mean breaches **23.9 → 17.3** / **31.3 → 30.2** respectively. Changing turret coordinates changes targeting, so identical combat outcomes are not expected; no balance coefficients were retuned. These small deterministic samples are calibration, not estimates of human win rate.


## Artillery, rarity and recon pass (2026-11-11)

This pass starts from `9250c86`. It keeps all 270 reference card effects and save v1, changes offer probabilities and enemy behavior, and optimizes Laser rendering. Theme/roster, attack distance, projectile rules and reconnaissance are documented in [docs/enemies.md](docs/enemies.md).

- **Offer rarity:** Tier 1/2/3 weights 1/.5/.25; Extra additionally ×.2; module/combo weight .8. Three pips unlock random Extras, with no guaranteed slots or pinned rerolls. These are relative weights among the remaining eligible cards, not fixed percentages.
- **Incoming pressure:** `enemyHpMul .76 → .85`; wave HP growth stays .13. Replacing suicidal flyers with artillery at the old HP coefficient gave nearly free 3/3 wins. The fixed fresh Normal triplet now gives smart 1/3 (first victory attempt3), first-card 0/3; the unchanged 12-seed series gives smart 6/12 and first-card 1/12. Sensible-policy mean meteor/ranged incoming damage: 1163.4/132.8 HP, 22.4 breaches, 19.5 picks with 1.8 Extras. No seeds were replaced and no failure-dependent assistance was added.
- **Late openings:** pre-recon S12/R&D45 Normal lost0/3 on wave1 before developing a build. Reconnaissance retains full enemy HP/contact damage but ramps early count/cadence; the final matrix below uses identical R&D, seeds and zero Chips, with no free turrets.
- **Tests:** 114 smoke checks cover real offer frequencies, rarity eligibility/rerolls, all 15 enemy models, station/attack/control behavior, ammo interception/expiry/caps, wave completion, preview/actual roster agreement, individual weapons with all their cards, laser damage ticks and bounded visuals at 60/120 Hz. The cooperative all-card stress remains; per-weapon damage is tested separately so competing weapons cannot starve one another of targets.

### Reproducible protocol

`tests/balance.cjs` initializes through real `startBattle()`, including Elite multipliers, permanent R&D and Chips. Each run has its own seeded harness and dt=.05s. The November 11 setup used a 2400s simulation limit and required a boss kill. The current stream can also end after the fortress survives the Tyrant’s impact. Timeout/nonfinite state is a failed check, not a loss silently counted as a completed campaign. Offer/taken tiers/Extras, meteor/ranged damage, firing/interception, duration, wave composition and per-unit DPS are recorded. HP-at-wave averages are conditional on reaching that wave.

The original first-three seeds are 3121/777/42; broad probes keep3121,777,42,1234,9999,2026,555,8888,31415,2718,1618,4242. Policies are the established sensible ranking and first offered card; neither moves the Guardian or rerolls. They are reproducible probes, not human win-rate estimates.

The November 11 CI guard for fresh S1 Normal/R&D1/no Chips required 1–2 smart wins on the first three seeds. The current guard expects 0/3 after the continuous-stream recalibration. It rejects calibration overrides and other profiles. The noninteractive 1.2s intro is skipped consistently, matching the earlier fixed-clock benchmark. There is no such quota or reseeding in the game itself.

```sh
node tests/balance.cjs --runs 3 --policy smart --check-balance
node tests/balance.cjs --check-balance
node tests/balance.cjs --runs 3 --stage 9 --rd 30 --elite --policy smart
node tests/balance.cjs --runs 3 --stage 12 --rd 45 --policy smart
node tests/laser-perf.cjs
```

### Laser workload

`tests/laser-perf.cjs`:330 static immortal targets,2s channel at 60/120 Hz,5 repetitions for the recorded median. Heavy load:4 deflections,2 sweeps, refraction,3 reflections,2 deflection reflections, split and double band. The native CPU raster pass uses a2× canvas; it is not whole-game FPS or an Android measurement. The unchanged target/base-damage/timestamp checksum is verified for all four base/heavy ×60/120 configurations.

| Heavy workload | Before9250c86 | Current |
|---|---:|---:|
| Live ray visuals,60Hz |53|17|
| Live ray visuals,120Hz |98|17|
| Long blurred strokes/frame,120Hz |294|0|
| CPU ray raster ms/frame,60Hz median |1.349|.285|
| CPU ray raster ms/frame,120Hz median |2.614|.290|

One cached visual slot per ray removes refresh-rate-dependent overdraw; tick-only scans and stable one-pass reflection selection reduce simulation work. Optional `--raster` needs `@napi-rs/canvas`; ordinary tests and the game have no added dependency. Native inspection also covered the new silhouettes, charge telegraphs, hostile projectile shapes and combat effects. Browser layout and Android FPS remain device checks.


### Elite pressure after reducing Extra frequency

Elite HP was retuned from ×1.68 to **×1.4**. Speed ×1.10, contact ×1.18, extra enemies, champions, support auras and boss bonuses are unchanged. In stages 4–12 the opening interval additionally uses ×1.5 / ×1⅓ / ×1⅙ on waves 1–3, returning to the ordinary full cadence on wave 4. This is fixed campaign pacing, independent of R&D, prior losses or the selected build.

At the old Elite HP, even R&D 45 plus all Chips at 5 lost three S12 probes on waves 2/1/2. Cadence alone only moved the failure to waves 4–5. The new global coefficient and opening cadence allow the same no-Chips S12 profile to win one attempt and actually destroy the final boss. Elite remains harder than Normal in the paired probes below; final HP is insufficient as a pressure measure because kills restore HP.


### Final paired verification

The original seeds are unchanged. R&D applies to all units, all Chips are zero, and turrets must be earned from cards. Every reported victory kills its boss; no attempt timed out. Elite rows were rechecked on the final production implementation without calibration overrides. Normal recon rows are unaffected by the final Elite-only changes.

| Stage / R&D | Normal wins | Elite wins | Incoming meteor + ranged HP, Normal / Elite (mean) |
|---|---:|---:|---|
| 1 / 1 | 6/12 | 0/3 | 1163.4 + 132.8 / 1298 + 48.3 |
| 4 / 12 | 3/3 | 3/3 | 0 + 20 / 443.7 + 636.7 |
| 9 / 30 | 3/3 | 2/3 | 291.7 + 183.7 / 459.7 + 1133.7 |
| 12 / 45 | 1/3 | 1/3 | 836 + 137 / 969.3 + 184.3 |

The S1 Normal first-three probe is 1/3 sensible wins; the wider first-card policy is 1/12. S4 Elite can win 3/3 while taking much more damage than Normal; one run falls to 185 HP. S9 Elite winners reach lows of 200/322 HP. S12 Elite's winner is seed 777 (wave 30, boss killed, 1107s); the other two lose on wave 2. End-of-battle HP often returns to 1000 because of healing, so it is not a substitute for breaches and incoming-damage metrics.

Compact raw measurements, per-seed outcomes, coefficient metadata and the laser benchmark are checked in at [docs/balance-artillery-2026-11-11.json](docs/balance-artillery-2026-11-11.json). Builds, card effects and save compatibility are covered by the separate smoke suite. Android FPS and browser viewport behavior were not measured in this environment.
