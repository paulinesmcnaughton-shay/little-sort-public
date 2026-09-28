import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/theme';

export type IconName =
  | 'play' | 'back' | 'close' | 'gear' | 'grid' | 'bulb' | 'undo' | 'refresh' | 'star' | 'crown'
  | 'lock' | 'check' | 'sound' | 'music' | 'bell' | 'phone' | 'sparkle' | 'palette' | 'calendar'
  | 'chevron' | 'info' | 'heart' | 'shield' | 'tube' | 'clock' | 'gem' | 'bomb' | 'rowwipe' | 'shuffle' | 'gift' | 'logout' | 'trash' | 'cloud' | 'megaphone';

// Ported from the Design System icon set (viewBox 0 0 24 24, currentColor).
export function Icon({ name, size = 24, color = colors.ink, stroke = 2.2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const s = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const f = { fill: color };
  const body = (() => {
    switch (name) {
      case 'play': return <Path d="M8 5.5v13l11-6.5z" {...f} />;
      case 'back': return <Path d="M15 5l-7 7 7 7" {...s} />;
      case 'chevron': return <Path d="M9 6l6 6-6 6" {...s} />;
      case 'close': return <Path d="M6 6l12 12M18 6L6 18" {...s} />;
      case 'check': return <Path d="M5 12.5l4.5 4.5L19 7" {...s} />;
      case 'undo': return <Path d="M9 7L5 11l4 4M5 11h9a5 5 0 0 1 0 10h-2" {...s} />;
      case 'star': return <Path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" {...f} />;
      case 'crown': return <Path d="M4 18h16l1.2-9-5.2 3.5L12 5l-4 7.5L2.8 9z" {...f} />;
      case 'sparkle': return <Path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" {...f} />;
      case 'heart': return <Path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20z" {...f} />;
      case 'gear': return <Path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" {...f} fillRule="evenodd" />;
      case 'grid': return <G {...s}><Rect x="4" y="4" width="6" height="6" rx="1.6" /><Rect x="14" y="4" width="6" height="6" rx="1.6" /><Rect x="4" y="14" width="6" height="6" rx="1.6" /><Rect x="14" y="14" width="6" height="6" rx="1.6" /></G>;
      case 'bulb': return <G {...s}><Path d="M9 18h6M10 21h4" /><Path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3z" /></G>;
      case 'refresh': return <G {...s}><Path d="M4 5v5h5" /><Path d="M5.5 14a7 7 0 1 0 1.5-7.5L4 10" /></G>;
      case 'lock': return <G {...s}><Rect x="5.5" y="11" width="13" height="9" rx="2.4" /><Path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></G>;
      case 'sound': return <G {...s}><Path d="M4 9v6h4l5 4V5L8 9z" /><Path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" /></G>;
      case 'music': return <G {...s}><Path d="M9 18V6l10-2v12" /><Circle cx="6" cy="18" r="2.6" /><Circle cx="16" cy="16" r="2.6" /></G>;
      case 'bell': return <G {...s}><Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2.5h-15z" /><Path d="M10 19a2 2 0 0 0 4 0" /></G>;
      case 'megaphone': return <G {...s}><Path d="M4.5 10.5v3a2 2 0 0 0 2 2H8l8.5 4V4.5L8 8.5H6.5a2 2 0 0 0-2 2z" /><Path d="M8 15.5v4a1.8 1.8 0 0 0 3.6 0v-2.3" /><Path d="M19.5 10a2.8 2.8 0 0 1 0 4" /></G>;
      case 'phone': return <G {...s}><Path d="M12 3v3M5 7l1.5 1.5M19 7l-1.5 1.5" /><Rect x="7" y="10" width="10" height="10" rx="2" /></G>;
      case 'calendar': return <G {...s}><Rect x="4" y="5.5" width="16" height="15" rx="2.4" /><Path d="M4 9.5h16M8 3.5v3M16 3.5v3" /></G>;
      case 'info': return <G {...s}><Circle cx="12" cy="12" r="9" /><Path d="M12 11v5M12 8h.01" /></G>;
      case 'shield': return <G {...s}><Path d="M12 3l7 2.5V11c0 5-3.4 8.2-7 9.5C8.4 19.2 5 16 5 11V5.5z" /><Path d="M9 12l2 2 4-4" /></G>;
      case 'tube': return <G {...s}><Path d="M8 3h8M9 3v13a3 3 0 0 0 6 0V3" /><Path d="M9 11h6" /></G>;
      case 'clock': return <G {...s}><Circle cx="12" cy="12" r="8.5" /><Path d="M12 7v5.5l3.5 2" /></G>;
      case 'gem': return <G {...s}><Path d="M7 4h10l4 6-9 10-9-10z" /><Path d="M3 10h18M9 4l-2 6 5 10M15 4l2 6-5 10" /></G>;
      case 'palette': return <G {...s}><Path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2s-.4-2 .5-2.5H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3z" /><Circle cx="8" cy="11" r="1" {...f} stroke="none" /><Circle cx="12" cy="8" r="1" {...f} stroke="none" /><Circle cx="16" cy="11" r="1" {...f} stroke="none" /></G>;
      case 'bomb': return <G {...s}><Circle cx="11" cy="15" r="6" /><Path d="M15 11l2.5-2.5M17.5 8.5l1.5.5M17.5 8.5l-.5-1.5" /></G>;
      case 'rowwipe': return <G {...s}><Rect x="3" y="9.5" width="18" height="5" rx="1.6" /><Path d="M7 7V5M12 7V5M17 7V5M7 19v-2M12 19v-2M17 19v-2" /></G>;
      case 'shuffle': return <G {...s}><Path d="M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3" /><Path d="M18 4l2 3-2 3M18 14l2 3-2 3" /></G>;
      case 'gift': return <G {...s}><Rect x="3" y="10" width="18" height="11" rx="2" /><Path d="M3 13h18M12 10v11" /><Path d="M12 10H7.5a2.5 2.5 0 0 1 0-5C10 5 12 10 12 10z" /><Path d="M12 10h4.5a2.5 2.5 0 0 0 0-5C14 5 12 10 12 10z" /></G>;
      case 'logout': return <G {...s}><Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><Path d="M10 17l5-5-5-5M15 12H3" /></G>;
      case 'trash': return <G {...s}><Path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /><Path d="M10 11v6M14 11v6" /></G>;
      case 'cloud': return <Path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" {...s} />;
      default: return null;
    }
  })();
  return <Svg width={size} height={size} viewBox="0 0 24 24">{body}</Svg>;
}
