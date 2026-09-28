import React, { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import { colors, fonts } from '../theme/theme'

const TILES = [
  { base: '#E2956E', dark: '#B96E47', light: '#D2845C' },
  { base: '#E7C56B', dark: '#B68F33', light: '#DCB551' },
  { base: '#8FBFA3', dark: '#5C7A68', light: '#7BAE90' },
]

function FlowerGlyph({ tile, size = 40 }: { tile: typeof TILES[0]; size?: number }) {
  const half = size / 2
  return (
    <Svg width={size} height={size} viewBox="-24 -24 48 48">
      <G fill={tile.base} stroke={tile.dark} strokeWidth={2.3} strokeLinejoin="round">
        <Circle cx={0} cy={-8} r={5.2} />
        <Circle cx={8} cy={-1} r={5.2} />
        <Circle cx={5} cy={8} r={5.2} />
        <Circle cx={-5} cy={8} r={5.2} />
        <Circle cx={-8} cy={-1} r={5.2} />
      </G>
      <Circle cx={0} cy={0} r={5.2} fill={tile.light} stroke={tile.dark} strokeWidth={2.3} />
    </Svg>
  )
}

export function SplashScreen() {
  // Tile drop animations — start off-screen, spring to rest
  const t0 = useRef(new Animated.Value(-150)).current
  const t1 = useRef(new Animated.Value(-150)).current
  const t2 = useRef(new Animated.Value(-150)).current
  // Reveal animations (plank, wordmark, tagline)
  const plankAnim = useRef(new Animated.Value(0)).current
  const wordAnim = useRef(new Animated.Value(0)).current
  const tagAnim = useRef(new Animated.Value(0)).current
  // Dot bounce
  const dot0 = useRef(new Animated.Value(0)).current
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current

  const animsRef = useRef<Animated.CompositeAnimation[]>([])

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        t0.setValue(0); t1.setValue(0); t2.setValue(0)
        plankAnim.setValue(1); wordAnim.setValue(1); tagAnim.setValue(1)
        return
      }

      const spring = (val: Animated.Value, delay: number) =>
        Animated.sequence([
          Animated.delay(delay),
          Animated.spring(val, { toValue: 0, tension: 78, friction: 7, useNativeDriver: true }),
        ])

      const rise = (val: Animated.Value, delay: number) =>
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ])

      const dotLoop = (val: Animated.Value, delay: number) =>
        Animated.sequence([
          Animated.delay(delay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(val, { toValue: 1, duration: 440, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(val, { toValue: 0, duration: 660, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            ])
          ),
        ])

      const main = Animated.parallel([
        spring(t0, 120), spring(t1, 250), spring(t2, 380),
        rise(plankAnim, 0), rise(wordAnim, 550), rise(tagAnim, 850),
      ])
      const d0 = dotLoop(dot0, 880)
      const d1 = dotLoop(dot1, 1040)
      const d2 = dotLoop(dot2, 1200)

      animsRef.current = [main, d0, d1, d2]
      main.start(); d0.start(); d1.start(); d2.start()
    })
    return () => animsRef.current.forEach((a) => a.stop())
  }, [])

  const t0Opacity = t0.interpolate({ inputRange: [-150, -80, 0], outputRange: [0, 1, 1], extrapolate: 'clamp' })
  const t1Opacity = t1.interpolate({ inputRange: [-150, -80, 0], outputRange: [0, 1, 1], extrapolate: 'clamp' })
  const t2Opacity = t2.interpolate({ inputRange: [-150, -80, 0], outputRange: [0, 1, 1], extrapolate: 'clamp' })

  const plankY = plankAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })
  const wordY = wordAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })
  const tagY = tagAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] })

  return (
    <View style={styles.root}>
      {/* Soft ambient blobs (matches the design's blurred highlights) */}
      <View style={styles.blobTop} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />

      {/* Hero */}
      <View style={styles.hero}>
        {/* Tiles row */}
        <View style={styles.tilesRow}>
          {TILES.map((tile, i) => {
            const y = [t0, t1, t2][i]
            const op = [t0Opacity, t1Opacity, t2Opacity][i]
            return (
              <Animated.View key={i} style={[styles.tileWrap, { opacity: op, transform: [{ translateY: y }] }]}>
                <View style={[styles.tileEdge, { backgroundColor: tile.dark }]} />
                <View style={[styles.tile, { backgroundColor: tile.base }]}>
                  <View style={styles.well}>
                    <FlowerGlyph tile={tile} size={40} />
                  </View>
                </View>
              </Animated.View>
            )
          })}
        </View>

        {/* Shelf plank */}
        <Animated.View style={[styles.plankWrap, { opacity: plankAnim, transform: [{ translateY: plankY }] }]}>
          <View style={styles.plankEdge} />
          <View style={styles.plank} />
        </Animated.View>

        {/* Wordmark */}
        <Animated.Text style={[styles.wordmark, { opacity: wordAnim, transform: [{ translateY: wordY }] }]}>
          Little Sort
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagAnim, transform: [{ translateY: tagY }] }]}>
          A cozy little sorting game
        </Animated.Text>
      </View>

      {/* Loader dots */}
      <View style={styles.dotsRow}>
        {[
          { dot: dot0, color: TILES[0].base },
          { dot: dot1, color: TILES[1].base },
          { dot: dot2, color: TILES[2].base },
        ].map(({ dot, color }, i) => {
          const dotY = dot.interpolate({ inputRange: [0, 1], outputRange: [0, -9] })
          const dotOp = dot.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] })
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { backgroundColor: color, opacity: dotOp, transform: [{ translateY: dotY }] }]}
            />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blobTop: {
    position: 'absolute',
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  blobBottom: {
    position: 'absolute',
    bottom: 90,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  hero: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-end',
  },
  tileWrap: {
    width: 72,
    height: 76,
  },
  tileEdge: {
    position: 'absolute',
    bottom: 0,
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  tile: {
    position: 'absolute',
    top: 0,
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  well: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FBF6EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plankWrap: {
    marginTop: -8,
    width: 268,
    height: 27,
  },
  plankEdge: {
    position: 'absolute',
    bottom: 0,
    width: 268,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#C7AC81',
  },
  plank: {
    position: 'absolute',
    top: 0,
    width: 268,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#EBDBC1',
  },
  wordmark: {
    marginTop: 28,
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: fonts.displayHeavy,
    fontSize: 48,
    letterSpacing: 0.4,
    color: colors.ink,
  },
  tagline: {
    marginTop: 6,
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: fonts.bodyMed,
    fontSize: 17,
    color: colors.inkSoft,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 56,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
})
