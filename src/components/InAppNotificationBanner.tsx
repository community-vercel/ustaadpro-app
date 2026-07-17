import React, {useEffect, useRef} from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import {Megaphone, PackageCheck, ShoppingBag, X} from 'lucide-react-native';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {rounded} from '@/theme/layout';

type NotificationKind = 'broadcast' | 'service' | 'shop';

function getNotificationMeta(title: string, body: string) {
  const text = `${title} ${body}`.toLowerCase();
  const kind: NotificationKind = text.includes('shop') || text.includes('shopping') || text.includes('store')
    ? 'shop'
    : text.includes('order') || text.includes('booking') || text.includes('service')
      ? 'service'
      : 'broadcast';

  if (kind === 'shop') {
    return {accent: '#db2777', surface: '#fff1f7', Icon: ShoppingBag};
  }
  if (kind === 'service') {
    return {accent: colors.secondary, surface: '#effcf6', Icon: PackageCheck};
  }
  return {accent: '#4f46e5', surface: '#eef2ff', Icon: Megaphone};
}
type Props = {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
};

export function InAppNotificationBanner({
  visible,
  title,
  body,
  onClose,
}: Props): React.JSX.Element {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slide.setValue(0);
      return;
    }

    Animated.spring(slide, {
      toValue: 1,
      useNativeDriver: true,
      damping: 14,
      stiffness: 170,
      mass: 0.8,
    }).start();

    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose, slide, visible]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });
  const meta = getNotificationMeta(title, body);
  const AccentIcon = meta.Icon;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: slide,
              transform: [{translateY}],
            },
          ]}
        >
          <View style={[styles.iconWrap, {backgroundColor: meta.surface}]}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={[styles.iconBadge, {backgroundColor: meta.accent}]}>
              <AccentIcon color="#ffffff" size={11} strokeWidth={2.7} />
            </View>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {body}
            </Text>
          </View>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
          >
            <X color={colors.muted} size={18} strokeWidth={2.2} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 60,
    backgroundColor: 'rgba(11, 28, 48, 0.18)',
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce9ff',
    shadowColor: '#0b1c30',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#0b1c30',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 5},
    elevation: 4,
  },
  logo: {
    width: 29,
    height: 29,
    borderRadius: 8,
  },
  iconBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 15,
  },
  body: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  closeButton: {
    padding: 4,
  },
});
