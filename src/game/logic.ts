import { Level, ShelfLayout, SlotItem, VALID_ITEM_TYPES } from './levels';

export type SlotPosition = { shelf: number; slot: number };

export function cloneLayout(layout: ShelfLayout): ShelfLayout {
  return layout.map((shelf) => [...shelf]);
}

export function countItems(layout: ShelfLayout): Record<string, number> {
  return layout.reduce<Record<string, number>>((counts, shelf) => {
    shelf.forEach((item) => {
      if (item) counts[item] = (counts[item] ?? 0) + 1;
    });
    return counts;
  }, {});
}

export function hasSameItemCounts(before: ShelfLayout, after: ShelfLayout): boolean {
  const beforeCounts = countItems(before);
  const afterCounts = countItems(after);
  const keys = new Set([...Object.keys(beforeCounts), ...Object.keys(afterCounts)]);
  return Array.from(keys).every((key) => beforeCounts[key] === afterCounts[key]);
}

function hasValidPosition(layout: ShelfLayout, position: SlotPosition): boolean {
  return Boolean(layout[position.shelf] && position.slot >= 0 && position.slot < layout[position.shelf].length);
}

function filledItems(shelf: SlotItem[]): Exclude<SlotItem, null>[] {
  return shelf.filter((item): item is Exclude<SlotItem, null> => item !== null);
}

export function canMoveItem(layout: ShelfLayout, from: SlotPosition, to: SlotPosition): boolean {
  if (!hasValidPosition(layout, from) || !hasValidPosition(layout, to)) return false;
  if (from.shelf === to.shelf && from.slot === to.slot) return false;

  const moving = layout[from.shelf][from.slot];
  return Boolean(moving && layout[to.shelf][to.slot] === null);
}

export function moveItem(layout: ShelfLayout, from: SlotPosition, to: SlotPosition): ShelfLayout {
  if (!canMoveItem(layout, from, to)) return layout;
  const next = cloneLayout(layout);
  const moving = next[from.shelf][from.slot];
  next[from.shelf][from.slot] = null;
  next[to.shelf][to.slot] = moving;

  if (!hasSameItemCounts(layout, next)) {
    console.warn('[Little Sort] Invalid move blocked because item counts changed.', { from, to });
    return layout;
  }

  return next;
}

function isEmptyShelf(shelf: SlotItem[]): boolean {
  return shelf.every((item) => item === null);
}

function isFullGroupedShelf(shelf: SlotItem[], capacity: number): boolean {
  const items = filledItems(shelf);
  return items.length === capacity && items.every((item) => item === items[0]);
}

export function isLevelComplete(layout: ShelfLayout, level: Level): boolean {
  if (!hasSameItemCounts(level.start, layout)) return false;

  const requiredItemTypes = Object.keys(countItems(level.start));
  if (requiredItemTypes.length === 0) return false;

  const nonEmptyShelves = layout.filter((shelf) => !isEmptyShelf(shelf));
  return nonEmptyShelves.every((shelf) => isFullGroupedShelf(shelf, level.capacity));
}

// ---- Hints -------------------------------------------------------------------
// Plays the way a person sorts. Every kind of item gets a HOME — the row that
// already holds the most of it — and the hint moves items into their homes:
//   1. A move that finishes a row always comes first.
//   2. Then a LONE item, before one that would leave a partner behind in its row.
//   3. Then the home that already has the biggest pile of that item.
// If a home row is full of other things, the hint first moves one odd item out of
// it. Items only ever travel toward their home, so the hint never undoes its own
// advice or goes round in circles, and following it always finishes the level.
// Legality is still decided by canMoveItem; this only chooses among legal moves.

type HintMove = { from: SlotPosition; to: SlotPosition };
type Item = Exclude<SlotItem, null>;

function countIn(row: SlotItem[], item: Item): number {
  let n = 0;
  for (const x of row) if (x === item) n += 1;
  return n;
}

function isFinishedRow(row: SlotItem[]): boolean {
  return row.every((item) => item !== null && item === row[0]);
}

// One row per kind of item. The biggest existing piles claim their rows first;
// ties go to the cleaner row (fewer other items), then the earlier row, so the
// answer stays the same from one hint to the next.
function assignHomes(layout: ShelfLayout): Map<Item, number> {
  const kinds: Item[] = [];
  const claims: { item: Item; row: number; count: number; others: number }[] = [];
  layout.forEach((row, r) => {
    const counts = new Map<Item, number>();
    let filled = 0;
    for (const x of row) {
      if (x === null) continue;
      filled += 1;
      counts.set(x, (counts.get(x) ?? 0) + 1);
      if (!kinds.includes(x)) kinds.push(x);
    }
    counts.forEach((count, item) => claims.push({ item, row: r, count, others: filled - count }));
  });
  claims.sort((a, b) => b.count - a.count || a.others - b.others || a.row - b.row || (a.item < b.item ? -1 : 1));

  const homes = new Map<Item, number>();
  const taken = new Set<number>();
  for (const claim of claims) {
    if (homes.has(claim.item) || taken.has(claim.row)) continue;
    homes.set(claim.item, claim.row);
    taken.add(claim.row);
  }
  // A kind whose piles were all claimed by bigger ones starts fresh in the
  // emptiest row nobody has claimed.
  for (const item of kinds) {
    if (homes.has(item)) continue;
    let best = -1;
    let bestFree = -1;
    layout.forEach((row, r) => {
      if (taken.has(r)) return;
      const free = row.filter((x) => x === null).length;
      if (free > bestFree) {
        best = r;
        bestFree = free;
      }
    });
    if (best === -1) continue;
    homes.set(item, best);
    taken.add(best);
  }
  return homes;
}

type Candidate = { move: HintMove; score: number; tier: number };

// Tiers are the person's rule and are never traded away for anything else:
// 3 finishes a row · 2 a lone item goes home · 1 a piece of a pair goes home ·
// 0 an odd item is moved out of a full home row to make room.
function intoHomeCandidates(layout: ShelfLayout, homes: Map<Item, number>): Candidate[] {
  const found: Candidate[] = [];
  layout.forEach((row, r) => {
    if (isFinishedRow(row)) return;
    const seen = new Set<Item>();
    row.forEach((item, slot) => {
      if (item === null || seen.has(item)) return;
      seen.add(item);
      const home = homes.get(item);
      if (home === undefined || home === r) return;
      const target = layout[home];
      const to = target.indexOf(null);
      if (to === -1) return;
      const move = { from: { shelf: r, slot }, to: { shelf: home, slot: to } };
      if (!canMoveItem(layout, move.from, move.to)) return;

      const pile = countIn(target, item);
      const others = target.filter((x) => x !== null && x !== item).length;
      const finishes = others === 0 && pile + 1 === target.length;
      const isLone = countIn(row, item) === 1;
      found.push({ move, score: pile * 100 - others, tier: finishes ? 3 : isLone ? 2 : 1 });
    });
  });
  return found;
}

// Every waiting item's home is full of other things: open one up by moving an odd
// item out — from the home whose own pile is closest to done, onto a spare row
// if there is one, ideally one that already holds some of that item.
function clearHomeCandidates(layout: ShelfLayout, homes: Map<Item, number>): Candidate[] {
  const homeRows = new Set(homes.values());
  const found: Candidate[] = [];
  homes.forEach((home, owner) => {
    const target = layout[home];
    if (target.includes(null) || isFinishedRow(target)) return;
    const ownerWaiting = layout.some((row, r) => r !== home && row.includes(owner));
    if (!ownerWaiting) return;
    const ownerPile = countIn(target, owner);
    target.forEach((item, slot) => {
      if (item === null || item === owner) return;
      layout.forEach((dest, d) => {
        if (d === home) return;
        const to = dest.indexOf(null);
        if (to === -1) return;
        const move = { from: { shelf: home, slot }, to: { shelf: d, slot: to } };
        if (!canMoveItem(layout, move.from, move.to)) return;
        const score = ownerPile * 1000 + (homeRows.has(d) ? 0 : 100) + countIn(dest, item) * 10 + (countIn(target, item) === 1 ? 5 : 0);
        found.push({ move, score, tier: 0 });
      });
    });
  });
  return found;
}

function anyLegalMove(layout: ShelfLayout): HintMove | null {
  for (let r = 0; r < layout.length; r += 1) {
    for (let s = 0; s < layout[r].length; s += 1) {
      if (layout[r][s] === null) continue;
      for (let d = 0; d < layout.length; d += 1) {
        const to = layout[d].indexOf(null);
        if (d === r || to === -1) continue;
        const move = { from: { shelf: r, slot: s }, to: { shelf: d, slot: to } };
        if (canMoveItem(layout, move.from, move.to)) return move;
      }
    }
  }
  return null;
}

// The moves in the best tier on offer, most person-like first.
function topTier(layout: ShelfLayout): Candidate[] {
  const homes = assignHomes(layout);
  const into = intoHomeCandidates(layout, homes);
  const pool = into.length > 0 ? into : clearHomeCandidates(layout, homes);
  if (pool.length === 0) return [];
  const tier = Math.max(...pool.map((c) => c.tier));
  return pool.filter((c) => c.tier === tier).sort((a, b) => b.score - a.score);
}

function isSorted(layout: ShelfLayout): boolean {
  return layout.every((row) => row.every((x) => x === null) || isFinishedRow(row));
}

function applyHintMove(layout: ShelfLayout, move: HintMove): ShelfLayout {
  const next = cloneLayout(layout);
  next[move.to.shelf][move.to.slot] = next[move.from.shelf][move.from.slot];
  next[move.from.shelf][move.from.slot] = null;
  return next;
}

// How many moves it takes to finish from here by always taking the top move.
function movesToFinish(layout: ShelfLayout): number {
  let current = layout;
  for (let steps = 0; steps < 200; steps += 1) {
    if (isSorted(current)) return steps;
    const next = topTier(current)[0]?.move ?? anyLegalMove(current);
    if (!next) return Infinity;
    current = applyHintMove(current, next);
  }
  return Infinity;
}

// Among the few best moves in the top tier, play each one out to the end and
// take whichever finishes the level in the fewest moves — the tier rule decides
// WHAT kind of move it is, this only picks the smartest one of that kind.
// Without it, following every hint could run one move past the level's limit.
const LOOKAHEAD_CANDIDATES = 6;

export function findHint(layout: ShelfLayout): HintMove | null {
  if (isSorted(layout)) return null; // nothing left to do — never suggest un-sorting a finished board
  const options = topTier(layout).slice(0, LOOKAHEAD_CANDIDATES);
  if (options.length === 0) return anyLegalMove(layout);
  if (options.length === 1) return options[0].move;
  let best = options[0];
  let bestLength = movesToFinish(applyHintMove(layout, best.move));
  for (const option of options.slice(1)) {
    const length = movesToFinish(applyHintMove(layout, option.move));
    if (length < bestLength) {
      best = option;
      bestLength = length;
    }
  }
  return best.move;
}

export function validateLevelData(level: Level): boolean {
  let valid = true;
  const validItems = new Set(VALID_ITEM_TYPES);

  const validateLayout = (name: 'start' | 'target', layout: ShelfLayout) => {
    if (layout.length !== level.shelves) {
      console.warn(`[Little Sort] Level ${level.id} ${name} layout has ${layout.length} shelves, expected ${level.shelves}.`);
      valid = false;
    }

    layout.forEach((shelf, shelfIndex) => {
      if (shelf.length !== level.capacity) {
        console.warn(`[Little Sort] Level ${level.id} ${name} shelf ${shelfIndex + 1} has ${shelf.length} slots, expected ${level.capacity}.`);
        valid = false;
      }

      shelf.forEach((slot, slotIndex) => {
        if (slot !== null && !validItems.has(slot)) {
          console.warn(`[Little Sort] Level ${level.id} ${name} shelf ${shelfIndex + 1} slot ${slotIndex + 1} has invalid item: ${slot}.`);
          valid = false;
        }
      });
    });
  };

  validateLayout('start', level.start);
  validateLayout('target', level.target);

  const startCounts = countItems(level.start);
  const targetCounts = countItems(level.target);
  const countKeys = new Set([...Object.keys(startCounts), ...Object.keys(targetCounts)]);
  Array.from(countKeys).forEach((item) => {
    if (startCounts[item] !== targetCounts[item]) {
      console.warn(`[Little Sort] Level ${level.id} has mismatched ${item} count: start=${startCounts[item] ?? 0}, target=${targetCounts[item] ?? 0}.`);
      valid = false;
    }
  });

  return valid;
}
