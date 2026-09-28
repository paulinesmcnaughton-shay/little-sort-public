import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/theme';
import { Icon, IconName } from './Icon';

export function RoundBtn({ name, onPress, size = 52, bg = colors.surface, fg = colors.inkSoft, edge = colors.hairline, active, badge, disabled, style }: { name: IconName; onPress?: () => void; size?: number; bg?: string; fg?: string; edge?: string; active?: boolean; badge?: number | string | null; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={Platform.OS === 'android' ? 12 : undefined}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: active ? colors.primary : bg, alignItems: 'center', justifyContent: 'center', shadowColor: edge, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: pressed ? 1 : 3 }, elevation: 3, opacity: disabled ? 0.45 : 1, transform: [{ translateY: pressed ? 2 : 0 }] },
        style,
      ]}>
      <Icon name={name} color={active ? '#fff' : fg} size={Math.round(size * 0.46)} />
      {badge != null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.terra, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 12, fontFamily: fonts.display },
});
