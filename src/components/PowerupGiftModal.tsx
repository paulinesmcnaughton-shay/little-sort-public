import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MatchPowerups } from '../store/progress';
import { colors, fonts } from '../theme/theme';
import { Icon, IconName } from './Icon';

const OPTIONS: { kind: keyof MatchPowerups; icon: IconName; label: string }[] = [
  { kind: 'addTime', icon: 'clock', label: '+30 Seconds' },
  { kind: 'bomb', icon: 'bomb', label: 'Bomb' },
  { kind: 'rowWipe', icon: 'rowwipe', label: 'Row Wipe' },
  { kind: 'shuffle', icon: 'shuffle', label: 'Shuffle' },
];

export const PowerupGiftModal = ({ visible, onPick }: { visible: boolean; onPick: (kind: keyof MatchPowerups) => void }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.crown}>
            <Icon name="crown" size={26} color={colors.star} />
          </View>
          <Text style={styles.title}>Daily Member Gift</Text>
          <Text style={styles.sub}>Pick a free power-up for today.</Text>
          <View style={styles.grid}>
            {OPTIONS.map((o) => (
              <Pressable
                key={o.kind}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${o.label}`}
                onPress={() => onPick(o.kind)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View style={styles.optionCircle}>
                  <Icon name={o.icon} size={26} color={colors.ink} />
                </View>
                <Text style={styles.optionLabel}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(50, 37, 24, 0.36)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 340, borderRadius: 28, backgroundColor: colors.surface, padding: 24, alignItems: 'center', shadowColor: colors.ink, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 8 },
  crown: { width: 52, height: 52, borderRadius: 999, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 20, color: colors.ink },
  sub: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.inkSoft, marginTop: 4, marginBottom: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  // A share of the card, not a fixed width: on narrower phones (Galaxy S23 and
  // smaller) 132pt boxes wrapped one per row instead of the 2×2 grid.
  option: { width: '46%', borderRadius: 18, backgroundColor: colors.surfaceSoft, paddingVertical: 16, alignItems: 'center', gap: 8 },
  optionPressed: { opacity: 0.7 },
  optionCircle: { width: 48, height: 48, borderRadius: 999, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.hairline },
  optionLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
});
