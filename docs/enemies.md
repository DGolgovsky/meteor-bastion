# Enemy ecology and siege behavior

The campaign keeps 12 stages with 20/25/30 waves and distinct Normal/Elite modes. Enemy IDs are stable. Only `meteor`, `fast`, `armored` and `charger` collide with the fortress — plus the boss, which descends on it instead of holding a firing station. All other types, including spawned Broodlings, establish firing stations instead of falling onto the deck.

## Campaign themes

The roster is declared once in `STAGE_ECOLOGY` (`04-waves.js`). Random flocks, scatters and wedges must draw from that stage's currently available pool. Elite unlocks castes one wave earlier and raises insect weights by 20%; during the first two waves of stages 4–12, it respects the opening reconnaissance gates. It keeps the same theme. A Hive Tyrant joins at 60% of the stage stream and descends on the fortress: if it arrives, it deals 90% of base max HP. Carrier children belong to their parent's brood rather than the random spawn pool.

| Stage | Theme | Waves | Castes (first Normal wave) |
|---:|---|---:|---|
| 1 | Debris Front | 20 | Meteor (1), Fast meteor (2), Dartwing (3), Armored (5), Needle Wasp (8) |
| 2 | Hive Outskirts | 20 | Meteor (1), Fast meteor (2), Dartwing (3), Acid Spitter (5), Needle Wasp (9) |
| 3 | Brood Gardens | 20 | Meteor (1), Armored (2), Dartwing (3), Brood Carrier (4), Nurse Scarab (6) |
| 4 | Acid Marsh | 25 | Meteor (1), Fast meteor (1), Acid Spitter (3), Shell Beetle (6), Nurse Scarab (8) |
| 5 | Needle Passage | 25 | Meteor (1), Fast meteor (1), Armored (2), Dartwing (3), Needle Wasp (4), Veilwing (7) |
| 6 | Brood Furnace | 25 | Meteor (1), Fast meteor (1), Armored (2), Brood Carrier (3), Acid Spitter (4), Nurse Scarab (6) |
| 7 | Prism Bloom | 25 | Meteor (1), Fast meteor (1), Prism Moth (3), Needle Wasp (4), Veilwing (6), Nurse Scarab (8) |
| 8 | Iron Carapace | 25 | Meteor (1), Fast meteor (1), Armored (2), Assault meteor (2), Shell Beetle (3), Acid Spitter (5), Royal Hornet (8) |
| 9 | Phantom Nebula | 30 | Meteor (1), Fast meteor (1), Veilwing (2), Prism Moth (3), Needle Wasp (4), Royal Hornet (8) |
| 10 | Storm Swarm | 30 | Meteor (1), Fast meteor (1), Dartwing (2), Needle Wasp (3), Prism Moth (5), Royal Hornet (7) |
| 11 | Siege Ring | 30 | Meteor (1), Fast meteor (1), Armored (2), Assault meteor (2), Shell Beetle (3), Acid Spitter (4), Nurse Scarab (6), Royal Hornet (8) |
| 12 | Queen's Nexus | 30 | Meteor (1), Fast meteor (1), Armored (2), Assault meteor (2), Brood Carrier (3), Acid Spitter (3), Needle Wasp (4), Shell Beetle (5), Prism Moth (6), Veilwing (7), Nurse Scarab (8), Royal Hornet (9) |

### Late-sector reconnaissance

Stages 1–3 retain their exact pacing. For stages 4–12, the stage's extra enemy-count bonus reaches 0% / 35% / 70% / 100% across waves 1–4. The spawn interval and formation cooldown use a sector-scaled opening multiplier: at Stage 12, ×2.7 / ×1.9 / ×1.3 / ×1. The first wave uses each theme's lightweight meteor/scout roster, with heavy or invisible castes from wave 2 onward. Elite keeps extra enemies and its stat/champion multipliers. Elite additionally spaces the first three waves by ×1.5 / ×1⅓ / ×1⅙; it keeps HP ×1.4, speed ×1.10, contact ×1.18 and its champion/boss bonuses. By wave 4, the full stage pressure is restored. This gives a Guardian-only start time to earn turret cards without free turrets, chips, HP or altered card effects.

## Firing stations and attacks

Each regular insect chooses an individual firing station within its caste’s distance band, approaches from above and then strafes slightly. The Hive Tyrant uses its band to start firing and keeps descending. The station seed comes from the already-random spawn phase/position; drawing consumes no combat randomness. An external overshoot is corrected at least 60px above the base so Gravity cannot leave an insect inside the bunker.

| Caste | Distance above base (px) | Windup (s) | Reload (s) | Volley | Ammunition HP |
|---|---:|---:|---:|---|---:|
| Dartwing | 145–215 | 0.75 | 4.4 | 1 × needle | 5 |
| Brood Carrier | 190–270 | 1 | 5.4 | 2 × orb | 9 |
| Broodling | 100–165 | 0.6 | 4.8 | 1 × needle | 3 |
| Nurse Scarab | 230–305 | 1.1 | 6.5 | 1 × orb | 8 |
| Royal Hornet | 140–230 | 1 | 5.2 | 3 × needle | 6 |
| Veilwing | 235–315 | 1 | 4.6 | 1 × prism | 6 |
| Acid Spitter | 180–250 | 1.15 | 5 | 1 × spit | 9 |
| Needle Wasp | 300–370 | 1.25 | 4.2 | 1 × needle | 4 |
| Shell Beetle | 90–145 | 1.15 | 5.8 | 2 × siege | 14 |
| Prism Moth | 255–325 | 1.25 | 6 | 3 × prism | 7 |
| BOSS "Hive Tyrant" | 185–255 | 1.6 | 5.6 | 3 × siege | 18 |

- **Acid Spitter:** medium-distance corrosive globules; vulnerable to fire.
- **Needle Wasp:** fragile long-range sniper with a long visible windup; vulnerable to electricity.
- **Shell Beetle:** armored close-range siege volleys; physical resistance and electrical vulnerability.
- **Prism Moth:** broad three-shard fan from the rear; energy resistance and fire vulnerability.
- **Brood Carrier / Broodling:** carrier splits into two smaller shooters on death. Nurse Scarabs heal neighbors, Royal Hornets support Elite attacks, Veilwings cloak but reveal themselves while aiming.

## Telegraphs, control and ammunition

The charge ring and dotted aiming line show a locked impact point. Moving after the windup starts does not silently retarget that volley. Displaying at most ten aiming lines keeps crowded scenes readable; each charging insect still shows its own charge ring. Hostile rounds have distinct acid, needle, prism and siege shapes.

Slow delays approach, windup and reload. Paralyze/Immobilize cancel a windup; knockback or Gravity above the station's approach threshold makes the insect approach again. Disruption fields also slow hostile rounds to half speed. Weak defenses cannot safely stall forever: after 20s at a station, siege damage grows gradually to ×1.6 over the next 60s.

Player rounds hit enemies in order of first contact with their outer edges. Interception uses the paths of both rounds during the frame, including Disruption slowdown, their remaining lifetimes and the time the hostile round reaches the fortress. A shot consumes projectile penetration or the projectile itself, and awards no kills, XP, battle points or healing. Instant laser/beam damage is unchanged. Maximum hostile ammunition is 64 rounds; each lives at most 8s, and an already-fired round remains dangerous after its source dies. The stage end waits until that ammunition is cleared, intercepted or expires. Ranged hits/damage and meteor impacts/damage are recorded separately.

All values above are Meteor Bastion settings, not recovered coefficients of the reference game.
