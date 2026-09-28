import { AudioPlayer, createAudioPlayer } from 'expo-audio';

// Short one-shot sound effects, synthesized in-house (public domain, no attribution).
// Files live at assets/sfx/*.wav. Respects the same on/off flag as background music.
const SOURCES: Record<SfxName, number> = {
  swap: require('../../assets/sfx/swap.wav'),
  clear: require('../../assets/sfx/clear.wav'),
  win: require('../../assets/sfx/win.wav'),
  lose: require('../../assets/sfx/lose.wav'),
};

// Diagnostic kill-switch (crash bisect, 2026-06-11): exonerated — crash was
// LayoutAnimation on the new architecture. Keep false.
const DIAG_DISABLE_SFX = false;

const players: Partial<Record<SfxName, AudioPlayer>> = {};
let enabled = false;

function ensureLoaded(): void {
  if (DIAG_DISABLE_SFX) return;
  for (const name of Object.keys(SOURCES) as SfxName[]) {
    if (players[name]) continue;
    try {
      const player = createAudioPlayer(SOURCES[name]);
      player.volume = 0.6;
      players[name] = player;
    } catch {
      // best-effort — a failed load just means that effect stays silent
    }
  }
}

export async function initSfx(initialEnabled: boolean): Promise<void> {
  enabled = initialEnabled;
  if (enabled) ensureLoaded();
}

export async function setSfxEnabled(value: boolean): Promise<void> {
  enabled = value;
  if (value) ensureLoaded();
}

export function playSfx(name: SfxName, opts?: { rate?: number }): void {
  if (DIAG_DISABLE_SFX) return;
  if (!enabled) return;
  const player = players[name];
  if (!player) return;
  // rate > 1 raises pitch. Default 1 resets pitch in case a previous call changed
  // it. Best-effort — any failure just skips the effect.
  try {
    player.setPlaybackRate(opts?.rate ?? 1);
    player.seekTo(0);
    player.play();
  } catch {
    // ignore — sfx are never worth crashing over
  }
}

export type SfxName = 'swap' | 'clear' | 'win' | 'lose';
