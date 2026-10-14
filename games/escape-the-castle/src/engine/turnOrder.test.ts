import { describe, it, expect } from 'vitest';
import { buildTurnOrder, effectiveGrace } from './turnOrder';
import { TUNING } from './data';
import type { Combatant, StatKey } from './types';

function mk(id: string, grace: number, opts: Partial<Combatant> = {}): Combatant {
  const stats: Record<StatKey, number> = {
    strength: 0,
    arcana: 0,
    grace,
    charisma: 0,
    resolve: 0,
    intuition: 0,
  };
  return {
    id,
    sourceId: id,
    name: id,
    side: 'party',
    emoji: '🙂',
    color: '#888',
    hp: 10,
    maxHp: 10,
    sp: 0,
    maxSp: 0,
    stats,
    weakTo: [],
    resists: [],
    immuneTo: [],
    statuses: [],
    powerIds: [],
    ...opts,
    // keep the grace we set even if opts had stats
    ...(opts.stats ? {} : { stats }),
  };
}

describe('effectiveGrace', () => {
  it('is the base grace with no slow', () => {
    expect(effectiveGrace(mk('a', 8), TUNING)).toBe(8);
  });

  it('is reduced while slowed', () => {
    const slowed = mk('a', 8, { statuses: [{ effect: 'slow', turnsRemaining: 2 }] });
    // SLOW_GRACE_MULTIPLIER default 0.5 -> 4
    expect(effectiveGrace(slowed, TUNING)).toBe(8 * TUNING.SLOW_GRACE_MULTIPLIER);
  });
});

describe('buildTurnOrder', () => {
  it('orders by grace descending', () => {
    const order = buildTurnOrder([mk('a', 5), mk('b', 9), mk('c', 7)], TUNING);
    expect(order).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by id ascending, deterministically', () => {
    const order = buildTurnOrder([mk('mira', 7), mk('cassian', 7), mk('idris', 7)], TUNING);
    expect(order).toEqual(['cassian', 'idris', 'mira']);
  });

  it('excludes dead combatants', () => {
    const order = buildTurnOrder([mk('a', 9), mk('b', 5, { hp: 0 }), mk('c', 7)], TUNING);
    expect(order).toEqual(['a', 'c']);
  });

  it('slow actually reorders — a slowed fast unit falls behind', () => {
    // base graces: fast=8, slow-victim=10. Without slow, victim goes first.
    const fast = mk('fast', 8);
    const victim = mk('victim', 10, { statuses: [{ effect: 'slow', turnsRemaining: 1 }] });
    // effective: victim 10 * 0.5 = 5, fast 8 -> fast first now.
    expect(buildTurnOrder([fast, victim], TUNING)).toEqual(['fast', 'victim']);
  });
});
