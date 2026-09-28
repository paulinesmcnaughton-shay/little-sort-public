// Match-3 engine (Candy-Crush style). Pure-ish helpers; the screen drives the
// cascade loop so it can animate each step. Tiles carry a stable `id` so the UI
// can animate a tile falling to a new cell instead of swapping content.

export type TileKind = 'rainbow' | 'block';
export type Tile = { id: number; color: number; kind?: TileKind; hp?: number };
export type Cell = Tile | null;
export type Board = Cell[][]; // board[row][col]
export type Pos = { r: number; c: number };

export const RAINBOW_COLOR = -1; // sentinel — rainbow tiles never match by colour
export const BLOCK_COLOR = -2; // sentinel — blocker crates never match by colour
export const BLOCK_HP = 2; // adjacent clears needed to break a crate

let nextTileId = 1;
function makeTile(color: number): Tile {
  return { id: nextTileId++, color };
}

function makeRainbow(): Tile {
  return { id: nextTileId++, color: RAINBOW_COLOR, kind: 'rainbow' };
}

function makeBlock(): Tile {
  return { id: nextTileId++, color: BLOCK_COLOR, kind: 'block', hp: BLOCK_HP };
}

function randomColor(colors: number): number {
  return Math.floor(Math.random() * colors);
}

// Build a full board with no pre-existing matches, so the first move is the player's.
export function createBoard({ rows, cols, colors }: { rows: number; cols: number; colors: number }): Board {
  const board: Board = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      let color = randomColor(colors);
      // avoid making a 3-in-a-row on the way down/right
      while ((c >= 2 && row[c - 1]?.color === color && row[c - 2]?.color === color) || (r >= 2 && board[r - 1][c]?.color === color && board[r - 2][c]?.color === color)) {
        color = randomColor(colors);
      }
      row.push(makeTile(color));
    }
    board.push(row);
  }
  return board;
}

export function inBounds(board: Board, r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < board.length && c < board[0].length;
}

export function areAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function swapped(board: Board, a: Pos, b: Pos): Board {
  const next = cloneBoard(board);
  const tmp = next[a.r][a.c];
  next[a.r][a.c] = next[b.r][b.c];
  next[b.r][b.c] = tmp;
  return next;
}

// All cells that are part of a horizontal or vertical run of 3+ same color.
export function findMatches(board: Board): Pos[] {
  const rows = board.length;
  const cols = board[0].length;
  const matched = new Set<string>();

  const run = (cells: Pos[]) => {
    let start = 0;
    while (start < cells.length) {
      let end = start;
      const head = board[cells[start].r][cells[start].c];
      const color = head && !head.kind ? head.color : null; // special tiles (rainbow/block) never form a run
      while (color != null && end + 1 < cells.length) {
        const next = board[cells[end + 1].r][cells[end + 1].c];
        if (!next || next.kind || next.color !== color) break;
        end++;
      }
      if (color != null && end - start + 1 >= 3) for (let i = start; i <= end; i++) matched.add(`${cells[i].r},${cells[i].c}`);
      start = end + 1;
    }
  };

  for (let r = 0; r < rows; r++) run(Array.from({ length: cols }, (_, c) => ({ r, c })));
  for (let c = 0; c < cols; c++) run(Array.from({ length: rows }, (_, r) => ({ r, c })));

  return Array.from(matched).map((k) => {
    const [r, c] = k.split(',').map(Number);
    return { r, c };
  });
}

export function hasMatch(board: Board): boolean {
  return findMatches(board).length > 0;
}

// Clears the given positions (sets them to null). Returns a new board.
export function clearCells(board: Board, cells: Pos[]): Board {
  const next = cloneBoard(board);
  for (const { r, c } of cells) next[r][c] = null;
  return next;
}

// Collapse nulls (gravity) and refill from the top with fresh tiles. New tiles have
// a `rainbowChance` probability of being a rainbow diamond (0 = never, the default),
// but the board never holds more than `rainbowCap` rainbows at once.
export function collapseAndRefill(board: Board, colors: number, rainbowChance = 0, rainbowCap = Infinity): Board {
  const rows = board.length;
  const cols = board[0].length;
  let rainbowCount = 0;
  for (const row of board) for (const cell of row) if (cell?.kind === 'rainbow') rainbowCount++;
  const next: Board = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
  for (let c = 0; c < cols; c++) {
    const stack: Tile[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      const cell = board[r][c];
      if (cell) stack.push(cell);
    }
    for (let r = rows - 1, i = 0; r >= 0; r--, i++) {
      if (i < stack.length) {
        next[r][c] = stack[i];
      } else if (rainbowChance > 0 && rainbowCount < rainbowCap && Math.random() < rainbowChance) {
        next[r][c] = makeRainbow();
        rainbowCount++;
      } else {
        next[r][c] = makeTile(randomColor(colors));
      }
    }
  }
  return next;
}

// Cells cleared when a rainbow tile is activated against `color`: every tile of
// that colour, plus the rainbow itself.
export function activateRainbow(board: Board, rainbow: Pos, color: number): Pos[] {
  const cells: Pos[] = [{ r: rainbow.r, c: rainbow.c }];
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board[0].length; c++) {
      if (r === rainbow.r && c === rainbow.c) continue;
      const cell = board[r][c];
      if (cell && cell.kind !== 'rainbow' && cell.color === color) cells.push({ r, c });
    }
  return cells;
}

// Convert up to `count` random normal cells into rainbow diamonds.
export function seedRainbows(board: Board, count: number): Board {
  return seedSpecial(board, count, makeRainbow);
}

// Convert up to `count` random normal cells into blocker crates (BLOCK_HP to break).
export function seedBlockers(board: Board, count: number): Board {
  return seedSpecial(board, count, makeBlock);
}

function seedSpecial(board: Board, count: number, make: () => Tile): Board {
  const next = cloneBoard(board);
  const spots: Pos[] = [];
  for (let r = 0; r < next.length; r++)
    for (let c = 0; c < next[0].length; c++) {
      const cell = next[r][c];
      if (cell && !cell.kind) spots.push({ r, c });
    }
  for (let i = 0; i < count && spots.length > 0; i++) {
    const idx = Math.floor(Math.random() * spots.length);
    const [{ r, c }] = spots.splice(idx, 1);
    next[r][c] = make();
  }
  return next;
}

// Crates take 1 damage when any orthogonally-adjacent cell clears this step —
// at most 1 per step, so a crate needs BLOCK_HP separate matches to break.
// At 0 hp they're removed. Returns a new board.
export function damageBlockers(board: Board, cleared: Pos[]): Board {
  const next = cloneBoard(board);
  const hit = new Set<number>(); // a crate takes at most 1 damage per step
  for (const { r, c } of cleared) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(next, nr, nc)) continue;
      const cell = next[nr][nc];
      if (!cell || cell.kind !== 'block') continue;
      const key = nr * next[0].length + nc;
      if (hit.has(key)) continue;
      hit.add(key);
      const hp = (cell.hp ?? BLOCK_HP) - 1;
      next[nr][nc] = hp <= 0 ? null : { ...cell, hp };
    }
  }
  return next;
}

// Points for clearing `count` tiles in a cascade step at `chain` depth (1-based).
// base: 10 per gem, multiplied by chain depth (a cascade scores progressively more).
// comboBonus: extra flat reward for each chain step past the first (streak payoff).
// bigClearBonus: extra for large single clears (4+, 5+ gems at once).
export function scoreForClear(count: number, chain: number): number {
  const base = count * 10 * chain;
  const comboBonus = chain > 1 ? (chain - 1) * 50 : 0;
  const bigClearBonus = count > 3 ? (count - 3) * 20 : 0;
  return base + comboBonus + bigClearBonus;
}

// True if any adjacent swap on the board would create a match (used to reshuffle dead boards).
export function hasPossibleMove(board: Board): boolean {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && hasMatch(swapped(board, { r, c }, { r, c: c + 1 }))) return true;
      if (r + 1 < rows && hasMatch(swapped(board, { r, c }, { r: r + 1, c }))) return true;
    }
  }
  return false;
}

export function starsForScore(score: number, target: number): number {
  if (score >= target * 2) return 3;
  if (score >= target * 1.5) return 2;
  if (score >= target) return 1;
  return 0;
}

// ── Power-ups ────────────────────────────────────────────────────────────────
// These only compute which cells to clear (bomb / row) or reshuffle the board.
// They build on clearCells/collapseAndRefill and do NOT change matching or scoring.

// The cell at `pos` plus its 8 neighbours, in bounds and non-empty.
export function bombCells(board: Board, pos: Pos): Pos[] {
  const cells: Pos[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const r = pos.r + dr;
      const c = pos.c + dc;
      if (inBounds(board, r, c) && board[r][c]) cells.push({ r, c });
    }
  return cells;
}

// All non-empty positions in row `r`.
export function rowCells(board: Board, r: number): Pos[] {
  if (r < 0 || r >= board.length) return [];
  const cells: Pos[] = [];
  for (let c = 0; c < board[0].length; c++) if (board[r][c]) cells.push({ r, c });
  return cells;
}

// Places every tile from `tiles` onto a `rows` x `cols` board, avoiding 3-in-a-row
// runs, without ever dropping or adding a tile — used when random full-shuffle
// attempts run out, so the colour multiset is preserved no matter what.
function arrangeWithoutMatches(tiles: Tile[], rows: number, cols: number): Board {
  const board: Board = Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
  const remaining = tiles.slice();
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const counts = new Map<number, number>();
      for (const tile of remaining) counts.set(tile.color, (counts.get(tile.color) ?? 0) + 1);
      let bestIdx = -1;
      let bestCount = -1;
      for (let i = 0; i < remaining.length; i++) {
        const color = remaining[i].color;
        const rowRun = c >= 2 && board[r][c - 1]?.color === color && board[r][c - 2]?.color === color;
        const colRun = r >= 2 && board[r - 1][c]?.color === color && board[r - 2][c]?.color === color;
        if (rowRun || colRun) continue;
        const count = counts.get(color) ?? 0;
        if (count > bestCount) { bestCount = count; bestIdx = i; }
      }
      const idx = bestIdx === -1 ? 0 : bestIdx; // every remaining tile would complete a run: place anyway, multiset stays exact
      board[r][c] = remaining.splice(idx, 1)[0];
    }
  }
  return board;
}

// Rearrange the existing tiles into a fresh layout with no initial match and at
// least one possible move. Preserves tile ids and the colour multiset so the UI
// can animate tiles to their new cells. Falls back to a fresh board only when the
// input board itself wasn't full to begin with.
export function shuffleBoard(board: Board, colors: number): Board {
  const rows = board.length;
  const cols = board[0].length;
  const tiles: Tile[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const cell = board[r][c]; if (cell) tiles.push(cell); }
  if (tiles.length !== rows * cols) return createBoard({ rows, cols, colors });
  for (let attempt = 0; attempt < 40; attempt++) {
    const pool = tiles.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const next: Board = [];
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) row.push(pool[k++]);
      next.push(row);
    }
    if (!hasMatch(next) && hasPossibleMove(next)) return next;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = arrangeWithoutMatches(tiles, rows, cols);
    if (!hasMatch(next) && hasPossibleMove(next)) return next;
  }
  return arrangeWithoutMatches(tiles, rows, cols);
}
