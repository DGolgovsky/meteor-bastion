# Meteor Bastion — исходники (модульная раскладка)

Игра собирается из модулей в один самодостаточный `index.html`.
Сборка байт-в-байт воспроизводит исходный файл (эталон: git blob
`b9c0a45604a8ca141192d14705a6577ce21ffec0`, 130586 байт, 1807 строк,
master `569e9278`) — разрез ничего не меняет в логике, только режет
файл на части. Проверка: `python3 build.py`, затем
`git hash-object index.html` должен дать тот же SHA, а
`diff index.html` с эталоном — пустой. Smoke-тест: `node tests/smoke.cjs`
(18 тестов).

## Раскладка

- `src/shell.html` — оболочка: весь HTML+CSS, вместо тела скрипта плейсхолдер `<!-- __GAME_JS__ -->` (теги `<script>`/`</script>` на месте).
- `src/js/` — модули JS. Порядок склейки задаёт `src/order.txt` (этот список, а не номера имён).
- `src/order.txt` — список модулей в порядке склейки.
- `build.py` — сборщик (Python 3, без зависимостей).
- `index.html` — собранный файл, в репозиторий НЕ коммитится (см. `.gitignore`).
- `tests/smoke.cjs` — headless-регрессионный набор (18 тестов, без зависимостей).

## Модули

| Файл | Строк | Содержимое |
|---|---|---|
| `00-config.js` | 62 | CONFIG: RARITY, TURRETS, SOLDIER_CFG, ENEMIES, STAGES, BALANCE (включая Elite-коэффициенты), metaDamage/metaCooldown/metaSecondary, константы поля (W, H, WAVES, MAX_ENEMIES, BASEY…) |
| `01-state.js` | 161 | STATE+SAVE + AUDIO + NAV/META UI: META, сейвы (loadSave/persist/refillEnergy), totalCritBonus, toast, SFX/startMusic, show, renderHome/renderTurrets |
| `02-units.js` | 89 | BATTLE: canvas/fitCanvas, mkUnit, newBattle, startBattle, guardian, allFighters |
| `04-waves.js` | 54 | Волны: startWave, wavePickKind, spawnEnemy, spawnBoss |
| `03-combat.js` | 335 | Бой: inRange, pickTarget, aimPoint, dealDamage, killEnemy, FX (burst/arcFx/ringFx/beamFx), fireLaser, fireFocusedBeam, unitFire, applyHit, sweptContact |
| `05-update.js` | 178 | update() и loop() |
| `06-render.js` | 309 | Отрисовка: drawUnit, drawCombatHud, draw, mmss, syncHud, openPause |
| `07-ui.js` | 234 | DRAFT + RESULTS: genCards, cardHTML, openDraft, applyCard, endBattle, награды |
| `08-main.js` | 2 | INIT: привязки кнопок, инициализирующие вызовы |

Всего в теле скрипта 1424 строки; оболочка `shell.html` — 383 строки.

## Почему 04-waves.js идёт раньше 03-combat.js

В исходном файле секция волн стоит раньше секции боя. Разрез — чистое
разбиение исходника на последовательные куски, поэтому порядок склейки
повторяет исходный. Номера в именах файлов — просто имена; порядок задаёт
только `src/order.txt`. Не «чините» его сортировкой — сломается сборка.

## Почему SOLDIER_CFG и meta* лежат в 00-config.js, а SFX/show — в 01-state.js

Они так расположены в исходнике (SOLDIER_CFG — между TURRETS и ENEMIES,
meta-функции — в секции CONFIG, SFX и домашний UI — в начале файла).
Перестановка любого куска изменила бы собранный файл, поэтому модули —
строгие срезы исходника в его же порядке.

## Что изменилось относительно второй разбивки (3d7b3ae5 → 569e9278)

Схема модулей, `order.txt`, `build.py` и `.gitignore` — без изменений:
тот же разрез, только границы сместились по новому файлу (+35 строк
всего: +30 в теле скрипта, +5 в оболочке).

- `src/shell.html` (378 → 383 строки): CSS `.upgrade-stat` (новая
  вёрстка панели постоянных усилений), `hq-scene` — `role="region"`,
  заголовок результатов «Урон и средний DPS» (было «Урон обороны»).
- `00-config.js` (57 → 62 строки): Elite-коэффициенты переехали в
  BALANCE — `eliteHp` 1.68, `eliteSpeed` 1.10, `eliteContact` 1.18,
  `eliteWaveBase` 2, `eliteWaveGrowth` 0.28, шансы/мультипликаторы
  чемпионов (`eliteChampionBaseChance` 0.095, `eliteChampionWaveChance`
  0.004, `eliteChampionMaxChance` 0.21, `eliteChampionHp` 1.37,
  `eliteChampionSpeed` 1.03, `eliteChampionContact` 1.14,
  `eliteChampionArmor` 0.07), `eliteBossHp` 1.32,
  `eliteBossContact` 1.20, `eliteAuraSpeed` 1.15.
- `01-state.js` (161 строка, 2 правки на месте): подпись риска этапа
  и размер волны читают BALANCE вместо хардкода (было ×1.85 HP);
  панель бонусов — новая разметка `.upgrade-stat`.
- `02-units.js` (89 строк, 1 правка на месте): множители Elite в
  `startBattle` читают BALANCE (было хардкод 1.85/1.13/1.30).
- `04-waves.js` (54 строки, правки на месте): размер Elite-волн,
  шанс/сила чемпионов и множители босса читают BALANCE; у чемпионов
  убран множитель XP ×1.30 (теперь `xp:cfg.xp`).
- `05-update.js` (178 строк, 3 правки на месте): аура чемпионов
  ускоряет соседей на `BALANCE.eliteAuraSpeed`; **фикс Hive-призраков**:
  враг помечается `e.dead=true` до удаления при ударе о базу; осы
  перепроверяют цель (`B.enemies.indexOf(dr.tgt)<0`).
- `06-render.js` (284 → 309 строк): новый компактный оверлей-HUD
  `drawCombatHud()` (режим/этап, таймер, волна, убийства, AVG DPS,
  прогресс волны и карточки), Elite-фон и свечение, аура чемпионов
  (маркер ✦, фиолетовое свечение), цвета полосы HP базы.
- `03-combat.js` (335), `07-ui.js` (234), `08-main.js` (2): без
  изменений — файлы байт-в-байт как во второй разбивке.
- `tests/smoke.cjs`: 11 → 18 тестов (+7: состав Elite/давление первой
  волны, запуск ос только по дальности, сброс целей после удара о базу,
  сохранение Elite-очисток в v1, контролы лобби, аура чемпионов,
  переключение режима и стрелки этапов).

## Что изменилось относительно первой разбивки (b61ea096 → 3d7b3ae5)

Схема модулей, `order.txt`, `build.py` и `.gitignore` — без изменений:
тот же разрез, только границы сместились по новому файлу (+223 строки
всего: +81 в теле скрипта, +142 в оболочке).

- `src/shell.html` (236 → 378 строк): перестройка лобби этапов в
  Galaxy Defense-стиле — CSS `.hq-*` (профиль, сцена с планетой,
  вкладки Normal/Elite, метрики этапа, действия), новый HTML домашнего
  экрана (заголовок этапа, стрелки выбора этапа, инфо-панель) и новый
  оверлей `#ov-stage-info` (сундук/сведения об этапе). Старая кнопка
  `btn-elite` (переключатель режима) заменена вкладками `btn-normal` /
  `btn-elite`.
- `01-state.js` (125 → 161 строка, 80 изменённых строк): рендер нового
  лобби — `renderHome`/`renderTurrets` под `.hq-*` разметку, привязка
  вкладок Normal/Elite и стрелок этапов, `#ov-stage-info`.
- `04-waves.js` (42 → 54 строки): отдельные Elite-волны.
- `03-combat.js` (318 → 335 строк): способности чемпионов.
- `05-update.js` (167 → 178 строк): глобальный ретаргет дронов Hive.
- `02-units.js` (87 → 89), `07-ui.js` (231 → 234): точечные правки.
- `00-config.js` (57), `06-render.js` (284), `08-main.js` (2): без
  изменений — файлы байт-в-байт как в первой разбивке.

## Как собирать

```sh
python3 build.py
```

## Как тестировать

```sh
node tests/smoke.cjs
```

Должно пройти 18 тестов.

## Правило

Правки вносятся ТОЛЬКО в `src/` (и `tests/`, `BALANCE.md`, документацию).
Собранный `index.html` руками не трогать — он пересобирается командой выше.
