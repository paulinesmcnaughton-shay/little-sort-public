import React from 'react';
import { Platform, SafeAreaView as CoreSafeAreaView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView as ContextSafeAreaView } from 'react-native-safe-area-context';
import { ThemeKey, themes } from '../theme/theme';

// Android-only: the deprecated core SafeAreaView has a known touch-hit-test bug
// on Android after certain layout changes. iOS keeps the original core component.
const SafeAreaView = Platform.OS === 'android' ? ContextSafeAreaView : CoreSafeAreaView;

export function Screen({ children, themeKey = 'kitchen', style }: { children: React.ReactNode; themeKey?: ThemeKey; style?: ViewStyle }) {
  const theme = themes[themeKey];
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}><View style={[styles.container, { backgroundColor: theme.bg }, style]}>{children}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
});
