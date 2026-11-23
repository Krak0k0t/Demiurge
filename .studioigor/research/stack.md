# Stack — research (2026-11-13)
Game: Дуэль Демиургов — 3D тактическая карточная дуэль в стиле «Обсидиановое Таро и Эфирный Разряд», платформа: браузер (превью на порту 3000).

## Findings
- **Three.js `0.187.0` (r187, Oct 2026) + `postprocessing` `6.39.6` (pmndrs):** стандарт для браузерного 3D. Есть PBR/PMREM и planar reflector для мокрого базальта, `ACESFilmic` + selective `Bloom` + `Vignette`, кастомный `ShaderMaterial` / TSL для Fresnel-ободков и дуг Перегрузки. Поверх `<canvas>` нативно работают HTML/SVG-карты Таро (`tabular-nums`, тонкие золотые орбиты 1px) на базе уже работающего в проекте React 19 + Vite + TypeScript. Размер бандла ~1.5–2.5 МБ.
- **Babylon.js `9.36.0` (v9 released Mar 2026):** добавлен Clustered Lighting и фрейм-граф оптимизации на WebGL 2 / WebGPU, встроенная физика и Inspector. Для компактной камерной арены дуэли избыточен по весу (~4–6 МБ) и слабее в типографическом 2D UI-оверлее по сравнению с React + SVG.
- **Godot 4.3+ (GDScript Web export):** single-threaded HTML5 экспорт больше не требует `SharedArrayBuffer`, но базовый wasm + pck весит 15–40 МБ, веб-рендер ограничен Compatibility/WebGL2 (без SSR/часть постобработки урезана), и бинарник Godot отсутствует в среде контейнера.
- **Проверка окружения (`/app/applet`):** установлены Node.js, npm, Vite 8.3, React 19, TypeScript 7, `playwright-cli` (для визуальной проверки рендера и DOM); `blender` и `godot` отсутствуют.

## What this changes
- Платформа уже зафиксирована пользователем в фазе 1 (`Браузер прямо здесь`, превью Vite на порту 3000).
- Для требований `ART_BIBLE.md` (двойные отражения на мокром базальте, selective Bloom, кастомные шейдеры и чёткий SVG-оверлей Таро) оптимален `web` стек: Three.js + React/SVG-HUD. Godot Web проигрывает по размеру загрузки (15–40 МБ vs ~2 МБ) и несовместимости с живым Vite-превью.

## Sources
- npm registry (`npm view three version` = 0.187.0, `postprocessing` = 6.39.6, `@babylonjs/core` = 9.36.0) — 2026-11-13
- Three.js r187 / RenderPipeline updates (utsubo.com, threejsroadmap.com) — 2026-11-13
- Babylon.js 9.0 release notes (babylonjs.com, GitHub) — 2026-11-13
- Godot 4 single-threaded Web export docs & binary size analysis (godotengine.org) — 2026-11-13
