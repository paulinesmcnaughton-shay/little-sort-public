import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ItemType, SlotItem, VALID_ITEM_TYPES } from '../game/levels';
import { colors, ITEM_COLORS, ThemeKey } from '../theme/theme';
import { itemArtXml } from './ShelfItem';

const OUTLINE = 3;
// The lip is 4 wider than the glass on each side; the hint ring lines up with it.
const HINT_OUTSET = 4;

const colorFor = (type: ItemType) => {
  const i = VALID_ITEM_TYPES.indexOf(type);
  return ITEM_COLORS[(i < 0 ? 0 : i) % ITEM_COLORS.length];
};

// A vertical glass test-tube. Items stack from the bottom (slot 0) up; the top
// item lifts when the tube is selected. Tapping anywhere acts on the whole tube.
export function Tube({ items, tubeIndex, capacity, width, selected, celebrate, hint, hintTo, onPress, themeKey }: { items: SlotItem[]; tubeIndex: number; capacity: number; width: number; selected?: boolean; celebrate?: boolean; hint?: boolean; hintTo?: boolean; onPress?: (index: number) => void; themeKey?: ThemeKey }) {
  const filled = items.filter((x): x is ItemType => x !== null); // bottom -> top
  const stacked = filled.slice().reverse(); // render top -> bottom
  const inner = width - OUTLINE * 2;
  const segH = inner;
  const bodyH = segH * capacity + OUTLINE * 2;
  const radius = inner / 2;

  // Hints pulse slowly so "pick up here" (gold) and "pour here" (green) read as
  // two distinct tubes rather than a single quick flash.
  const pulse = useRef(new Animated.Value(0.35)).current;
  const hinted = hint || hintTo;
  useEffect(() => {
    if (!hinted) {
      pulse.setValue(0.35);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.35, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hinted]);

  const bottomRadius = { borderBottomLeftRadius: width / 2, borderBottomRightRadius: width / 2 };

  return (
    <Pressable onPress={() => onPress?.(tubeIndex)} style={styles.wrap} accessibilityRole="button" accessibilityLabel={`Tube ${tubeIndex + 1}`}>
      <View style={[styles.rim, { width: width + 8, height: 9, borderColor: colors.ink }]} />
      <View style={[styles.body, { width, height: bodyH, borderColor: colors.ink }, bottomRadius, selected && styles.selected, celebrate && styles.celebrate]}>
        <View style={styles.col}>
          {stacked.map((type, ri) => {
            const isTop = ri === 0;
            const isBottom = ri === stacked.length - 1;
            return (
              <View key={ri} style={[{ width: inner, height: segH, backgroundColor: colorFor(type), alignItems: 'center', justifyContent: 'center' }, isBottom && { borderBottomLeftRadius: radius, borderBottomRightRadius: radius }, isTop && selected && styles.lift]}>
                <View style={[styles.disc, { width: Math.round(segH * 0.74), height: Math.round(segH * 0.74), borderRadius: Math.round(segH * 0.37) }]}>
                  <SvgXml xml={itemArtXml(type, themeKey)} width={Math.round(segH * 0.62)} height={Math.round(segH * 0.62)} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
      {hinted ? (
        // Drawn around the whole tube, lip included, sitting just OUTSIDE the
        // glass rather than over the balls — it used to be a thin ring inside the
        // tube and was hard to spot. The row gap (8) keeps it clear of neighbours.
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hintRing,
            { borderBottomLeftRadius: (width + HINT_OUTSET * 2) / 2, borderBottomRightRadius: (width + HINT_OUTSET * 2) / 2 },
            { borderColor: hintTo ? colors.primary : colors.star, opacity: pulse },
          ]}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', overflow: 'visible' },
  rim: { borderWidth: OUTLINE, borderRadius: 6, backgroundColor: colors.surface, marginBottom: -OUTLINE, zIndex: 2 },
  body: { borderWidth: OUTLINE, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: colors.surface, justifyContent: 'flex-end' },
  col: { flex: 1, justifyContent: 'flex-end' },
  disc: { backgroundColor: 'rgba(255,255,255,0.62)', alignItems: 'center', justifyContent: 'center' },
  lift: { transform: [{ translateY: -6 }] },
  selected: { borderColor: colors.primary },
  celebrate: { borderColor: colors.primaryDark, backgroundColor: '#EAF7EF' },
  hintRing: { position: 'absolute', top: -HINT_OUTSET, bottom: -HINT_OUTSET, left: 0, right: 0, borderWidth: OUTLINE + 4, borderTopLeftRadius: 8, borderTopRightRadius: 8, zIndex: 3 },
});
