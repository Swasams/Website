import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  activeCombatant,
  canAfford,
  createBattle,
  enemyAct,
  livingAlliesOf,
  livingOpponentsOf,
  playerAct,
  powerNeedsTarget,
} from '../engine/battle';
import { getPower } from '../engine/data';
import { createRng, type RNG } from '../engine/rng';
import type { BattleState, Combatant, Power, TargetKind } from '../engine/types';
import { CombatantCard } from './Combatant';

interface Floater {
  id: number;
  targetId: string;
  text: string;
  kind: string;
}

interface FightDef {
  key: string;
  label: string;
  blurb: string;
  party: string[];
  enemies: string[];
}

const FIGHTS: FightDef[] = [
  {
    key: 'ghouls',
    label: 'Escape attempt — 2 Ghouls',
    blurb: 'Winnable. Ghouls resist steel and dread the light. Try Mira’s Dawnsong.',
    party: ['princess', 'cassian', 'idris', 'mira'],
    enemies: ['ghoul', 'ghoul'],
  },
  {
    key: 'dragon',
    label: 'The Dragon',
    blurb: 'You will lose — for now. It resists fire and steel, and Dragonfire hits everyone.',
    party: ['princess', 'cassian', 'idris', 'mira'],
    enemies: ['dragon'],
  },
];

const TARGET_HINT: Record<TargetKind, string> = {
  single: 'one enemy',
  all_enemies: 'all enemies',
  single_ally: 'one ally',
  all_allies: 'all allies',
};

export function Game() {
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [seed, setSeed] = useState<number>(0);
  const [selectedPower, setSelectedPower] = useState<Power | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const rngRef = useRef<RNG | null>(null);
  const floaterId = useRef(0);

  const spawnFloaters = useCallback((state: BattleState) => {
    if (state.lastEvents.length === 0) {
      return;
    }
    const fresh: Floater[] = state.lastEvents.map((e) => ({
      id: floaterId.current++,
      targetId: e.targetId,
      text: e.text,
      kind: e.kind,
    }));
    setFloaters((prev) => [...prev, ...fresh]);
    const ids = new Set(fresh.map((f) => f.id));
    setTimeout(() => setFloaters((prev) => prev.filter((f) => !ids.has(f.id))), 950);
  }, []);

  const applyTransition = useCallback(
    (next: BattleState) => {
      setBattle(next);
      spawnFloaters(next);
    },
    [spawnFloaters]
  );

  const startFight = useCallback((fight: FightDef) => {
    const s = Date.now() >>> 0;
    const rng = createRng(s);
    rngRef.current = rng;
    setSeed(s);
    setSelectedPower(null);
    setFloaters([]);
    setBattle(createBattle(fight.party, fight.enemies, rng));
  }, []);

  // Enemies act on a short timer so you can read what happens.
  useEffect(() => {
    if (!battle || battle.phase !== 'enemy_turn' || !rngRef.current) {
      return;
    }
    const rng = rngRef.current;
    const timer = setTimeout(() => {
      applyTransition(enemyAct(battle, rng));
    }, 750);
    return () => clearTimeout(timer);
  }, [battle, applyTransition]);

  const active = battle ? activeCombatant(battle) : null;

  const targetableIds = useMemo(() => {
    if (!battle || !active || !selectedPower) {
      return new Set<string>();
    }
    const pool =
      selectedPower.target === 'single'
        ? livingOpponentsOf(battle, active.id)
        : selectedPower.target === 'single_ally'
          ? livingAlliesOf(battle, active.id)
          : [];
    return new Set(pool.map((c) => c.id));
  }, [battle, active, selectedPower]);

  const onPowerClick = useCallback(
    (power: Power) => {
      if (!battle || !active || !rngRef.current) {
        return;
      }
      if (powerNeedsTarget(power)) {
        setSelectedPower((cur) => (cur?.id === power.id ? null : power));
        return;
      }
      // AoE / no explicit target: fire immediately.
      applyTransition(playerAct(battle, power.id, null, rngRef.current));
      setSelectedPower(null);
    },
    [battle, active, applyTransition]
  );

  const onCombatantClick = useCallback(
    (c: Combatant) => {
      if (!battle || !selectedPower || !rngRef.current || !targetableIds.has(c.id)) {
        return;
      }
      applyTransition(playerAct(battle, selectedPower.id, c.id, rngRef.current));
      setSelectedPower(null);
    },
    [battle, selectedPower, targetableIds, applyTransition]
  );

  const floatersFor = useCallback(
    (id: string) => floaters.filter((f) => f.targetId === id),
    [floaters]
  );

  if (!battle) {
    return (
      <div className="dp-root dp-menu">
        <h1 className="dp-title">Escape the Castle</h1>
        <p className="dp-subtitle">Combat vertical slice</p>
        <div className="dp-fight-list">
          {FIGHTS.map((f) => (
            <button key={f.key} type="button" className="dp-fight" onClick={() => startFight(f)}>
              <span className="dp-fight-label">{f.label}</span>
              <span className="dp-fight-blurb">{f.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const party = battle.combatants.filter((c) => c.side === 'party');
  const enemies = battle.combatants.filter((c) => c.side === 'enemy');
  const over = battle.phase === 'victory' || battle.phase === 'defeat';

  return (
    <div className="dp-root">
      <div className="dp-topbar">
        <span>Round {battle.round}</span>
        <span>
          {battle.phase === 'player_choice' && active ? `${active.name}’s turn` : ''}
          {battle.phase === 'enemy_turn' && active ? `${active.name} is acting…` : ''}
        </span>
        <span className="dp-seed">seed {seed}</span>
      </div>

      <div className="dp-field">
        <div className="dp-row dp-enemies">
          {enemies.map((c) => (
            <CombatantCard
              key={c.id}
              combatant={c}
              isActive={c.id === battle.activeId}
              isTargetable={targetableIds.has(c.id)}
              floaters={floatersFor(c.id)}
              onClick={() => onCombatantClick(c)}
            />
          ))}
        </div>

        <div className="dp-row dp-party">
          {party.map((c) => (
            <CombatantCard
              key={c.id}
              combatant={c}
              isActive={c.id === battle.activeId}
              isTargetable={targetableIds.has(c.id)}
              floaters={floatersFor(c.id)}
              onClick={() => onCombatantClick(c)}
            />
          ))}
        </div>
      </div>

      <div className="dp-controls">
        {battle.phase === 'player_choice' && active ? (
          <div className="dp-actions">
            {active.powerIds.map((pid) => {
              const power = getPower(pid);
              const affordable = canAfford(active, power);
              const selected = selectedPower?.id === power.id;
              return (
                <button
                  key={pid}
                  type="button"
                  className={`dp-power ${selected ? 'is-selected' : ''}`}
                  disabled={!affordable}
                  onClick={() => onPowerClick(power)}
                  title={power.description}
                >
                  <span className="dp-power-name">{power.name}</span>
                  <span className="dp-power-meta">
                    {power.sp_cost} SP · {TARGET_HINT[power.target]}
                  </span>
                </button>
              );
            })}
            {selectedPower && powerNeedsTarget(selectedPower) ? (
              <div className="dp-target-hint">Pick a target for {selectedPower.name} (or click it again to cancel).</div>
            ) : null}
          </div>
        ) : null}
        {battle.phase === 'enemy_turn' ? <div className="dp-waiting">…</div> : null}
      </div>

      <div className="dp-log">
        {battle.log.slice(-6).map((l, i) => (
          <div key={battle.log.length - 6 + i} className="dp-log-line">
            {l.text}
          </div>
        ))}
      </div>

      {over ? (
        <div className={`dp-overlay dp-${battle.phase}`}>
          <div className="dp-overlay-card">
            <h2>{battle.phase === 'victory' ? 'Victory' : 'Defeat'}</h2>
            <p>
              {battle.phase === 'victory'
                ? 'You cut a path deeper into the dark.'
                : 'The dragon drags you back to the top. (The run-reset loop comes later.)'}
            </p>
            <button type="button" className="dp-btn" onClick={() => setBattle(null)}>
              Back to menu
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
