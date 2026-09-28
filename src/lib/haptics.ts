import * as Haptics from 'expo-haptics';

// Diagnostic kill-switch (crash bisect, 2026-06-11): exonerated — crash was
// LayoutAnimation on the new architecture. Keep false.
const DIAG_DISABLE_HAPTICS = false;

// Subtle tactile feedback. All calls are best-effort — they no-op on platforms
// or devices without haptics support.
export function selectHaptic(): void {
  if (DIAG_DISABLE_HAPTICS) return;
  Haptics.selectionAsync().catch(() => undefined);
}

export function moveHaptic(): void {
  if (DIAG_DISABLE_HAPTICS) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function shelfDoneHaptic(): void {
  if (DIAG_DISABLE_HAPTICS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function winHaptic(): void {
  if (DIAG_DISABLE_HAPTICS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function loseHaptic(): void {
  if (DIAG_DISABLE_HAPTICS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}
