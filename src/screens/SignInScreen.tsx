import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Path } from 'react-native-svg'
import { DocModal } from '../components/DocModal'
import { DocPage, PRIVACY_DOC, TERMS_DOC } from '../content/legal'
import { APPLE_ENABLED, FACEBOOK_ENABLED } from '../services/auth'
import { SignInProvider } from '../store/progress'
import { colors, fonts } from '../theme/theme'

type Tone = { c: string; dk: string; lo: string }

const TONES: Tone[] = [
  { c: '#E2956E', dk: '#B96E47', lo: '#D2845C' },
  { c: '#E7C56B', dk: '#B68F33', lo: '#DCB551' },
  { c: '#8FBFA3', dk: '#5C7A68', lo: '#7BAE90' },
]

export function SignInScreen({ onSignIn, onGuest }: { onSignIn: (provider: SignInProvider) => Promise<void>; onGuest: () => void }) {
  const [loadingProvider, setLoadingProvider] = useState<SignInProvider | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [doc, setDoc] = useState<DocPage | null>(null)

  const handle = async (provider: SignInProvider) => {
    if (loadingProvider) return
    setLoadingProvider(provider)
    await onSignIn(provider)
    setLoadingProvider(null)
  }

  const busy = loadingProvider !== null

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.blobTop} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />

      <View style={styles.body}>
        <View style={styles.heroWrap}>
          <View style={styles.hero}>
            <Shelf />
            <Text style={styles.wordmark}>Little Sort</Text>
            <Text style={styles.tagline}>Cozy sorting game.</Text>
          </View>
        </View>

        <View style={styles.providers}>
          {Platform.OS === 'ios' && (
            <ProviderButton
              label={APPLE_ENABLED ? 'Continue with Apple' : 'Continue with Apple (soon)'}
              bg="#1B1B1F"
              fg="#fff"
              mark={<AppleMark />}
              disabled={!APPLE_ENABLED || busy}
              loading={loadingProvider === 'apple'}
              onPress={() => handle('apple')}
            />
          )}
          <ProviderButton
            label="Continue with Google"
            bg="#fff"
            fg={colors.ink}
            border="#E2EAE6"
            mark={<GoogleMark />}
            disabled={busy && loadingProvider !== 'google'}
            loading={loadingProvider === 'google'}
            onPress={() => handle('google')}
          />
          <ProviderButton
            label={FACEBOOK_ENABLED ? 'Continue with Facebook' : 'Continue with Facebook (soon)'}
            bg="#1877F2"
            fg="#fff"
            mark={<FacebookMark />}
            disabled={!FACEBOOK_ENABLED || busy}
            loading={loadingProvider === 'facebook'}
            onPress={() => handle('facebook')}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={() => setSheetOpen(true)}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.guestText}>Play as guest</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.terms}>
        By continuing you agree to our{' '}
        <Text style={styles.termsLink} accessibilityRole="link" onPress={() => setDoc(TERMS_DOC)}>Terms of Use</Text> and{' '}
        <Text style={styles.termsLink} accessibilityRole="link" onPress={() => setDoc(PRIVACY_DOC)}>Privacy Policy</Text>.
      </Text>

      <DocModal doc={doc} onClose={() => setDoc(null)} />

      <GuestSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onContinue={() => {
          setSheetOpen(false)
          onGuest()
        }}
      />
    </SafeAreaView>
  )
}

function Shelf() {
  return (
    <View style={styles.shelf}>
      <View style={styles.tilesRow}>
        {TONES.map((tone, i) => (
          <View key={i} style={styles.tileWrap}>
            <View style={[styles.tileEdge, { backgroundColor: tone.dk }]} />
            <View style={[styles.tile, { backgroundColor: tone.c }]}>
              <View style={styles.tileWell}>
                <FlowerGlyph tone={tone} size={34} />
              </View>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.plankWrap}>
        <View style={styles.plankEdge} />
        <View style={styles.plank} />
      </View>
    </View>
  )
}

function FlowerGlyph({ tone, size = 34 }: { tone: Tone; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-24 -24 48 48">
      <G fill={tone.c} stroke={tone.dk} strokeWidth={2.3} strokeLinejoin="round">
        <Circle cx={0} cy={-8} r={5.2} />
        <Circle cx={8} cy={-1} r={5.2} />
        <Circle cx={5} cy={8} r={5.2} />
        <Circle cx={-5} cy={8} r={5.2} />
        <Circle cx={-8} cy={-1} r={5.2} />
      </G>
      <Circle cx={0} cy={0} r={5.2} fill={tone.lo} stroke={tone.dk} strokeWidth={2.3} />
    </Svg>
  )
}

function ProviderButton({ label, bg, fg, border, mark, onPress, disabled, loading }: { label: string; bg: string; fg: string; border?: string; mark: React.ReactNode; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.provBtn,
        { backgroundColor: bg, borderWidth: border ? 1.5 : 0, borderColor: border ?? 'transparent', opacity: disabled ? 0.45 : 1, transform: [{ translateY: pressed ? 3 : 0 }] },
      ]}>
      <View style={styles.provMark}>{mark}</View>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.provLabel, { color: fg }]}>{label}</Text>}
    </Pressable>
  )
}

function GuestSheet({ visible, onClose, onContinue }: { visible: boolean; onClose: () => void; onContinue: () => void }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) return
    anim.setValue(0)
    Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [visible])

  if (!visible) return null

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] })
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.34] })

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.sheetRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.warnCircle}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#D99A4E" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
              <Path d="M12 9v4" />
              <Path d="M12 17h.01" />
            </Svg>
          </View>
          <Text style={styles.sheetTitle}>Playing as a guest?</Text>
          <Text style={styles.sheetBody}>
            Your progress is saved <Text style={styles.sheetBold}>only on this phone</Text>. Delete the app or switch phones and it’s gone. Sign in to keep it safe.
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.sheetPrimary, { transform: [{ translateY: pressed ? 2 : 0 }] }]}>
            <Text style={styles.sheetPrimaryText}>Sign in to keep my progress</Text>
          </Pressable>
          <Pressable onPress={onContinue} accessibilityRole="button" style={({ pressed }) => [styles.sheetGhost, pressed && { opacity: 0.6 }]}>
            <Text style={styles.sheetGhostText}>Continue as guest anyway</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const AppleMark = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path fill="#fff" d="M17.05 12.6c-.03-2.6 2.13-3.85 2.23-3.91-1.22-1.78-3.11-2.02-3.78-2.05-1.61-.16-3.14.94-3.95.94-.82 0-2.07-.92-3.41-.9-1.75.03-3.37 1.02-4.27 2.59-1.82 3.16-.47 7.84 1.3 10.41.86 1.26 1.89 2.67 3.24 2.62 1.3-.05 1.79-.84 3.36-.84 1.56 0 2 .84 3.38.81 1.39-.02 2.28-1.28 3.14-2.55.99-1.46 1.4-2.88 1.42-2.95-.03-.01-2.73-1.05-2.76-4.16zM14.6 4.97c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.03-1.46z" />
  </Svg>
)

const GoogleMark = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <Path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
  </Svg>
)

const FacebookMark = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path fill="#fff" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
  </Svg>
)

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  blobTop: { position: 'absolute', top: -70, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.42)' },
  blobBottom: { position: 'absolute', bottom: 60, left: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.24)' },
  body: { flex: 1, paddingHorizontal: 26, paddingBottom: 10 },
  heroWrap: { flex: 1, justifyContent: 'center', paddingBottom: '12%' },
  hero: { alignItems: 'center' },
  shelf: { alignItems: 'center', marginTop: Platform.OS === 'android' ? 40 : undefined },
  tilesRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', marginBottom: -5, paddingLeft: 3 },
  tileWrap: { width: 60, height: 64 },
  tileEdge: { position: 'absolute', bottom: 0, width: 60, height: 60, borderRadius: 17 },
  tile: { position: 'absolute', top: 0, width: 60, height: 60, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tileWell: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FBF6EC', alignItems: 'center', justifyContent: 'center' },
  plankWrap: { width: 226, height: 22 },
  plankEdge: { position: 'absolute', bottom: 0, width: 226, height: 18, borderRadius: 10, backgroundColor: '#D7C09B' },
  plank: { position: 'absolute', top: 0, width: 226, height: 18, borderRadius: 10, backgroundColor: '#EBDBC1' },
  wordmark: { marginTop: 30, fontFamily: fonts.displayHeavy, fontSize: 44, letterSpacing: 0.4, color: colors.ink },
  tagline: { marginTop: Platform.OS === 'android' ? -2 : 8, fontFamily: fonts.bodyMed, fontSize: 16, color: colors.inkSoft },
  providers: { gap: 12 },
  provBtn: { width: '100%', borderRadius: 18, paddingVertical: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#3C4A48', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  provMark: { position: 'absolute', left: 20 },
  provLabel: { fontFamily: fonts.display, fontSize: 17 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: '#E2EAE6' },
  dividerText: { fontFamily: fonts.body, fontSize: 13, color: colors.inkFaint, letterSpacing: 0.4 },
  guestBtn: { paddingVertical: 8, alignItems: 'center' },
  guestText: { fontFamily: fonts.display, fontSize: 16, color: colors.inkSoft },
  terms: { paddingHorizontal: 32, paddingBottom: 30, textAlign: 'center', fontFamily: fonts.bodyMed, fontSize: 12, lineHeight: 18, color: colors.inkFaint },
  termsLink: { color: colors.inkSoft, textDecorationLine: 'underline', fontFamily: fonts.body },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#283734' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 26, paddingTop: 12, paddingBottom: 40 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#E2EAE6', alignSelf: 'center', marginBottom: 18 },
  warnCircle: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#FBF3E4', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { textAlign: 'center', fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.ink, marginBottom: 8 },
  sheetBody: { textAlign: 'center', fontFamily: fonts.bodyMed, fontSize: 15, lineHeight: 22, color: colors.inkSoft, marginBottom: 22 },
  sheetBold: { color: colors.ink, fontFamily: fonts.body },
  sheetPrimary: { backgroundColor: '#7BB89C', borderRadius: 18, paddingVertical: 14, alignItems: 'center', shadowColor: '#5E9E82', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, marginBottom: 11 },
  sheetPrimaryText: { fontFamily: fonts.display, fontSize: 17, color: '#fff' },
  sheetGhost: { paddingVertical: 10, alignItems: 'center' },
  sheetGhostText: { fontFamily: fonts.display, fontSize: 15.5, color: colors.inkSoft },
})
