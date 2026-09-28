import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/theme';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'accent' | 'gold' | 'light' | 'soft' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = { title: string; onPress?: () => void; variant?: Variant; size?: Size; disabled?: boolean; style?: ViewStyle; icon?: IconName };

const palettes: Record<Variant, { bg: string; edge: string; fg: string }> = {
  primary: { bg: colors.primary, edge: colors.primaryDark, fg: '#fff' },
  accent: { bg: colors.accent, edge: colors.accentDark, fg: '#fff' },
  gold: { bg: colors.gold, edge: colors.goldDark, fg: '#5A4416' },
  light: { bg: colors.surface, edge: '#E0E8E4', fg: colors.ink },
  soft: { bg: colors.surfaceSoft, edge: '#E0E8E4', fg: colors.ink },
  danger: { bg: colors.danger, edge: '#C77064', fg: '#fff' },
};

const sizing: Record<Size, { height: number; radius: number; fontSize: number; padH: number }> = {
  lg: { height: 60, radius: 20, fontSize: 20, padH: 26 },
  md: { height: 50, radius: 16, fontSize: 17, padH: 20 },
  sm: { height: 42, radius: 13, fontSize: 15, padH: 16 },
};

export function Button({ title, onPress, variant = 'primary', size = 'lg', disabled, style, icon }: Props) {
  const pal = palettes[variant];
  const sz = sizing[size];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: sz.height, paddingHorizontal: sz.padH, borderRadius: sz.radius, backgroundColor: pal.bg, borderWidth: variant === 'light' ? 1 : 0, borderColor: colors.hairline, shadowColor: pal.edge, shadowOffset: { width: 0, height: pressed ? 1 : 4 }, opacity: disabled ? 0.5 : 1, transform: [{ translateY: pressed ? 3 : 0 }] },
        style,
      ]}>
      <View style={styles.row}>
        {icon ? <Icon name={icon} color={pal.fg} size={sz.fontSize + 4} /> : null}
        {title ? <Text style={[styles.text, { color: pal.fg, fontSize: sz.fontSize }]}>{title}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  text: { fontFamily: fonts.display, letterSpacing: 0.2 },
});
