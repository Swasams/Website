// Full battle state machine: start, take an action, advance the turn, check end
// state. Pure and deterministic given the RNG passed in. The RNG is stateful
// (a closure) and lives outside the state, so a single rng instance threads
// through every call of one battle; state itself is cloned per transition.

import { CHARACTERS, ENEMIES, POWERS, TUNING, getCharacter, getEnemy, getPower } from './data';
import { computeDamage, isHeal } from './damage';
import { cosmeticFor } from './cosmetics';
import { pick, type RNG } from './rng';
import { buildTurnOrder, hasStatus } from './turnOrder';
import type { BattleState, Combatant, Power, StatKey, StatusEffect } from './types';

// ---- construction ----

function maxSpFor(resolve: number): number {
  return TUNING.STARTING_SP + resolve * TUNING.SP_PER_RESOLVE;
}

function partyCombatant(charId: string): Combatant {
  const c = getCharacter(charId);
  const stats: Record<StatKey, number> = {
    strength: c.strength,
    arcana: c.arcana,
    grace: c.grace,
    charisma: c.charisma,
    resolve: c.resolve,
    intuition: c.intuition,
  };
  const cos = cosmeticFor(c.id);
  const maxSp = maxSpFor(c.resolve);
  // Combat sandbox: give each hero every power they own so the fight exercises
  // AoE / status / heal. The run loop will gate the bond-locked ones later.
  const powerIds = POWERS.filter((p) => p.owner_id === c.id).map((p) => p.id);
  return {
    id: c.id,
    sourceId: c.id,
    name: c.name,
    side: 'party',
    emoji: cos.emoji,
    color: cos.color,
    hp: c.max_hp,
    maxHp: c.max_hp,
    sp: maxSp,
    maxSp,
    stats,
    weakTo: [],
    resists: [],
    immuneTo: [],
    statuses: [],
    powerIds,
  };
}

function enemyCombatant(enemyId: string, instanceIndex: number): Combatant {
  const e = getEnemy(enemyId);
  const stats: Record<StatKey, number> = {
    strength: e.strength,
    arcana: e.arcana,
    grace: e.grace,
    charisma: 0,
    resolve: e.resolve,
    intuition: 0,
  };
  const cos = cosmeticFor(e.id);
  const maxSp = maxSpFor(e.resolve);
  return {
    id: `${e.id}#${instanceIndex}`,
    sourceId: e.id,
    name: e.name,
    side: 'enemy',
    emoji: cos.emoji,
    color: cos.color,
    hp: e.max_hp,
    maxHp: e.max_hp,
    sp: maxSp,
    maxSp,
    stats,
    weakTo: e.weak_to,
    resists: e.resists,
    immuneTo: e.immune_to,
    statuses: [],
    powerIds: e.power_ids,
  };
}

// ---- selectors (used by the UI; no rules mutation) ----

export function getCombatant(state: BattleState, id: string): Combatant {
  const c = state.combatants.find((x) => x.id === id);
  if (!c) {
    throw new Error(`getCombatant: no combatant "${id}"`);
  }
  return c;
}

export function activeCombatant(state: BattleState): Combatant | null {
  return state.activeId ? getCombatant(state, state.activeId) : null;
}

export function livingOpponentsOf(state: BattleState, id: string): Combatant[] {
  const me = getCombatant(state, id);
  return state.combatants.filter((c) => c.hp > 0 && c.side !== me.side);
}

export function livingAlliesOf(state: BattleState, id: string): Combatant[] {
  const me = getCombatant(state, id);
  return state.combatants.filter((c) => c.hp > 0 && c.side === me.side);
}

export function canAfford(caster: Combatant, power: Power): boolean {
  return caster.sp >= power.sp_cost;
}

export function powerNeedsTarget(power: Power): boolean {
  return power.target === 'single' || power.target === 'single_ally';
}

// ---- internal helpers ----

function cloneState(state: BattleState): BattleState {
  // No functions/undefined-carrying cycles in state, so a structural clone is
  // safe and keeps transitions free of shared-reference bugs.
  return JSON.parse(JSON.stringify(state)) as BattleState;
}

function log(state: BattleState, text: string): void {
  state.log.push({ round: state.round, text });
}

function applyStatus(target: Combatant, effect: StatusEffect, turns: number): void {
  const existing = target.statuses.find((s) => s.effect === effect);
  if (existing) {
    existing.turnsRemaining = turns; // refresh
  } else {
    target.statuses.push({ effect, turnsRemaining: turns });
  }
}

function checkEnd(state: BattleState): boolean {
  const enemiesAlive = state.combatants.some((c) => c.side === 'enemy' && c.hp > 0);
  const partyAlive = state.combatants.some((c) => c.side === 'party' && c.hp > 0);

  if (!enemiesAlive) {
    state.phase = 'victory';
    state.activeId = null;
    log(state, 'Victory! The enemies are down.');
    return true;
  }

  if (!partyAlive) {
    state.phase = 'defeat';
    state.activeId = null;
    log(state, 'Defeat. The party has fallen.');
    return true;
  }

  return false;
}

function resolveTargets(
  state: BattleState,
  caster: Combatant,
  power: Power,
  chosenTargetId: string | null
): string[] {
  const opponents = livingOpponentsOf(state, caster.id).map((c) => c.id);
  const allies = livingAlliesOf(state, caster.id).map((c) => c.id);

  switch (power.target) {
    case 'all_enemies':
      return opponents;
    case 'all_allies':
      return allies;
    case 'single':
      if (chosenTargetId && opponents.includes(chosenTargetId)) {
        return [chosenTargetId];
      }
      return [];
    case 'single_ally':
      if (chosenTargetId && allies.includes(chosenTargetId)) {
        return [chosenTargetId];
      }
      return [];
  }
}

function chooseEnemyTargets(
  state: BattleState,
  caster: Combatant,
  power: Power,
  rng: RNG
): string[] {
  const opponents = livingOpponentsOf(state, caster.id).map((c) => c.id);
  const allies = livingAlliesOf(state, caster.id).map((c) => c.id);

  switch (power.target) {
    case 'all_enemies':
      return opponents;
    case 'all_allies':
      return allies;
    case 'single':
      return opponents.length ? [pick(rng, opponents)] : [];
    case 'single_ally':
      return allies.length ? [pick(rng, allies)] : [];
  }
}

// Apply one power from caster to a resolved set of targets. Mutates state,
// pushes UI events, writes log lines. RNG draw order per target is fixed:
// dodge -> damage variance -> status resist.
function applyPower(
  state: BattleState,
  caster: Combatant,
  power: Power,
  targetIds: string[],
  rng: RNG
): void {
  caster.sp -= power.sp_cost;
  log(state, `${caster.name} uses ${power.name}.`);

  for (const targetId of targetIds) {
    const target = getCombatant(state, targetId);
    if (target.hp <= 0) {
      continue;
    }

    if (isHeal(power)) {
      const result = computeDamage(power, caster.stats, target, TUNING, rng);
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + result.amount);
      const healed = target.hp - before;
      state.lastEvents.push({
        kind: 'heal',
        targetId,
        amount: healed,
        text: `+${healed}`,
      });
      log(state, `${target.name} recovers ${healed} HP.`);
      continue;
    }

    // Dodge (uses base grace so it stays readable).
    const dodgeChance = target.stats.grace * TUNING.DODGE_PER_GRACE;
    if (rng() < dodgeChance) {
      state.lastEvents.push({ kind: 'miss', targetId, text: 'dodge' });
      log(state, `${target.name} dodges.`);
      continue;
    }

    const result = computeDamage(power, caster.stats, target, TUNING, rng);
    if (result.affinity === 'immune' || result.amount === 0) {
      state.lastEvents.push({
        kind: 'immune',
        targetId,
        damageType: power.damage_type,
        affinity: result.affinity,
        text: 'immune',
      });
      log(state, `${target.name} is immune.`);
    } else {
      target.hp = Math.max(0, target.hp - result.amount);
      state.lastEvents.push({
        kind: 'damage',
        targetId,
        amount: result.amount,
        damageType: power.damage_type,
        affinity: result.affinity,
        text: result.affinity === 'weak' ? `${result.amount}!` : `${result.amount}`,
      });
      const tag = result.affinity === 'weak' ? ' (weak!)' : result.affinity === 'resist' ? ' (resisted)' : '';
      log(state, `${target.name} takes ${result.amount} damage${tag}.`);
    }

    // Status application on a hit that landed and left the target alive.
    if (power.status_effect && target.hp > 0) {
      const resistChance = target.stats.resolve * TUNING.STATUS_RESIST_PER_RESOLVE;
      if (rng() < resistChance) {
        state.lastEvents.push({
          kind: 'status_resisted',
          targetId,
          status: power.status_effect,
          text: `resist ${power.status_effect}`,
        });
        log(state, `${target.name} shrugs off ${power.status_effect}.`);
      } else {
        applyStatus(target, power.status_effect, power.status_turns);
        state.lastEvents.push({
          kind: 'status_applied',
          targetId,
          status: power.status_effect,
          text: power.status_effect,
        });
        log(state, `${target.name} is afflicted with ${power.status_effect}.`);
      }
    }
  }
}

// Start-of-turn upkeep for one actor: SP regen, burn tick, fear roll, then
// status countdown. Returns whether the actor is fear-skipped this turn.
function startOfTurn(state: BattleState, actor: Combatant, rng: RNG): { skipped: boolean } {
  actor.sp = Math.min(actor.maxSp, actor.sp + TUNING.SP_REGEN_PER_TURN);

  if (hasStatus(actor, 'burn')) {
    const dmg = TUNING.BURN_DAMAGE_PER_TURN;
    actor.hp = Math.max(0, actor.hp - dmg);
    state.lastEvents.push({
      kind: 'status_tick',
      targetId: actor.id,
      amount: dmg,
      status: 'burn',
      damageType: 'fire',
      text: `${dmg}`,
    });
    log(state, `${actor.name} takes ${dmg} burn damage.`);
  }

  let skipped = false;
  if (actor.hp > 0 && hasStatus(actor, 'fear')) {
    if (rng() < TUNING.FEAR_SKIP_CHANCE) {
      skipped = true;
    }
  }

  // Countdown after this turn's effects have been felt.
  actor.statuses = actor.statuses
    .map((s) => ({ effect: s.effect, turnsRemaining: s.turnsRemaining - 1 }))
    .filter((s) => s.turnsRemaining > 0);

  if (skipped) {
    state.lastEvents.push({ kind: 'skip', targetId: actor.id, text: 'frozen in fear' });
    log(state, `${actor.name} is too afraid to act.`);
  }

  return { skipped };
}

// Advance until we land on a living actor who must choose, or the battle ends.
function advance(state: BattleState, rng: RNG): void {
  let guard = 0;
  while (true) {
    if (++guard > 10000) {
      throw new Error('advance: turn loop failed to terminate');
    }

    state.turnIndex += 1;
    if (state.turnIndex >= state.order.length) {
      state.round += 1;
      state.order = buildTurnOrder(state.combatants, TUNING);
      state.turnIndex = 0;
      if (state.order.length === 0) {
        checkEnd(state);
        return;
      }
    }

    const actor = state.combatants.find((c) => c.id === state.order[state.turnIndex]);
    if (!actor || actor.hp <= 0) {
      continue; // died earlier this round
    }

    const { skipped } = startOfTurn(state, actor, rng);
    if (checkEnd(state)) {
      return;
    }
    if (actor.hp <= 0 || skipped) {
      continue;
    }

    state.activeId = actor.id;
    state.phase = actor.side === 'party' ? 'player_choice' : 'enemy_turn';
    return;
  }
}

// ---- public transitions ----

export function createBattle(partyIds: string[], enemyIds: string[], rng: RNG): BattleState {
  const party = partyIds.map(partyCombatant);

  const totalPer: Record<string, number> = {};
  for (const id of enemyIds) {
    totalPer[id] = (totalPer[id] ?? 0) + 1;
  }
  const seen: Record<string, number> = {};
  const enemies = enemyIds.map((id, i) => {
    const c = enemyCombatant(id, i);
    if (totalPer[id] > 1) {
      seen[id] = (seen[id] ?? 0) + 1;
      c.name = `${c.name} ${String.fromCharCode(64 + seen[id])}`; // A, B, C...
    }
    return c;
  });

  const combatants = [...party, ...enemies];
  const state: BattleState = {
    round: 1,
    order: buildTurnOrder(combatants, TUNING),
    turnIndex: -1,
    activeId: null,
    combatants,
    phase: 'player_choice',
    log: [{ round: 1, text: 'The battle begins.' }],
    lastEvents: [],
  };

  advance(state, rng);
  return state;
}

export function playerAct(
  state: BattleState,
  powerId: string,
  targetId: string | null,
  rng: RNG
): BattleState {
  if (state.phase !== 'player_choice') {
    throw new Error(`playerAct called during phase "${state.phase}"`);
  }

  const next = cloneState(state);
  next.lastEvents = [];
  const caster = activeCombatant(next);
  if (!caster) {
    throw new Error('playerAct: no active combatant');
  }

  const power = getPower(powerId);
  if (!caster.powerIds.includes(powerId)) {
    throw new Error(`${caster.name} does not know ${powerId}`);
  }
  if (!canAfford(caster, power)) {
    throw new Error(`${caster.name} cannot afford ${power.name}`);
  }

  const targets = resolveTargets(next, caster, power, targetId);
  if (targets.length === 0) {
    throw new Error(`${power.name} has no valid target`);
  }

  applyPower(next, caster, power, targets, rng);
  if (!checkEnd(next)) {
    advance(next, rng);
  }
  return next;
}

export function enemyAct(state: BattleState, rng: RNG): BattleState {
  if (state.phase !== 'enemy_turn') {
    throw new Error(`enemyAct called during phase "${state.phase}"`);
  }

  const next = cloneState(state);
  next.lastEvents = [];
  const caster = activeCombatant(next);
  if (!caster) {
    throw new Error('enemyAct: no active combatant');
  }

  const usable = caster.powerIds.map(getPower).filter((p) => canAfford(caster, p));
  if (usable.length > 0) {
    const power = pick(rng, usable);
    const targets = chooseEnemyTargets(next, caster, power, rng);
    if (targets.length > 0) {
      applyPower(next, caster, power, targets, rng);
    } else {
      log(next, `${caster.name} has no target.`);
    }
  } else {
    log(next, `${caster.name} hesitates.`);
  }

  if (!checkEnd(next)) {
    advance(next, rng);
  }
  return next;
}

// Convenience for standard fights the playtest uses.
export const PARTY_IDS = CHARACTERS.map((c) => c.id);
export const ENEMY_IDS = ENEMIES.map((e) => e.id);
