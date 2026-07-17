import React from 'react';
import {Platform, StyleSheet, View, ViewProps} from 'react-native';
import {BlurView} from '@react-native-community/blur';

export function GlassCard({children, style}: ViewProps): React.JSX.Element {
  if (Platform.OS === 'ios') {
    return (
      <BlurView blurType="light" blurAmount={18} style={[styles.card, style]}>
        {children}
      </BlurView>
    );
  }

  return <View style={[styles.card, styles.androidFallback, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  androidFallback: {
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
});
