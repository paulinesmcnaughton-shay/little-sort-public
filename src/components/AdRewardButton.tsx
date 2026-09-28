import React from 'react';
import { Button } from './Button';
import { IconName } from './Icon';

export function AdRewardButton({ title, icon = 'play', onPress, disabled }: { title: string; icon?: IconName; onPress: () => void; disabled?: boolean }) {
  return <Button title={title} icon={icon} variant="gold" size="md" onPress={onPress} disabled={disabled} />;
}
