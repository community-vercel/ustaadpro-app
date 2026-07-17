import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

export function GradientButton({
  title,
  onPress,
  loading = false,
  style,
}: GradientButtonProps): React.JSX.Element {
  return (
    <Pressable onPress={onPress} disabled={loading} style={style}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.button}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0,
  },
});
