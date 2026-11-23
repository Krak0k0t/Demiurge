# Decisions

One line = one decision. `by`: user — the user decided; agent — the agent decided on its own
(the user chose "you decide" or the question wasn't worth their time). A cancelled
decision is not deleted: a new line says "replaces #N".

| # | date | phase | decision | options | by | why |
|---|---|---|---|---|---|---|
| 1 | 2026-11-14 | 0 | project folder: /app/applet (working title: Дуэль Демиургов) | — | agent | current AI Studio workspace serves preview on port 3000 |
| 2 | 2026-11-14 | 1 | format: Чистая арена дуэлей со сборкой колоды; scale: Компактная кампания (4 школы, 6-8 дуэлей, ~30 карт); platform (prelim): Браузер (10-15 мин) | — | user | Phase 1 Round 1 answers |
| 3 | 2026-11-14 | 1 | camera: 3D-арена (демиурги друг напротив друга); twist: Перегрузка Эфирного Канала; deckbuilding: Драфт 1 из 3 после победы; story: Турнирный сюжет с репликами и сценами перед боссами | — | user | Phase 1 Round 2 answers |
| 4 | 2026-11-14 | 1 | pitch card approved: Дуэль Демиургов (3D-арена, Перегрузка Канала, драфт 1 из 3, турнирный сюжет) | — | user | pitch card summary approved |
| 5 | 2026-11-14 | 1 | controls, failure, anti-pillars: клик/тап с явными фазами, переигровка боя, без глобальной карты/базы/мультиплеера | — | agent | concept defaults shown in Assumed and approved |
| 6 | 2026-11-14 | 1 | hooks approved: GD01 Алтарь Эфира, GD02 Аномалии арены, GD03 Закалка существ, GD04 Ультиматум Демиурга (→ M08–M11) | — | user | user selected all 4 hooks in multiSelect |
| 7 | 2026-11-14 | 2 | style R1: 12 likes evenly across all 4 directions (3 per set) — synthesize 3 mixed R2 variants | — | user | likes: Etherlords duel framing & stats, dark obsidian arena floor & golden pillars, Art Deco gold frames & orbital UI, brutalist wet stone reflections & cyan/crimson overload |
| 8 | 2026-11-14 | 2 | style R2: 10 likes converging on Obsidian Bronze Tarot base (5) + Wet-Stone Ether Overload (3) + Classic Duel Framing (2) | — | user | 10 likes across R2: dark obsidian monoliths with gold inner light, Art Deco bronze relief & tarot orbits, cyan/amber crystal discharge on wet stone, classic two-demiurge duel framing with crisp stats |
| 9 | 2026-11-14 | 2 | style locked: 'Обсидиановое Таро и Эфирный Разряд' | — | user | Утверждено пользователем: синтез из 10 кадров R2 (тёмный мокрый базальт, литая бронза и золотые рамки Таро, бирюзовый эфир, багровый акцент Перегрузки, дуэль демиургов напротив друг друга) |
| 10 | 2026-11-14 | 3 | platforms: web (browser) | — | user | Выбрано пользователем в фазе 1: Браузер прямо здесь (вход в один клик, сессия 10-15 минут) |
| 11 | 2026-11-14 | 3 | engine: Three.js 0.187.0 + postprocessing + React 19 HUD (web) | Three.js + React HUD \| Babylon.js \| Godot 4 Web | user | Выбор пользователя: мгновенное 3D-превью в браузере, PBR-отражения мокрого базальта, selective Bloom и чёткие SVG-карты Таро поверх сцены |
| 12 | 2026-11-14 | 4 | 3D without Blender: procedural TypeScript/Three.js geometry (no Blender in Linux container) | — | agent | Среда Linux без Blender/Homebrew: по assets.md §4 процедурные 3D-тотемы и арена собираются в TypeScript/Three.js |
| 13 | 2026-11-14 | 4 | user confirmed live 3D Hello scene on port 3000 works | — | user | Вижу 3D-арену и управление работает, идём к Фазе 5 |
| 14 | 2026-11-14 | 5 | asset strategy: procedural Three.js + SVG Tarot UI + procedural Web Audio ambient & SFX | — | user | Пользователь утвердил процедурный пайплайн без внешних 3D-паков и с процедурным тёмным эмбиентом/SFX |
