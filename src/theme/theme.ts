export type ThemeKey = 'kitchen' | 'garden' | 'bakery' | 'lavender' | 'sunset' | 'cuddly' | 'galaxy' | 'ocean' | 'daily' | 'fruits' | 'flora';

// Design System tokens — soft sage/cream neutrals, calm and tactile.
export const colors = {
  bg: '#E8EFEC',
  bgDeep: '#DCE7E2',
  surface: '#FFFFFF',
  surfaceSoft: '#F4F8F6',
  ink: '#3A4A48',
  inkSoft: '#6E817D',
  inkFaint: '#A6B5B0',
  primary: '#7BB89C',
  primaryDark: '#5E9E82',
  accent: '#6FA3BC',
  accentDark: '#5689A2',
  gold: '#E3B25A',
  goldDark: '#CF9A3E',
  terra: '#E0936A',
  star: '#F2C14E',
  shelf: '#E7D6BB',
  shelfEdge: '#D2BB97',
  slot: '#F4F8F6',
  danger: '#D98A86',
  hairline: '#E2EAE6',
};

// The 8 sort colors — item "type" index maps to one of these (items are pre-coloured to match).
export const ITEM_COLORS = ['#E2956E', '#E7C56B', '#8FBFA3', '#6FC2BE', '#7FB0CC', '#8C9ED6', '#B79AD0', '#E59AA6'];

// Font families (loaded in App via @expo-google-fonts).
export const fonts = {
  display: 'Baloo2_700Bold', // headings, numbers, buttons
  displayHeavy: 'Baloo2_800ExtraBold',
  displayMed: 'Baloo2_600SemiBold',
  body: 'Nunito_700Bold',
  bodyMed: 'Nunito_600SemiBold',
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 34 };
export const radii = { sm: 13, md: 18, lg: 22, xl: 26, sheet: 30, pill: 999 };

type ThemeDef = { name: string; emoji: string; bg: string; bgDeep: string; primary: string; shelf: string; shelfEdge: string; art: string; items: string[]; premium?: boolean };

export const themes: Record<ThemeKey, ThemeDef> = {
  kitchen: { name: 'Cozy Kitchen', emoji: '☕', bg: '#E8EFEC', bgDeep: '#DCE7E2', shelf: '#E7D6BB', shelfEdge: '#D2BB97', art: 'kitchen', primary: colors.primary, items: ['🍵', '🍯', '🫖', '🍎', '🥐', '🧁'] },
  garden: { name: 'Little Garden', emoji: '🌿', bg: '#E7EFE6', bgDeep: '#DBE8D9', shelf: '#E2D3B8', shelfEdge: '#CDB994', art: 'garden', primary: colors.primary, items: ['🌿', '🌸', '🍄', '🌻', '🪴', '🍓'] },
  bakery: { name: 'Sweet Bakery', emoji: '🧁', bg: '#F3ECEA', bgDeep: '#EBE0DD', shelf: '#EAD9C6', shelfEdge: '#D8C0A8', art: 'bakery', primary: colors.primary, items: ['🥐', '🧁', '🍩', '🍪', '🍰', '🥨'] },
  lavender: { name: 'Lavender Hour', emoji: '💜', bg: '#EDE9F4', bgDeep: '#E2DCEF', shelf: '#DCD2E8', shelfEdge: '#C6B9D8', art: 'lavender', primary: colors.primary, premium: true, items: ['🪻', '🍇', '🫐', '🌸', '🍬', '🧁'] },
  sunset: { name: 'Sunset Shelf', emoji: '🌅', bg: '#FBEBE0', bgDeep: '#F6DDCD', shelf: '#E9C9A8', shelfEdge: '#D8B189', art: 'sunset', primary: colors.primary, premium: true, items: ['🍑', '🍊', '🌅', '🍓', '🌷', '🧁'] },
  cuddly: { name: 'Cuddly Critters', emoji: '🐻', bg: '#F3ECE2', bgDeep: '#EBE1D2', shelf: '#E6D3B6', shelfEdge: '#D2BB94', art: 'critters', primary: colors.primary, premium: true, items: ['🐶', '🐱', '🐰', '🐔', '🦆', '🐮'] },
  galaxy: { name: 'Galaxy', emoji: '🪐', bg: '#E8E8F4', bgDeep: '#DBDCEE', shelf: '#D7D8E6', shelfEdge: '#C2C4D8', art: 'galaxy', primary: colors.primary, premium: true, items: ['🪐', '🌟', '🌙', '☄️', '🚀', '🛸'] },
  ocean: { name: 'Under the Sea', emoji: '🐚', bg: '#E2EFF0', bgDeep: '#D4E8EA', shelf: '#E6D7BC', shelfEdge: '#D2BD98', art: 'sea', primary: colors.primary, premium: true, items: ['🐠', '🐡', '🐙', '🦀', '🐚', '🐬'] },
  // Daily-only theme — forced for the Daily Challenge, never selectable in Settings.
  daily: { name: 'Daily Special', emoji: '💎', bg: '#E7ECF1', bgDeep: '#DBE3EB', shelf: '#D9DEE8', shelfEdge: '#C3CAD8', art: 'gems', primary: colors.primary, items: ['⭐', '💎', '🌟', '🔮', '🍀', '🌈', '🎁'] },
  // Daily-only theme — Fruit Stand, forced for the Daily Challenge, never selectable in Settings.
  fruits: { name: 'Fruit Stand', emoji: '🍓', bg: '#F4EFE4', bgDeep: '#ECE4D2', shelf: '#E7D6BB', shelfEdge: '#D2BB97', art: 'fruits', primary: colors.primary, items: ['🍎', '🍓', '🍌', '🍒', '🍊', '🍇', '🍍', '🍉'] },
  // Tubes-only theme — Blossom, forced for Tubes mode, never selectable in Settings.
  flora: { name: 'Blossom', emoji: '🌷', bg: '#ECF1E8', bgDeep: '#E0EADB', shelf: '#E2D3B8', shelfEdge: '#CDB994', art: 'flora', primary: colors.primary, items: ['🌹', '🌷', '🌼', '🌻', '🌺', '🪻', '🪷', '🪴'] },
};
