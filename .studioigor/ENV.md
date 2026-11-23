# Environment — Дуэль Демиургов

<!-- Phase 4 (references/environment.md). Commands verified by a real run.
VERIFIED is switched only by `studio.py verify`. CAPTURE writes images to
.studioigor/captures/. -->
VERIFIED: yes

## Installed
| tool | version | why |
|---|---|---|
| Node.js + npm | 22.23.2 / 10.15.0 | сборщик Vite 8.3 и запуск тестов |
| Three.js + @types/three | 0.187.0 | 3D WebGL-рендер арены, PBR и шейдеры |
| postprocessing | 6.39.6 | постобработка (ACESFilmic, selective Bloom) |
| React + TypeScript | 19.0.1 / 7.0.2 | Таро SVG-HUD и строгая типизация логики |
| Vitest | 5.1.0 | модульные тесты чистой игровой логики |
| ESLint + typescript-eslint | 10.15.0 / 8.72.2 | статический контроль TypeScript-кода |
| Playwright + headless shell | 1.65.1 (chromium-1247) | безголовый захват 3D-кадров и консоли |

## Agent integrations
- `tools/capture.mjs` (Playwright headless + SwiftShader WebGL fallback, снимает `frame_*.png`, `sheet.png` и `metrics.json`, падает при ошибках консоли).
- `playwright-cli` (`0.1.22`) доступен для живой проверки запущенного сервера на порту 3000.
- 3D без Blender: контейнер без macOS/Blender, вся 3D-геометрия строится процедурно в TypeScript (`src/view/`) согласно `assets.md` §4.

## Commands
RUN: npm run dev
TEST: npx tsc --noEmit && npx vitest run
BUILD: npm run build
CAPTURE: npm run build && node tools/capture.mjs --dir dist --out .studioigor/captures/hello --duration 4 --every 0.8 --wait-for "window.__GAME__?.ready" --inputs tools/inputs/hello.json --require-completed
EDITOR: none — код и сцены в TypeScript-репозитории

## Pitfalls
- Контейнер Linux (без `brew` и `blender`): `envcheck.py` ориентирован на macOS-пути, поэтому Chromium берётся из `/ms-playwright/chromium_headless_shell-1247/...` через автопоиск в `tools/capture.mjs`.
- `typescript-eslint` 8.x не поддерживает установленный TypeScript 7.0 (`^7.0.2`), поэтому статическая проверка включена через строгий `tsc --noEmit` (`strict`, `noUnusedLocals`, `noUnusedParameters`).
- В headless-режиме Chromium использует SwiftShader: тяжёлый `EffectComposer` и `shadowMap` отключаются по `isSoftwareGl`, а цикл рендера синхронизируется через `gl.fenceSync` (`afterDraw`).
