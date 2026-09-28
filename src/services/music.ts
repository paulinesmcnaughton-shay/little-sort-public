import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Background track: "Carefree" by Kevin MacLeod (incompetech.com), CC BY 4.0.
// Credited in the Settings screen. Swap the file at assets/music/loop.mp3 to change it.
const MUSIC_SOURCE: number | null = require('../../assets/music/loop.mp3');

// Diagnostic kill-switch (crash bisect, 2026-06-11): exonerated — crash was
// LayoutAnimation on the new architecture. Keep false.
const DIAG_DISABLE_MUSIC = false;

let player: AudioPlayer | null = null;
let enabled = false;

function ensureLoaded(): void {
  if (DIAG_DISABLE_MUSIC) return;
  if (!MUSIC_SOURCE || player) return;
  try {
    player = createAudioPlayer(MUSIC_SOURCE);
    player.loop = true;
    player.volume = 0.4;
    if (enabled) player.play();
  } catch {
    player = null;
  }
}

export async function initMusic(initialEnabled: boolean): Promise<void> {
  enabled = initialEnabled;
  if (DIAG_DISABLE_MUSIC) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // ignore — audio mode is best-effort
  }
  if (enabled) ensureLoaded();
}

export async function setMusicEnabled(value: boolean): Promise<void> {
  enabled = value;
  try {
    if (value) {
      if (!player) ensureLoaded();
      else player.play();
    } else if (player) {
      player.pause();
    }
  } catch {
    // ignore — music is never worth crashing over
  }
}
