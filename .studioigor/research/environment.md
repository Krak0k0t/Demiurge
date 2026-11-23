# Environment — research (2026-11-14)
Game: Дуэль Демиургов · Stack: Web (`Three.js 0.187.0` + `postprocessing 6.39.6` + React 19 + Vite 8 + TypeScript 7) · OS: Linux x86_64 (AI Studio container, порт 3000).

## Findings
- **Runtime и сборщик:** Node `22.23.2`, npm `10.15.0`, Vite `8.3.0`, TypeScript `7.0.2`, `tsx 4.21.0` уже установлены. Превью работает на порту `3000` (`npm run dev`, HMR отключён через `DISABLE_HMR=true`).
- **3D и графика:** `three@0.187.0` (`@types/three`) + `postprocessing@6.39.6` (или `three/addons/postprocessing/EffectComposer.js` + `UnrealBloomPass` + `RoomEnvironment` PMREM). При headless WebGL (SwiftShader/llvmpipe) нужен `isSoftwareGl` guard с pacing через `gl.fenceSync` (`afterDraw`), а в React — изолированный `<div ref>` без CSS `backdrop-blur` поверх `<canvas>`.
- **Захват кадров (CAPTURE) и браузер:** `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` уже содержит бинарник `/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell`. Шаблон `capture.mjs` работает с локальным пакетом `playwright` + `PW_CHROMIUM`, снимая PNG-кадры, контакт-лист `sheet.png`, ошибки консоли и `window.__metrics`.
- **Тесты и линтер:** `vitest` для чистой детерминированной логики дуэли (`src/game/core/`) + `eslint` (`@eslint/js` + `typescript-eslint`, flat config `eslint.config.js`) + `tsc --noEmit`.
- **Blender и `brew`:** среда Linux-контейнера без macOS `brew` и без установленного `blender`; в соответствии с `assets.md` §4 и `environment.md` §11 3D-геометрия строится процедурно на TypeScript/Three.js (`THREE.Group` из 3–12 составных частей, `ExtrudeGeometry`/`LatheGeometry`/`InstancedMesh`) с превью через `capture.mjs`.

## What this changes
- Ставим в проект одним пакетом: `three`, `@types/three`, `postprocessing`, `vitest`, `playwright`, `eslint`, `@eslint/js`, `typescript-eslint`.
- Фиксируем решение `3D without Blender` для процедурной 3D-геометрии и материалов прямо в Three.js.
- Настраиваем `eslint.config.js`, `vitest` (`npm test`) и `tools/capture.mjs` с автоопределением `/ms-playwright/.../chrome-headless-shell` в `PW_CHROMIUM`.

## Sources
- `envcheck.py --engine web` и аудит контейнера (`node -v`, `env`, `/ms-playwright/`) — 2026-11-14
- `npm view three`, `postprocessing` (`0.187.0`, `6.39.6`) — 2026-11-14
- Three.js Skill directives (`threejs/SKILL.md`, `references/postprocessing.md`, `references/lighting.md`) — 2026-11-14
- `studioigor/references/environment.md` §8, §11–14 — 2026-11-14
