import React, { useRef } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { purchaseStars, STARS_PACK_AMOUNT } from '../services/purchases';
import { colors } from '../theme/theme';
import { Button } from './Button';
import { Icon } from './Icon';

export const HINT_COST = 5;
const STARS_PACK_PRICE = '$0.99';

// The one "Hint Stars" popup, shared by the home screen and the level screen:
// shows the balance and offers the star pack whenever the caller can grant it.
export function StarInfoModal({ visible, stars, onClose, onBuyStars }: { visible: boolean; stars: number; onClose: () => void; onBuyStars?: (amount: number) => void }) {
  // A ref, not state: two taps in the same instant must not both get through.
  const isBuying = useRef(false);
  const buyStars = async () => {
    if (isBuying.current) return;
    isBuying.current = true;
    const result = await purchaseStars();
    isBuying.current = false;
    if (!result.ok) {
      if (result.error === '') Alert.alert('Payment Cancelled', 'No payment was processed. You cancelled the purchase.');
      else Alert.alert('Purchase failed', result.error ?? 'Something went wrong.');
      return;
    }
    onBuyStars?.(result.stars);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.badge}><Icon name="star" color={colors.star} size={32} /></View>
          <Text style={styles.title}>Hint Stars</Text>
          <Text style={styles.message}>You have {stars} star{stars === 1 ? '' : 's'}. Tap 💡 Hint to spend {HINT_COST} stars for a free hint — no ad needed.</Text>
          {onBuyStars ? (
            <Text style={styles.message}>Want more stars? Top off {STARS_PACK_AMOUNT} stars for {STARS_PACK_PRICE}.</Text>
          ) : null}
          {onBuyStars ? <Button title="Get more stars" variant="gold" size="md" onPress={buyStars} /> : null}
          <Button title="Done" variant="primary" size="md" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(50, 37, 24, 0.36)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 28, backgroundColor: colors.surface, padding: 22, gap: 16, shadowColor: colors.ink, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 8 },
  badge: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FBF6E8', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  message: { fontSize: 16, fontWeight: '700', color: colors.inkSoft, lineHeight: 24, textAlign: 'center' },
});
