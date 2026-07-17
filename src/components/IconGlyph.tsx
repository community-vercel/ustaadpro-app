import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
  CalendarCheck,
  Coins,
  LucideIcon,
  Scissors,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react-native';

const glyphs: Record<string, LucideIcon> = {
  tools: Wrench,
  sparkle: Sparkles,
  salon: Scissors,
  calendar: CalendarCheck,
  shield: ShieldCheck,
  coin: Coins,
};

export function IconGlyph({
  name,
  color,
  size = 48,
}: {
  name: string;
  color: string;
  size?: number;
}): React.JSX.Element {
  const Icon = glyphs[name] ?? Sparkles;

  return (
    <View
      style={[
        styles.wrap,
        {width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}18`},
      ]}>
      <Icon color={color} size={Math.max(20, size * 0.48)} strokeWidth={2.4} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
