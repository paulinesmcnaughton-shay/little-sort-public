import { Level, ShelfLayout } from './levels';
import { canMoveItem, isLevelComplete, moveItem, SlotPosition } from './logic';
import { applyMoveTube, canPourTube, isTubeSolved, tubeTop } from './tubes';

export type GameMode = 'classic' | 'tubes';

// A ruleset captures the mode-specific play rules so the UI (GameplayScreen,
// Shelf) can stay identical across modes.
//   select   — given a tapped slot, what should become selected (or null)
//   canMove  — can the current selection move to the tapped position
//   applyMove/isComplete — perform the move / check the win
export interface Ruleset {
  mode: GameMode;
  select(layout: ShelfLayout, tapped: SlotPosition): SlotPosition | null;
  canMove(layout: ShelfLayout, from: SlotPosition, to: SlotPosition): boolean;
  applyMove(layout: ShelfLayout, from: SlotPosition, to: SlotPosition): ShelfLayout;
  isComplete(layout: ShelfLayout, level: Level): boolean;
}

// Free placement: tap any item, then any empty slot.
export const classicRuleset: Ruleset = {
  mode: 'classic',
  select: (layout, tapped) => (layout[tapped.shelf]?.[tapped.slot] != null ? tapped : null),
  canMove: canMoveItem,
  applyMove: moveItem,
  isComplete: isLevelComplete,
};

// Stack tubes: tap a tube (selects its top), then a tube to drop it on.
export const tubesRuleset: Ruleset = {
  mode: 'tubes',
  select: (layout, tapped) => (isTubeSolved(layout[tapped.shelf]) ? null : tubeTop(layout, tapped.shelf)),
  canMove: (layout, from, to) => canPourTube(layout, from.shelf, to.shelf),
  applyMove: (layout, from, to) => applyMoveTube(layout, from.shelf, to.shelf),
  isComplete: isLevelComplete,
};

const RULESETS: Record<GameMode, Ruleset> = {
  classic: classicRuleset,
  tubes: tubesRuleset,
};

export function getRuleset(mode: GameMode = 'classic'): Ruleset {
  return RULESETS[mode] ?? classicRuleset;
}
