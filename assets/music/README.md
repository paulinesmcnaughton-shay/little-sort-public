# Background music

**Current track:** `loop.mp3` — "Carefree" by Kevin MacLeod (incompetech.com)
**License:** Creative Commons Attribution 4.0 (CC BY 4.0) —
https://creativecommons.org/licenses/by/4.0/

Free for commercial use (including this app), perpetually, with attribution.
The required credit is shown in the in-app Settings screen. Keep that credit
in place while this track is used.

## Swapping the track

Replace `loop.mp3` with any track you're licensed to use (a 30–90s seamless
loop is ideal). iOS needs **MP3 / M4A / WAV** (not OGG). Then:

- If the new track needs different attribution, update the credit line in
  `src/screens/SettingsScreen.tsx` and this file.
- If it's CC0 / no-attribution (e.g. Pixabay), you can remove the credit line.

The Music toggle in Settings already controls play/pause; volume is 0.4 and it
loops. Restart the Expo dev server after swapping the file.
