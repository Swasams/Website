// Pure engine types. Zero React, zero DOM.

export type StatKey =
  | 'strength'
  | 'arcana'
  | 'grace'
  | 'charisma'
  | 'resolve'
  | 'intuition';

export type DamageType = 'physical' | 'fire' | 'frost' | 'radiant' | 'none';

export type StatusEffect = 'burn' | 'slow' | 'fear';

export type TargetKind =
  | 'single' // one opponent
  | 'all_enemies' // every opponent
  | 'single_ally' // one ally (self included)
  | 'all_allies'; // every ally

export type Affinity = 'weak' | 'neutral' | 'resist' | 'immune';

export type Side = 'party' | 'enemy';

// ---- Content (loaded from src/data/*.json) ----

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  max_hp: number;
  strength: number;
  arcana: number;
  grace: number;
  charisma: number;
  resolve: number;
  intuition: number;
  starting_power_id: string;
}

export interface Power {
  id: string;
  name: string;
  owner_id: string;
  damage_type: DamageType;
  scaling_stat: StatKey;
  base_power: number; // negative = healing
  sp_cost: number;
  target: TargetKind;
  status_effect: StatusEffect | null;
  status_turns: number;
  description: string;
}

export interface Enemy {
  id: string;
  name: string;
  tier: string;
  max_hp: number;
  strength: number;
  arcana: number;
  grace: number;
  resolve: number;
  weak_to: DamageType[];
  resists: DamageType[];
  immune_to: DamageType[];
  power_ids: string[];
  floor_range: [number, number];
}

export interface Tuning {
  STAT_SCALING_DIVISOR: number;
  MULT_WEAK: number;
  MULT_NEUTRAL: number;
  MULT_RESIST: number;
  MULT_IMMUNE: number;
  VARIANCE_MIN: number;
  VARIANCE_MAX: number;
  PARTY_SIZE: number;
  MAX_ENEMIES: number;
  STARTING_SP: number;
  SP_REGEN_PER_TURN: number;
  SP_PER_RESOLVE: number;
  STATUS_RESIST_PER_RESOLVE: number;
  DODGE_PER_GRACE: number;
  HEAL_SCALING_STAT: StatKey;
  // Magnitudes the source spreadsheet did not specify — invented, tune freely.
  SLOW_GRACE_MULTIPLIER: number;
  FEAR_SKIP_CHANCE: number;
  BURN_DAMAGE_PER_TURN: number;
}

// ---- Runtime combat state ----

export interface ActiveStatus {
  effect: StatusEffect;
  turnsRemaining: number;
}

export interface Combatant {
  id: string; // unique instance id (e.g. "ghoul#1")
  sourceId: string; // character or enemy id in the data files
  name: string;
  side: Side;
  emoji: string;
  color: string;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  stats: Record<StatKey, number>;
  weakTo: DamageType[];
  resists: DamageType[];
  immuneTo: DamageType[];
  statuses: ActiveStatus[];
  powerIds: string[];
}

export type BattlePhase =
  | 'player_choice'
  | 'enemy_turn'
  | 'victory'
  | 'defeat';

// A discrete thing that happened, for the UI to render (floating numbers, log).
export type BattleEventKind =
  | 'damage'
  | 'heal'
  | 'miss'
  | 'immune'
  | 'status_applied'
  | 'status_resisted'
  | 'status_tick'
  | 'skip';

export interface BattleEvent {
  kind: BattleEventKind;
  targetId: string;
  amount?: number;
  damageType?: DamageType;
  affinity?: Affinity;
  status?: StatusEffect;
  text: string;
}

export interface LogEntry {
  round: number;
  text: string;
}

export interface BattleState {
  round: number;
  order: string[]; // combatant ids in turn order for this round
  turnIndex: number;
  activeId: string | null;
  combatants: Combatant[];
  phase: BattlePhase;
  log: LogEntry[];
  lastEvents: BattleEvent[]; // events from the most recent action, for the UI
}
