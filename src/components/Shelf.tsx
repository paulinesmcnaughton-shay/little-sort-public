import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { ShelfLayout } from '../game/levels';
import { SlotPosition } from '../game/logic';
import { colors, ThemeKey, themes } from '../theme/theme';
import { ShelfItem } from './ShelfItem';

const SCREEN_W = Dimensions.get('window').width;
const SIDE_MARGIN = 16; // breathing room from the screen edges
const MAX_SLOT = 52; // the standard (3-wide) tile size — keep tiles this big

// Gap between slots narrows as a row gets more crowded, so wider rows (up to 8)
// still fit without shrinking tiles more than necessary.
function gapFor(cols: number): number {
  if (cols <= 4) return 8;
  if (cols <= 6) return 6;
  return 4;
}

// Keep tiles full size; widen the row toward the 16px margins for more columns.
// Only shrink when even a full-width row can't fit the tiles (e.g. 7-wide on a small phone).
function slotSizeFor(cols: number): number {
  const gap = gapFor(cols);
  const avail = SCREEN_W - SIDE_MARGIN * 2 - gap * (cols - 1);
  return Math.max(30, Math.min(MAX_SLOT, Math.floor(avail / cols)));
}

export function Shelf({ items, shelfIndex, selected, hint, onSlotPress, themeKey, celebrate, showTargets = true }: { items: ShelfLayout[number]; shelfIndex: number; selected?: SlotPosition | null; hint?: SlotPosition | null; onSlotPress?: (position: SlotPosition) => void; themeKey?: ThemeKey; celebrate?: boolean; showTargets?: boolean }) {
  const hasSelection = selected != null && showTargets;
  const wood = themes[themeKey ?? 'kitchen'];
  const gap = gapFor(items.length);
  const size = slotSizeFor(items.length);
  const itemSize = Math.round(size * 0.86);
  return (
    <View style={[styles.wrap, celebrate && styles.celebrate]}>
      <View style={[styles.slots, { gap, minHeight: size + 2 }]}>{items.map((item, slotIndex) => {
        const position = { shelf: shelfIndex, slot: slotIndex };
        const isSelected = selected?.shelf === shelfIndex && selected.slot === slotIndex;
        const isHinted = hint?.shelf === shelfIndex && hint.slot === slotIndex;
        const isTarget = item === null && hasSelection;
        return <Pressable key={slotIndex} onPress={() => onSlotPress?.(position)} style={[styles.slot, { width: size, height: size, borderRadius: size / 2 }, item === null && styles.emptySlot, isTarget && styles.validTarget, isHinted && styles.hintSlot]}>{item ? <ShelfItem type={item} size={itemSize} selected={isSelected} themeKey={themeKey} /> : null}</Pressable>;
      })}</View>
      <View style={[styles.plank, { backgroundColor: wood.shelf, borderBottomColor: wood.shelfEdge }, celebrate && styles.plankCelebrate]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 3, borderRadius: 20, marginVertical: 2 },
  celebrate: { backgroundColor: '#E6F7EC' },
  slots: { flexDirection: 'row', justifyContent: 'center' },
  slot: { backgroundColor: colors.slot, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  emptySlot: { borderColor: '#EADBC4', borderStyle: 'dashed', backgroundColor: '#FFF8EC' },
  validTarget: { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: '#EBFAF1' },
  hintSlot: { borderColor: colors.primaryDark, backgroundColor: '#F0FFF6' },
  plank: { height: 10, borderRadius: 8, backgroundColor: colors.shelf, borderBottomWidth: 5, borderBottomColor: colors.shelfEdge, marginTop: -2, alignSelf: 'stretch' },
  plankCelebrate: { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark },
});
