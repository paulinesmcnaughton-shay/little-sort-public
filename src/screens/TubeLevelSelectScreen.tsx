import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { RoundBtn } from '../components/RoundBtn';
import { Screen } from '../components/Screen';
import { TUBE_LEVEL_COUNT, TubeDifficulty, tubeDifficultyTier } from '../game/tubes';
import { ProgressState } from '../store/progress';
import { colors, fonts } from '../theme/theme';

const LEVELS = Array.from({ length: TUBE_LEVEL_COUNT }, (_, i) => i + 1);

const TIER_LABELS: Record<TubeDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard', veryHard: 'Very Hard' };
const TIER_COLORS: Record<TubeDifficulty, string> = { easy: colors.primaryDark, medium: colors.accentDark, hard: colors.terra, veryHard: colors.danger };

export function TubeLevelSelectScreen({ progress, onPlay, onBack }: { progress: ProgressState; onPlay: (id: number) => void; onBack: () => void }) {
  return (
    <Screen themeKey="flora" style={styles.container}>
      <View style={styles.header}>
        <RoundBtn name="back" size={46} onPress={onBack} />
        <Text style={styles.title}>Tubes</Text>
      </View>
      <FlatList
        data={LEVELS}
        keyExtractor={(n) => String(n)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        initialNumToRender={30}
        windowSize={10}
        renderItem={({ item }) => {
          const locked = !__DEV__ && item > progress.tubeUnlockedLevels;
          const completed = item < progress.tubeUnlockedLevels;
          const tier = tubeDifficultyTier(item);
          return (
            <Pressable
              disabled={locked}
              accessibilityRole="button"
              accessibilityLabel={`Tube ${item}, ${TIER_LABELS[tier]}${locked ? ', locked' : completed ? ', completed' : ''}`}
              onPress={() => onPlay(item)}
              style={[styles.card, locked && styles.cardLocked]}>
              {locked ? (
                <Icon name="lock" color={colors.inkFaint} size={24} />
              ) : (
                <>
                  <Text style={styles.num}>{item}</Text>
                  <Text style={[styles.tierLabel, { color: TIER_COLORS[tier] }]}>{TIER_LABELS[tier]}</Text>
                </>
              )}
              {completed && !locked
                ? <View style={styles.badge}><Icon name="check" color="#fff" size={11} stroke={3} /></View>
                : null}
            </Pressable>
          );
        }}
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
  card: { width: '31%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: colors.hairline, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardLocked: { backgroundColor: colors.surfaceSoft },
  num: { fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.ink },
  tierLabel: { fontFamily: fonts.bodyMed, fontSize: 11, marginTop: 2 },
  badge: { position: 'absolute', top: 7, right: 7, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
