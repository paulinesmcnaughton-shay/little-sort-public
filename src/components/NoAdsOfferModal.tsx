import React, { useState } from 'react'
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { DocPage, PRIVACY_DOC, TERMS_DOC } from '../content/legal'
import { confirmGuestPurchase } from '../lib/guest-purchase'
import { purchaseNoAds } from '../services/purchases'
import { colors, fonts } from '../theme/theme'
import { Button } from './Button'
import { DocModal } from './DocModal'
import { Icon } from './Icon'

export const NO_ADS_PRICE = '$2.99'

// Shown right after an interstitial closes, at the moment the interruption is
// freshest — never on a schedule of its own. The parent decides how often (and
// stops asking after a few declines); this only handles the purchase.
export const NoAdsOfferModal = ({ visible, userId, onClose, onPurchased }: { visible: boolean; userId: string | null; onClose: () => void; onPurchased: () => void }) => {
  const [busy, setBusy] = useState(false)
  const [doc, setDoc] = useState<DocPage | null>(null)

  const buy = async () => {
    if (busy) return
    if (!(await confirmGuestPurchase(userId))) return
    setBusy(true)
    const result = await purchaseNoAds()
    setBusy(false)
    if (result.ok) {
      onPurchased()
      Alert.alert('Ads Removed', 'Thanks! No more interruptions for the next year.')
      return
    }
    if (result.error === '') Alert.alert('Payment Cancelled', 'No payment was processed. You cancelled the purchase.')
    else Alert.alert('Remove Ads', result.error ?? 'Something went wrong.')
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.well}>
            <Icon name="megaphone" size={26} color={colors.inkSoft} />
          </View>
          <Text style={styles.title}>Tired of ads?</Text>
          <Text style={styles.sub}>Remove them for a whole year. You keep playing everything you play now — just without the interruptions.</Text>
          <View style={styles.actions}>
            <Button title={`Remove Ads · ${NO_ADS_PRICE}/year`} variant="gold" size="md" disabled={busy} onPress={buy} />
            <Button title="No thanks" variant="light" size="md" disabled={busy} onPress={onClose} />
          </View>
          <Text style={styles.legal}>
            Renews every year until you cancel. Cancel anytime in your {Platform.OS === 'android' ? 'Google Play' : 'Apple ID'} settings.
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
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(50, 37, 24, 0.36)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 340, borderRadius: 28, backgroundColor: colors.surface, padding: 24, alignItems: 'center', shadowColor: colors.ink, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 8 },
  well: { width: 52, height: 52, borderRadius: 999, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontFamily: fonts.displayHeavy, fontSize: 20, color: colors.ink },
  sub: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.inkSoft, marginTop: 4, marginBottom: 18, textAlign: 'center', lineHeight: 20 },
  actions: { alignSelf: 'stretch', gap: 10 },
  legal: { marginTop: 14, fontSize: 11, fontFamily: fonts.bodyMed, color: colors.inkFaint, textAlign: 'center', lineHeight: 16 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  legalLink: { fontSize: 12, fontFamily: fonts.bodyMed, color: colors.accentDark, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, fontFamily: fonts.bodyMed, color: colors.inkFaint },
})
