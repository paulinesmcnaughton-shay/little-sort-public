import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { SortDifficulty } from '../game/levels';
import { colors, fonts } from '../theme/theme';

const TIER_LABELS: Record<SortDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard', veryHard: 'Very Hard' };
const TIER_COLORS: Record<SortDifficulty, string> = { easy: colors.primaryDark, medium: colors.accentDark, hard: colors.terra, veryHard: colors.danger };

export function LevelCard({ level, locked, completed, stars = 0, tier, onPress }: { level: number; locked: boolean; completed?: boolean; stars?: number; tier: SortDifficulty; onPress: () => void }) {
  return (
    <Pressable
      disabled={locked}
      accessibilityRole="button"
      accessibilityLabel={`Level ${level}, ${TIER_LABELS[tier]}${locked ? ', locked' : completed ? `, completed, ${stars} star${stars === 1 ? '' : 's'}` : ''}`}
      onPress={onPress}
      style={[styles.card, locked && styles.cardLocked]}>
      {locked ? (
        <Icon name="lock" color={colors.inkFaint} size={24} />
      ) : (
        <>
          <Text style={styles.num}>{level}</Text>
          <Text style={[styles.tierLabel, { color: TIER_COLORS[tier] }]}>{TIER_LABELS[tier]}</Text>
          <View style={styles.stars}>
            {[0, 1, 2].map((i) => <Icon key={i} name="star" size={12} color={i < stars ? colors.star : colors.hairline} />)}
          </View>
        </>
      )}
      {completed && !locked
        ? <View style={styles.badge}><Icon name="check" color="#fff" size={11} stroke={3} /></View>
        : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '31%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: colors.hairline, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardLocked: { backgroundColor: colors.surfaceSoft },
  num: { fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.ink },
  tierLabel: { fontFamily: fonts.bodyMed, fontSize: 11 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  badge: { position: 'absolute', top: 7, right: 7, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
