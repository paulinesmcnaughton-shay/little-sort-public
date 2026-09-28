// ─────────────────────────────────────────────────────────────────────────────
// LOCKED — Match It board layout. Do NOT change the formula or make the column
// count depend on the measured height/area, and do NOT vary it per user (free vs
// paid). Columns derive ONLY from the stable screen width; height is used solely
// to shrink the cell so all rows still fit on small screens. Deriving columns from
// height reintroduces the "dropped column on reload" bug. Covered by
// tests/match-layout.test.ts — those tests must keep passing.
// ─────────────────────────────────────────────────────────────────────────────

export const MATCH_GAP = 1; // px between cells
export const MATCH_ROWS = 10; // fixed row count
export const MATCH_BOTTOM_INSET = 16; // keep clear of the iOS home-swipe bar
const MIN_COLS = 5;
const MAX_COLS = 8;
const TARGET_CELL = 54; // aim for ~54px gems
const MIN_CELL = 24;

// Column count — a pure function of width only. Stable across layout passes and
// identical for every user.
export function matchColumns(boardW: number): number {
  return Math.max(MIN_COLS, Math.min(MAX_COLS, Math.round(boardW / TARGET_CELL)));
}

export function matchLayout({ boardW, areaH }: { boardW: number; areaH: number | null }): MatchLayout {
  const cols = matchColumns(boardW);
  const widthCell = Math.floor((boardW - MATCH_GAP * (cols - 1)) / cols);
  if (areaH === null) return { cols, rows: MATCH_ROWS, cell: widthCell };
  const availH = areaH - MATCH_BOTTOM_INSET;
  const heightCell = Math.floor((availH - MATCH_GAP * (MATCH_ROWS - 1)) / MATCH_ROWS);
  return { cols, rows: MATCH_ROWS, cell: Math.max(MIN_CELL, Math.min(widthCell, heightCell)) };
}

export type MatchLayout = { cols: number; rows: number; cell: number };
