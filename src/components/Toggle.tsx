import React, { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { colors } from '../theme/theme';

export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (next: boolean) => void }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: true, bounciness: 12, speed: 14 }).start();
  }, [value, x]);
  const left = x.interpolate({ inputRange: [0, 1], outputRange: [3, 23] });
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onValueChange(!value)} style={{ width: 50, height: 30, borderRadius: 999, backgroundColor: value ? colors.primary : '#D9E3DE', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', top: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', transform: [{ translateX: left }], shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
    </Pressable>
  );
}
