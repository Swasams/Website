// Loads and validates the JSON content at module init. Throws loudly with a
// precise path (e.g. `powers[3].base_power`) on any mismatch, so a bad CSV
// export fails immediately instead of corrupting a battle silently.

import charactersJson from '../data/characters.json';
import powersJson from '../data/powers.json';
import enemiesJson from '../data/enemies.json';
import tuningJson from '../data/tuning.json';
import type {
  Character,
  DamageType,
  Enemy,
  Power,
  StatKey,
  StatusEffect,
  TargetKind,
  Tuning,
} from './types';

const STAT_KEYS: StatKey[] = [
  'strength',
  'arcana',
  'grace',
  'charisma',
  'resolve',
  'intuition',
];
const DAMAGE_TYPES: DamageType[] = [
  'physical',
  'fire',
  'frost',
  'radiant',
  'none',
];
const STATUS_EFFECTS: StatusEffect[] = ['burn', 'slow', 'fear'];
const TARGET_KINDS: TargetKind[] = [
  'single',
  'all_enemies',
  'single_ally',
  'all_allies',
];

class DataError extends Error {
  constructor(message: string) {
    super(`[escape-the-castle data] ${message}`);
    this.name = 'DataError';
  }
}

function req(cond: boolean, path: string, expected: string): void {
  if (!cond) {
    throw new DataError(`${path}: expected ${expected}`);
  }
}

function num(v: unknown, path: string): number {
  req(typeof v === 'number' && Number.isFinite(v), path, 'a finite number');
  return v as number;
}

function str(v: unknown, path: string): string {
  req(typeof v === 'string' && v.length > 0, path, 'a non-empty string');
  return v as string;
}

function oneOf<T extends string>(v: unknown, allowed: T[], path: string): T {
  req(
    typeof v === 'string' && (allowed as string[]).includes(v),
    path,
    `one of [${allowed.join(', ')}]`
  );
  return v as T;
}

function damageTypeArray(v: unknown, path: string): DamageType[] {
  req(Array.isArray(v), path, 'an array of damage types');
  return (v as unknown[]).map((t, i) => oneOf(t, DAMAGE_TYPES, `${path}[${i}]`));
}

// ---- validators ----

function validateTuning(raw: unknown): Tuning {
  req(typeof raw === 'object' && raw !== null, 'tuning', 'an object');
  const t = raw as Record<string, unknown>;
  const keys: (keyof Tuning)[] = [
    'STAT_SCALING_DIVISOR',
    'MULT_WEAK',
    'MULT_NEUTRAL',
    'MULT_RESIST',
    'MULT_IMMUNE',
    'VARIANCE_MIN',
    'VARIANCE_MAX',
    'PARTY_SIZE',
    'MAX_ENEMIES',
    'STARTING_SP',
    'SP_REGEN_PER_TURN',
    'SP_PER_RESOLVE',
    'STATUS_RESIST_PER_RESOLVE',
    'DODGE_PER_GRACE',
    'SLOW_GRACE_MULTIPLIER',
    'FEAR_SKIP_CHANCE',
    'BURN_DAMAGE_PER_TURN',
  ];
  const out = {} as Tuning;
  for (const k of keys) {
    (out[k] as number) = num(t[k], `tuning.${k}`);
  }
  out.HEAL_SCALING_STAT = oneOf(
    t.HEAL_SCALING_STAT,
    STAT_KEYS,
    'tuning.HEAL_SCALING_STAT'
  );
  return out;
}

function validateCharacter(raw: unknown, i: number): Character {
  const p = `characters[${i}]`;
  req(typeof raw === 'object' && raw !== null, p, 'an object');
  const c = raw as Record<string, unknown>;
  const out: Character = {
    id: str(c.id, `${p}.id`),
    name: str(c.name, `${p}.name`),
    role: str(c.role, `${p}.role`),
    description: str(c.description, `${p}.description`),
    max_hp: num(c.max_hp, `${p}.max_hp`),
    strength: num(c.strength, `${p}.strength`),
    arcana: num(c.arcana, `${p}.arcana`),
    grace: num(c.grace, `${p}.grace`),
    charisma: num(c.charisma, `${p}.charisma`),
    resolve: num(c.resolve, `${p}.resolve`),
    intuition: num(c.intuition, `${p}.intuition`),
    starting_power_id: str(c.starting_power_id, `${p}.starting_power_id`),
  };
  return out;
}

function validatePower(raw: unknown, i: number): Power {
  const p = `powers[${i}]`;
  req(typeof raw === 'object' && raw !== null, p, 'an object');
  const w = raw as Record<string, unknown>;
  return {
    id: str(w.id, `${p}.id`),
    name: str(w.name, `${p}.name`),
    owner_id: str(w.owner_id, `${p}.owner_id`),
    damage_type: oneOf(w.damage_type, DAMAGE_TYPES, `${p}.damage_type`),
    scaling_stat: oneOf(w.scaling_stat, STAT_KEYS, `${p}.scaling_stat`),
    base_power: num(w.base_power, `${p}.base_power`),
    sp_cost: num(w.sp_cost, `${p}.sp_cost`),
    target: oneOf(w.target, TARGET_KINDS, `${p}.target`),
    status_effect:
      w.status_effect === null
        ? null
        : oneOf(w.status_effect, STATUS_EFFECTS, `${p}.status_effect`),
    status_turns: num(w.status_turns, `${p}.status_turns`),
    description: str(w.description, `${p}.description`),
  };
}

function validateEnemy(raw: unknown, i: number): Enemy {
  const p = `enemies[${i}]`;
  req(typeof raw === 'object' && raw !== null, p, 'an object');
  const e = raw as Record<string, unknown>;
  req(
    Array.isArray(e.floor_range) && e.floor_range.length === 2,
    `${p}.floor_range`,
    'a [min, max] tuple'
  );
  const fr = e.floor_range as unknown[];
  req(
    Array.isArray(e.power_ids) && e.power_ids.length > 0,
    `${p}.power_ids`,
    'a non-empty array'
  );
  return {
    id: str(e.id, `${p}.id`),
    name: str(e.name, `${p}.name`),
    tier: str(e.tier, `${p}.tier`),
    max_hp: num(e.max_hp, `${p}.max_hp`),
    strength: num(e.strength, `${p}.strength`),
    arcana: num(e.arcana, `${p}.arcana`),
    grace: num(e.grace, `${p}.grace`),
    resolve: num(e.resolve, `${p}.resolve`),
    weak_to: damageTypeArray(e.weak_to, `${p}.weak_to`),
    resists: damageTypeArray(e.resists, `${p}.resists`),
    immune_to: damageTypeArray(e.immune_to, `${p}.immune_to`),
    power_ids: (e.power_ids as unknown[]).map((id, j) =>
      str(id, `${p}.power_ids[${j}]`)
    ),
    floor_range: [num(fr[0], `${p}.floor_range[0]`), num(fr[1], `${p}.floor_range[1]`)],
  };
}

// ---- load + cross-reference ----

function build() {
  const tuning = validateTuning(tuningJson);
  const characters = (charactersJson as unknown[]).map(validateCharacter);
  const powers = (powersJson as unknown[]).map(validatePower);
  const enemies = (enemiesJson as unknown[]).map(validateEnemy);

  const powerById = new Map(powers.map((p) => [p.id, p]));
  const characterById = new Map(characters.map((c) => [c.id, c]));
  const enemyById = new Map(enemies.map((e) => [e.id, e]));

  req(powerById.size === powers.length, 'powers', 'unique ids');
  req(characterById.size === characters.length, 'characters', 'unique ids');
  req(enemyById.size === enemies.length, 'enemies', 'unique ids');

  // Referential integrity — every id a battle will dereference must exist.
  characters.forEach((c, i) => {
    req(
      powerById.has(c.starting_power_id),
      `characters[${i}].starting_power_id`,
      `a known power id (got "${c.starting_power_id}")`
    );
  });
  enemies.forEach((e, i) => {
    e.power_ids.forEach((id, j) => {
      req(
        powerById.has(id),
        `enemies[${i}].power_ids[${j}]`,
        `a known power id (got "${id}")`
      );
    });
  });

  return { tuning, characters, powers, enemies, powerById, characterById, enemyById };
}

const content = build();

export const TUNING = content.tuning;
export const CHARACTERS = content.characters;
export const POWERS = content.powers;
export const ENEMIES = content.enemies;

export function getPower(id: string): Power {
  const p = content.powerById.get(id);
  if (!p) {
    throw new DataError(`getPower: no power "${id}"`);
  }
  return p;
}

export function getCharacter(id: string): Character {
  const c = content.characterById.get(id);
  if (!c) {
    throw new DataError(`getCharacter: no character "${id}"`);
  }
  return c;
}

export function getEnemy(id: string): Enemy {
  const e = content.enemyById.get(id);
  if (!e) {
    throw new DataError(`getEnemy: no enemy "${id}"`);
  }
  return e;
}
