# Assets — research (2026-11-14)
Game: Дуэль Демиургов · Style: «Обсидиановое Таро и Эфирный Разряд» · Engine: Three.js 0.187 + React/SVG HUD (`3D without Blender`).

## Findings
- **Процедурная 3D-геометрия (Three.js):** статичные элементы окружения (плиты помоста, балки, орнаменты колонн) объединяются через `mergeGeometries` (`BufferGeometryUtils`) в 1 draw call; повторяющиеся руны, осколки флюорита и искры Перегрузки рендерятся через преаллоцированный `THREE.InstancedMesh` (нулевые GC-паузы в рантайме, ≤ 80 draw calls).
- **Силуэты существ и демиургов:** собираются как составные `THREE.Group` из 4–10 деталей (`ExtrudeGeometry` со скосами, `LatheGeometry`, `Octahedron`/`TubeGeometry`), привязанные к опорной точке `bottom-center (y = 0)` с контрастом `roughness` ≥ 0.25 между литой бронзой (`#956842`), тёмным флюоритом (`#1A181A`) и светящимся ядром (`#679793` / `#B93826`).
- **Текстуры и 2D/UI:** процедурные `CanvasTexture` (`SRGBColorSpace` + `getMaxAnisotropy()`) для мокрого базальта с лужами шероховатости + чистые SVG-фреймы Таро и орбиты драфта с антиквой `Cinzel` и `Inter`. Zero-404: ноль внешних `.png`/`.glb`/`.mp3` запросов.
- **Звук и музыка:** ZzFX / Web Audio API синтез даёт мгновенные SFX (призыв кристалла, тяжёлый бронзовый удар, щит, треск Перегрузки) с нулевой задержкой загрузки и лицензионной чистотой; процедурный тёмный эмбиент-дрон умеет гармонически сгущаться при Перегрузке Канала. Альтернатива — бесплатные CC0-паки (Kenney, OpenGameArt), если понадобится живой оркестровый луп.

## What this changes
- Все 3D-ассеты, материалы, VFX и базовые SFX делаем процедурно в TypeScript-модулях (`src/view/assets/`) — 100% попадание в арт-библию и нулевые лицензионные риски.
- Одобряем стратегию по категориям и выбор музыки с пользователем, после чего собираем Look-Dev сцену полной боевой дуэли (`?scene=lookdev`) с демиургами, существами, картой Таро в руке и постобработкой.

## Sources
- Three.js `InstancedMesh` & `BufferGeometryUtils.mergeGeometries` web performance patterns — 2026-11-14
- ZzFX / Web Audio deterministic SFX synthesis for zero-latency web games — 2026-11-14
- `studioigor/references/assets.md` §4, §8–14 — 2026-11-14
