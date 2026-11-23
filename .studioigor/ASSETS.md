# Assets — Дуэль Демиургов

<!-- Phase 5 (references/assets.md). -->

## Inventory
<!-- one line per asset card (references/assets.md): name · category · style · budget · source · status -->
| asset | category | style | budget | source | status |
|---|---|---|---|---|---|
| A001 · SM_DuelArena | environment | восьмиугольный мокрый базальт `#1A181A`, золотой рунный круг Таро, 6 базальтовых столбов | ≤ 4k tris, 1–2 draw calls | procedural Three.js (`mergeGeometries` + `Reflector`) | done |
| A002 · SM_DemiurgePlayer | character | фигура демиурга-претендента в бронзовом плаще, корона-нимб и посох с эфиром `#679793` | ≤ 1.8k tris, 6–8 частей | procedural Three.js (`Lathe`/`Extrude`) | done |
| A003 · SM_DemiurgeEnemy | character | силуэт соперника (Игнис/Корвин) в тёмной патине `#453636` и янтарной оправе | ≤ 1.8k tris, 6–8 частей | procedural Three.js (`Lathe`/`Extrude`) | done |
| A004 · SM_CreatureKinet | character | парящий кристально-клинок октаэдр школы Кинетов, бирюзовый `#679793` Fresnel-кант | ≤ 900 tris, 5 частей | procedural Three.js (`THREE.Group`) | done |
| A005 · SM_CreatureVital | character | бронзово-янтарный тотем-рой школы Виталов с живыми сферами роста | ≤ 900 tris, 6 частей | procedural Three.js (`THREE.Group`) | done |
| A006 · SM_CreatureChaos | character | рубленый обсидианово-угольный голем Хаотов с тлеющим ядром | ≤ 900 tris, 6 частей | procedural Three.js (`THREE.Group`) | done |
| A007 · SM_CreatureSynth | character | геометрический астроид-конструкт Синтетов в клёпаной бронзе и щитах | ≤ 900 tris, 6 частей | procedural Three.js (`THREE.Group`) | done |
| A008 · VFX_EtherOverload | vfx | дуги Перегрузки `#B93826`, кольцо нексуса и пул искр удара | ≤ 200 instanced частиц | procedural GLSL + `InstancedMesh` | done |
| A009 · T_WetBasalt_Mat | texture | процедурная карта альбедо + шероховатости луж базальта с разметкой Таро | 512–1024 px, `SRGBColorSpace` | procedural `CanvasTexture` | done |
| A010 · UI_TarotDeckKit | ui | рамки карт Таро 1px `#BE9F4E`, орбиты драфта 1 из 3, векторные глифы 4 школ | вектор SVG | procedural SVG + React | done |
| A011 · AUD_EtherSynth | audio | кристальные переливы, тяжёлые удары бронзы, треск Перегрузки и тёмный дрон | 0 Б загрузки, latency < 5 мс | procedural Web Audio / ZzFX | done |

## Strategy by category
| category | source (pack / Blender / procedural / generation / user) | why | status |
|---|---|---|---|
| Окружение и арена | procedural (Three.js `mergeGeometries`) | 100% точное попадание в мокрый базальт и золотые щели монолитов из `ART_BIBLE.md`, ≤ 2 draw calls | approved |
| Демиурги и существа 4 школ | procedural (Three.js составные `THREE.Group` 5–8 деталей) | Бронзовая пластика и флюорит без Blender в контейнере, мгновенная смена школьной палитры и анимации удара/блока | approved |
| Текстуры и материалы | procedural (`CanvasTexture` + PBR `roughnessMap` + GLSL Fresnel) | Zero-404, управляемые двойные отражения на мокром камне и реактивный сдвиг при Перегрузке | approved |
| VFX и энергия | procedural (GLSL-дуги + `InstancedMesh` искры + selective `Bloom`) | Выделение Перегрузки строго в `#B93826` без мусорного перегруза кадра | approved |
| UI и карты Таро | procedural (SVG + React + `Cinzel` / `Inter`) | Кристально чёткая типографика статов и тонкие золотые орбиты 1px поверх 3D-арены | approved |
| SFX и музыка | procedural (Web Audio / ZzFX — тёмный эмбиент + SFX) | Нулевая загрузка, чистая лицензия, реактивный звук на Перегрузку | approved |

## Conventions
- Единицы: метрические (`1 unit = 1 м`); вверх `+Y`, вперёд к противнику `-Z` / `+Z`; опорная точка всех моделей — `bottom-center (y = 0)`.
- Именование: `SM_` (статичная группа/меш), `VFX_` (шейдер/инстансы), `T_` (процедурная текстура), `UI_` (компонент/SVG), `AUD_` (синтезатор); строго ASCII без пробелов.
- Бюджеты: ≤ 80 draw calls в боевой сцене, ≤ 80k треугольников в кадре, стабильные 60 fps на 1440×900, ноль внешних бинарных зависимостей (zero-404).

## Requests to the user
- Стратегия утверждена пользователем (процедурный Three.js + SVG + процедурный Web Audio эмбиент и SFX).

## License registry
| asset / pack | source (URL) | license | author | path | attribution |
|---|---|---|---|---|---|
| Собственные процедурные 3D/SVG/Audio генераторы | внутренние модули TypeScript | проектная (CC0-эквивалент для синтеза) | Дуэль Демиургов (procedural) | `src/view/` / `src/ui/` / `src/audio/` | не требуется |
