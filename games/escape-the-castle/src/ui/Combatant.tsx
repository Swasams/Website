import type { CSSProperties } from 'react';
import type { Combatant, StatusEffect } from '../engine/types';

const STATUS_ICON: Record<StatusEffect, string> = {
  burn: '🔥',
  slow: '🐌',
  fear: '😨',
};

interface Floater {
  id: number;
  text: string;
  kind: string;
}

interface Props {
  combatant: Combatant;
  isActive: boolean;
  isTargetable: boolean;
  floaters: Floater[];
  onClick: () => void;
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`dp-bar ${className}`}>
      <div className="dp-bar-fill" style={{ width: `${pct}%` }} />
      <span className="dp-bar-label">
        {Math.max(0, Math.round(value))}/{max}
      </span>
    </div>
  );
}

export function CombatantCard({ combatant, isActive, isTargetable, floaters, onClick }: Props) {
  const dead = combatant.hp <= 0;
  const classes = [
    'dp-combatant',
    dead ? 'is-dead' : '',
    isActive ? 'is-active' : '',
    isTargetable ? 'is-targetable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={{ '--dp-color': combatant.color } as CSSProperties}
      onClick={onClick}
      disabled={!isTargetable}
      aria-label={combatant.name}
    >
      <div className="dp-floaters">
        {floaters.map((f) => (
          <span key={f.id} className={`dp-floater dp-floater-${f.kind}`}>
            {f.text}
          </span>
        ))}
      </div>

      <div className="dp-emoji">{combatant.emoji}</div>
      <div className="dp-name">{combatant.name}</div>

      <Bar value={combatant.hp} max={combatant.maxHp} className="dp-hp" />
      <Bar value={combatant.sp} max={combatant.maxSp} className="dp-sp" />

      <div className="dp-statuses">
        {combatant.statuses.map((s) => (
          <span key={s.effect} className="dp-status" title={`${s.effect} (${s.turnsRemaining})`}>
            {STATUS_ICON[s.effect]}
            <sub>{s.turnsRemaining}</sub>
          </span>
        ))}
      </div>
    </button>
  );
}
