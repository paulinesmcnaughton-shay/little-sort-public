import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { RoundBtn } from '../components/RoundBtn';
import { Screen } from '../components/Screen';
import { getMatchLevel, MATCH_LEVEL_COUNT, matchDifficultyTier, MatchDifficulty } from '../game/match-levels';
import { ProgressState } from '../store/progress';
import { colors, fonts } from '../theme/theme';

const LEVELS = Array.from({ length: MATCH_LEVEL_COUNT }, (_, i) => i + 1);

const TIER_LABELS: Record<MatchDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard', veryHard: 'Very Hard' };
const TIER_COLORS: Record<MatchDifficulty, string> = { easy: colors.primaryDark, medium: colors.accentDark, hard: colors.terra, veryHard: colors.danger };

export function MatchLevelSelectScreen({ progress, onPlay, onBack }: { progress: ProgressState; onPlay: (id: number) => void; onBack: () => void }) {
  return (
    <Screen themeKey="daily" style={styles.container}>
      <View style={styles.header}>
        <RoundBtn name="back" size={46} onPress={onBack} />
        <Text style={styles.title}>Match It</Text>
      </View>
      <FlatList
        data={LEVELS}
        keyExtractor={(n) => String(n)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const locked = !__DEV__ && item > progress.matchUnlockedLevels;
          const stars = progress.matchStars[item] ?? 0;
          const meta = getMatchLevel(item);
          const spike = meta.tier !== 'normal';
          const tier = matchDifficultyTier(item);
          return (
            <Pressable disabled={locked} accessibilityRole="button" accessibilityLabel={`Level ${item}, ${TIER_LABELS[tier]}${locked ? ', locked' : meta.tier !== 'normal' ? `, ${meta.tier === 'super' ? 'super hard' : 'hard'}` : ''}`} onPress={() => onPlay(item)} style={[styles.card, locked && styles.cardLocked, !locked && spike && (meta.tier === 'super' ? styles.cardSuper : styles.cardHard)]}>
              {locked ? (
                <Icon name="lock" color={colors.inkFaint} size={24} />
              ) : (
                <>
                  {spike ? <Text style={[styles.badge, meta.tier === 'super' ? styles.badgeSuper : styles.badgeHard]}>{meta.tier === 'super' ? 'SUPER' : 'HARD'}</Text> : null}
                  <Text style={styles.num}>{item}</Text>
                  <Text style={[styles.tierLabel, { color: TIER_COLORS[tier] }]}>{TIER_LABELS[tier]}</Text>
                  <View style={styles.stars}>
                    {meta.mode === 'timed' ? <Icon name="clock" size={11} color={colors.inkSoft} /> : null}
                    {meta.objective === 'collect' ? <Icon name="gem" size={11} color={colors.inkSoft} /> : null}
                    {[0, 1, 2].map((i) => <Icon key={i} name="star" size={12} color={i < stars ? colors.star : colors.hairline} />)}
                  </View>
                </>
              )}
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
  card: { width: '31%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: colors.hairline, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardLocked: { backgroundColor: colors.surfaceSoft },
  cardHard: { borderWidth: 2, borderColor: colors.accent },
  cardSuper: { borderWidth: 2, borderColor: colors.danger },
  num: { fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.ink },
  tierLabel: { fontFamily: fonts.bodyMed, fontSize: 11 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  badge: { position: 'absolute', top: 8, fontFamily: fonts.body, fontSize: 8, color: colors.surface, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, overflow: 'hidden' },
  badgeHard: { backgroundColor: colors.accent },
  badgeSuper: { backgroundColor: colors.danger },
});
