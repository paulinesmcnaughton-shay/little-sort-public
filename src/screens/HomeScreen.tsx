import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Icon, IconName } from '../components/Icon';
import { RoundBtn } from '../components/RoundBtn';
import { Screen } from '../components/Screen';
import { itemArtXml } from '../components/ShelfItem';
import { ItemType, VALID_ITEM_TYPES } from '../game/levels';
import { MatchPowerups } from '../store/progress';
import { colors, fonts, ThemeKey, themes } from '../theme/theme';

type Props = { themeKey: ThemeKey; currentLevel: number; completedCount: number; stars: number; streak: number; isMember: boolean; matchPowerups: MatchPowerups; onPlay: () => void; onDaily: () => void; onTubes: () => void; onMatch: () => void; onLevels: () => void; onSettings: () => void; onPaywall: () => void; onStars: () => void };

const ITEM = (i: number): ItemType => VALID_ITEM_TYPES[i];

function MiniShelf({ types, themeKey, itemSize }: { types: number[]; themeKey: ThemeKey; itemSize: number }) {
  const theme = themes[themeKey];
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingBottom: 2 }}>
        {types.map((t, i) => <SvgXml key={i} xml={itemArtXml(ITEM(t), themeKey)} width={itemSize} height={itemSize} />)}
      </View>
      <View style={{ alignSelf: 'stretch', height: Math.round(itemSize * 0.22), borderRadius: 8, backgroundColor: theme.shelf, borderBottomWidth: 3, borderBottomColor: theme.shelfEdge }} />
    </View>
  );
}

function MatchPowerupRow({ powerups }: { powerups: MatchPowerups }) {
  const items: { icon: IconName; count: number }[] = [
    { icon: 'clock', count: powerups.addTime },
    { icon: 'bomb', count: powerups.bomb },
    { icon: 'rowwipe', count: powerups.rowWipe },
    { icon: 'shuffle', count: powerups.shuffle },
  ];
  return (
    <View style={styles.powerRow}>
      {items.map((item, i) => (
        <View key={i} style={styles.powerMini}>
          <Icon name={item.icon} size={13} color={colors.inkSoft} />
          <View style={styles.powerMiniBadge}><Text style={styles.powerMiniBadgeText}>{item.count}</Text></View>
        </View>
      ))}
    </View>
  );
}

function HomeTile({ icon, label, sub, locked, onPress }: { icon: IconName; label: string; sub?: string; locked?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, { transform: [{ translateY: pressed ? 3 : 0 }], shadowOffset: { width: 0, height: pressed ? 1 : 4 } }]}>
      <View style={styles.tileWell}><Icon name={icon} color={colors.accent} size={22} /></View>
      <View>
        <Text style={styles.tileLabel}>{label}</Text>
        {sub ? (
          <View style={styles.tileSubRow}>
            {locked ? <Icon name="lock" color={colors.goldDark} size={12} /> : null}
            <Text style={[styles.tileSub, locked && { color: colors.goldDark }]}>{sub}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function HomeScreen({ themeKey, currentLevel, stars, isMember, matchPowerups, onPlay, onDaily, onTubes, onMatch, onLevels, onSettings, onPaywall, onStars }: Props) {
  return (
    <Screen themeKey={themeKey} style={styles.container}>
      <View style={styles.top}>
        <View>
          {isMember ? (
            <View style={styles.proText}><Icon name="crown" color={colors.goldDark} size={20} /><Text style={styles.proTextLabel}>Pro</Text></View>
          ) : (
            <Pressable onPress={onPaywall} style={({ pressed }) => [styles.proPill, { transform: [{ translateY: pressed ? 2 : 0 }], shadowOffset: { width: 0, height: pressed ? 1 : 3 } }]}>
              <Icon name="crown" color="#5A4416" size={17} /><Text style={styles.proPillLabel}>Pro</Text>
            </Pressable>
          )}
          {isMember ? <MatchPowerupRow powerups={matchPowerups} /> : null}
        </View>
        <View style={styles.topRight}>
          <RoundBtn name="gear" size={46} onPress={onSettings} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${stars} hint stars`} onPress={onStars} style={styles.starChip}>
            <Icon name="star" color={colors.star} size={15} /><Text style={styles.starChipText} accessibilityElementsHidden>{stars}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.shelfCluster}>
          <MiniShelf types={[1, 1, 1]} themeKey={themeKey} itemSize={44} />
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <MiniShelf types={[0, 0]} themeKey={themeKey} itemSize={40} />
            <MiniShelf types={[2, 2]} themeKey={themeKey} itemSize={40} />
          </View>
        </View>
        <Text style={styles.logo}>Little Sort</Text>
        <Text style={styles.subtitle}>A cozy little sorting game</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onPlay} style={({ pressed }) => [styles.playBtn, { transform: [{ translateY: pressed ? 3 : 0 }], shadowOffset: { width: 0, height: pressed ? 2 : 5 } }]}>
          <View>
            <Text style={styles.playTitle}>Play</Text>
            <Text style={styles.playSub}>Level {currentLevel}</Text>
          </View>
          <View style={styles.playIcon}><Icon name="play" color="#fff" size={26} /></View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 13 }}>
          <HomeTile icon="grid" label="Levels" onPress={onLevels} />
          <HomeTile icon="calendar" label="Daily" onPress={onDaily} />
        </View>
        <View style={{ flexDirection: 'row', gap: 13 }}>
          <HomeTile icon="tube" label="Tubes" sub={isMember ? undefined : 'Pro'} locked={!isMember} onPress={onTubes} />
          <HomeTile icon="gem" label="Match It" sub={isMember ? undefined : 'Pro'} locked={!isMember} onPress={onMatch} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 14, paddingHorizontal: 24 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 8 },
  powerRow: { flexDirection: 'column', gap: 8, marginTop: 8, marginLeft: 2 },
  powerMini: { width: 26, height: 26, borderRadius: 999, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: colors.hairline, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  powerMiniBadge: { position: 'absolute', top: -4, right: -4, minWidth: 14, height: 14, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  powerMiniBadgeText: { fontFamily: fonts.body, fontSize: 9, color: colors.surface },
  topRight: { alignItems: 'center', gap: 4 },
  starChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  starChipText: { fontFamily: fonts.display, fontSize: 14, color: colors.ink },
  proText: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proTextLabel: { fontFamily: fonts.display, fontSize: 15, color: colors.goldDark },
  proPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, shadowColor: colors.goldDark, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  proPillLabel: { fontFamily: fonts.display, fontSize: 14, color: '#5A4416' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shelfCluster: { gap: 10, alignItems: 'center', marginBottom: 26, transform: [{ rotate: '-2deg' }] },
  logo: { fontFamily: fonts.displayHeavy, fontSize: 46, color: colors.ink, letterSpacing: 0.4, textAlign: 'center' },
  subtitle: { marginTop: 8, fontFamily: fonts.bodyMed, fontSize: 16, color: colors.inkSoft },
  actions: { paddingBottom: Platform.OS === 'android' ? 40 : 28, gap: 13, transform: Platform.OS === 'android' ? [{ translateY: 16 }] : [] },
  playBtn: { backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: colors.primaryDark, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  playTitle: { fontFamily: fonts.display, fontSize: 24, color: '#fff' },
  playSub: { fontFamily: fonts.body, fontSize: 13, color: '#fff', opacity: 0.9, marginTop: 3 },
  playIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 11, shadowColor: colors.hairline, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  tileWell: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  tileSubRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  tileSub: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
});
