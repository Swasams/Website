import { describe, it, expect } from 'vitest';
import {
  activeCombatant,
  canAfford,
  createBattle,
  enemyAct,
  getCombatant,
  livingAlliesOf,
  livingOpponentsOf,
  playerAct,
} from './battle';
import { getPower } from './data';
import { createRng } from './rng';
import type { BattleEvent, BattleState, Combatant, Power } from './types';

function targetFor(state: BattleState, active: Combatant, power: Power): string | null {
  if (power.target === 'single') {
    return livingOpponentsOf(state, active.id)[0]?.id ?? null;
  }
  if (power.target === 'single_ally') {
    return livingAlliesOf(state, active.id)[0]?.id ?? null;
  }
  return null;
}

// Drive a whole battle: each hero uses their first affordable damaging power
// (falling back to any affordable power), enemies act automatically.
function drive(
  seed: number,
  partyIds: string[],
  enemyIds: string[],
  maxRounds = 100
): { state: BattleState; events: BattleEvent[] } {
  const rng = createRng(seed);
  let state = createBattle(partyIds, enemyIds, rng);
  const events: BattleEvent[] = [];
  let steps = 0;

  while (state.phase === 'player_choice' || state.phase === 'enemy_turn') {
    if (++steps > 5000 || state.round > maxRounds) {
      break;
    }

    if (state.phase === 'player_choice') {
      const active = activeCombatant(state)!;
      const affordable = active.powerIds.map(getPower).filter((p) => canAfford(active, p));
      const damaging = affordable.filter((p) => p.base_power > 0);
      const power = damaging[0] ?? affordable[0];
      state = playerAct(state, power.id, targetFor(state, active, power), rng);
    } else {
      state = enemyAct(state, rng);
    }
    events.push(...state.lastEvents);
  }

  return { state, events };
}

describe('createBattle', () => {
  it('builds the full roster and orders the first turn by grace', () => {
    const rng = createRng(1);
    const state = createBattle(['princess', 'cassian', 'idris', 'mira'], ['ghoul', 'ghoul'], rng);
    expect(state.combatants).toHaveLength(6);
    expect(state.order).toHaveLength(6);
    // Party graces beat the ghouls' 5, so a hero acts first.
    const first = getCombatant(state, state.order[0]);
    expect(first.side).toBe('party');
    // Two ghouls get distinct instance ids and A/B names.
    const ghouls = state.combatants.filter((c) => c.sourceId === 'ghoul');
    expect(new Set(ghouls.map((g) => g.id)).size).toBe(2);
    expect(ghouls.map((g) => g.name).sort()).toEqual(['Lil Ghoul A', 'Lil Ghoul B']);
  });

  it('starts every combatant at full HP and full SP', () => {
    const state = createBattle(['princess'], ['ghoul'], createRng(1));
    for (const c of state.combatants) {
      expect(c.hp).toBe(c.maxHp);
      expect(c.sp).toBe(c.maxSp);
    }
  });
});

describe('a winnable fight vs 2 ghouls', () => {
  it('reaches victory', () => {
    const { state } = drive(7, ['princess', 'cassian', 'idris', 'mira'], ['ghoul', 'ghoul']);
    expect(state.phase).toBe('victory');
  });

  it('hitting the ghoul weakness (radiant) reads as a weak hit; physical is resisted', () => {
    const { events } = drive(7, ['princess', 'cassian', 'idris', 'mira'], ['ghoul', 'ghoul']);
    const damage = events.filter((e) => e.kind === 'damage');
    expect(damage.some((e) => e.affinity === 'weak')).toBe(true); // dawnsong, radiant
    expect(damage.some((e) => e.affinity === 'resist')).toBe(true); // cleave, physical
  });
});

describe('a losing fight vs the dragon', () => {
  it('reaches defeat', () => {
    const { state } = drive(3, ['princess', 'cassian', 'idris', 'mira'], ['dragon']);
    expect(state.phase).toBe('defeat');
  });
});

describe('immunity', () => {
  it('the ghost is immune to physical — cleave never lands damage on it', () => {
    const { events } = drive(4, ['cassian'], ['ghost'], 12);
    expect(events.some((e) => e.kind === 'immune')).toBe(true);
    // cassian only has physical -> he can never actually damage the ghost.
    const dmgToGhost = events.filter((e) => e.kind === 'damage' && e.targetId.startsWith('ghost'));
    expect(dmgToGhost).toHaveLength(0);
  });
});

describe('determinism', () => {
  it('same seed + same policy = identical outcome', () => {
    const a = drive(42, ['princess', 'cassian', 'idris', 'mira'], ['ghoul', 'ghoul']);
    const b = drive(42, ['princess', 'cassian', 'idris', 'mira'], ['ghoul', 'ghoul']);
    expect(a.state.phase).toBe(b.state.phase);
    expect(a.state.round).toBe(b.state.round);
    expect(a.state.log.length).toBe(b.state.log.length);
    expect(a.events.length).toBe(b.events.length);
  });
});

describe('turn economy', () => {
  it('a power the caster cannot afford is rejected, not silently free', () => {
    const state = createBattle(['idris'], ['ghoul'], createRng(1));
    const idris = activeCombatant(state)!;
    // Drain SP so nothing is affordable, then confirm playerAct refuses.
    idris.sp = 0;
    expect(() => playerAct(state, 'emberbolt', livingOpponentsOf(state, idris.id)[0].id, createRng(1))).toThrow();
  });
});
