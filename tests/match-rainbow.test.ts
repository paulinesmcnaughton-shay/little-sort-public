import assert from 'node:assert';
import { activateRainbow, Board, clearCells, collapseAndRefill, createBoard, findMatches, RAINBOW_COLOR, seedRainbows } from '../src/game/match3';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
}

let id = 1000;
const t = (color: number): { id: number; color: number } => ({ id: id++, color });
const rb = (): { id: number; color: number; kind: 'rainbow' } => ({ id: id++, color: RAINBOW_COLOR, kind: 'rainbow' });
const countRainbows = (b: Board) => b.flat().filter((c) => c && c.kind === 'rainbow').length;

test('activateRainbow clears every tile of the target color plus the rainbow', () => {
  const board: Board = [
    [rb(), t(0), t(1)],
    [t(0), t(2), t(0)],
    [t(1), t(0), t(2)],
  ];
  const cells = activateRainbow(board, { r: 0, c: 0 }, 0);
  // 4 zeroes on the board + the rainbow cell = 5
  assert.strictEqual(cells.length, 5);
  assert.ok(cells.some((p) => p.r === 0 && p.c === 0), 'includes the rainbow itself');
  for (const { r, c } of cells) {
    const cell = board[r][c];
    assert.ok(cell && (cell.color === 0 || cell.kind === 'rainbow'), `cell ${r},${c} should be color 0 or the rainbow`);
  }
});

test('activateRainbow never clears other rainbows or other colors', () => {
  const board: Board = [
    [rb(), t(0), rb()],
    [t(1), t(0), t(1)],
  ];
  const cells = activateRainbow(board, { r: 0, c: 0 }, 0);
  assert.ok(!cells.some((p) => p.r === 0 && p.c === 2), 'other rainbow not cleared');
  assert.ok(!cells.some((p) => board[p.r][p.c]?.color === 1), 'color 1 not cleared');
});

test('findMatches ignores rainbow tiles — they never form or extend a run', () => {
  // Three rainbows in a row must NOT count as a match.
  const board: Board = [[rb(), rb(), rb()], [t(0), t(1), t(2)]];
  assert.strictEqual(findMatches(board).length, 0);
});

test('seedRainbows places exactly `count` rainbow diamonds', () => {
  const board = createBoard({ rows: 6, cols: 6, colors: 4 });
  const seeded = seedRainbows(board, 3);
  assert.strictEqual(countRainbows(seeded), 3);
  assert.strictEqual(countRainbows(board), 0, 'original board is untouched');
});

test('collapseAndRefill with rainbowChance=1 fills empty cells with rainbows', () => {
  let board = createBoard({ rows: 5, cols: 5, colors: 4 });
  // Null out the top row to force refills.
  board = board.map((row, r) => row.map((cell) => (r === 0 ? null : cell)));
  const refilled = collapseAndRefill(board, 4, 1);
  assert.ok(countRainbows(refilled) >= 1, 'at least one rainbow spawned');
});

test('collapseAndRefill respects the rainbow cap', () => {
  // Empty the whole top half and refill with chance 1 but a cap of 3 — never exceed 3.
  let board = createBoard({ rows: 8, cols: 8, colors: 4 });
  board = board.map((row, r) => row.map((cell) => (r < 4 ? null : cell)));
  const refilled = collapseAndRefill(board, 4, 1, 3);
  assert.ok(countRainbows(refilled) <= 3, `cap exceeded: ${countRainbows(refilled)}`);
});

test('collapseAndRefill adds no rainbows when already at the cap', () => {
  // Board already holds 3 rainbows; refilling must not add more.
  let board = createBoard({ rows: 6, cols: 6, colors: 4 });
  board = seedRainbows(board, 3);
  board = board.map((row, r) => row.map((cell) => (r === 0 && cell?.kind !== 'rainbow' ? null : cell)));
  const refilled = collapseAndRefill(board, 4, 1, 3);
  assert.strictEqual(countRainbows(refilled), 3);
});

test('rainbow cap holds across many refills (no accumulation)', () => {
  // Simulate a long game: seed 1, then repeatedly clear cells and refill with a
  // high spawn chance and cap 3. Rainbows are never cleared (they don't match),
  // so this is the worst case for accumulation. It must never exceed 3.
  let board = seedRainbows(createBoard({ rows: 8, cols: 8, colors: 5 }), 1);
  for (let step = 0; step < 60; step++) {
    // Clear a couple of non-rainbow cells each turn to force refills.
    const toClear = [] as { r: number; c: number }[];
    for (let r = 0; r < 8 && toClear.length < 6; r++)
      for (let c = 0; c < 8 && toClear.length < 6; c++) if (board[r][c]?.kind !== 'rainbow') toClear.push({ r, c });
    board = collapseAndRefill(clearCells(board, toClear), 5, 0.6, 3);
    assert.ok(countRainbows(board) <= 3, `step ${step}: ${countRainbows(board)} rainbows, cap is 3`);
  }
});

test('collapseAndRefill default (no chance) never spawns rainbows', () => {
  let board = createBoard({ rows: 5, cols: 5, colors: 4 });
  board = board.map((row, r) => row.map((cell) => (r === 0 ? null : cell)));
  assert.strictEqual(countRainbows(collapseAndRefill(board, 4)), 0);
});

console.log(`OK — ${passed} match-rainbow tests passed`);
