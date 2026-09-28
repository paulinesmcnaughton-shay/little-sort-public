import assert from 'node:assert';
import { Board, clearCells, collapseAndRefill, createBoard, findMatches, hasMatch, hasPossibleMove, scoreForClear, starsForScore, swapped } from '../src/game/match3';

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

// Build a board from a grid of color numbers (-1 = empty). Tiles only need a color
// for the logic under test; ids are assigned for collapse/identity checks.
let nextId = 1;
const board = (grid: number[][]): Board => grid.map((row) => row.map((c) => (c < 0 ? null : { id: nextId++, color: c })));

test('findMatches detects a horizontal run of 3', () => {
  const b = board([
    [0, 0, 0, 1],
    [1, 2, 1, 2],
    [2, 1, 2, 1],
    [0, 2, 0, 2],
  ]);
  const m = findMatches(b);
  assert.strictEqual(m.length, 3);
  assert.ok(m.every((p) => p.r === 0 && p.c <= 2));
});

test('findMatches detects a vertical run of 3', () => {
  const b = board([
    [0, 1, 2, 1],
    [0, 2, 1, 2],
    [0, 1, 2, 1],
    [3, 2, 1, 2],
  ]);
  const m = findMatches(b);
  assert.strictEqual(m.length, 3);
  assert.ok(m.every((p) => p.c === 0 && p.r <= 2));
});

test('no false matches on a checkerboard', () => {
  const b = board([
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
  ]);
  assert.strictEqual(findMatches(b).length, 0);
  assert.strictEqual(hasMatch(b), false);
});

test('swapped exchanges two cells without mutating the original', () => {
  const b = board([[0, 1]]);
  const s = swapped(b, { r: 0, c: 0 }, { r: 0, c: 1 });
  assert.strictEqual(s[0][0]?.color, 1);
  assert.strictEqual(s[0][1]?.color, 0);
  assert.strictEqual(b[0][0]?.color, 0); // original untouched
});

test('clearCells nulls the given positions', () => {
  const b = board([[0, 0, 0]]);
  const c = clearCells(b, [{ r: 0, c: 0 }, { r: 0, c: 2 }]);
  assert.strictEqual(c[0][0], null);
  assert.strictEqual(c[0][1]?.color, 0);
  assert.strictEqual(c[0][2], null);
});

test('collapseAndRefill drops survivors to the bottom and refills the top', () => {
  const lower = { id: 91, color: 5 };
  const upper = { id: 92, color: 6 };
  const b: Board = [[null], [upper], [null], [lower]]; // rows top->bottom, 4x1
  const out = collapseAndRefill(b, 4);
  assert.strictEqual(out[3]?.[0]?.id, 91); // bottom-most survivor stays at the bottom
  assert.strictEqual(out[2]?.[0]?.id, 92);
  assert.ok(out.every((row) => row.every((cell) => cell !== null))); // no nulls left
  for (const r of [0, 1]) assert.ok(out[r][0]!.color >= 0 && out[r][0]!.color < 4); // refilled tiles in range
});

test('scoreForClear scales with count and chain depth', () => {
  assert.strictEqual(scoreForClear(3, 1), 30); // base only: 3*10*1
  assert.strictEqual(scoreForClear(4, 1), 60); // base 40 + big-clear (1*20)
  assert.strictEqual(scoreForClear(3, 2), 110); // base 60 + combo (1*50)
  assert.strictEqual(scoreForClear(4, 2), 150); // base 80 + combo 50 + big-clear 20
  assert.strictEqual(scoreForClear(5, 3), 290); // base 150 + combo 100 + big-clear 40
});

test('scoreForClear rewards deeper chains more than the same clear at chain 1', () => {
  assert.ok(scoreForClear(3, 3) > scoreForClear(3, 1) * 3);
});

test('starsForScore thresholds (1x / 1.5x / 2x)', () => {
  assert.strictEqual(starsForScore(100, 100), 1);
  assert.strictEqual(starsForScore(150, 100), 2);
  assert.strictEqual(starsForScore(200, 100), 3);
  assert.strictEqual(starsForScore(99, 100), 0);
});

test('createBoard has correct dims, no nulls, and no starting matches', () => {
  for (let i = 0; i < 20; i++) {
    const b = createBoard({ rows: 8, cols: 6, colors: 5 });
    assert.strictEqual(b.length, 8);
    assert.ok(b.every((row) => row.length === 6));
    assert.ok(b.every((row) => row.every((cell) => cell !== null && cell.color >= 0 && cell.color < 5)));
    assert.strictEqual(findMatches(b).length, 0, 'fresh board should have no matches');
  }
});

test('hasPossibleMove is true when a swap would create a match', () => {
  // swapping (0,2) and (1,2) makes a vertical three of color 0 in column 2
  const b = board([
    [1, 1, 0],
    [2, 2, 1],
    [3, 3, 0],
    [4, 4, 0],
  ]);
  assert.strictEqual(hasPossibleMove(b), true);
});

console.log(`OK — ${passed} match3 tests passed`);
