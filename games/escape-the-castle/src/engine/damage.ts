// Pure damage / healing maths. Every number comes from Tuning; none are
// literals here.

import { randRange, type RNG } from './rng';
import type { Affinity, DamageType, Power, StatKey, Tuning } from './types';

interface AffinityTarget {
  weakTo: DamageType[];
  resists: DamageType[];
  immuneTo: DamageType[];
}

export interface DamageResult {
  amount: number; // always >= 0; interpret via isHeal
  affinity: Affinity;
  isHeal: boolean;
}

export function isHeal(power: Power): boolean {
  return power.base_power < 0;
}

export function affinityFor(damageType: DamageType, target: AffinityTarget): Affinity {
  // Typeless damage is never weak/resist/immune — it just lands.
  if (damageType === 'none') {
    return 'neutral';
  }

  if (target.immuneTo.includes(damageType)) {
    return 'immune';
  }

  if (target.weakTo.includes(damageType)) {
    return 'weak';
  }

  if (target.resists.includes(damageType)) {
    return 'resist';
  }

  return 'neutral';
}

export function multiplierFor(affinity: Affinity, tuning: Tuning): number {
  switch (affinity) {
    case 'weak':
      return tuning.MULT_WEAK;
    case 'resist':
      return tuning.MULT_RESIST;
    case 'immune':
      return tuning.MULT_IMMUNE;
    case 'neutral':
      return tuning.MULT_NEUTRAL;
  }
}

export function computeDamage(
  power: Power,
  casterStats: Record<StatKey, number>,
  target: AffinityTarget,
  tuning: Tuning,
  rng: RNG
): DamageResult {
  const variance = randRange(rng, tuning.VARIANCE_MIN, tuning.VARIANCE_MAX);

  if (isHeal(power)) {
    // Healing skips affinity entirely and scales off the configured heal stat.
    const stat = casterStats[tuning.HEAL_SCALING_STAT];
    const raw = Math.abs(power.base_power) * (1 + stat / tuning.STAT_SCALING_DIVISOR);
    return { amount: Math.round(raw * variance), affinity: 'neutral', isHeal: true };
  }

  const stat = casterStats[power.scaling_stat];
  const raw = power.base_power * (1 + stat / tuning.STAT_SCALING_DIVISOR);
  const affinity = affinityFor(power.damage_type, target);
  // "none" is never multiplied by affinity (affinityFor already returns
  // neutral, so multiplier is MULT_NEUTRAL).
  const mult = multiplierFor(affinity, tuning);
  return { amount: Math.round(raw * mult * variance), affinity, isHeal: false };
}
