# Escape the Castle — combat vertical slice

A browser roguelike RPG (working title). This is **Session 1: combat only** — one
Persona-style battle that plays end to end. No map, no social scenes, no run
loop, no saving. That's all deliberate; it comes later.

## Requires Node.js

This machine did **not** have Node.js/npm installed when the project was built,
so nothing here has been installed, tested, or bundled yet. Install Node 18+ (the
LTS from https://nodejs.org), reopen a terminal, then:

```bash
cd games/escape-the-castle
npm install       # pull vite / react / typescript / vitest
npm test          # run the engine unit tests (Vitest)
npm run dev       # play it locally at the printed localhost URL
npm run build     # produce dist/ for embedding on the site
```

## Architecture (rules live in one place)

```
src/engine/   pure TypeScript. Zero React, zero DOM. All rules here.
              Deterministic given a seeded RNG — never calls Math.random().
src/data/     *.json content. No stats/names/damage numbers live anywhere else.
src/ui/       React components. Read engine state, dispatch actions, own no rules.
src/engine/*.test.ts   unit tests (damage, turn order, full battle).
src/mount.tsx entry point: export mountGame(element).
```

## Embedding on the static site

`vite build` emits a self-contained UMD bundle (React is bundled in) plus a
stylesheet, with `base: './'` so relative paths work from any subdirectory:

```html
<link rel="stylesheet" href="./dist/style.css" />
<div id="dp-game"></div>
<script src="./dist/escape-the-castle.js"></script>
<script>EscapeTheCastle.mountGame(document.getElementById('dp-game'));</script>
```

`mountGame` returns an unmount function.

## Changes from the original spec / CSVs — read these

1. **`empathy` → `intuition`** everywhere, per request. It's the sixth stat
   (scales healing) and `tuning.json`'s `HEAL_SCALING_STAT`.

2. **Two enemy AoE moves were re-targeted.** In the Powers CSV, `wail` and
   `dragonfire` were listed as `target: all_allies`, but their descriptions say
   they hit the whole party. Targeting in the engine is **relative to the
   caster** (`all_enemies` = everyone on the opposing side), so to make them hit
   the party they're stored as `all_enemies`. If you re-export the CSV, either
   change those two cells to `all_enemies` or tell me and I'll keep converting
   them. Everything else matches your field names exactly.

3. **Values the source didn't specify — invented, flagged, and tunable** in
   `src/data/tuning.json`:
   - `SLOW_GRACE_MULTIPLIER` (0.5) — `slow` halves effective grace.
   - `FEAR_SKIP_CHANCE` (0.5) — chance a feared unit loses its turn.
   - `BURN_DAMAGE_PER_TURN` (6) — flat burn tick.
   These weren't on the Tuning tab; pick real numbers when you're ready.

4. **Combat sandbox gives each hero every power they own** (so the fight
   exercises AoE / status / heal). Your Relationships tab gates `sweep`,
   `hoarfrost`, and `dawnsong` behind bond levels — that gating belongs to the
   run loop, which is out of scope this session. Easy to restrict later.

## Placeholder art

Coloured rectangles + one emoji per combatant, HP/SP bars, status icons, and a
floating number on hit. No sprites, no real art — that's yours to make later.
Cosmetics live in `src/engine/cosmetics.ts` and touch no rules.

## What the slice covers

- Party of 4 vs 1–3 enemies, all visible, turn-based.
- Turn order by grace, recomputed each round (so `slow` actually reorders).
- Damage = `base × (1 + stat/DIVISOR) × affinity × variance`; weakness = more
  damage and **no** extra turn; healing skips affinity and scales off intuition;
  `none` is never multiplied.
- SP costs/regen, four damage types, `burn`/`slow`/`fear` with resolve-based
  resist, dodge from grace.
- Victory / defeat screens. Two demo fights: winnable (2 ghouls) and losing
  (the dragon).
```
