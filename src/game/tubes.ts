import { ItemType, Level, ShelfLayout, SlotItem, VALID_ITEM_TYPES } from './levels';
import { SlotPosition } from './logic';

// Premium "Tubes" mode: classic stack-sort. Each shelf is a tube that fills from
// the left (slot 0); only the rightmost filled item (the "top") can move, and
// only onto a tube that is empty or whose top matches — never onto a full tube.

const TUBE_CAPACITY = 4;
const TUBE_EMPTY_TUBES = 2;
const TUBE_EMPTY_TUBES_EXPANSION = 3; // levels 101+: 7 colors (max) + 3 empty = 10 tubes total
export const TUBE_LEVEL_COUNT = 150;

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function filledCount(tube: SlotItem[]): number {
  let n = 0;
  for (const item of tube) if (item !== null) n += 1;
  return n;
}

export function tubeTop(layout: ShelfLayout, shelf: number): SlotPosition | null {
  const n = filledCount(layout[shelf]);
  return n > 0 ? { shelf, slot: n - 1 } : null;
}

function tubeNextEmpty(layout: ShelfLayout, shelf: number): SlotPosition | null {
  const n = filledCount(layout[shelf]);
  return n < layout[shelf].length ? { shelf, slot: n } : null;
}

export function canMoveTube(layout: ShelfLayout, fromShelf: number, toShelf: number): boolean {
  if (fromShelf === toShelf) return false;
  const top = tubeTop(layout, fromShelf);
  if (!top) return false;
  const dest = tubeNextEmpty(layout, toShelf);
  if (!dest) return false;
  const destTop = tubeTop(layout, toShelf);
  if (!destTop) return true;
  return layout[destTop.shelf][destTop.slot] === layout[top.shelf][top.slot];
}

// Interactive play only: any tube with room accepts a pour, no colour-match
// required — a "wrong" pour is a real, undoable move rather than a blocked tap.
// Level generation/solvability/hints keep using the strict canMoveTube above so
// the puzzle itself, and what the hint suggests, are unaffected.
export function canPourTube(layout: ShelfLayout, fromShelf: number, toShelf: number): boolean {
  if (fromShelf === toShelf) return false;
  if (!tubeTop(layout, fromShelf)) return false;
  return tubeNextEmpty(layout, toShelf) !== null;
}

export function applyMoveTube(layout: ShelfLayout, fromShelf: number, toShelf: number): ShelfLayout {
  if (!canPourTube(layout, fromShelf, toShelf)) return layout;
  const next = layout.map((shelf) => [...shelf]);
  const top = tubeTop(layout, fromShelf) as SlotPosition;
  const dest = tubeNextEmpty(layout, toShelf) as SlotPosition;
  next[dest.shelf][dest.slot] = next[top.shelf][top.slot];
  next[top.shelf][top.slot] = null;
  return next;
}

// A tube that's full and a single color — already done, and should stay that way
// (never selectable to break apart again).
export function isTubeSolved(tube: SlotItem[]): boolean {
  const items = tube.filter((item): item is ItemType => item !== null);
  return items.length === tube.length && items.every((item) => item === items[0]);
}

function isSolvedTubes(layout: ShelfLayout): boolean {
  return layout.every((tube) => tube.every((item) => item === null) || isTubeSolved(tube));
}

function listMoves(layout: ShelfLayout): [number, number][] {
  const moves: [number, number][] = [];
  for (let f = 0; f < layout.length; f += 1) {
    if (!tubeTop(layout, f)) continue;
    for (let t = 0; t < layout.length; t += 1) if (canMoveTube(layout, f, t)) moves.push([f, t]);
  }
  return moves;
}

function scrambleTubes(target: ShelfLayout, depth: number, rand: () => number): ShelfLayout {
  let layout = target.map((shelf) => [...shelf]);
  let lastFrom = -1;
  let lastTo = -1;
  for (let i = 0; i < depth; i += 1) {
    const all = listMoves(layout);
    if (all.length === 0) break;
    const avoid = all.filter(([f, t]) => !(f === lastTo && t === lastFrom));
    const pool = avoid.length > 0 ? avoid : all;
    const [f, t] = pool[Math.floor(rand() * pool.length)];
    layout = applyMoveTube(layout, f, t);
    lastFrom = f;
    lastTo = t;
  }
  return layout;
}

const tubeKey = (l: ShelfLayout) => l.map((t) => t.map((x) => x ?? '_').join('')).join('|');

// Genuinely mixed start: drop every ball randomly into the colour tubes (full),
// leaving the empty tubes as workspace. This is what makes ball-sort interesting.
function randomFill(itemTypes: ItemType[], capacity: number, emptyTubes: number, rand: () => number): ShelfLayout {
  const balls: ItemType[] = [];
  for (const type of itemTypes) for (let i = 0; i < capacity; i += 1) balls.push(type);
  for (let i = balls.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [balls[i], balls[j]] = [balls[j], balls[i]];
  }
  const tubes: ShelfLayout = [];
  for (let i = 0; i < itemTypes.length; i += 1) tubes.push(balls.slice(i * capacity, (i + 1) * capacity) as SlotItem[]);
  for (let i = 0; i < emptyTubes; i += 1) tubes.push(Array.from({ length: capacity }, () => null));
  return tubes;
}

// DFS solvability check (find any solution). Solvable random fills resolve fast;
// the rare unsolvable one explores to the node cap and is rejected (re-rolled).
function isSolvableTubes(start: ShelfLayout): boolean {
  const seen = new Set<string>([tubeKey(start)]);
  const stack: ShelfLayout[] = [start];
  let nodes = 0;
  while (stack.length) {
    const layout = stack.pop() as ShelfLayout;
    if (isSolvedTubes(layout)) return true;
    nodes += 1;
    if (nodes > 18000) return false;
    for (let f = 0; f < layout.length; f += 1) {
      for (let t = 0; t < layout.length; t += 1) {
        if (!canMoveTube(layout, f, t)) continue;
        const moved = applyMoveTube(layout, f, t);
        const k = tubeKey(moved);
        if (seen.has(k)) continue;
        seen.add(k);
        stack.push(moved);
      }
    }
  }
  return false;
}

function tubeItems(tube: SlotItem[]): ItemType[] {
  return tube.filter((item): item is ItemType => item !== null);
}

// How many of the top colour sit in a row at the top of the tube.
function topRun(items: ItemType[]): number {
  let run = 0;
  for (let i = items.length - 1; i >= 0 && items[i] === items[items.length - 1]; i -= 1) run += 1;
  return run;
}

// Every pour the PLAYER could make, most helpful first. The hint plans with the
// same rules as the game (ruleset.ts): a finished tube can't be picked up, and a
// ball can go onto any tube with room. Same-colour pours always rank above a
// wrong-colour one, so a wrong-colour pour is only ever suggested when it's the
// only way out — which matters, because after a few of the player's own
// wrong-colour pours the board may have no same-colour-only solution at all, and
// planning with stricter rules than the player has made the hint go in circles.
// Among same-colour pours: onto a clean tube of that colour scores highest
// (finishing it wins outright); pouring the odd colour off a nearly-done tube
// next; a pure tube is never broken apart unless nothing else is possible.
function rankedTubeMoves(layout: ShelfLayout): { from: number; to: number; score: number }[] {
  const moves: { from: number; to: number; score: number }[] = [];

  for (let f = 0; f < layout.length; f++) {
    const source = tubeItems(layout[f]);
    if (source.length === 0 || isTubeSolved(layout[f])) continue;
    const colour = source[source.length - 1];
    const sourcePure = source.every((item) => item === colour);
    const runF = topRun(source);
    const beneath = source.slice(0, -1);
    const uncoversNewColour = beneath.length > 0 && beneath[beneath.length - 1] !== colour;
    const leavesSourcePure = beneath.length > 0 && beneath.every((item) => item === beneath[0]);

    for (let t = 0; t < layout.length; t++) {
      if (!canPourTube(layout, f, t)) continue;
      if (!canMoveTube(layout, f, t)) {
        moves.push({ from: f, to: t, score: leavesSourcePure ? -4 : -5 }); // wrong colour: last resort
        continue;
      }
      const target = tubeItems(layout[t]);
      const targetPure = target.length > 0 && target.every((item) => item === colour);

      let score = 1;
      if (target.length === 0 && sourcePure) score = 0; // shuffling a clean tube into empty space
      else if (target.length > 0 && !targetPure && sourcePure) score = 0; // breaking a clean tube onto a mixed pile
      else if (targetPure && sourcePure && target.length < source.length) score = 0; // pour the smaller pile onto the bigger one
      else if (targetPure) {
        score = 6 + target.length;
        if (target.length + 1 === layout[t].length) score += 10; // finishes the tube
        else if (target.length + runF === layout[t].length) score += 4; // finishes after the run
      } else if (target.length > 0) {
        score = 2; // same colour on top, but the pile underneath is still mixed
      }
      if (score > 0) {
        if (uncoversNewColour) score += 2;
        if (leavesSourcePure) score += 3;
        if (beneath.length === 0) score += 1; // frees up a tube
      }
      moves.push({ from: f, to: t, score });
    }
  }

  return moves.sort((a, b) => b.score - a.score);
}

// A lower bound on the pours still needed: every ball sitting above its tube's
// bottom run has to move at least once, and if one colour forms the bottom of
// several tubes, all but the biggest of those runs have to move too.
function poursStillNeeded(layout: ShelfLayout): number {
  let needed = 0;
  const bottomRuns = new Map<ItemType, number[]>();
  for (const tube of layout) {
    const items = tubeItems(tube);
    if (items.length === 0) continue;
    let run = 1;
    while (run < items.length && items[run] === items[0]) run += 1;
    needed += items.length - run;
    const runs = bottomRuns.get(items[0]) ?? [];
    runs.push(run);
    bottomRuns.set(items[0], runs);
  }
  bottomRuns.forEach((runs) => {
    if (runs.length > 1) needed += runs.reduce((a, b) => a + b, 0) - Math.max(...runs);
  });
  return needed;
}

// Tubes are interchangeable for "have I been here before" — only their contents
// matter — which keeps the search from re-exploring the same board rearranged.
const canonicalTubeKey = (l: ShelfLayout) => l.map((t) => t.map((x) => x ?? '_').join('')).sort().join('|');

type SearchNode = { layout: ShelfLayout; moves: number; priority: number; order: number; first: { from: number; to: number } | null };

function pushNode(heap: SearchNode[], node: SearchNode): void {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (!isBefore(heap[i], heap[parent])) break;
    [heap[i], heap[parent]] = [heap[parent], heap[i]];
    i = parent;
  }
}

function popNode(heap: SearchNode[]): SearchNode | undefined {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length > 0 && last) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let smallest = i;
      if (l < heap.length && isBefore(heap[l], heap[smallest])) smallest = l;
      if (r < heap.length && isBefore(heap[r], heap[smallest])) smallest = r;
      if (smallest === i) break;
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
  }
  return top;
}

function isBefore(a: SearchNode, b: SearchNode): boolean {
  return a.priority < b.priority || (a.priority === b.priority && a.order < b.order);
}

// Hard limits so a hint can never freeze the phone: the search runs on the JS
// thread when Hint is tapped. Real boards need a few hundred steps at most (worst
// seen across ~25,000 hints, including wildly scrambled boards: 434), so these
// only ever matter on pathological positions — then it falls back to the best-
// looking pour, which is still a legal move.
const SEARCH_BUDGET = 20000;
const SEARCH_TIME_MS = 250;
const SEARCH_WEIGHT = 2;

// Route-finding search (weighted A*) for the shortest way to a finished board
// from exactly where the player is. The hint is the first pour of that route.
// Ties go to the pour a person would pick (rankedTubeMoves order), so the route
// it follows is the obvious one whenever the obvious one works. Because every
// hint is the first step of a real route to the end, pressing Hint over and over
// always finishes the board — it can't wander or go round in circles.
function solveTubes(layout: ShelfLayout): { from: number; to: number } | null {
  const heap: SearchNode[] = [];
  const best = new Map<string, number>([[canonicalTubeKey(layout), 0]]);
  let order = 0;
  pushNode(heap, { layout, moves: 0, priority: SEARCH_WEIGHT * poursStillNeeded(layout), order: order++, first: null });

  const deadline = Date.now() + SEARCH_TIME_MS;
  for (let expanded = 0; heap.length > 0 && expanded < SEARCH_BUDGET; expanded += 1) {
    if ((expanded & 63) === 0 && Date.now() > deadline) break;
    const node = popNode(heap) as SearchNode;
    if (isSolvedTubes(node.layout)) return node.first;
    for (const move of rankedTubeMoves(node.layout)) {
      const next = applyMoveTube(node.layout, move.from, move.to);
      const key = canonicalTubeKey(next);
      const moves = node.moves + 1;
      const known = best.get(key);
      if (known !== undefined && known <= moves) continue;
      best.set(key, moves);
      pushNode(heap, { layout: next, moves, priority: moves + SEARCH_WEIGHT * poursStillNeeded(next), order: order++, first: node.first ?? move });
    }
  }
  return null;
}

export function findTubeHint(layout: ShelfLayout): { from: SlotPosition; to: SlotPosition } | null {
  const ranked = rankedTubeMoves(layout);
  if (ranked.length === 0) return null;
  const chosen = solveTubes(layout) ?? ranked[0];
  return { from: tubeTop(layout, chosen.from) as SlotPosition, to: { shelf: chosen.to, slot: 0 } };
}

// Fixed currency-star reward by difficulty tier only — never based on moves or
// time, and never shown as a per-level 1-3 rating badge. Tubes stays chill; this
// just decides how much currency a completion pays into the star bank. Mirrors
// the same colour-count progression getTubeLevel already uses, read-only.
export type TubeDifficulty = 'easy' | 'medium' | 'hard' | 'veryHard';

export function tubeDifficultyTier(id: number): TubeDifficulty {
  const colors = Math.min(3 + Math.floor((id - 1) / 12), 7);
  if (colors <= 3) return 'easy';
  if (colors === 4) return 'medium';
  if (colors <= 6) return 'hard';
  return 'veryHard';
}

const TUBE_CURRENCY_STARS: Record<TubeDifficulty, number> = { easy: 1, medium: 2, hard: 3, veryHard: 3 };

export function tubeCurrencyStars(id: number): number {
  return TUBE_CURRENCY_STARS[tubeDifficultyTier(id)];
}

export function getTubeLevel(id: number): Level {
  const capacity = TUBE_CAPACITY;
  const colors = Math.min(3 + Math.floor((id - 1) / 12), 7);
  const emptyTubes = id > 100 ? TUBE_EMPTY_TUBES_EXPANSION : TUBE_EMPTY_TUBES;
  const itemTypes = VALID_ITEM_TYPES.slice(0, colors);
  const base = (id * 0x9e3779b1) >>> 0;

  let start: ShelfLayout | null = null;
  for (let salt = 0; salt < 150; salt += 1) {
    const candidate = randomFill(itemTypes, capacity, emptyTubes, rng((base + salt * 7919) >>> 0));
    if (!isSolvedTubes(candidate) && isSolvableTubes(candidate)) {
      start = candidate;
      break;
    }
  }
  if (!start) {
    // Fallback (very rare): a guaranteed-solvable valid-move scramble.
    const target: ShelfLayout = [...itemTypes.map((type) => Array.from({ length: capacity }, () => type as SlotItem)), ...Array.from({ length: emptyTubes }, () => Array.from({ length: capacity }, () => null))];
    start = scrambleTubes(target, colors * 8, rng(base));
  }
  const target: ShelfLayout = [...itemTypes.map((type) => Array.from({ length: capacity }, () => type as SlotItem)), ...Array.from({ length: emptyTubes }, () => Array.from({ length: capacity }, () => null))];

  return { id, name: `Tube ${id}`, shelves: colors + emptyTubes, capacity, itemTypes, start, target, maxMoves: undefined };
}
