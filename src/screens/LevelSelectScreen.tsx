import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { LevelCard } from '../components/LevelCard';
import { RoundBtn } from '../components/RoundBtn';
import { Screen } from '../components/Screen';
import { levels, sortDifficultyTier } from '../game/levels';
import { ProgressState } from '../store/progress';
import { colors, fonts, ThemeKey } from '../theme/theme';

export function LevelSelectScreen({ themeKey, progress, onPlay, onBack }: { themeKey: ThemeKey; progress: ProgressState; onPlay: (level: number) => void; onBack: () => void }) {
  return (
    <Screen themeKey={themeKey} style={styles.container}>
      <View style={styles.header}>
        <RoundBtn name="back" size={46} onPress={onBack} />
        <Text style={styles.title}>Choose a Shelf</Text>
      </View>
      <FlatList
        data={levels}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        initialNumToRender={30}
        windowSize={10}
        renderItem={({ item }) => (
          <LevelCard level={item.id} locked={!__DEV__ && item.id > progress.unlockedLevels} completed={progress.completedLevels.includes(item.id)} stars={progress.levelStars[item.id] ?? 0} tier={sortDifficultyTier(item.id)} onPress={() => onPlay(item.id)} />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8, paddingBottom: 10 },
  title: { fontSize: 30, fontFamily: fonts.displayHeavy, color: colors.ink },
  row: { justifyContent: 'space-between' },
  grid: { paddingBottom: 28, gap: 12 },
});
