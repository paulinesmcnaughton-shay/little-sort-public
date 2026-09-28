import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { colors, fonts } from '../theme/theme';

export function WinScreen({ visible, level, moves, bestMoves, stars = 3, onNext, onReplay, onLevels, onExit, onDismissed, label, nextTitle, earnedStars, daily, tube }: { visible: boolean; level: number; moves: number; bestMoves?: number; stars?: number; onNext: () => void; onReplay: () => void; onLevels: () => void; onExit: () => void; onDismissed?: () => void; label?: string; nextTitle?: string; earnedStars?: number; daily?: boolean; tube?: boolean }) {
  return (
    // onDismiss (iOS only) fires once the popup has fully finished closing.
    <Modal visible={visible} transparent animationType="fade" onDismiss={onDismissed}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.sparkle}><Icon name="sparkle" color={colors.gold} size={42} /></View>
          <Text style={styles.title}>{label ?? 'Shelf Sorted!'}</Text>
          <Text style={styles.subtitle}>{label ? `Solved in ${moves} moves.` : `Level ${level} completed in ${moves} moves.`}</Text>
          {tube ? null : (
            <View style={styles.starRow}>
              {[0, 1, 2].map((i) => <Icon key={i} name="star" size={34} color={i < stars ? colors.star : colors.hairline} />)}
            </View>
          )}
          {earnedStars ? <Text style={styles.best}>+{earnedStars} stars earned</Text> : <Text style={styles.best}>Best: {bestMoves ? Math.min(bestMoves, moves) : moves} moves</Text>}
          <View style={styles.actions}>
            <Button title={nextTitle ?? 'Next Level'} icon={daily ? 'check' : 'play'} onPress={onNext} />
            <Button title="Replay" icon="refresh" variant="light" onPress={onReplay} />
            {daily || tube ? null : <Button title="Levels" icon="grid" variant="light" onPress={onLevels} />}
            {daily ? null : <Button title="Exit" icon="back" variant="light" onPress={onExit} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(59,74,72,0.34)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: 30, padding: 24, alignItems: 'center' },
  sparkle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 12, fontSize: 34, fontFamily: fonts.displayHeavy, color: colors.ink },
  subtitle: { marginTop: 8, fontSize: 16, color: colors.inkSoft, fontFamily: fonts.body, textAlign: 'center' },
  starRow: { marginTop: 16, flexDirection: 'row', gap: 8 },
  best: { marginTop: 8, marginBottom: 18, fontSize: 15, color: colors.inkSoft, fontWeight: '800' },
  actions: { alignSelf: 'stretch', gap: 12 },
});
