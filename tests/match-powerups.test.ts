import assert from 'node:assert';
import { Board, bombCells, clearCells, createBoard, hasMatch, hasPossibleMove, rowCells, shuffleBoard } from '../src/game/match3';

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

const ROWS = 6;
const COLS = 6;
const COLORS = 4;
const colorCounts = (board: Board): Map<number, number> => {
  const counts = new Map<number, number>();
  for (const row of board) for (const cell of row) if (cell) counts.set(cell.color, (counts.get(cell.color) ?? 0) + 1);
  return counts;
};

test('bombCells returns 9 cells for an interior tile on a full board', () => {
  const board = createBoard({ rows: ROWS, cols: COLS, colors: COLORS });
  assert.strictEqual(bombCells(board, { r: 2, c: 2 }).length, 9);
});

test('bombCells clamps at corners (4) and edges (6)', () => {
  const board = createBoard({ rows: ROWS, cols: COLS, colors: COLORS });
  assert.strictEqual(bombCells(board, { r: 0, c: 0 }).length, 4);
  assert.strictEqual(bombCells(board, { r: 0, c: 2 }).length, 6);
});

test('bombCells skips already-empty cells', () => {
  let board = createBoard({ rows: ROWS, cols: COLS, colors: COLORS });
  board = clearCells(board, [{ r: 2, c: 2 }, { r: 1, c: 1 }]);
  const cells = bombCells(board, { r: 2, c: 2 });
  assert.ok(!cells.some((p) => p.r === 2 && p.c === 2), 'should skip the empty center');
  assert.ok(!cells.some((p) => p.r === 1 && p.c === 1), 'should skip the empty neighbour');
  assert.strictEqual(cells.length, 7);
});

test('rowCells returns the whole row on a full board, none for out-of-range', () => {
  const board = createBoard({ rows: ROWS, cols: COLS, colors: COLORS });
  assert.strictEqual(rowCells(board, 3).length, COLS);
  assert.strictEqual(rowCells(board, -1).length, 0);
  assert.strictEqual(rowCells(board, ROWS).length, 0);
});

test('rowCells skips empty cells', () => {
  let board = createBoard({ rows: ROWS, cols: COLS, colors: COLORS });
  board = clearCells(board, [{ r: 3, c: 0 }, { r: 3, c: 5 }]);
  assert.strictEqual(rowCells(board, 3).length, COLS - 2);
});

test('shuffleBoard preserves dimensions, fills every cell, and keeps the colour multiset', () => {
  const board = createBoard({ rows: ROWS, cols: COLS, colors: COLORS });
  const shuffled = shuffleBoard(board, COLORS);
  assert.strictEqual(shuffled.length, ROWS);
  assert.ok(shuffled.every((row) => row.length === COLS && row.every((cell) => cell !== null)));
  const before = colorCounts(board);
  const after = colorCounts(shuffled);
  assert.strictEqual(after.size, before.size);
  for (const [color, n] of before) assert.strictEqual(after.get(color), n, `colour ${color} count changed`);
});

test('shuffleBoard yields a playable board (no initial match, has a move)', () => {
  for (let i = 0; i < 25; i++) {
    const board = createBoard({ rows: ROWS, cols: COLS, colors: COLORS });
    const shuffled = shuffleBoard(board, COLORS);
    assert.ok(!hasMatch(shuffled), 'shuffled board should have no initial match');
    assert.ok(hasPossibleMove(shuffled), 'shuffled board should have at least one move');
  }
});

console.log(`OK — ${passed} match-powerups tests passed`);
