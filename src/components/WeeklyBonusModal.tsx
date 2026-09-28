import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/theme';
import { Icon, IconName } from './Icon';

const ITEMS: { icon: IconName; label: string }[] = [
  { icon: 'clock', label: '+30 Seconds' },
  { icon: 'bomb', label: 'Bomb' },
  { icon: 'rowwipe', label: 'Row Wipe' },
  { icon: 'shuffle', label: 'Shuffle' },
];

export const WeeklyBonusModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.crown}>
            <Icon name="crown" size={26} color={colors.star} />
          </View>
          <Text style={styles.title}>7-Day Streak!</Text>
          <Text style={styles.sub}>You’ve opened Little Sort 7 days in a row — here’s one of every power-up.</Text>
          <View style={styles.grid}>
            {ITEMS.map((it) => (
              <View key={it.label} style={styles.item}>
                <View style={styles.itemCircle}>
                  <Icon name={it.icon} size={24} color={colors.ink} />
                </View>
                <Text style={styles.itemLabel}>+1 {it.label}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Claim streak reward" onPress={onClose} style={({ pressed }) => [styles.btn, pressed && { transform: [{ translateY: 2 }] }]}>
            <Text style={styles.btnText}>Claim</Text>
          </Pressable>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 20 },
  // Share of the card, not fixed: 132pt items wrapped one per row on narrower phones.
  item: { width: '46%', borderRadius: 18, backgroundColor: colors.surfaceSoft, paddingVertical: 16, alignItems: 'center', gap: 8 },
  itemCircle: { width: 48, height: 48, borderRadius: 999, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.hairline },
  itemLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  btn: { width: '100%', borderRadius: 18, backgroundColor: colors.primary, paddingVertical: 15, alignItems: 'center', shadowColor: colors.primaryDark, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnText: { fontFamily: fonts.display, fontSize: 17, color: '#fff' },
});
