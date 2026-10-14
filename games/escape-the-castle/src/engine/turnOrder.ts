// Turn order: everyone acts once per round, ordered by grace descending,
// recomputed at the start of each round so `slow` actually matters. Ties break
// by id ascending — deterministic, no RNG.

import type { Combatant, Tuning } from './types';

export function hasStatus(c: Combatant, effect: Combatant['statuses'][number]['effect']): boolean {
  return c.statuses.some((s) => s.effect === effect);
}

export function effectiveGrace(c: Combatant, tuning: Tuning): number {
  const base = c.stats.grace;
  return hasStatus(c, 'slow') ? base * tuning.SLOW_GRACE_MULTIPLIER : base;
}

export function buildTurnOrder(combatants: Combatant[], tuning: Tuning): string[] {
  return combatants
    .filter((c) => c.hp > 0)
    .slice()
    .sort((a, b) => {
      const dg = effectiveGrace(b, tuning) - effectiveGrace(a, tuning);
      if (dg !== 0) {
        return dg;
      }

      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .map((c) => c.id);
}
