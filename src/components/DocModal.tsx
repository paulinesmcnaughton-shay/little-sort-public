import React, { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { DocPage, SUPPORT_EMAIL } from '../content/legal'
import { searchDocBlocks } from '../lib/doc-search'
import { ThemeKey } from '../theme/theme'
import { colors, fonts } from '../theme/theme'
import { RoundBtn } from './RoundBtn'
import { Screen } from './Screen'

// Full-screen viewer for legal/informational pages (About, Privacy, Terms).
// Used from Settings and the paywall; ends with a tappable support email.
// Slides in from the right (and back out) to match the chevron direction —
// driven by the Animated API since RN's Modal "slide" only moves bottom-up.
export const DocModal = ({ doc, themeKey = 'kitchen', onClose }: { doc: DocPage | null; themeKey?: ThemeKey; onClose: () => void }) => {
  const width = Dimensions.get('window').width
  const translateX = useRef(new Animated.Value(width)).current
  const [rendered, setRendered] = useState<DocPage | null>(doc)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (doc) {
      setRendered(doc)
      setQuery('')
      translateX.setValue(width)
      Animated.timing(translateX, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
      return
    }
    Animated.timing(translateX, { toValue: width, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setRendered(null)
    })
  }, [doc, width, translateX])

  const shownBlocks = rendered?.searchable ? searchDocBlocks(rendered.blocks, query) : rendered?.blocks ?? []

  return (
    <Modal visible={!!rendered} animationType="none" transparent onRequestClose={onClose}>
      {rendered ? (
        <Animated.View style={[styles.slide, { transform: [{ translateX }] }]}>
          <Screen themeKey={themeKey} style={styles.container}>
            <View style={styles.header}>
              <RoundBtn name="back" size={46} onPress={onClose} />
              <Text style={styles.title}>{rendered.title}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
              {rendered.subtitle ? <Text style={styles.sub}>{rendered.subtitle}</Text> : null}
              {rendered.searchable ? (
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search questions"
                  placeholderTextColor={colors.inkFaint}
                  accessibilityLabel={`Search ${rendered.title}`}
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                  style={styles.search}
                />
              ) : null}
              {shownBlocks.length === 0 ? (
                <Text style={styles.p}>No answers match “{query.trim()}”. Try another word, or tap “Help & Feedback” in Settings to email us.</Text>
              ) : null}
              {shownBlocks.map((block, i) => {
                if (block.h) return <Text key={i} style={styles.h}>{block.h}</Text>
                if (block.li) return <View key={i} style={styles.list}>{block.li.map((item, j) => <Text key={j} style={styles.p}>{'•'}  {item}</Text>)}</View>
                return <Text key={i} style={styles.p}>{block.p}</Text>
              })}
              <Pressable accessibilityRole="link" accessibilityLabel={`Email ${SUPPORT_EMAIL}`} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => undefined)}>
                <Text style={styles.email}>{SUPPORT_EMAIL}</Text>
              </Pressable>
            </ScrollView>
          </Screen>
        </Animated.View>
      ) : null}
    </Modal>
  )
}

const styles = StyleSheet.create({
  slide: { flex: 1 },
  container: { paddingTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 26, fontFamily: fonts.displayHeavy, color: colors.ink, flexShrink: 1 },
  scroll: { paddingBottom: 48, paddingTop: 4 },
  search: { minHeight: 48, borderWidth: 1, borderColor: colors.hairline, borderRadius: 16, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 16, color: colors.ink, backgroundColor: colors.surfaceSoft, marginBottom: 8 },
  sub: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.inkSoft, marginBottom: 12, lineHeight: 19 },
  h: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, marginTop: 18, marginBottom: 6 },
  p: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.inkSoft, lineHeight: 21, marginBottom: 10 },
  list: { marginBottom: 4 },
  email: { fontFamily: fonts.body, fontSize: 14, color: colors.accentDark, marginTop: 6 },
})
