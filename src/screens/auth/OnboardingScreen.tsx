import React, {useRef, useState} from 'react';
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Image,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowRight} from 'lucide-react-native';
import {AuthStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {rounded} from '@/theme/layout';
import {fontFamily, type} from '@/theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

interface Slide {
  title: string;
  body: string;
  image: any;
}

const slides: Slide[] = [
  {
    title: 'Premium Home Maintenance',
    body: 'Book trusted home services with clear, upfront pricing. Expert technicians ready to assist you.',
    image: require('@/assets/images/1.webp'),
  },
  {
    title: 'Verified Professionals',
    body: 'Every provider is rigorously vetted, ensuring peace of mind and the highest quality of work.',
    image: require('@/assets/images/2.webp'),
  },
];

export function OnboardingScreen({navigation}: Props): React.JSX.Element {
  const {width} = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const completeOnboarding = useAppStore(state => state.completeOnboarding);

  const finishOnboarding = () => {
    completeOnboarding();
    navigation.replace('Login');
  };

  const handleNext = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({index: index + 1, animated: true});
      return;
    }

    finishOnboarding();
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.brand}>UstaadPro</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            hitSlop={10}
            onPress={finishOnboarding}
            style={({pressed}) => [
              styles.skipButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <Animated.FlatList
          ref={listRef}
          data={slides}
          keyExtractor={item => item.title}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {x: scrollX}}}],
            {useNativeDriver: true},
          )}
          scrollEventThrottle={16}
          renderItem={({item}) => (
            <View style={[styles.slide, {width}]}>
              <View style={styles.imageContainer}>
                <Image 
                  source={item.image} 
                  style={styles.image} 
                  resizeMode="contain" 
                />
              </View>

              <View style={styles.copyBlock}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </View>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((slide, dotIndex) => (
              <View
                key={slide.title}
                style={[styles.dot, dotIndex === index && styles.dotActive]}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleNext}
            style={({pressed}) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {index === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <ArrowRight color="#ffffff" size={20} strokeWidth={2.5} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: fontFamily.extraBold,
    color: '#0F172A',
    fontSize: 22,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: rounded.full,
    backgroundColor: '#F1F5F9',
  },
  skipText: {
    fontFamily: fontFamily.bold,
    color: '#64748B',
    fontSize: 14,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  imageContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  image: {
    width: '100%',
    height: '100%',
    maxHeight: 320,
  },
  copyBlock: {
    flex: 0.4,
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.extraBold,
    color: '#0F172A',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  body: {
    fontFamily: fontFamily.medium,
    color: '#64748B',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 32,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#0F172A',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#006C49',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 4,
    shadowColor: '#006C49',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
  },
  primaryButtonText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 18,
  },
  pressed: {
    opacity: 0.85,
    transform: [{scale: 0.98}],
  },
});

