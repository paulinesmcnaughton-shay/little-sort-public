import assert from 'node:assert';
import { BLOCK_COLOR, BLOCK_HP, Board, damageBlockers, findMatches, seedBlockers, createBoard, collapseAndRefill, clearCells } from '../src/game/match3';

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

let id = 5000;
const t = (color: number): { id: number; color: number } => ({ id: id++, color });
const blk = (hp = BLOCK_HP): { id: number; color: number; kind: 'block'; hp: number } => ({ id: id++, color: BLOCK_COLOR, kind: 'block', hp });
const countBlocks = (b: Board) => b.flat().filter((c) => c && c.kind === 'block').length;

test('seedBlockers places exactly `count` crates with full hp', () => {
  const board = createBoard({ rows: 6, cols: 6, colors: 4 });
  const seeded = seedBlockers(board, 5);
  assert.strictEqual(countBlocks(seeded), 5);
  for (const cell of seeded.flat()) if (cell?.kind === 'block') assert.strictEqual(cell.hp, BLOCK_HP);
  assert.strictEqual(countBlocks(board), 0, 'original board untouched');
});

test('blockers never form a match', () => {
  const board: Board = [[blk(), blk(), blk()], [t(0), t(1), t(2)]];
  assert.strictEqual(findMatches(board).length, 0);
});

test('an adjacent clear damages a crate by exactly 1, once per step', () => {
  const board: Board = [
    [t(0), blk(), t(1)],
    [t(2), t(3), t(0)],
  ];
  // Two cleared cells both orthogonally adjacent to the crate — still 1 damage.
  const next = damageBlockers(board, [{ r: 0, c: 0 }, { r: 0, c: 2 }]);
  const crate = next[0][1];
  assert.ok(crate && crate.kind === 'block', 'crate survives the first hit');
  assert.strictEqual(crate.hp, BLOCK_HP - 1);
});

test('a crate at 1 hp breaks on the next adjacent clear', () => {
  const board: Board = [[t(0), blk(1), t(1)]];
  const next = damageBlockers(board, [{ r: 0, c: 0 }]);
  assert.strictEqual(next[0][1], null, 'crate removed at 0 hp');
});

test('diagonal clears do NOT damage crates', () => {
  const board: Board = [
    [t(0), t(1)],
    [t(2), blk()],
  ];
  const next = damageBlockers(board, [{ r: 0, c: 0 }]); // diagonal to the crate
  const crate = next[1][1];
  assert.ok(crate && crate.kind === 'block' && crate.hp === BLOCK_HP, 'diagonal does no damage');
});

test('crates fall with gravity and survive refills', () => {
  let board = seedBlockers(createBoard({ rows: 5, cols: 5, colors: 4 }), 3);
  board = board.map((row, r) => row.map((cell) => (r === 4 && cell?.kind !== 'block' ? null : cell)));
  const refilled = collapseAndRefill(clearCells(board, []), 4);
  assert.strictEqual(countBlocks(refilled), 3, 'all crates still on the board after collapse');
});

console.log(`OK — ${passed} match-blockers tests passed`);
