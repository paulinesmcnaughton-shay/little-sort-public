import { Level } from './levels';

const SECONDS_PER_MOVE = 3;

function itemCount(level: Level): number {
  return level.start.reduce((n, shelf) => n + shelf.filter((item) => item !== null).length, 0);
}

// "Par" finish time — scales with the level's difficulty. For classic/daily we use
// the optimal move count (cap minus its buffer); tubes have no cap, so estimate
// from the number of items.
export function parSeconds(level: Level): number {
  const optimal = level.maxMoves ? Math.max(1, level.maxMoves - 2) : Math.round(itemCount(level) * 1.2);
  return Math.max(8, optimal * SECONDS_PER_MOVE);
}

// 3 stars under par, 2 under double par, 1 otherwise. Never fails the player.
export function timeStars(level: Level, seconds: number): number {
  const par = parSeconds(level);
  if (seconds <= par) return 3;
  if (seconds <= par * 2) return 2;
  return 1;
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
