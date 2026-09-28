import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, GestureResponderEvent, LayoutChangeEvent, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Button } from '../components/Button';
import { Icon, IconName } from '../components/Icon';
import { RoundBtn } from '../components/RoundBtn';
import { Screen } from '../components/Screen';
import { ITEM_ART } from '../game/item-art';
import { matchLayout, MATCH_BOTTOM_INSET, MATCH_GAP } from '../game/match-layout';
import { getMatchLevel, MATCH_LEVEL_COUNT } from '../game/match-levels';
import { activateRainbow, Board, bombCells, clearCells, collapseAndRefill, createBoard, damageBlockers, findMatches, hasMatch, hasPossibleMove, Pos, rowCells, scoreForClear, seedBlockers, seedRainbows, shuffleBoard, swapped } from '../game/match3';
import { MatchPowerups } from '../store/progress';
import { loseHaptic, moveHaptic, selectHaptic, shelfDoneHaptic, winHaptic } from '../lib/haptics';
import { showExtraMovesReward } from '../services/ads';
import { CONSUMABLE_IAP_AVAILABLE, purchaseExtraMoves } from '../services/purchases';
import { playSfx } from '../services/sfx';
import { colors, fonts } from '../theme/theme';

const SCREEN_W = Dimensions.get('window').width;
const SIDE = 8; // gap from each screen edge
const BOARD_W = SCREEN_W - SIDE * 2; // board always fills the width — deterministic, no measurement
const MOVE_MS = 170;
const CLEAR_MS = 150;
const ART_SCALE = 1.05; // tiny overscale so the cropped gems just kiss their neighbours
const POWERUP_LEVEL = 1; // power-up bar appears from this Match It level onward
const ADD_TIME_SECONDS = 30;
const POWERUP_SCORE_PER_GEM = 50; // power-up clears reward 5× a normal match (10/gem) — you used help because you needed it
const BLOCKER_CLEAR_BONUS = 1000; // one-time bonus for breaking every crate on a blocker level
const RAINBOW_SEED = 1; // rainbow diamonds seeded at the start of a rainbow level
const RAINBOW_REFILL_CHANCE = 0.02; // chance a refilled cell becomes a rainbow diamond
// Max rainbows on the board scales with the level: 2 on early supers (20–59),
// 3 mid (60–99), 4 on high supers (100+).
const rainbowCap = (levelId: number) => Math.max(2, Math.min(4, 2 + Math.floor((levelId - 20) / 40)));
const CONTINUE_AD_TIME = 30;
const CONTINUE_AD_MOVES = 5;
const CONTINUE_BUY_TIME = 60;
const CONTINUE_BUY_MOVES = 10;
const CONTINUE_BUY_PRICE = '$0.99';
const CONTINUE_BUY_POWERUPS = 8; // +N of each power-up included in the Buy bundle
// Board layout is LOCKED in src/game/match-layout.ts — do not reintroduce sizing
// math here. These re-exports keep the rest of this file referencing one source.
const GAP = MATCH_GAP;
const BOTTOM_INSET = MATCH_BOTTOM_INSET;

type Pos2 = { tx: Animated.Value; ty: Animated.Value; scale: Animated.Value };
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;
// Stars reward efficiency: the more of your resource (moves/time) left when you hit
// the goal, the more stars.
const matchStars = (timeLeft: number, total: number) => {
  const r = total > 0 ? timeLeft / total : 0;
  if (r >= 0.35) return 3;
  if (r >= 0.15) return 2;
  return 1;
};

export function MatchScreen({ levelId, bestScore, soundsEnabled, sfxEnabled, powerups, onUsePowerup, onEarnPowerup, onBuyPowerups, introSeen, onSeenIntro, onToggleSounds, onToggleSfx, onWin, onExit, onChangeLevel, onPlayLevel }: { levelId: number; bestScore: number; soundsEnabled: boolean; sfxEnabled: boolean; powerups: MatchPowerups; onUsePowerup: (kind: keyof MatchPowerups) => void; onEarnPowerup: (kind: keyof MatchPowerups) => void; onBuyPowerups: (count: number) => void; introSeen: boolean; onSeenIntro: () => void; onToggleSounds: (next: boolean) => void; onToggleSfx: (next: boolean) => void; onWin: (id: number, score: number, stars: number) => void; onExit: () => void; onChangeLevel: () => void; onPlayLevel: (id: number) => void }) {
  const level = useMemo(() => getMatchLevel(levelId), [levelId]);
  const { target, colors: tileColors, mode, objective, collect } = level;
  const tierLabel = level.tier === 'super' ? 'Super Hard' : level.tier === 'hard' ? 'Hard' : null;
  const rainbowChance = level.rainbow ? RAINBOW_REFILL_CHANCE : 0;
  const rainbowMax = rainbowCap(levelId);

  // Fill the available board area: 20 rows fixed, cell sized to the height, then
  // columns chosen so the grid also reaches the side edges.
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const { cols, rows, cell } = useMemo(() => matchLayout({ boardW: BOARD_W, areaH: area ? area.h : null }), [area]);
  const step = cell + GAP;

  const [board, setBoard] = useState<Board | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(level.moves);
  const [time, setTime] = useState(level.seconds);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [wonStars, setWonStars] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [armed, setArmed] = useState<'bomb' | 'rowWipe' | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [collected, setCollected] = useState<Record<number, number>>({});
  const comboAnim = useRef(new Animated.Value(0)).current;
  const collectedRef = useRef<Record<number, number>>({});
  const blockerBonusRef = useRef(false);

  const posRef = useRef<Record<number, Pos2>>({});
  const busyRef = useRef(false);
  const scoreRef = useRef(0);
  const movesRef = useRef(level.moves);
  const timeRef = useRef(level.seconds);
  const boardRef = useRef<Board | null>(null);
  const resultRef = useRef<'win' | 'lose' | null>(null);
  const menuRef = useRef(false);
  const startCellRef = useRef<Pos | null>(null);
  const attemptSwapRef = useRef<(a: Pos, b: Pos) => void>(() => undefined);
  boardRef.current = board;
  resultRef.current = result;
  menuRef.current = menuOpen;

  const onBoardLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (height < 1) return;
    // Only used to shrink the cell so 10 rows fit; column count is fixed, so a
    // changing height here just resizes tiles — it can't drop a column.
    setArea((prev) => (prev && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
  }, []);

  const makeBoard = useCallback(() => {
    let fresh = createBoard({ rows, cols, colors: tileColors });
    if (level.rainbow) fresh = seedRainbows(fresh, RAINBOW_SEED);
    if (level.blockers > 0) fresh = seedBlockers(fresh, level.blockers);
    return fresh;
  }, [rows, cols, tileColors, level.rainbow, level.blockers]);

  // Tally cleared gem colours toward collect goals (specials have negative colours).
  const recordCleared = useCallback((cells: Pos[], b: Board) => {
    if (objective !== 'collect') return;
    const tally = collectedRef.current;
    for (const { r, c } of cells) {
      const cell = b[r][c];
      if (cell && cell.color >= 0) tally[cell.color] = (tally[cell.color] ?? 0) + 1;
    }
    setCollected({ ...tally });
  }, [objective]);

  const reachedGoal = useCallback(() => {
    if (objective === 'collect') return (collect ?? []).every((g) => (collectedRef.current[g.color] ?? 0) >= g.count);
    return scoreRef.current >= target;
  }, [objective, collect, target]);

  // Column count is fixed up front, so the board can be built immediately.
  useEffect(() => {
    if (board) return;
    setBoard(makeBoard());
  }, [board, makeBoard]);

  // Show the how-to-play once, the first time a player opens Match It.
  const introShownRef = useRef(false);
  useEffect(() => {
    if (introShownRef.current || introSeen) return;
    introShownRef.current = true;
    setHowToOpen(true);
    onSeenIntro();
  }, [introSeen, onSeenIntro]);

  // Animate every tile to its cell whenever the board changes.
  useEffect(() => {
    if (!board) return;
    const present = new Set<number>();
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const t = board[r][c];
        if (!t) continue;
        present.add(t.id);
        const p = posRef.current[t.id];
        if (!p) continue;
        Animated.timing(p.tx, { toValue: c * step, duration: MOVE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
        Animated.timing(p.ty, { toValue: r * step, duration: MOVE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      }
    for (const key of Object.keys(posRef.current)) if (!present.has(Number(key))) delete posRef.current[Number(key)];
  }, [board, rows, cols, step]);

  const win = useCallback(() => {
    // Stars reward leftover of whichever resource the level is racing: time, or moves.
    const stars = mode === 'timed' ? matchStars(timeRef.current, level.seconds) : matchStars(movesRef.current, level.moves);
    playSfx('win');
    winHaptic();
    setWonStars(stars);
    onWin(levelId, scoreRef.current, stars);
    setResult('win');
  }, [levelId, level.seconds, level.moves, mode, onWin]);

  const loseGame = useCallback(() => {
    playSfx('lose');
    loseHaptic();
    setResult('lose');
  }, []);

  // Recover from a loss without losing score/board: add time + moves and resume.
  const continueGame = useCallback((addSeconds: number, addMoves: number) => {
    timeRef.current += addSeconds;
    movesRef.current += addMoves;
    setTime(timeRef.current);
    setMoves(movesRef.current);
    busyRef.current = false;
    setResult(null);
  }, []);

  // While a $0.99 purchase is open nothing else on this popup may run: a second
  // Buy tap, Watch Ad or Try Again used to give two continues or put the paid time
  // on a fresh board.
  const continuingRef = useRef(false);

  const handleAdContinue = useCallback(() => {
    if (continuingRef.current) return;
    showExtraMovesReward(() => continueGame(CONTINUE_AD_TIME, CONTINUE_AD_MOVES));
  }, [continueGame]);

  const handleBuyContinue = useCallback(async () => {
    if (continuingRef.current) return;
    continuingRef.current = true;
    const result = await purchaseExtraMoves();
    continuingRef.current = false;
    if (!result.ok) {
      // Empty error = the user backed out of the payment sheet; same message as the Pro paywall.
      if (result.error === '') Alert.alert('Payment Cancelled', 'No payment was processed. You cancelled the purchase.');
      else Alert.alert('Purchase failed', result.error ?? 'Something went wrong.');
      return;
    }
    onBuyPowerups(CONTINUE_BUY_POWERUPS);
    continueGame(CONTINUE_BUY_TIME, CONTINUE_BUY_MOVES);
  }, [continueGame, onBuyPowerups]);

  // Countdown timer — timed levels only. Pauses while a menu/power-up is open.
  useEffect(() => {
    if (mode !== 'timed' || result || menuOpen || howToOpen || armed || !board) return;
    const id = setInterval(() => {
      timeRef.current -= 1;
      setTime(timeRef.current);
      if (timeRef.current <= 0) {
        clearInterval(id);
        if (reachedGoal()) win();
        else loseGame();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mode, result, menuOpen, howToOpen, armed, board, reachedGoal, win, loseGame]);

  const addScore = useCallback((gain: number) => {
    scoreRef.current += gain;
    setScore(scoreRef.current);
  }, []);

  const animateClear = useCallback((cells: Pos[], b: Board) =>
    Promise.all(cells.map(({ r, c }) => {
      const t = b[r][c];
      const p = t && posRef.current[t.id];
      if (!p) return Promise.resolve();
      return new Promise<void>((res) => Animated.timing(p.scale, { toValue: 0, duration: CLEAR_MS, useNativeDriver: true }).start(() => res()));
    })), []);

  const finishTurn = useCallback(() => {
    if (reachedGoal()) win();
    else if (mode === 'moves' && movesRef.current <= 0) loseGame();
    busyRef.current = false;
  }, [reachedGoal, mode, win, loseGame]);

  const showFlash = useCallback((text: string) => {
    setFlash(text);
    comboAnim.setValue(0);
    Animated.sequence([
      Animated.timing(comboAnim, { toValue: 1, duration: 140, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.delay(420),
      Animated.timing(comboAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setFlash(null));
  }, [comboAnim]);

  // One-time bonus when the last crate on a blocker level breaks — clearing them
  // is real work, so it pays toward the goal instead of just opening space.
  const maybeBlockerBonus = useCallback((b: Board) => {
    if (level.blockers === 0 || blockerBonusRef.current) return;
    if (b.some((row) => row.some((cell) => cell?.kind === 'block'))) return;
    blockerBonusRef.current = true;
    addScore(BLOCKER_CLEAR_BONUS);
    playSfx('clear');
    shelfDoneHaptic();
    showFlash(`Crates cleared! +${BLOCKER_CLEAR_BONUS}`);
  }, [level.blockers, addScore, showFlash]);

  const resolve = useCallback(async (initial: Board) => {
    let b = initial;
    let chain = 0;
    while (true) {
      const matches = findMatches(b);
      if (matches.length === 0) break;
      chain++;
      playSfx('clear', { rate: 1 + (chain - 1) * 0.12 });
      moveHaptic();
      await animateClear(matches, b);
      addScore(scoreForClear(matches.length, chain));
      recordCleared(matches, b);
      if (chain >= 2) showFlash(`Combo ×${chain}!`);
      b = collapseAndRefill(damageBlockers(clearCells(b, matches), matches), tileColors, rainbowChance, rainbowMax);
      maybeBlockerBonus(b);
      setBoard(b);
      await sleep(MOVE_MS + 30);
    }
    const hasRainbow = b.some((row) => row.some((cell) => cell?.kind === 'rainbow'));
    if (!hasPossibleMove(b) && !hasRainbow) {
      b = makeBoard();
      setBoard(b);
      await sleep(MOVE_MS);
    }
    finishTurn();
  }, [addScore, animateClear, finishTurn, makeBoard, tileColors, rainbowChance, rainbowMax, recordCleared, showFlash, maybeBlockerBonus]);

  const spendMove = useCallback(() => {
    if (mode !== 'moves') return;
    movesRef.current -= 1;
    setMoves(movesRef.current);
  }, [mode]);

  const attemptSwap = useCallback(async (a: Pos, bPos: Pos) => {
    const cur = boardRef.current;
    if (!cur || busyRef.current) return;
    const aTile = cur[a.r][a.c];
    const bTile = cur[bPos.r][bPos.c];
    // Blocker crates can't be swapped — they only break via adjacent matches.
    if (aTile?.kind === 'block' || bTile?.kind === 'block') return;
    // Swiping a rainbow diamond onto a gem clears every gem of that gem's colour.
    const rainbowPos = aTile?.kind === 'rainbow' ? a : bTile?.kind === 'rainbow' ? bPos : null;
    const other = rainbowPos === a ? bTile : aTile;
    if (rainbowPos && other && !other.kind) {
      busyRef.current = true;
      // Slide the rainbow into the gem first (same animation as a normal swap),
      // then clear that gem's whole colour.
      const slid = swapped(cur, a, bPos);
      playSfx('swap');
      selectHaptic();
      setBoard(slid);
      await sleep(MOVE_MS);
      const rainbowNow = rainbowPos === a ? bPos : a;
      const cells = activateRainbow(slid, rainbowNow, other.color);
      playSfx('clear');
      moveHaptic();
      await animateClear(cells, slid);
      addScore(cells.length * POWERUP_SCORE_PER_GEM);
      recordCleared(cells, slid);
      spendMove();
      const next = collapseAndRefill(damageBlockers(clearCells(slid, cells), cells), tileColors, rainbowChance, rainbowMax);
      maybeBlockerBonus(next);
      setBoard(next);
      await sleep(MOVE_MS + 30);
      await resolve(next);
      return;
    }
    busyRef.current = true;
    const sw = swapped(cur, a, bPos);
    playSfx('swap');
    selectHaptic();
    setBoard(sw);
    await sleep(MOVE_MS);
    if (!hasMatch(sw)) {
      setBoard(swapped(sw, a, bPos));
      await sleep(MOVE_MS);
      busyRef.current = false;
      return;
    }
    spendMove();
    await resolve(sw);
  }, [resolve, spendMove, addScore, animateClear, tileColors, rainbowChance, rainbowMax, recordCleared, maybeBlockerBonus]);
  attemptSwapRef.current = attemptSwap;

  // ── Power-ups (Match It, level 10+) ──────────────────────────────────────────
  useEffect(() => {
    if (menuOpen || howToOpen || result) setArmed(null);
  }, [menuOpen, howToOpen, result]);

  const applyClearPowerup = useCallback(async (cells: Pos[], kind: 'bomb' | 'rowWipe') => {
    const cur = boardRef.current;
    if (!cur || busyRef.current || cells.length === 0) return;
    busyRef.current = true;
    onUsePowerup(kind);
    playSfx('clear');
    moveHaptic();
    await animateClear(cells, cur);
    addScore(cells.length * POWERUP_SCORE_PER_GEM);
    recordCleared(cells, cur);
    // Bomb/row blasts destroy crates outright (they're included in `cells`).
    const next = collapseAndRefill(damageBlockers(clearCells(cur, cells), cells), tileColors, rainbowChance, rainbowMax);
    maybeBlockerBonus(next);
    setBoard(next);
    await sleep(MOVE_MS + 30);
    await resolve(next);
  }, [addScore, animateClear, onUsePowerup, resolve, tileColors, rainbowChance, rainbowMax, recordCleared, maybeBlockerBonus]);

  const handleTargetPress = useCallback((e: GestureResponderEvent) => {
    const kind = armed;
    setArmed(null);
    if (!kind || busyRef.current || resultRef.current || !boardRef.current) return;
    const cur = boardRef.current;
    const r = Math.floor(e.nativeEvent.locationY / step);
    const c = Math.floor(e.nativeEvent.locationX / step);
    if (r < 0 || c < 0 || r >= rows || c >= cols) return;
    const cells = kind === 'bomb' ? bombCells(cur, { r, c }) : rowCells(cur, r);
    applyClearPowerup(cells, kind);
  }, [armed, step, rows, cols, applyClearPowerup]);

  const handleAddTime = useCallback(() => {
    if (busyRef.current || resultRef.current) return;
    if (powerups.addTime <= 0) return onEarnPowerup('addTime');
    onUsePowerup('addTime');
    timeRef.current += ADD_TIME_SECONDS;
    setTime(timeRef.current);
    playSfx('clear');
    moveHaptic();
  }, [powerups.addTime, onEarnPowerup, onUsePowerup]);

  const handleShuffle = useCallback(() => {
    const cur = boardRef.current;
    if (!cur || busyRef.current || resultRef.current) return;
    if (powerups.shuffle <= 0) return onEarnPowerup('shuffle');
    onUsePowerup('shuffle');
    setArmed(null);
    setBoard(shuffleBoard(cur, tileColors));
    playSfx('swap');
    selectHaptic();
  }, [powerups.shuffle, onEarnPowerup, onUsePowerup, tileColors]);

  const handleArm = useCallback((kind: 'bomb' | 'rowWipe') => {
    if (busyRef.current || resultRef.current) return;
    if (powerups[kind] <= 0) return onEarnPowerup(kind);
    setArmed((prev) => (prev === kind ? null : kind));
  }, [powerups, onEarnPowerup]);

  // Swipe a gem toward a neighbour to swap them.
  const pan = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !busyRef.current && !resultRef.current && !menuRef.current && !!boardRef.current,
      onMoveShouldSetPanResponder: (_e, g) => !busyRef.current && !resultRef.current && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
      onPanResponderGrant: (e) => {
        const r = Math.floor(e.nativeEvent.locationY / step);
        const c = Math.floor(e.nativeEvent.locationX / step);
        startCellRef.current = r >= 0 && c >= 0 && r < rows && c < cols ? { r, c } : null;
      },
      onPanResponderRelease: (_e, g) => {
        const from = startCellRef.current;
        startCellRef.current = null;
        if (!from) return;
        const adx = Math.abs(g.dx);
        const ady = Math.abs(g.dy);
        if (Math.max(adx, ady) < step * 0.35) return;
        const to = adx > ady ? { r: from.r, c: from.c + (g.dx > 0 ? 1 : -1) } : { r: from.r + (g.dy > 0 ? 1 : -1), c: from.c };
        if (to.r < 0 || to.c < 0 || to.r >= rows || to.c >= cols) return;
        attemptSwapRef.current(from, to);
      },
    }), [step, rows, cols]);

  const replay = useCallback(() => {
    scoreRef.current = 0;
    movesRef.current = level.moves;
    timeRef.current = level.seconds;
    posRef.current = {};
    collectedRef.current = {};
    blockerBonusRef.current = false;
    setCollected({});
    setScore(0);
    setMoves(level.moves);
    setTime(level.seconds);
    setMenuOpen(false);
    setResult(null);
    setWonStars(0);
    setBoard(makeBoard());
  }, [level, makeBoard]);

  const hasNext = levelId < MATCH_LEVEL_COUNT;
  const lowTime = time <= 10;

  return (
    <Screen themeKey="daily" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.sideL}>
          <Text style={styles.title} numberOfLines={1}>Match It</Text>
          <Text style={styles.level} numberOfLines={1}>Level {levelId}</Text>
          {tierLabel ? <Text style={[styles.tierTag, level.tier === 'super' && styles.tierTagSuper]} numberOfLines={1}>{tierLabel}</Text> : null}
        </View>
        <View style={styles.center}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum} numberOfLines={1}>{score}</Text>
              <Text style={styles.hudLabel} numberOfLines={1}>Score</Text>
            </View>
            <View style={styles.divider} />
            {objective === 'collect' && collect ? (
              <View style={styles.stat}>
                <View style={styles.collectRow}>
                  {collect.map((g) => {
                    const got = Math.min(collected[g.color] ?? 0, g.count)
                    const done = got >= g.count
                    return (
                      <View key={g.color} style={styles.collectChip}>
                        <GemTile color={g.color} size={14} />
                        <Text style={[styles.collectText, done && { color: colors.accent }]}>{done ? '✓' : `${got}/${g.count}`}</Text>
                      </View>
                    )
                  })}
                </View>
                <Text style={styles.hudLabel} numberOfLines={1}>Collect</Text>
              </View>
            ) : (
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.accent }]} numberOfLines={1}>{target}</Text>
                <Text style={styles.hudLabel} numberOfLines={1}>Goal</Text>
              </View>
            )}
          </View>
          {mode === 'moves' ? (
            <Text style={styles.movesText}>{moves} moves left</Text>
          ) : (
            <View style={[styles.timerPill, lowTime && styles.timerLow]}>
              <Icon name="clock" color={lowTime ? colors.danger : colors.inkSoft} size={16} />
              <Text style={[styles.timerText, lowTime && { color: colors.danger }]}>{clock(time)}</Text>
            </View>
          )}
        </View>
        <View style={styles.sideR}>
          <RoundBtn name="gear" size={46} onPress={() => setMenuOpen(true)} />
        </View>
      </View>

      <View style={styles.boardWrap} onLayout={onBoardLayout}>
        <View {...pan.panHandlers} style={{ width: cols * step - GAP, height: rows * step - GAP, overflow: 'visible' }}>
          {board?.map((row, r) =>
            row.map((tile, c) => {
              if (!tile) return null;
              const p = posRef.current[tile.id] ?? (posRef.current[tile.id] = { tx: new Animated.Value(c * step), ty: new Animated.Value(r * step - rows * step), scale: new Animated.Value(1) });
              return (
                <Animated.View key={tile.id} pointerEvents="none" style={[styles.tile, { width: cell, height: cell, transform: [{ translateX: p.tx }, { translateY: p.ty }, { scale: p.scale }] }]}>
                  {tile.kind === 'rainbow' ? <RainbowTile size={cell} /> : tile.kind === 'block' ? <BlockTile size={cell} hp={tile.hp ?? 2} /> : <GemTile color={tile.color} size={Math.round(cell * ART_SCALE)} />}
                </Animated.View>
              );
            }),
          )}
          {armed ? <Pressable style={StyleSheet.absoluteFill} onPress={handleTargetPress} accessibilityRole="button" accessibilityLabel={armed === 'bomb' ? 'Tap a gem to bomb' : 'Tap a row to wipe'} /> : null}
        </View>
        {flash ? (
          <Animated.View pointerEvents="none" style={[styles.combo, { opacity: comboAnim, transform: [{ scale: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
            <Text style={styles.comboText}>{flash}</Text>
          </Animated.View>
        ) : null}
      </View>

      {levelId >= POWERUP_LEVEL ? (
        <View style={styles.powerBar}>
          {armed ? <Text style={styles.powerHint}>{armed === 'bomb' ? 'Tap a gem to blast it and its neighbors' : 'Tap a row to clear it'} · timer paused</Text> : null}
          <View style={styles.powerRow}>
            <PowerupButton icon="clock" label="+30s" count={powerups.addTime} onPress={handleAddTime} />
            <PowerupButton icon="bomb" label="Bomb" count={powerups.bomb} active={armed === 'bomb'} onPress={() => handleArm('bomb')} />
            <PowerupButton icon="rowwipe" label="Row" count={powerups.rowWipe} active={armed === 'rowWipe'} onPress={() => handleArm('rowWipe')} />
            <PowerupButton icon="shuffle" label="Shuffle" count={powerups.shuffle} onPress={handleShuffle} />
          </View>
        </View>
      ) : null}

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.settingsCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Settings</Text>
            <Button title="How to Play" icon="info" variant="light" size="md" onPress={() => { setMenuOpen(false); setHowToOpen(true); }} />
            <Button title="Replay" icon="refresh" variant="light" size="md" onPress={replay} />
            <Button title="Change Level" icon="grid" variant="light" size="md" onPress={onChangeLevel} />
            <Button title="Exit Game" icon="back" variant="light" size="md" onPress={onExit} />
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: soundsEnabled }} onPress={() => onToggleSounds(!soundsEnabled)} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Music</Text>
              <Text style={[styles.toggleValue, soundsEnabled ? styles.toggleOn : styles.toggleOff]}>{soundsEnabled ? 'On' : 'Off'}</Text>
            </Pressable>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: sfxEnabled }} onPress={() => onToggleSfx(!sfxEnabled)} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Sound Effects</Text>
              <Text style={[styles.toggleValue, sfxEnabled ? styles.toggleOn : styles.toggleOff]}>{sfxEnabled ? 'On' : 'Off'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setMenuOpen(false)} style={styles.continueButton}>
              <Text style={styles.continueText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={howToOpen} animationType="fade" onRequestClose={() => setHowToOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.sparkle}><Icon name="gem" color={colors.accent} size={40} /></View>
            <Text style={styles.cardTitle}>How to Play</Text>
            <Text style={styles.howto}>Swipe a gem onto a neighbour to swap them. Line up 3 or more of the same kind in a row or column to clear them and score.{'\n\n'}Reach the goal before your moves or the timer run out. The faster you hit it, the more stars you earn.{'\n\n'}✦ Rainbow diamonds: swipe one onto any gem to clear every gem of that colour.{'\n\n'}Some levels ask you to COLLECT certain gems instead of chasing a score — watch the chips at the top. Wooden crates can’t be moved; clear gems next to them twice to break them.</Text>
            <View style={styles.actions}><Button title="Got it" onPress={() => setHowToOpen(false)} /></View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={!!result} animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={[styles.sparkle, result === 'lose' && { backgroundColor: '#FBEAE8' }]}>
              <Icon name={result === 'win' ? 'gem' : mode === 'timed' ? 'clock' : 'grid'} color={result === 'win' ? colors.accent : colors.danger} size={40} />
            </View>
            <Text style={styles.cardTitle}>{result === 'win' ? 'Goal Reached!' : mode === 'timed' ? 'Time’s Up' : 'Out of Moves'}</Text>
            {result === 'win' ? (
              <View style={styles.starRow}>{[0, 1, 2].map((i) => <Icon key={i} name="star" size={34} color={i < wonStars ? colors.star : colors.hairline} />)}</View>
            ) : null}
            <Text style={styles.cardSub}>{result === 'win' ? `${score} points` : objective === 'collect' && collect ? `Collected ${collect.map((g) => `${Math.min(collected[g.color] ?? 0, g.count)}/${g.count}`).join(' · ')} — so close!` : `${score} / ${target} — so close!`}</Text>
            {bestScore ? <Text style={styles.best}>Best: {Math.max(bestScore, score)}</Text> : null}
            {result === 'lose' ? (
              <>
                <Text style={styles.continueHint}>Stock up power-ups for your retry</Text>
                <View style={styles.powerRowModal}>
                  <PowerupButton icon="clock" label="+30s" count={powerups.addTime} onPress={() => onEarnPowerup('addTime')} />
                  <PowerupButton icon="bomb" label="Bomb" count={powerups.bomb} onPress={() => onEarnPowerup('bomb')} />
                  <PowerupButton icon="rowwipe" label="Row" count={powerups.rowWipe} onPress={() => onEarnPowerup('rowWipe')} />
                  <PowerupButton icon="shuffle" label="Shuffle" count={powerups.shuffle} onPress={() => onEarnPowerup('shuffle')} />
                </View>
                <Text style={styles.continueTitle}>Keep going?</Text>
                <View style={[styles.actions, { marginTop: 10 }]}>
                  <Button title={`Watch Ad · ${mode === 'timed' ? `+${CONTINUE_AD_TIME}s` : `+${CONTINUE_AD_MOVES} moves`}`} icon="play" variant="gold" onPress={handleAdContinue} />
                  {CONSUMABLE_IAP_AVAILABLE ? (
                    <>
                      <Button title={`Buy ${CONTINUE_BUY_PRICE}`} icon="crown" variant="primary" onPress={handleBuyContinue} />
                      <Text style={styles.buyDetail}>{mode === 'timed' ? `+${CONTINUE_BUY_TIME}s` : `+${CONTINUE_BUY_MOVES} moves`} & {CONTINUE_BUY_POWERUPS} of each power-up</Text>
                    </>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <Button title="Try Again" icon="refresh" variant="light" onPress={() => { if (!continuingRef.current) replay(); }} />
                  <Button title="Exit" icon="back" variant="light" onPress={onExit} />
                </View>
              </>
            ) : (
              <View style={styles.actions}>
                {hasNext ? <Button title="Next Level" icon="play" onPress={() => onPlayLevel(levelId + 1)} /> : null}
                <Button title="Replay" icon="refresh" variant="light" onPress={replay} />
                <Button title="Exit" icon="back" variant="light" onPress={onExit} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// The gem art has ~50% transparent padding inside its 48-unit viewBox; crop to
// the content box so each gem fills its cell instead of floating in whitespace.
const GEM_ART = ITEM_ART.gems.map((svg) => svg.replace('viewBox="0 0 48 48"', 'viewBox="9 9 30 30"'));

const GemTile = React.memo(({ color, size }: { color: number; size: number }) => {
  const xml = GEM_ART[color % GEM_ART.length];
  return <SvgXml xml={xml} width={size} height={size} />;
});
GemTile.displayName = 'GemTile';

// Rainbow diamond — a distinct multi-hue diamond tile. Swipe it onto a gem to clear
// that gem's whole colour. Hues are intentionally decorative (a rainbow needs many).
const RAINBOW_DIAMOND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs><linearGradient id="rb" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#E5616B"/><stop offset="0.1667" stop-color="#E5616B"/>
    <stop offset="0.1667" stop-color="#F2A45C"/><stop offset="0.3333" stop-color="#F2A45C"/>
    <stop offset="0.3333" stop-color="#F2C14E"/><stop offset="0.5" stop-color="#F2C14E"/>
    <stop offset="0.5" stop-color="#7FB069"/><stop offset="0.6667" stop-color="#7FB069"/>
    <stop offset="0.6667" stop-color="#6FA3BC"/><stop offset="0.8333" stop-color="#6FA3BC"/>
    <stop offset="0.8333" stop-color="#9B7EDE"/><stop offset="1" stop-color="#9B7EDE"/>
  </linearGradient></defs>
  <path d="M24 3 L45 24 L24 45 L3 24 Z" fill="url(#rb)" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <path d="M24 15 L26.5 21.5 L33 24 L26.5 26.5 L24 33 L21.5 26.5 L15 24 L21.5 21.5 Z" fill="#FFFFFF" opacity="0.85"/>
</svg>`;
const RainbowTile = ({ size }: { size: number }) => <SvgXml xml={RAINBOW_DIAMOND_SVG} width={size} height={size} />;

// Blocker crate — can't be swapped or matched; breaks after 2 adjacent matches.
// The cracked variant shows at 1 hp so progress is visible.
const CRATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect x="4" y="4" width="40" height="40" rx="7" fill="#C49A6C" stroke="#8A6240" stroke-width="3"/>
  <path d="M4 24h40M24 4v40" stroke="#8A6240" stroke-width="2.5"/>
  <rect x="9" y="9" width="30" height="30" rx="4" fill="none" stroke="#A87E52" stroke-width="2"/>
</svg>`;
const CRATE_CRACKED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect x="4" y="4" width="40" height="40" rx="7" fill="#C49A6C" stroke="#8A6240" stroke-width="3"/>
  <path d="M4 24h40M24 4v40" stroke="#8A6240" stroke-width="2.5"/>
  <rect x="9" y="9" width="30" height="30" rx="4" fill="none" stroke="#A87E52" stroke-width="2"/>
  <path d="M12 10l8 9-5 7 9 12M36 12l-7 10 6 8" stroke="#6E4D30" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`;
const BlockTile = ({ size, hp }: { size: number; hp: number }) => <SvgXml xml={hp <= 1 ? CRATE_CRACKED_SVG : CRATE_SVG} width={size} height={size} />;

const PowerupButton = ({ icon, label, count, active = false, onPress }: { icon: IconName; label: string; count: number; active?: boolean; onPress: () => void }) => {
  const empty = count <= 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${empty ? 'watch ad to earn' : `${count} left`}`}
      onPress={onPress}
      style={({ pressed }) => [styles.powerBtn, pressed && styles.powerBtnPressed]}
    >
      <View style={[styles.powerCircle, active && styles.powerCircleActive]}>
        <Icon name={icon} size={24} color={empty ? colors.inkFaint : colors.ink} />
        <View style={[styles.powerBadge, empty && styles.powerBadgeAd]}>
          {empty ? <Icon name="play" size={11} color={colors.surface} /> : <Text style={styles.powerBadgeText}>{count}</Text>}
        </View>
      </View>
      <Text style={[styles.powerLabel, empty && styles.powerLabelEmpty]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8 },
  sideL: { flex: 0.9, alignItems: 'flex-start' },
  center: { flex: 1.7, alignItems: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  stat: { alignItems: 'center', flexShrink: 1 },
  statNum: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.ink, lineHeight: 26 },
  divider: { width: 1.5, height: 30, backgroundColor: colors.inkSoft, marginHorizontal: 14 },
  sideR: { flex: 0.7, alignItems: 'flex-end' },
  title: { fontFamily: fonts.displayHeavy, fontSize: 16, color: colors.ink },
  level: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  tierTag: { marginTop: 4, alignSelf: 'flex-start', fontFamily: fonts.body, fontSize: 10, color: colors.surface, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  tierTagSuper: { backgroundColor: colors.danger },
  movesText: { fontFamily: fonts.display, fontSize: 14, color: colors.ink, marginTop: 4, textAlign: 'center' },
  hudLabel: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 1 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginTop: 4, shadowColor: colors.hairline, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  timerLow: { backgroundColor: '#FBEAE8' },
  timerText: { fontFamily: fonts.display, fontSize: 16, color: colors.inkSoft },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginHorizontal: -14, paddingBottom: BOTTOM_INSET, overflow: 'visible' },
  tile: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  collectRow: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  collectChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  collectText: { fontFamily: fonts.displayHeavy, fontSize: 12, color: colors.ink },
  combo: { position: 'absolute', top: '34%', left: 0, right: 0, alignItems: 'center' },
  comboText: { fontFamily: fonts.displayHeavy, fontSize: 28, color: colors.star, backgroundColor: 'rgba(58,74,72,0.9)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
  powerBar: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8, alignItems: 'center', transform: Platform.OS === 'android' ? [{ translateY: 0 }] : [] },
  powerHint: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.accentDark, marginBottom: 6, textAlign: 'center' },
  powerRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  powerBtn: { alignItems: 'center', width: 64 },
  powerBtnPressed: { opacity: 0.7 },
  powerCircle: { width: 52, height: 52, borderRadius: 999, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.hairline, shadowColor: colors.hairline, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  powerCircleActive: { borderColor: colors.accent, backgroundColor: colors.surfaceSoft },
  powerBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  powerBadgeAd: { backgroundColor: colors.inkSoft },
  powerBadgeText: { fontFamily: fonts.body, fontSize: 11, color: colors.surface },
  powerLabel: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.inkSoft, marginTop: 4 },
  powerLabelEmpty: { color: colors.inkFaint },
  powerRowModal: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  continueTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 10, marginBottom: 4 },
  continueHint: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.inkSoft, marginTop: 14, marginBottom: 10, textAlign: 'center' },
  buyDetail: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.inkSoft, textAlign: 'center', marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(59,74,72,0.34)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(50, 37, 24, 0.36)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  settingsCard: { width: '100%', maxWidth: 340, borderRadius: 28, backgroundColor: colors.surface, padding: 20, gap: 12, shadowColor: colors.ink, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 8 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  toggleRow: { minHeight: 50, borderRadius: 16, backgroundColor: '#FFF8EC', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, fontWeight: '900', color: colors.ink },
  toggleValue: { fontSize: 16, fontWeight: '900' },
  toggleOn: { color: colors.primaryDark },
  toggleOff: { color: colors.inkFaint },
  continueButton: { alignItems: 'center', paddingVertical: 10 },
  continueText: { fontSize: 16, fontWeight: '900', color: colors.inkSoft },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: 30, padding: 24, alignItems: 'center' },
  sparkle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { marginTop: 12, fontSize: 30, fontFamily: fonts.displayHeavy, color: colors.ink },
  starRow: { marginTop: 14, flexDirection: 'row', gap: 8 },
  cardSub: { marginTop: 10, fontSize: 16, fontFamily: fonts.body, color: colors.inkSoft },
  howto: { marginTop: 12, fontSize: 15, lineHeight: 22, fontFamily: fonts.bodyMed, color: colors.inkSoft, textAlign: 'center' },
  best: { marginTop: 4, fontSize: 14, fontFamily: fonts.body, color: colors.inkSoft },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 18 },
});
