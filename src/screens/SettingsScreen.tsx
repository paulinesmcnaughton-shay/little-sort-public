import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Constants from 'expo-constants';
import { Button } from '../components/Button';
import { Icon, IconName } from '../components/Icon';
import { RoundBtn } from '../components/RoundBtn';
import { Screen } from '../components/Screen';
import { itemArtXml } from '../components/ShelfItem';
import { Toggle } from '../components/Toggle';
import { DocModal } from '../components/DocModal';
import { NO_ADS_PRICE } from '../components/NoAdsOfferModal';
import { ABOUT_DOC, DATA_DELETION_DOC, DocPage, FAQ_DOC, PRIVACY_DOC, SUPPORT_EMAIL, TERMS_DOC } from '../content/legal';
import { ItemType, VALID_ITEM_TYPES } from '../game/levels';
import { APPLE_ENABLED, FACEBOOK_ENABLED, getAccessToken, getCurrentSession } from '../services/auth';
import { redeemPromo } from '../services/promos';
import { getNoAdsRenewal, getProSource, LIFETIME_PRICE, MEMBERSHIP_PRICE, ProSource, purchaseLifetime, restorePurchases } from '../services/purchases';
import { restoreOutcome } from '../lib/restore-outcome';
import { ProgressState, SignInProvider } from '../store/progress';
import { colors, fonts, ThemeKey, themes } from '../theme/theme';

const THEME_KEYS = (Object.keys(themes) as ThemeKey[]).filter((key) => key !== 'daily' && key !== 'fruits' && key !== 'flora');
const PREVIEW_TYPES: ItemType[] = [VALID_ITEM_TYPES[0], VALID_ITEM_TYPES[1], VALID_ITEM_TYPES[2]];
const PROVIDER_NAME: Record<SignInProvider, string> = { apple: 'Apple', google: 'Google', facebook: 'Facebook' };

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

function ToggleRow({ icon, label, caption, value, onValueChange }: { icon: IconName; label: string; caption: string; value: boolean; onValueChange: (next: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.well}><Icon name={icon} color={colors.accent} size={20} /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowCaption}>{caption}</Text>
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

function LinkRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View style={[styles.well, danger && { backgroundColor: '#FBEAE8' }]}><Icon name={icon} color={danger ? colors.danger : colors.accent} size={20} /></View>
      <Text style={[styles.rowLabel, { flex: 1 }, danger && { color: colors.danger }]}>{label}</Text>
      <Icon name="chevron" color={colors.inkFaint} size={18} />
    </Pressable>
  );
}

export function SettingsScreen({ progress, onBack, onChange, onUpgrade, onOfferNoAds, onSignIn, onSignOut, onResetLocalState, onDeleteAccount, lifetimeDaysLeft = 0 }: { progress: ProgressState; onBack: () => void; onChange: (patch: Partial<ProgressState>) => void; onUpgrade: () => void; onOfferNoAds: () => void; onSignIn: (provider: SignInProvider) => void; onSignOut: () => void; onResetLocalState: () => void; onDeleteAccount: () => void; lifetimeDaysLeft?: number }) {
  const [doc, setDoc] = useState<DocPage | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [codePromptOpen, setCodePromptOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [noAdsRenewal, setNoAdsRenewal] = useState<{ expiresAt: string | null; willRenew: boolean } | null>(null);
  const showsNoAdsCard = progress.removeAds && !progress.isMember;
  // Pro already removes ads, so a member who also bought No Ads is paying twice
  // for the same thing. Show them its renewal so the yearly charge never surprises them.
  const checksNoAdsRenewal = progress.removeAds || progress.isMember;
  const showsAlsoNoAds = progress.isMember && !!noAdsRenewal?.expiresAt;
  // Bumped after Restore and whenever the app returns from the store's
  // subscription page, so a cancel or restore shows up without leaving Settings.
  const [renewalCheck, setRenewalCheck] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setRenewalCheck((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    if (!checksNoAdsRenewal) {
      setNoAdsRenewal(null);
      return;
    }
    getNoAdsRenewal().then((renewal) => { if (active) setNoAdsRenewal(renewal); }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [checksNoAdsRenewal, renewalCheck]);

  // Lifetime is otherwise only on the paywall, which Pro members never see — so
  // subscribers had no way to buy it. Offer it here, but only to someone actually
  // on the subscription (never to a player who already owns Lifetime).
  const [proSource, setProSource] = useState<ProSource | null>(null);
  const [lifetimeBusy, setLifetimeBusy] = useState(false);
  const [lifetimeInfoOpen, setLifetimeInfoOpen] = useState(false);
  const showsLifetimeUpgrade = progress.isMember && lifetimeDaysLeft > 0 && proSource !== null && !proSource.hasLifetime;

  useEffect(() => {
    let active = true;
    if (!progress.isMember) {
      setProSource(null);
      return;
    }
    getProSource().then((source) => { if (active) setProSource(source); }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [progress.isMember]);

  const buyLifetime = async () => {
    if (lifetimeBusy) return;
    setLifetimeBusy(true);
    const result = await purchaseLifetime();
    setLifetimeBusy(false);
    if (!result.ok) {
      if (result.error === '') return; // cancelled — stay silent
      Alert.alert('Purchase failed', result.error ?? 'Something went wrong.');
      return;
    }
    setProSource({ hasLifetime: true, hasActiveSubscription: proSource?.hasActiveSubscription ?? false });
    // Only a running subscription needs cancelling; a player who bought Lifetime
    // outright has nothing to do and shouldn't be told to go cancel something.
    if (proSource?.hasActiveSubscription) {
      Alert.alert(
        'You’re a Lifetime member',
        `Thanks for switching — Pro is yours for good.\n\nYour ${MEMBERSHIP_PRICE}/month subscription is still active. Cancel it so you aren’t billed again; you keep Pro either way.`,
        [{ text: 'Later', style: 'cancel' }, { text: 'Cancel Subscription', onPress: manageSubscription }],
      );
      return;
    }
    Alert.alert('You’re a Lifetime member', 'Thanks for supporting Little Sort — Pro is yours for good.');
  };

  useEffect(() => {
    let active = true;
    if (!progress.signInProvider) {
      setEmail(null);
      return;
    }
    getCurrentSession().then((session) => {
      if (active) setEmail(session?.email ?? null);
    });
    return () => {
      active = false;
    };
  }, [progress.signInProvider]);
  const restore = async () => {
    const result = await restorePurchases(progress.userId ?? undefined);
    if (!result.ok) {
      Alert.alert('Restore Purchases', result.error ?? 'There’s no Pro or No Ads purchase attached to this email.');
      return;
    }
    // Pro and No Ads are separate products: restoring one must never grant the
    // other. `removeAds` used to be set unconditionally here, which silently
    // handed the $2.99 No Ads product to anyone with only a Pro subscription.
    // The rules live in restoreOutcome and are locked by tests/restore-outcome.test.ts.
    const outcome = restoreOutcome({ ownsPro: result.pro, ownsNoAds: result.noAds, hadPro: progress.isMember, hadNoAds: progress.removeAds });
    onChange({ isMember: outcome.isMember, removeAds: outcome.removeAds });
    setRenewalCheck((count) => count + 1);
    Alert.alert('Restored', outcome.message);
  };
  const confirmDelete = () =>
    Alert.alert('Delete account?', `This permanently deletes your account and cloud progress right away. This can’t be undone.\n\nIt does not cancel a Pro subscription — cancel that in ${Platform.OS === 'android' ? 'Google Play' : 'your Apple ID settings'} first so you aren’t billed again.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDeleteAccount },
    ]);
  const confirmSignOut = () => {
    if (!progress.signInProvider) return;
    Alert.alert('Log out?', `You’re signed in with ${PROVIDER_NAME[progress.signInProvider]}. Your progress stays on this device and you can sign back in anytime.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', onPress: onSignOut },
    ]);
  };
  const confirmReset = () =>
    Alert.alert('Reset local state?', 'Signs out and clears local progress, Pro, redeemed codes, and testing flags on this device — back to a fresh guest state. Dev only.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: onResetLocalState },
    ]);
  const manageSubscription = () => {
    // Each store's standard subscription-management page — cancellation happens
    // there, never inside the app (the store controls billing).
    const url = Platform.OS === 'android'
      ? 'https://play.google.com/store/account/subscriptions?package=com.littlesort.game'
      : 'https://apps.apple.com/account/subscriptions';
    const fallback = Platform.OS === 'android'
      ? 'Open the Play Store app → Profile → Payments & subscriptions.'
      : 'Open Settings → Apple ID → Subscriptions on your device.';
    Linking.openURL(url).catch(() => Alert.alert('Manage Subscription', fallback));
  };
  const rateApp = () => {
    // A deliberate tap here always deep-links to the store's review page —
    // unlike the automatic native prompt (services/reviews.ts), which the
    // store throttles to a few times a year and may silently do nothing.
    const url = Platform.OS === 'android'
      ? 'https://play.google.com/store/apps/details?id=com.littlesort.game'
      : 'https://apps.apple.com/app/id6794051571?action=write-review';
    const fallback = Platform.OS === 'android'
      ? 'Search "Little Sort" on Google Play to leave a rating.'
      : 'Search “Little Sort” on the App Store to leave a rating.';
    Linking.openURL(url).catch(() => Alert.alert('Rate Little Sort', fallback));
  };
  const contactUs = async () => {
    const subject = encodeURIComponent('Little Sort feedback');
    const body = encodeURIComponent('Tell us what’s on your mind — a problem, how the levels feel, or something you’d love to see added:\n\n');
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    const opened = await Linking.openURL(url).then(() => true).catch(() => false);
    if (!opened) Alert.alert('Get in touch', `Email us at ${SUPPORT_EMAIL} — problems, level feedback, or ideas all welcome.`);
  };

  const submitPromoCode = async (raw: string) => {
    const accessToken = await getAccessToken();
    const result = await redeemPromo(raw, progress.redeemedPromos ?? [], accessToken);
    if (!result.ok) { Alert.alert('Invalid Code', result.error); return; }
    const patch: Partial<ProgressState> = {
      redeemedPromos: [...(progress.redeemedPromos ?? []), raw.trim().toUpperCase()],
    };
    if (result.grant.pro) { patch.isMember = true; patch.removeAds = true; }
    else if (result.grant.noAds) patch.removeAds = true;
    onChange(patch);
    Alert.alert('Code Redeemed', result.grant.pro ? 'Little Sort Pro is now active. Enjoy!' : 'Ads removed. Enjoy!');
  };
  // Alert.prompt is iOS-only (a silent no-op on Android), so Android gets a small
  // in-app sheet with the same fields instead.
  const redeemCode = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Redeem Code', 'Enter your promo code.', (raw) => { submitPromoCode(raw ?? ''); }, 'plain-text');
      return;
    }
    setCodeDraft('');
    setCodePromptOpen(true);
  };
  const handleSubmitCodeSheet = () => {
    setCodePromptOpen(false);
    submitPromoCode(codeDraft);
  };

  return (
    <Screen themeKey={progress.selectedTheme} style={styles.container}>
      <View style={styles.header}>
        <RoundBtn name="back" size={46} onPress={onBack} />
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {progress.isMember ? (
          <View style={[styles.banner, { backgroundColor: colors.surfaceSoft }]}>
            <View style={styles.bannerWell}><Icon name="crown" color={colors.goldDark} size={22} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>You’re a Pro</Text>
              <Text style={styles.bannerSub}>All themes and modes unlocked.</Text>
              {showsAlsoNoAds ? (
                <Pressable accessibilityRole="button" accessibilityHint="Opens your store's subscription settings" hitSlop={12} onPress={manageSubscription}>
                  <Text style={[styles.bannerSub, { marginTop: 6 }]}>
                    Ads Removed is also active. {memberNoAdsCaption(noAdsRenewal)} <Text style={{ textDecorationLine: 'underline' }}>Manage</Text>
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {showsLifetimeUpgrade ? (
          <Pressable onPress={buyLifetime} disabled={lifetimeBusy} style={({ pressed }) => [styles.lifetimeCard, pressed && { opacity: 0.8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lifetimeTitle}>Switch to Lifetime · {LIFETIME_PRICE}</Text>
              <Text style={styles.lifetimeSub}>
                {lifetimeBusy ? 'Opening…' : `One payment, Pro forever. ${lifetimeDaysLeft === 1 ? 'Offer ends today.' : `Offer ends in ${lifetimeDaysLeft} days.`}`}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="About switching to Lifetime" hitSlop={10} onPress={() => setLifetimeInfoOpen(true)}>
              <Icon name="info" color={colors.inkFaint} size={18} />
            </Pressable>
          </Pressable>
        ) : null}

        {!progress.isMember ? (
          <Pressable onPress={onUpgrade} style={({ pressed }) => [styles.banner, styles.bannerGold, { transform: [{ translateY: pressed ? 2 : 0 }], shadowOffset: { width: 0, height: pressed ? 1 : 4 } }]}>
            <View style={[styles.bannerWell, { backgroundColor: 'rgba(255,255,255,0.35)' }]}><Icon name="crown" color="#5A4416" size={22} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: '#5A4416' }]}>Unlock Little Sort Pro</Text>
              <Text style={[styles.bannerSub, { color: '#7A5E25' }]}>Every theme, Tubes mode & no ads.</Text>
            </View>
            <Icon name="chevron" color="#5A4416" size={20} />
          </Pressable>
        ) : null}

        {showsNoAdsCard ? (
          <View style={[styles.banner, { backgroundColor: colors.surfaceSoft }]}>
            <View style={styles.bannerWell}><Icon name="megaphone" color={colors.inkSoft} size={22} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Ads Removed</Text>
              <Text style={styles.bannerSub}>{noAdsCaption(noAdsRenewal)}</Text>
            </View>
          </View>
        ) : null}

        <SectionLabel>Theme</SectionLabel>
        <View style={styles.grid}>
          {THEME_KEYS.map((key) => {
            const theme = themes[key];
            const selected = progress.selectedTheme === key;
            const locked = !!theme.premium && !progress.isMember;
            return (
              <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected, disabled: locked }} onPress={() => (locked ? onUpgrade() : onChange({ selectedTheme: key }))} style={[styles.themeCard, selected && styles.themeCardOn]}>
                <View style={[styles.themePreview, { backgroundColor: theme.bgDeep }]}>
                  {PREVIEW_TYPES.map((t, i) => <SvgXml key={i} xml={itemArtXml(t, key)} width={30} height={30} />)}
                </View>
                <View style={styles.themeFoot}>
                  <Text style={styles.themeName} numberOfLines={1}>{theme.name}</Text>
                  {locked ? <Icon name="lock" color={colors.goldDark} size={16} /> : selected ? <Icon name="check" color={colors.primary} size={16} stroke={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>Game</SectionLabel>
        <View style={styles.cardGroup}>
          <ToggleRow icon="music" label="Music" caption="Background music while you sort." value={progress.soundsEnabled} onValueChange={(soundsEnabled) => onChange({ soundsEnabled })} />
          <View style={styles.divider} />
          <ToggleRow icon="sound" label="Sound Effects" caption="Blips and chimes as you play." value={progress.sfxEnabled} onValueChange={(sfxEnabled) => onChange({ sfxEnabled })} />
          <View style={styles.divider} />
          <ToggleRow icon="clock" label="Timer" caption="Race the clock for more stars." value={progress.timerEnabled} onValueChange={(timerEnabled) => onChange({ timerEnabled })} />
        </View>

        <SectionLabel>Account</SectionLabel>
        <View style={styles.cardGroup}>
          {progress.signInProvider ? (
            <>
              <View style={styles.row}>
                <View style={styles.well}><Icon name="check" color={colors.primary} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Signed in with {PROVIDER_NAME[progress.signInProvider]}</Text>
                  <Text style={styles.rowCaption} numberOfLines={1}>{email ?? 'Your progress is saved.'}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <LinkRow icon="gift" label="Redeem Code" onPress={redeemCode} />
              <View style={styles.divider} />
              <LinkRow icon="logout" label="Log Out" onPress={confirmSignOut} />
            </>
          ) : (
            <>
              <View style={styles.row}>
                <View style={styles.well}><Icon name="phone" color={colors.inkSoft} size={20} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Playing as Guest</Text>
                  <Text style={styles.rowCaption}>Progress is saved on this device only.</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.guestSignInBlock}>
                <Text style={styles.guestCta}>Sign in to save your progress to the cloud and keep it safe across devices.</Text>
                {Platform.OS === 'ios' && (
                  APPLE_ENABLED ? (
                    <Button title="Continue with Apple" variant="light" size="md" onPress={() => onSignIn('apple')} />
                  ) : (
                    <Button title="Continue with Apple (soon)" variant="light" size="md" disabled onPress={() => undefined} />
                  )
                )}
                <Button title="Continue with Google" variant="light" size="md" onPress={() => onSignIn('google')} />
                {FACEBOOK_ENABLED ? (
                  <Button title="Continue with Facebook" variant="light" size="md" onPress={() => onSignIn('facebook')} />
                ) : (
                  <Button title="Continue with Facebook (soon)" variant="light" size="md" disabled onPress={() => undefined} />
                )}
              </View>
            </>
          )}
        </View>

        <SectionLabel>Support</SectionLabel>
        <View style={styles.cardGroup}>
          <LinkRow icon="info" label="About Little Sort" onPress={() => setDoc(ABOUT_DOC)} />
          <View style={styles.divider} />
          <LinkRow icon="shield" label="Privacy Policy" onPress={() => setDoc(PRIVACY_DOC)} />
          <View style={styles.divider} />
          <LinkRow icon="check" label="Terms of Use" onPress={() => setDoc(TERMS_DOC)} />
          <View style={styles.divider} />
          <LinkRow icon="cloud" label="Data Deletion" onPress={() => setDoc(DATA_DELETION_DOC)} />
          <View style={styles.divider} />
          <LinkRow icon="refresh" label="Restore Purchases" onPress={restore} />
          <View style={styles.divider} />
          <LinkRow icon="gear" label="Manage Subscription" onPress={manageSubscription} />
          <View style={styles.divider} />
          <LinkRow icon="info" label="FAQ" onPress={() => setDoc(FAQ_DOC)} />
          <View style={styles.divider} />
          <LinkRow icon="bell" label="Help & Feedback" onPress={contactUs} />
          <View style={styles.divider} />
          <LinkRow icon="heart" label="Rate Little Sort" onPress={rateApp} />
          <View style={styles.divider} />
          <LinkRow icon="trash" label="Delete Account" danger onPress={confirmDelete} />
        </View>

        {__DEV__ ? (
          <>
            <SectionLabel>Developer Testing</SectionLabel>
            <View style={styles.cardGroup}>
              <ToggleRow icon="crown" label="Pro (test)" caption="Toggle Pro UI on/off — dev only, no real purchase." value={progress.isMember} onValueChange={(isMember) => onChange({ isMember })} />
              <View style={styles.divider} />
              <ToggleRow icon="shield" label="No Ads (test)" caption="Toggle ad removal — dev only, no real purchase." value={progress.removeAds} onValueChange={(removeAds) => onChange({ removeAds })} />
              <View style={styles.divider} />
              <LinkRow icon="undo" label="Clear login session" onPress={onSignOut} />
              <View style={styles.divider} />
              <LinkRow icon="refresh" label="Reset local state" danger onPress={confirmReset} />
            </View>
            <Text style={styles.devNote}>Visible in dev builds only — never ships to the App Store.</Text>
          </>
        ) : null}

        <Text style={styles.credit}>Little Sort · v{Constants.expoConfig?.version ?? '—'}{'\n'}Music: “Carefree” by Kevin MacLeod (incompetech.com) · CC BY 4.0</Text>

        {!progress.isMember && !progress.removeAds ? (
          // Deliberately understated — a quiet find at the bottom of the scroll,
          // not a second upsell competing with the Pro banner up top.
          <Pressable onPress={onOfferNoAds} style={({ pressed }) => [styles.noAdsTuck, pressed && { opacity: 0.7 }]}>
            <Text style={styles.noAdsTuckText}>Sick of ads? Turn it off for {NO_ADS_PRICE}/year.</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <DocModal doc={doc} themeKey={progress.selectedTheme} onClose={() => setDoc(null)} />

      <Modal transparent visible={lifetimeInfoOpen} animationType="fade" onRequestClose={() => setLifetimeInfoOpen(false)}>
        <Pressable style={styles.infoOverlay} onPress={() => setLifetimeInfoOpen(false)}>
          <Pressable style={styles.infoCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.infoTitle}>Switching to Lifetime</Text>
            <Text style={styles.infoBody}>
              Lifetime is a single {LIFETIME_PRICE} payment that keeps Pro unlocked forever — no renewals, ever.
              {'\n\n'}
              Your {MEMBERSHIP_PRICE}/month subscription doesn’t stop on its own. After switching, cancel it in {Platform.OS === 'android' ? 'Google Play' : 'your Apple ID settings'} so you aren’t billed again. You keep Pro the whole time.
              {'\n\n'}
              The current month already paid for isn’t refunded.
            </Text>
            <Button title="Got it" variant="primary" size="md" onPress={() => setLifetimeInfoOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
      {Platform.OS === 'android' ? (
        <Modal visible={codePromptOpen} transparent animationType="slide" onRequestClose={() => setCodePromptOpen(false)}>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>Redeem Code</Text>
              <Text style={styles.sheetSub}>Enter your promo code.</Text>
              <TextInput
                accessibilityLabel="Promo code"
                value={codeDraft}
                onChangeText={setCodeDraft}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSubmitCodeSheet}
                style={styles.sheetInput}
              />
              <View style={styles.sheetActions}>
                <Button title="Cancel" variant="light" size="md" onPress={() => setCodePromptOpen(false)} style={styles.sheetButton} />
                <Button title="Redeem" variant="gold" size="md" disabled={!codeDraft.trim()} onPress={handleSubmitCodeSheet} style={styles.sheetButton} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

// Yearly no-ads status for the Settings card. No store details (e.g. granted by a
// promo code) falls back to a plain description.
function noAdsCaption(renewal: { expiresAt: string | null; willRenew: boolean } | null): string {
  if (!renewal?.expiresAt) return 'No automatic ads between levels.';
  const date = new Date(renewal.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!renewal.willRenew) return `Won’t renew — ads return after ${date}.`;
  return `Renews ${date}. Cancel anytime in ${Platform.OS === 'android' ? 'Google Play' : 'your Apple ID settings'}.`;
}

// Pro keeps ads off regardless, so a lapsing No Ads must never warn a member
// that "ads return" — that would push them to renew something they don't need.
function memberNoAdsCaption(renewal: { expiresAt: string | null; willRenew: boolean } | null): string {
  if (!renewal?.expiresAt) return '';
  const date = new Date(renewal.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return renewal.willRenew ? `Renews ${date}.` : `Ends ${date}.`;
}

const styles = StyleSheet.create({
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(59,74,72,0.35)', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 32, gap: 12 },
  sheetTitle: { fontSize: 24, fontFamily: fonts.displayHeavy, color: colors.ink },
  sheetSub: { fontSize: 14, fontFamily: fonts.bodyMed, color: colors.inkSoft },
  sheetInput: { minHeight: 48, borderWidth: 1, borderColor: colors.hairline, borderRadius: 16, paddingHorizontal: 16, fontSize: 18, fontFamily: fonts.body, color: colors.ink, backgroundColor: colors.surfaceSoft },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sheetButton: { flex: 1 },
  container: { paddingTop: 14, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 30, fontFamily: fonts.displayHeavy, color: colors.ink },
  scroll: { paddingBottom: 36, gap: Platform.OS === 'android' ? 16 : 8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 20, padding: 14, marginTop: Platform.OS === 'android' ? 8 : 0 },
  bannerGold: { backgroundColor: colors.gold, shadowColor: colors.goldDark, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  bannerWell: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  bannerSub: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  section: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Platform.OS === 'android' ? 8 : 12 },
  themeCard: { width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 8, borderWidth: 2, borderColor: 'transparent', shadowColor: colors.hairline, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  themeCardOn: { borderColor: colors.primary },
  themePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 56, borderRadius: 13, marginBottom: 8 },
  themeFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 2 },
  themeName: { fontFamily: fonts.display, fontSize: 14, color: colors.ink, flex: 1 },
  cardGroup: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  well: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  rowCaption: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.hairline, marginLeft: 64 },
  cardCopy: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.inkSoft, padding: 14, lineHeight: 20 },
  guestSignInBlock: { gap: 10, padding: 14 },
  guestCta: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.inkSoft, lineHeight: 20, marginBottom: 4 },
  credit: { marginTop: 16, fontFamily: fonts.bodyMed, fontSize: 11, color: colors.inkFaint, textAlign: 'center', lineHeight: 16 },
  lifetimeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, padding: 14, borderRadius: 18, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.hairline },
  lifetimeTitle: { fontFamily: fonts.displayHeavy, fontSize: 15, color: colors.ink },
  lifetimeSub: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.inkSoft, marginTop: 2, lineHeight: 17 },
  infoOverlay: { flex: 1, backgroundColor: 'rgba(50, 37, 24, 0.36)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  infoCard: { width: '100%', maxWidth: 340, borderRadius: 24, backgroundColor: colors.surface, padding: 22, gap: 14 },
  infoTitle: { fontFamily: fonts.displayHeavy, fontSize: 18, color: colors.ink, textAlign: 'center' },
  infoBody: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.inkSoft, lineHeight: 19 },
  noAdsTuck: { marginTop: 20, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.hairline, backgroundColor: 'rgba(255,255,255,0.5)' },
  noAdsTuckText: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.inkFaint, textAlign: 'center' },
  devNote: { marginTop: 8, fontFamily: fonts.bodyMed, fontSize: 11, color: colors.inkFaint, textAlign: 'center' },
});

