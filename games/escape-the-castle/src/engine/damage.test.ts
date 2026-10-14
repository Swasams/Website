import { describe, it, expect } from 'vitest';
import { affinityFor, computeDamage, isHeal } from './damage';
import { TUNING } from './data';
import type { Power, StatKey } from './types';

// rng that always yields 0.5 -> variance lands exactly on 1.0
// (VARIANCE_MIN 0.95 + 0.5 * (1.05 - 0.95) = 1.0), so numbers are clean.
const rngMid = () => 0.5;

function stats(overrides: Partial<Record<StatKey, number>>): Record<StatKey, number> {
  return {
    strength: 0,
    arcana: 0,
    grace: 0,
    charisma: 0,
    resolve: 0,
    intuition: 0,
    ...overrides,
  };
}

function target(overrides: Partial<{ weakTo: Power['damage_type'][]; resists: Power['damage_type'][]; immuneTo: Power['damage_type'][] }> = {}) {
  return { weakTo: [], resists: [], immuneTo: [], ...overrides };
}

function mkPower(overrides: Partial<Power>): Power {
  return {
    id: 'test',
    name: 'Test',
    owner_id: 'x',
    damage_type: 'fire',
    scaling_stat: 'arcana',
    base_power: 12,
    sp_cost: 0,
    target: 'single',
    status_effect: null,
    status_turns: 0,
    description: '',
    ...overrides,
  };
}

describe('affinityFor', () => {
  it('reads weak / resist / immune / neutral off the target', () => {
    expect(affinityFor('fire', target({ weakTo: ['fire'] }))).toBe('weak');
    expect(affinityFor('fire', target({ resists: ['fire'] }))).toBe('resist');
    expect(affinityFor('fire', target({ immuneTo: ['fire'] }))).toBe('immune');
    expect(affinityFor('fire', target())).toBe('neutral');
  });

  it('treats damage type "none" as neutral always', () => {
    expect(affinityFor('none', target({ weakTo: ['none'] }))).toBe('neutral');
  });
});

describe('computeDamage — affinity multipliers', () => {
  // base 12, arcana scaling; caster arcana 10 -> raw = 12 * (1 + 10/20) = 18
  const power = mkPower({ base_power: 12, damage_type: 'fire', scaling_stat: 'arcana' });
  const caster = stats({ arcana: 10 });

  it('neutral hit = raw', () => {
    expect(computeDamage(power, caster, target(), TUNING, rngMid).amount).toBe(18);
  });

  it('weak hit = raw * 1.75, rounded, and no extra turn implied', () => {
    // 18 * 1.75 = 31.5 -> 32
    const r = computeDamage(power, caster, target({ weakTo: ['fire'] }), TUNING, rngMid);
    expect(r.amount).toBe(32);
    expect(r.affinity).toBe('weak');
  });

  it('resist hit = raw * 0.5', () => {
    expect(
      computeDamage(power, caster, target({ resists: ['fire'] }), TUNING, rngMid).amount
    ).toBe(9);
  });

  it('immune hit = 0', () => {
    const r = computeDamage(power, caster, target({ immuneTo: ['fire'] }), TUNING, rngMid);
    expect(r.amount).toBe(0);
    expect(r.affinity).toBe('immune');
  });

  it('damage type "none" is never multiplied by affinity', () => {
    const p = mkPower({ base_power: 12, damage_type: 'none', scaling_stat: 'arcana' });
    // even if the target somehow lists "none" as weak, no multiplier applies
    expect(
      computeDamage(p, caster, target({ weakTo: ['none'] }), TUNING, rngMid).amount
    ).toBe(18);
  });
});

describe('computeDamage — stat scaling at 0 / 10 / 20', () => {
  // base 10, so raw = 10 * (1 + stat / 20): stat 0 -> 10, 10 -> 15, 20 -> 20
  const power = mkPower({ base_power: 10, damage_type: 'fire', scaling_stat: 'strength' });

  it('stat 0 -> base', () => {
    expect(computeDamage(power, stats({ strength: 0 }), target(), TUNING, rngMid).amount).toBe(10);
  });
  it('stat 10 -> base * 1.5', () => {
    expect(computeDamage(power, stats({ strength: 10 }), target(), TUNING, rngMid).amount).toBe(15);
  });
  it('stat 20 -> base * 2', () => {
    expect(computeDamage(power, stats({ strength: 20 }), target(), TUNING, rngMid).amount).toBe(20);
  });
});

describe('computeDamage — healing', () => {
  const mend = mkPower({ base_power: -18, damage_type: 'none', scaling_stat: 'intuition' });

  it('negative base_power heals, scaling off the heal stat (intuition)', () => {
    // |−18| * (1 + 10/20) = 27
    const r = computeDamage(mend, stats({ intuition: 10 }), target(), TUNING, rngMid);
    expect(r.isHeal).toBe(true);
    expect(r.amount).toBe(27);
  });

  it('heal ignores target affinity entirely', () => {
    const r = computeDamage(mend, stats({ intuition: 10 }), target({ resists: ['none'] }), TUNING, rngMid);
    expect(r.amount).toBe(27);
  });

  it('isHeal flags negative base_power', () => {
    expect(isHeal(mend)).toBe(true);
    expect(isHeal(mkPower({ base_power: 5 }))).toBe(false);
  });
});

describe('computeDamage — variance bounds', () => {
  const power = mkPower({ base_power: 100, damage_type: 'fire', scaling_stat: 'arcana' });
  const caster = stats({ arcana: 0 }); // raw = 100

  it('rng 0 -> VARIANCE_MIN, rng ~1 -> VARIANCE_MAX', () => {
    expect(computeDamage(power, caster, target(), TUNING, () => 0).amount).toBe(95); // 100 * 0.95
    expect(computeDamage(power, caster, target(), TUNING, () => 0.999999).amount).toBe(105); // ~100 * 1.05
  });
});
