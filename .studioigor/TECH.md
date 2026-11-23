# Technology — Дуэль Демиургов

<!-- Phase 3 (references/stack.md). ENGINE — one of: godot, godot-mono, unity,
unreal, web, defold, bevy (read by studio.py and envcheck.py). DIMENSION — 2D or 3D
(2.5D with 3D models is 3D); envcheck.py recommends Blender for 3D. -->
ENGINE: web
ENGINE VERSION: Three.js 0.187.0 + postprocessing 6.39.6 + React 19
DIMENSION: 3D
LANGUAGE: TypeScript
PLATFORMS: web (browser preview)

## Decision
- context: 3D тактическая карточная дуэль в стиле «Обсидиановое Таро и Эфирный Разряд» (мокрые отражения на базальте, selective Bloom, Fresnel-кант, HTML/SVG-карты Таро) с мгновенным запуском в браузерном превью.
- options: Three.js 0.187 + postprocessing + React/SVG HUD (малый бандл ~2 МБ, полный PBR/шейдеры, нативный Vite-стек — плюс; без визуального редактора сцен — минус) | Babylon.js 9.36 (встроенные свет/физика — плюс; тяжелее ~4–6 МБ и слабее 2D-типографика Таро — минус) | Godot 4 Web (визуальный редактор и нативный экспорт — плюс; 15–40 МБ wasm, WebGL2 Compatibility без части отражений и не работает прямо в превью — минус).
- choice and why: Three.js 0.187 + postprocessing + React 19 HUD — даёт максимальный визуальный потолок под арт-библию (planar/PMREM-отражения, ACESFilmic, selective Bloom, кастомные шейдеры Перегрузки) и чёткий SVG-оверлей Таро прямо на порту 3000.
- consequences: 3D-фигуры существ, демиурги и арена строятся модульно в TypeScript (процедурная геометрия + PBR-материалы и шейдеры), логика боя полностью отделена от рендера и покрывается тестами через `tsx --test` / `vitest`, визуальная проверка идёт через Playwright на порту 3000.

## Budgets
- fps: стабильные 60 fps на среднем ноутбуке (1440×900) и ≥ 30 fps на мобильном вьюпорте при максимальных VFX Перегрузки.
- draw calls: ≤ 80 draw calls в активной дуэли (инстансинг частиц/рун, объединённая геометрия колонн арены).
- memory & bundle: JS-бандл ≤ 3 МБ gzipped (~15 МБ до сжатия), загрузка превью ≤ 3 сек, GPU-память текстур ≤ 64 МБ.

## Project structure
- `src/game/core/` — чистая детерминированная логика дуэли, карт, Перегрузки, ИИ и драфта (без DOM и Three.js, тестируется unit-тестами).
- `src/game/data/` — данные 4 школ, ~30 карт, противников турнирной лестницы и параметров баланса.
- `src/game/scene/` — Three.js сцена 3D-арены, освещение, постобработка (`ACESFilmic` + selective `Bloom`), процедурные бронзовые тотемы/кристаллы и VFX-шейдеры.
- `src/components/` — React/SVG HUD Таро: веер руки, орбитальный драфт 1 из 3, панель Канала/Перегрузки и переключатель сцен (Look-dev / Gyms / Arena).
- `src/utils/` — вспомогательные утилиты и модульные тесты.
