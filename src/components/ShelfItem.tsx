import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ItemType, VALID_ITEM_TYPES } from '../game/levels';
import { ITEM_ART } from '../game/item-art';
import { ThemeKey, themes } from '../theme/theme';

// The pre-coloured Design-System SVG for an item type within a theme.
export function itemArtXml(type: ItemType, themeKey: ThemeKey = 'kitchen'): string {
  const folder = themes[themeKey].art;
  const index = VALID_ITEM_TYPES.indexOf(type);
  return ITEM_ART[folder]?.[index] ?? ITEM_ART.kitchen[index >= 0 ? index : 0];
}

export function ShelfItem({ type, size = 46, selected, themeKey = 'kitchen' }: { type: ItemType; size?: number; selected?: boolean; themeKey?: ThemeKey }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const delay = setTimeout(() => loop.start(), Math.random() * 1300);
    return () => {
      clearTimeout(delay);
      loop.stop();
    };
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [-1.5, 1.5] });
  const art = Math.round(size * 1.18);

  return (
    <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ translateY }, { scale: selected ? 1.12 : 1 }] }}>
      <SvgXml xml={itemArtXml(type, themeKey)} width={art} height={art} />
    </Animated.View>
  );
}
