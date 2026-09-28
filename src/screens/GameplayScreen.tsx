import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { RoundBtn } from '../components/RoundBtn';
import { Screen } from '../components/Screen';
import { Shelf } from '../components/Shelf';
import { Tube } from '../components/Tube';
import { cloneLayout, countItems, findHint, hasSameItemCounts, SlotPosition, validateLevelData } from '../game/logic';
import { getLevel, Level, ShelfLayout, SlotItem } from '../game/levels';
import { classicRuleset, Ruleset } from '../game/ruleset';
import { formatTime, timeStars } from '../game/scoring';
import { findTubeHint } from '../game/tubes';
import { moveHaptic, selectHaptic, shelfDoneHaptic, winHaptic } from '../lib/haptics';
import { playSfx } from '../services/sfx';
import { showExtraMovesReward, showHintReward } from '../services/ads';
import { HINT_COST, StarInfoModal } from '../components/StarInfoModal';
import { colors, fonts, ThemeKey, themes } from '../theme/theme';

const SCREEN_W = Dimensions.get('window').width;

function isShelfComplete(shelf: SlotItem[], capacity: number): boolean {
  const items = shelf.filter((item) => item !== null);
  return items.length === capacity && items.every((item) => item === items[0]);
}

const FREE_UNDOS_PER_LEVEL = 1; // hard cap — same for everyone, no ad top-up

type Props = {
  levelId: number;
  themeKey: ThemeKey;
  soundsEnabled: boolean;
  sfxEnabled: boolean;
  onExitLevel: () => void;
  onExitGame: () => void;
  onToggleSounds: (enabled: boolean) => void;
  onToggleSfx: (enabled: boolean) => void;
  onWin: (moves: number, stars: number, seconds: number) => void;
  ruleset?: Ruleset;
  isMember?: boolean;
  levelOverride?: Level;
  stars?: number;
  onSpendStars?: (amount: number) => void;
  onBuyStars?: (amount: number) => void;
  timerEnabled?: boolean;
};


function samePosition(a: SlotPosition | null, b: SlotPosition): boolean {
  return a?.shelf === b.shelf && a.slot === b.slot;
}

export function GameplayScreen({ levelId, themeKey, soundsEnabled, sfxEnabled, onExitLevel, onExitGame, onToggleSounds, onToggleSfx, onWin, ruleset = classicRuleset, isMember = false, levelOverride, stars = 0, onSpendStars, onBuyStars, timerEnabled = false }: Props) {
  const level = useMemo(() => levelOverride ?? getLevel(levelId), [levelId, levelOverride]);
  const [layout, setLayout] = useState<ShelfLayout>(() => cloneLayout(level.start));
  const [selectedItem, setSelectedItem] = useState<SlotPosition | null>(null);
  const [moves, setMoves] = useState(0);
  const [extraMoves, setExtraMoves] = useState(0);
  const [infoVisible, setInfoVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [noMoreMovesVisible, setNoMoreMovesVisible] = useState(false);
  const [secondAdPromptVisible, setSecondAdPromptVisible] = useState(false);
  const [justCompletedShelf, setJustCompletedShelf] = useState<number | null>(null);
  const [history, setHistory] = useState<{ layout: ShelfLayout; moves: number }[]>([]);
  const [undosLeft, setUndosLeft] = useState(FREE_UNDOS_PER_LEVEL);
  const [hint, setHint] = useState<SlotPosition | null>(null);
  const [hintTo, setHintTo] = useState<SlotPosition | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [starInfoVisible, setStarInfoVisible] = useState(false);
  // Pro perk: the first hint of each level is free. After that Pro pays stars
  // or watches an ad like everyone else.
  const [freeHintUsed, setFreeHintUsed] = useState(false);
  const freeHintAvailable = isMember && !freeHintUsed;
  const moveLimit = level.maxMoves ? level.maxMoves + extraMoves : undefined;
  const noMoreMovesActive = noMoreMovesVisible || secondAdPromptVisible;
  const theme = themes[themeKey];
  const moveGoalText = moveLimit ? `${moves}/${moveLimit} moves` : `${moves} moves`;
  const timerRunning = timerEnabled && !won && !infoVisible && !settingsVisible && !noMoreMovesActive;

  // A hint's highlight runs on timers (pick-up tube, then pour-into tube, then
  // off). They're tracked so a move, undo, restart or level change cancels them —
  // otherwise a stale ring could flash on a board that has already changed, or
  // cut a second, paid hint short. While any are pending the hint is still on
  // screen, which is also what stops a double tap from paying twice.
  const hintTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  function clearHint() {
    hintTimers.current.forEach(clearTimeout);
    hintTimers.current = [];
    setHint(null);
    setHintTo(null);
  }
  function hintLater(ms: number, action: () => void) {
    const id = setTimeout(() => {
      hintTimers.current = hintTimers.current.filter((t) => t !== id);
      action();
    }, ms);
    hintTimers.current.push(id);
  }
  useEffect(() => () => hintTimers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // Soft "you're stuck" cue when the out-of-moves prompt appears (not a hard loss).
  useEffect(() => {
    if (!noMoreMovesVisible) return;
    playSfx('lose');
    moveHaptic();
  }, [noMoreMovesVisible]);

  useEffect(() => {
    validateLevelData(level);
    setLayout(cloneLayout(level.start));
    setSelectedItem(null);
    setMoves(0);
    setExtraMoves(0);
    setInfoVisible(false);
    setSettingsVisible(false);
    setNoMoreMovesVisible(false);
    setSecondAdPromptVisible(false);
    setHistory([]);
    setUndosLeft(FREE_UNDOS_PER_LEVEL);
    setFreeHintUsed(false);
    clearHint();
    setElapsed(0);
    setWon(false);
  }, [level]);

  function restart() {
    setLayout(cloneLayout(level.start));
    setSelectedItem(null);
    setMoves(0);
    setExtraMoves(0);
    setSettingsVisible(false);
    setNoMoreMovesVisible(false);
    setSecondAdPromptVisible(false);
    setHistory([]);
    setUndosLeft(FREE_UNDOS_PER_LEVEL);
    setFreeHintUsed(false);
    clearHint();
    setElapsed(0);
    setWon(false);
  }

  // From the settings menu: explain the deal first. The prompt's own button plays
  // the ad. (This used to play an ad here too, so +3 moves cost two ads.)
  function showNeedMoreMovesPrompt() {
    setSettingsVisible(false);
    setNoMoreMovesVisible(false);
    setSecondAdPromptVisible(true);
  }

  function addRewardedMoves() {
    showExtraMovesReward(() => {
      setExtraMoves((value) => value + 3);
      setSecondAdPromptVisible(false);
      setNoMoreMovesVisible(false);
      setSettingsVisible(false);
    });
  }

  function cancelMovesPrompt() {
    setSecondAdPromptVisible(false);
    if (moveLimit !== undefined && moves >= moveLimit) setNoMoreMovesVisible(true);
  }

  function performMove(from: SlotPosition, to: SlotPosition) {
    if (noMoreMovesActive) return;
    if (!validateLevelData(level)) return;
    if (!hasSameItemCounts(level.start, layout)) {
      console.warn('[Little Sort] Invalid board state: current item counts no longer match the loaded level.', { expected: countItems(level.start), actual: countItems(layout) });
      return;
    }

    const next = ruleset.applyMove(layout, from, to);
    if (next === layout) return;

    setHistory((stack) => [...stack, { layout, moves }]);
    const nextMoves = moves + 1;
    const completed = ruleset.isComplete(next, level);
    const shelfJustCompleted = !isShelfComplete(layout[to.shelf], level.capacity) && isShelfComplete(next[to.shelf], level.capacity);

    setLayout(next);
    setMoves(nextMoves);
    setSelectedItem(null);
    clearHint();

    if (completed) {
      setWon(true);
      winHaptic();
      playSfx('win');
      const stars = timerEnabled ? timeStars(level, elapsed) : moveLimit && nextMoves > moveLimit ? 2 : 3;
      setTimeout(() => onWin(nextMoves, stars, elapsed), 350);
      return;
    }

    if (shelfJustCompleted) {
      shelfDoneHaptic();
      playSfx('clear');
      setJustCompletedShelf(to.shelf);
      setTimeout(() => setJustCompletedShelf(null), 600);
    } else {
      moveHaptic();
      playSfx('swap');
    }

    if (moveLimit && nextMoves >= moveLimit) setNoMoreMovesVisible(true);
  }

  function performUndo() {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setLayout(previous.layout);
    setMoves(previous.moves);
    setSelectedItem(null);
    clearHint();
    setNoMoreMovesVisible(false);
    setSecondAdPromptVisible(false);
    setHistory((stack) => stack.slice(0, -1));
    selectHaptic();
  }

  function showHint() {
    // No hint once the board is won (the win popup opens a beat later), and none
    // while the last one is still on screen — a double tap must not pay twice.
    if (noMoreMovesActive || won || hintTimers.current.length > 0) return;
    const move = isTubes ? findTubeHint(layout) : findHint(layout);
    if (!move) return;
    const reveal = () => {
      clearHint();
      setSelectedItem(null);
      selectHaptic();
      if (isTubes) {
        // Shown in the order you'd actually play it: first the tube to pick up
        // from (gold), then the tube to pour into (green). It used to show the
        // destination first, which read backwards — "this empty tube, then that
        // ball" instead of "take this ball, put it there".
        setHint(move.from);
        hintLater(1500, () => {
          setHint(null);
          setHintTo(move.to);
        });
        hintLater(3000, () => setHintTo(null));
      } else {
        setHint(move.from);
        hintLater(3000, () => setHint(null));
      }
    };
    if (freeHintAvailable) {
      setFreeHintUsed(true);
      reveal();
      return;
    }
    if (stars >= HINT_COST) {
      onSpendStars?.(HINT_COST);
      reveal();
      return;
    }
    showHintReward(reveal);
  };

  function handleUndo() {
    if (history.length === 0 || undosLeft <= 0) return;
    setUndosLeft((value) => value - 1);
    performUndo();
  }

  function handleSlotPress(position: SlotPosition) {
    if (noMoreMovesActive) return;

    const sel = ruleset.select(layout, position);

    if (selectedItem === null) {
      if (sel) {
        selectHaptic();
        playSfx('swap');
        setSelectedItem(sel);
      }
      return;
    }

    if (sel && samePosition(selectedItem, sel)) {
      setSelectedItem(null);
      return;
    }

    if (ruleset.canMove(layout, selectedItem, position)) {
      performMove(selectedItem, position);
      return;
    }

    if (sel) {
      selectHaptic();
      playSfx('swap');
      setSelectedItem(sel);
    } else {
      setSelectedItem(null);
    }
  }

  function exitLevel() {
    setSettingsVisible(false);
    setNoMoreMovesVisible(false);
    setSecondAdPromptVisible(false);
    onExitLevel();
  }

  function exitGame() {
    setSettingsVisible(false);
    setNoMoreMovesVisible(false);
    setSecondAdPromptVisible(false);
    onExitGame();
  }

  const isTubes = ruleset.mode === 'tubes';
  // Split tubes into balanced rows: up to 4 stay on one row; 5+ split into two
  // even rows (top gets the extra), e.g. 5 -> 3+2, 6 -> 3+3, 7 -> 4+3.
  const tubesPerRow = isTubes ? (layout.length <= 4 ? layout.length : Math.ceil(layout.length / 2)) : 0;
  const tubeWidth = tubesPerRow ? Math.max(40, Math.min(66, Math.floor((SCREEN_W - 40 - (tubesPerRow - 1) * 12) / tubesPerRow))) : 0;
  const tubeRows: { tube: SlotItem[]; index: number }[][] = [];
  if (isTubes) for (let i = 0; i < layout.length; i += tubesPerRow) tubeRows.push(layout.slice(i, i + tubesPerRow).map((tube, j) => ({ tube, index: i + j })));

  return <Screen themeKey={themeKey} style={styles.container}>
    <View style={styles.header}>
      <View style={styles.headerActionsLeft}>
        <RoundBtn name="info" size={42} onPress={() => setInfoVisible(true)} />
      </View>
      <View style={styles.headerTitle}>
        <Text style={styles.title} numberOfLines={1}>{level.id === 0 ? level.name : `Level ${level.id}`}</Text>
        <Text style={styles.theme} numberOfLines={1}>{theme.emoji} {theme.name}</Text>
        <Text style={[styles.moveGoalText, moveLimit !== undefined && moves >= moveLimit && styles.limitOver]}>{timerEnabled ? `⏱ ${formatTime(elapsed)}  ·  ` : ''}{moveGoalText}</Text>
      </View>
      <View style={styles.headerActions}>
        <RoundBtn name="gear" size={42} onPress={() => setSettingsVisible(true)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${stars} hint stars`}
          onPress={() => setStarInfoVisible(true)}
          style={styles.starPill}
        >
          <Icon name="star" color={colors.star} size={13} />
          <Text style={styles.starPillText} accessibilityElementsHidden>{stars}</Text>
        </Pressable>
      </View>
    </View>

    <View style={styles.board}>
      <View style={isTubes ? undefined : styles.boardShift}>
        {isTubes ? (
          <View style={styles.tubeBoard}>{tubeRows.map((row, ri) => <View key={ri} style={styles.tubeRow}>{row.map(({ tube, index }) => <Tube key={index} items={tube} tubeIndex={index} capacity={level.capacity} width={tubeWidth} selected={selectedItem?.shelf === index} celebrate={justCompletedShelf === index} hint={hint?.shelf === index} hintTo={hintTo?.shelf === index} themeKey={themeKey} onPress={(i) => handleSlotPress({ shelf: i, slot: 0 })} />)}</View>)}</View>
        ) : (
          <View style={styles.boardShelves}>{layout.map((shelf, index) => <Shelf key={index} items={shelf} shelfIndex={index} selected={selectedItem} hint={hint} onSlotPress={handleSlotPress} themeKey={themeKey} celebrate={justCompletedShelf === index} showTargets={ruleset.mode === 'classic'} />)}</View>
        )}
      </View>
    </View>

    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Get a hint" disabled={noMoreMovesActive} onPress={showHint} style={({ pressed }) => [styles.actionBtn, noMoreMovesActive && styles.actionDisabled, pressed && styles.actionPressed]}>
        <Text style={styles.actionText}>💡 Hint{freeHintAvailable ? '' : stars >= HINT_COST ? ` · ${HINT_COST}⭐` : ' · Ad'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Undo last move" disabled={history.length === 0 || undosLeft <= 0 || noMoreMovesActive} onPress={handleUndo} style={({ pressed }) => [styles.actionBtn, (history.length === 0 || undosLeft <= 0 || noMoreMovesActive) && styles.actionDisabled, pressed && styles.actionPressed]}>
        <Text style={styles.actionText}>↶ Undo</Text>
      </Pressable>
    </View>

    <Modal transparent visible={infoVisible} animationType="fade" onRequestClose={() => setInfoVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>How to play</Text>
          <Text style={styles.modalMessage}>{isTubes ? 'Tap a tube to lift its top piece, then tap another tube to pour it on. A tube only accepts a piece if it’s empty or its top matches. Fill each tube with a single kind to win.' : 'Tap an item to select it. Then tap any empty slot to move that exact item there. Mismatched shelves are allowed while you play; win when every non-empty shelf has only one item type.'}</Text>
          <Button title="Got it" variant="primary" size="md" onPress={() => setInfoVisible(false)} />
        </View>
      </View>
    </Modal>

    <Modal transparent visible={settingsVisible} animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setSettingsVisible(false)}>
        <Pressable style={styles.settingsCard} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>Settings</Text>
          <Button title="Replay" icon="refresh" variant="light" size="md" onPress={restart} />
          <Button title="Change Level" icon="grid" variant="light" size="md" onPress={exitLevel} />
          <Button title="Exit Game" icon="back" variant="light" size="md" onPress={exitGame} />
          {level.maxMoves ? <Button title="Watch Ad for Free Moves" icon="play" variant="gold" size="md" onPress={showNeedMoreMovesPrompt} /> : null}
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: soundsEnabled }} onPress={() => onToggleSounds(!soundsEnabled)} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Music</Text>
            <Text style={[styles.toggleValue, soundsEnabled ? styles.toggleOn : styles.toggleOff]}>{soundsEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: sfxEnabled }} onPress={() => onToggleSfx(!sfxEnabled)} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Sound Effects</Text>
            <Text style={[styles.toggleValue, sfxEnabled ? styles.toggleOn : styles.toggleOff]}>{sfxEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setSettingsVisible(false)} style={styles.continueButton}>
            <Text style={styles.continueText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>

    <Modal transparent visible={noMoreMovesVisible} animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.modalOverlay}>
        <View style={styles.loseCard}>
          <View style={styles.loseSparkle}>
            <Icon name="grid" color={colors.danger} size={40} />
          </View>
          <Text style={styles.loseTitle}>Out of Moves</Text>
          <Text style={styles.loseSub}>{moves}/{moveLimit} moves — so close!</Text>
          <View style={styles.loseActions}>
            <Button title="Watch Ad · +3 Moves" icon="play" variant="gold" onPress={addRewardedMoves} />
            <Button title="Replay" icon="refresh" variant="light" onPress={restart} />
            <Button title="Levels" icon="grid" variant="light" onPress={exitLevel} />
            <Button title="Home" icon="back" variant="light" onPress={exitGame} />
          </View>
        </View>
      </View>
    </Modal>

    <StarInfoModal visible={starInfoVisible} stars={stars} onClose={() => setStarInfoVisible(false)} onBuyStars={onBuyStars} />

    <Modal transparent visible={secondAdPromptVisible} animationType="fade" onRequestClose={() => setSecondAdPromptVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.loseCard}>
          <View style={[styles.loseSparkle, { backgroundColor: '#FBF3E4' }]}>
            <Icon name="play" color={colors.goldDark} size={36} />
          </View>
          <Text style={styles.loseTitle}>Need more moves?</Text>
          <Text style={styles.loseSub}>Watch an ad to get +3 moves.</Text>
          <View style={styles.loseActions}>
            <Button title="Watch Ad · +3 Moves" icon="play" variant="gold" onPress={addRewardedMoves} />
            <Button title="Cancel" variant="light" onPress={cancelMovesPrompt} />
          </View>
        </View>
      </View>
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  container: { paddingTop: 14, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, minHeight: 80, marginBottom: 8, paddingTop: 8 },
  headerActionsLeft: { width: 64, alignItems: 'flex-start' },
  headerTitle: { flex: 1, alignItems: 'center', paddingTop: 4 },
  headerActions: { width: 64, alignItems: 'flex-end', gap: 8 },
  starPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.surface },
  starPillText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  title: { fontSize: 25, fontFamily: fonts.displayHeavy, color: colors.ink },
  theme: { marginTop: 2, fontSize: 12, fontWeight: '800', color: colors.inkSoft },
  moveGoalText: { marginTop: 5, textAlign: 'center', color: colors.inkSoft, fontWeight: '900' },
  limitOver: { color: colors.danger },
  board: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardShift: { transform: Platform.OS === 'android' ? [{ translateY: -80 }] : [] },
  boardShelves: { alignItems: 'center', justifyContent: 'center' },
  tubeBoard: { alignItems: 'center', gap: 18 },
  tubeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8, marginLeft: 8 },
  controls: { minHeight: 42, marginTop: 8, paddingBottom: 12, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', transform: Platform.OS === 'android' ? [{ translateY: 0 }] : [] },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  actionText: { fontSize: 15, fontWeight: '900', color: colors.ink },
  actionDisabled: { opacity: 0.4 },
  actionPressed: { transform: [{ translateY: 2 }] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(50, 37, 24, 0.36)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loseCard: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 30, padding: 24, alignItems: 'center', shadowColor: colors.ink, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 8 },
  loseSparkle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FBEAE8', alignItems: 'center', justifyContent: 'center' },
  loseTitle: { marginTop: 12, fontSize: 30, fontFamily: fonts.displayHeavy, color: colors.ink },
  loseSub: { marginTop: 10, fontSize: 16, fontFamily: fonts.body, color: colors.inkSoft, textAlign: 'center' },
  loseActions: { alignSelf: 'stretch', gap: 12, marginTop: 18 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 28, backgroundColor: colors.surface, padding: 22, gap: 16, shadowColor: colors.ink, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 8 },
  settingsCard: { width: '100%', maxWidth: 340, borderRadius: 28, backgroundColor: colors.surface, padding: 20, gap: 12, shadowColor: colors.ink, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 8 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  modalMessage: { fontSize: 16, fontWeight: '700', color: colors.inkSoft, lineHeight: 24, textAlign: 'center' },
  continueButton: { alignItems: 'center', paddingVertical: 10 },
  continueText: { fontSize: 16, fontWeight: '900', color: colors.inkSoft },
  toggleRow: { minHeight: 50, borderRadius: 16, backgroundColor: '#FFF8EC', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, fontWeight: '900', color: colors.ink },
  toggleValue: { fontSize: 16, fontWeight: '900' },
  toggleOn: { color: colors.primaryDark },
  toggleOff: { color: colors.inkFaint },
});
