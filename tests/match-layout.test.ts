import assert from 'node:assert';
import { matchColumns, matchLayout, MATCH_GAP, MATCH_ROWS } from '../src/game/match-layout';

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

// Representative device widths (board width = screen width minus padding).
const WIDTHS = [320, 360, 375, 390, 414, 428, 768, 834, 1024];
// Heights from absurdly small (mid-layout transient) to huge.
const HEIGHTS = [1, 50, 120, 240, 480, 600, 800, 1200, 4000];

test('column count is within the allowed range for every width', () => {
  for (const w of WIDTHS) {
    const c = matchColumns(w);
    assert.ok(c >= 5 && c <= 8, `cols ${c} out of range for width ${w}`);
  }
});

test('column count depends ONLY on width — never on height (the locked invariant)', () => {
  for (const w of WIDTHS) {
    const expected = matchColumns(w);
    for (const h of HEIGHTS) {
      const { cols } = matchLayout({ boardW: w, areaH: h });
      assert.strictEqual(cols, expected, `width ${w}: height ${h} changed cols to ${cols}, expected ${expected}`);
    }
    // null (pre-measurement) must also give the same column count.
    assert.strictEqual(matchLayout({ boardW: w, areaH: null }).cols, expected, `width ${w}: null height changed cols`);
  }
});

test('column count is stable across a transient-then-settled height (reload bug guard)', () => {
  for (const w of WIDTHS) {
    const transient = matchLayout({ boardW: w, areaH: 1 }).cols; // first, unsettled layout pass
    const settled = matchLayout({ boardW: w, areaH: 700 }).cols; // final layout
    assert.strictEqual(transient, settled, `width ${w}: cols changed between layout passes (${transient} -> ${settled})`);
  }
});

test('the grid never overflows the board width', () => {
  for (const w of WIDTHS) {
    for (const h of [...HEIGHTS, null] as (number | null)[]) {
      const { cols, cell } = matchLayout({ boardW: w, areaH: h });
      const gridW = cols * cell + (cols - 1) * MATCH_GAP;
      assert.ok(gridW <= w, `width ${w}, height ${h}: grid ${gridW} overflows board ${w}`);
    }
  }
});

test('rows are always the fixed count and cell is positive', () => {
  for (const w of WIDTHS) {
    for (const h of [...HEIGHTS, null] as (number | null)[]) {
      const { rows, cell } = matchLayout({ boardW: w, areaH: h });
      assert.strictEqual(rows, MATCH_ROWS, `width ${w}, height ${h}: rows ${rows}`);
      assert.ok(cell > 0, `width ${w}, height ${h}: cell ${cell} not positive`);
    }
  }
});

test('known widths map to known column counts (pin the design)', () => {
  // round(width / 54), clamped to [5, 8].
  assert.strictEqual(matchColumns(320), 6);
  assert.strictEqual(matchColumns(375), 7);
  assert.strictEqual(matchColumns(390), 7);
  assert.strictEqual(matchColumns(428), 8);
  assert.strictEqual(matchColumns(768), 8); // clamped at MAX
  assert.strictEqual(matchColumns(220), 5); // clamped at MIN
});

console.log(`OK — ${passed} match-layout tests passed`);
