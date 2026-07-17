import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Search} from 'lucide-react-native';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';

export function SearchTab(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Search color="#0b1c30" size={48} style={{marginBottom: 16}} />
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Discover services and professionals.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
  },
});
