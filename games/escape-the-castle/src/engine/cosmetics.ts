// Placeholder art only: one emoji + a rectangle colour per combatant, keyed by
// its data id. Real art replaces this later; nothing here affects the rules.

export interface Cosmetic {
  emoji: string;
  color: string;
}

const COSMETICS: Record<string, Cosmetic> = {
  // party
  princess: { emoji: '👑', color: '#c04a8f' },
  cassian: { emoji: '🗡️', color: '#3a6ea5' },
  idris: { emoji: '🔥', color: '#b5532a' },
  mira: { emoji: '✨', color: '#4a9d7f' },
  // enemies
  ghoul: { emoji: '🧟', color: '#6b7d4a' },
  ghost: { emoji: '👻', color: '#8a8ab0' },
  goblin: { emoji: '👺', color: '#7a8a3a' },
  goblin_king: { emoji: '👹', color: '#9a5a2a' },
  dragon: { emoji: '🐉', color: '#8a2a3a' },
};

const FALLBACK: Cosmetic = { emoji: '⬛', color: '#555' };

export function cosmeticFor(sourceId: string): Cosmetic {
  return COSMETICS[sourceId] ?? FALLBACK;
}
