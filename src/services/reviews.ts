import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

// Ask for a native rating after a handful of specific win milestones, not every
// win — Apple already caps how often the system dialog can actually appear
// (a few times per year), this just avoids spamming the counter/asking too soon.
const WIN_COUNT_KEY = 'reviewPromptWinCount';
const MILESTONES = [3, 10, 25, 50, 100];

export async function maybeRequestReview(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(WIN_COUNT_KEY);
    const count = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(WIN_COUNT_KEY, String(count));
    if (!MILESTONES.includes(count)) return;
    const available = await StoreReview.isAvailableAsync();
    if (available) await StoreReview.requestReview();
  } catch {
    // Never let a review-prompt failure affect gameplay.
  }
}
