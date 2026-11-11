# Meteor Bastion

A mobile HTML5 Canvas 2D tower-defense / roguelite built after the gameplay reference points of Galaxy Defense: Fortress TD. All in-game graphics are drawn by the project's own Canvas/CSS code. This is a standalone game, **not an exact reproduction of every hidden number in the original**.

## Running

The game itself needs no Node.js, npm, TypeScript, dependency bundler, or server. Assembling the sources requires only Python 3:

```sh
python3 build.py
```

The script creates `index.html` in the repository root; open it in a browser. **The built `index.html` is excluded from Git**; the repository stores the source code. To check the mechanics and saves:

```sh
node tests/smoke.cjs
node tests/balance.cjs
```

The suite assembles the script from `src/` in memory and runs on plain Node.js with no packages to install.

## What is already implemented

- **A 12-stage campaign**: stages 1–3 have 20 waves each, 4–8 have 25 waves, 9–12 have 30 waves. A victory unlocks the next stage, and the final boss appears in the last wave of every stage.
- **Normal / Elite** with separate wave compositions and champions that can speed up their allies.
- **A movable Guardian and 4 turret slots**. The Guardian fires alternately from both hands. There is no turret micromanagement in battle; turrets pick their targets automatically.
- **11 turrets**: Sky Guard, Laser, Disruption Drone, Aeroblast, Thunderbolt, Beam, Firewheel Drone, Hive, Railgun, Tesla Coil, Gravity Vortex Gun. Aeroblast uses an adaptive shotgun spread and a range of 540 instead of 200, so it can join the fight before enemies reach the fortress.
- **11 enemy types**: meteor, fast meteor, armored, flyer, golem mother, golem shard, regeneration star, elite, phantom scout, assault meteor and the boss. There are damage resistances, cloaking, accelerating dashes and ally support.
- **Pick-1-of-3 battle cards** earned with battle points: since 2026-11-11 the **full reference card set** from [`docs/turrets-reference.md`](docs/turrets-reference.md) — 270 cards (248 for the 11 turrets, 22 for the Guardian), one declarative `CARDS` table, the shared mechanics (mines, pulse waves, Paralyze/Immobilize, Disruption stacks, teleports, black holes, portals, chain lightning, mini drones, charged states…) in `03b-effects.js`. Star Tier N = in-run unit level N; Extra cards are purple and level the unit up (levels 1–3, then mastery); Super Mode turns on automatically at Lv.3 with enough R&D; 🔒 locks are R&D gates. Combos and fortress modules are kept. A **Selected Cards Overview** screen (from the draft, pause and results) shows the 5-slot level/pip row and every card taken.
- **Permanent upgrades** for every unit up to R&D Lv.45; the cost rises with level. Early R&D levels unlock specialized cards, and separate thresholds unlock Super Mode and combos.
- **Chips**: three purchase lines paid with components — turret damage, fire rate, base HP reserve, five levels each. **Liveries**: Classic / Arctic / Ember, cosmetic only.
- Resources, patrol, regenerating energy, rewards and the results screen, a mobile stage menu and the battle HUD.
- Progress saving in **`localStorage` under the key `meteor-bastion-save-v1`, schema `v:1`**, with support for reading older saves.

## Structure

```text
src/shell.html     HTML/CSS shell
src/order.txt      the single source of the module concatenation order
src/js/
  00-config.js     turrets, enemies, stages, difficulty coefficients
  01-state.js      saves, meta progression, Chips, Liveries, menus
  02-units.js      battle initialization, units, Guardian
  04-waves.js      wave composition and enemy spawning
  03-combat.js     damage, targeting, weapon firing and hits
  03b-effects.js   shared card systems (statuses, mines, pulses, bolts, portals, wasps, wheels, fields) and entity caps
  05-update.js     battle simulation, physics, fields, breaches
  06-render.js     Canvas rendering
  07-cards.js      declarative battle cards, unit levels 1–3 and pips
  07-ui.js         draft, Selected Cards Overview, rewards
  08-main.js       initialization
build.py           build into one standalone index.html
tests/smoke.cjs    regression checks (incl. "every reference card exists with its numbers")
tests/balance.cjs  headless Stage 1 R&D 1 campaigns, 12 seeds × 2 draft policies
docs/turrets-reference.md  the reference card set (source of truth for cards)
BALANCE.md         parameters and the balance testing protocol
```

The order in `src/order.txt` intentionally differs from alphabetical sorting: `04-waves.js` comes before `03-combat.js`, then `03b-effects.js`. Do not sort by name. Make changes in `src/`, not in the generated `index.html`.

## Balance

Compared with the previous build, enemies are noticeably faster and tougher, while the Guardian and turrets have been weakened/retuned so that some waves actually reach the fortress. Verified headless Stage 1 runs at R&D 1 included **victories with 6 and 8 breaches of the base**; random builds can also lose. Later stages were checked with matching meta progression. Numbers and remaining limitations are in [BALANCE.md](BALANCE.md).

**Limitations:** the passing tests are headless simulations and syntax checks, not a visual test on a real Android device. The original Galaxy Defense coefficients have not been recovered; that would require measurements of a specific version of the original. Chips/Liveries are a compact standalone implementation with no claim of being identical to the original inventory.

## Local test after a change

```sh
python3 build.py
node tests/smoke.cjs
node tests/balance.cjs
```

Also manually check one full run in a mobile browser: Guardian smoothness, HUD readability, correct boss appearance in waves 20/25/30, enemies' ability to damage the base, and saves after a restart.

The fortress scene was updated on 2026-11-11: a charcoal city backdrop, a wide misty dome, a window-lit bunker, dark underground supports and floodlit empty mounts. Turrets stand in mirrored pairs with 44px between neighbors (previously 76px); the four-slot order and the movable Guardian are preserved. The canvas is now `420×820`, with the same combat/base line at `y=720`; the added bottom area is scenery. The field fits both viewport dimensions. The HP arc remains 120°, now compact above the bunker. HUD metrics reserve space for the timer, and recoil advances in simulation time instead of on each redraw.

The battle mode was reworked following the screenshot plan of 2026-11-08: dense enemy formations, custom trajectories with hovering, a city panorama, the dome and base HP, Disruption bands, more expressive turrets and shots. Details and coefficients are in [BALANCE.md](BALANCE.md).
