import React, { useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { DocModal } from '../components/DocModal';
import { Icon } from '../components/Icon';
import { DocPage, PRIVACY_DOC, TERMS_DOC } from '../content/legal';
import { confirmGuestPurchase } from '../lib/guest-purchase';
import { LIFETIME_PRICE, MEMBERSHIP_PRICE, purchaseLifetime, purchasePro, PurchaseResult } from '../services/purchases';
import { colors, fonts } from '../theme/theme';


const PERKS = ['No ads', '5 exclusive themes', '1 daily power-up of your choice', '2 more puzzle games: Tubes (150 levels) & Match It (500 levels)'];

// onSubscribe is the success hook (the parent flips isMember on). Billing runs
// through src/services/purchases.ts — see the swap-in notes there to wire real IAP.
// lifetimeDaysLeft > 0 shows the one-time lifetime offer in place of Restore
// (Restore Purchases still lives in Settings). The parent derives it from the
// install date so the offer quietly disappears after the window closes.
export function PaywallScreen({ visible, onClose, onSubscribe, userId, lifetimeDaysLeft = 0 }: { visible: boolean; onClose: () => void; onSubscribe: () => void; userId?: string | null; lifetimeDaysLeft?: number }) {
  const [doc, setDoc] = useState<DocPage | null>(null);
  // One purchase at a time: a second tap before the store sheet appears used to
  // start a second purchase and show a "failed" popup over the real one.
  const isBuying = useRef(false);
  const buy = async (purchase: () => Promise<PurchaseResult>) => {
    if (isBuying.current) return;
    isBuying.current = true;
    try {
      if (!(await confirmGuestPurchase(userId))) return;
      const result = await purchase();
      if (result.ok) onSubscribe();
      // Empty error = the user backed out of the payment sheet (see PurchaseResult).
      else if (result.error === '') Alert.alert('Payment Cancelled', 'No payment was processed. You cancelled the purchase.');
      else Alert.alert('Little Sort Pro', result.error ?? 'Something went wrong.');
    } finally {
      isBuying.current = false;
    }
  };
  const handleSubscribe = () => buy(() => purchasePro(userId));
  const handleLifetime = () => buy(purchaseLifetime);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.close}>
            <Icon name="close" size={20} color={colors.inkFaint} />
          </Pressable>
          <View style={styles.crownWell}>
            <Icon name="crown" size={40} color={colors.gold} />
          </View>
          <Text style={styles.title}>Little Sort Pro</Text>
          <Text style={styles.subType}>Monthly subscription</Text>
          <Text style={styles.price}>{MEMBERSHIP_PRICE}/month</Text>
          <View style={styles.bullets}>
            {PERKS.map((perk) => (
              <View key={perk} style={styles.bulletRow}>
                <View style={styles.bulletIcon}><Icon name="check" size={18} color={colors.goldDark} stroke={2.6} /></View>
                <Text style={styles.bullet}>{perk}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.support}>Your membership keeps the app running. As our community grows, we'll keep adding fresh designs and new themes.</Text>
          <View style={styles.actions}>
            <Button title={`Subscribe · ${MEMBERSHIP_PRICE}/mo`} variant="gold" onPress={handleSubscribe} />
            {lifetimeDaysLeft > 0 ? (
              <>
                <Button title={`Lifetime for ${LIFETIME_PRICE}`} variant="light" onPress={handleLifetime} />
                <Text style={styles.offerNote}>
                  {lifetimeDaysLeft === 1 ? 'Offer ends today' : `Offer stands for the next ${lifetimeDaysLeft} days`}
                </Text>
              </>
            ) : null}
          </View>
          <Text style={styles.legal}>
            Monthly renews automatically until you cancel. Cancel anytime in your {Platform.OS === 'android' ? 'Google Play' : 'Apple ID'} settings.{lifetimeDaysLeft > 0 ? ' Lifetime is a one-time payment.' : ''}
          </Text>
          <View style={styles.legalLinks}>
            <Pressable accessibilityRole="link" onPress={() => setDoc(TERMS_DOC)} hitSlop={8}><Text style={styles.legalLink}>Terms of Use</Text></Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable accessibilityRole="link" onPress={() => setDoc(PRIVACY_DOC)} hitSlop={8}><Text style={styles.legalLink}>Privacy Policy</Text></Pressable>
          </View>
        </View>
      </View>
      <DocModal doc={doc} onClose={() => setDoc(null)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(59,74,72,0.35)', justifyContent: 'flex-end' },
  card: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 32, alignItems: 'center' },
  close: { position: 'absolute', top: 14, right: 16, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  crownWell: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 12, fontSize: 28, fontFamily: fonts.displayHeavy, color: colors.ink, textAlign: 'center' },
  subType: { marginTop: 2, fontSize: 13, fontFamily: fonts.bodyMed, color: colors.inkFaint },
  price: { marginTop: 4, fontSize: 18, fontFamily: fonts.display, color: colors.ink },
  bullets: { alignSelf: 'stretch', marginTop: 20, gap: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bulletIcon: { marginTop: 2 },
  bullet: { flexShrink: 1, fontSize: 16, fontFamily: fonts.body, color: colors.ink, lineHeight: 21 },
  support: { marginTop: 16, fontSize: 13, fontFamily: fonts.bodyMed, color: colors.inkSoft, textAlign: 'center', lineHeight: 19 },
  actions: { alignSelf: 'stretch', gap: 12, marginTop: 24 },
  offerNote: { marginTop: -4, fontSize: 12, fontFamily: fonts.bodyMed, color: colors.inkSoft, textAlign: 'center' },
  legal: { marginTop: 16, fontSize: 11, fontFamily: fonts.bodyMed, color: colors.inkFaint, textAlign: 'center', lineHeight: 16 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  legalLink: { fontSize: 12, fontFamily: fonts.bodyMed, color: colors.accentDark, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, fontFamily: fonts.bodyMed, color: colors.inkFaint },
});
