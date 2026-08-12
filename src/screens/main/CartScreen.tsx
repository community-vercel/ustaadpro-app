import React, { useEffect } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react-native';
import { RootStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { formatPkr } from '@/utils/currency';
import { rounded } from '@/theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props): React.JSX.Element {
  const cart = useAppStore(state => state.cart);
  const appSettings = useAppStore(state => state.appSettings);
  const fetchAppContent = useAppStore(state => state.fetchAppContent);
  const user = useAppStore(state => state.user);
  const removeFromCart = useAppStore(state => state.removeFromCart);
  const updateCartQuantity = useAppStore(state => state.updateCartQuantity);

  useEffect(() => {
    fetchAppContent();
  }, [fetchAppContent]);

  const handleProceed = () => {
    if (!user) {
      Alert.alert(
        'Login required',
        'Please login or create an account to place a service booking.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: () => navigation.navigate('Auth', { screen: 'Login' }),
          },
        ],
      );
      return;
    }

    // Navigate to Booking screen to complete checkout details
    // For now we just pass a dummy string to bypass the type error if we want, but better to navigate
    navigation.navigate('Booking', {serviceId: cart[0].service.id, fromCart: true});
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.service.price * item.quantity,
    0,
  );
  const inspectionFee = Number(appSettings.inspectionFee || 0);
  const tax = Math.round(
    (subtotal * Number(appSettings.serviceTaxPercent || 0)) / 100,
  );
  const total = subtotal + inspectionFee + tax;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ marginRight: 16 }}
          >
            <ArrowLeft color="#0b1c30" size={24} strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Service Cart</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cart.length} items</Text>
        </View>
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {cart.length === 0 ? (
          <Text style={styles.emptyText}>Your cart is empty.</Text>
        ) : (
          cart.map((item, index) => (
            <View key={[item.service.id, item.service.selectedWorkPriceId || item.service.selectedWorkPrice?.id || 'direct'].join('-')} style={styles.cartCard}>
              <View
                style={[
                  styles.itemImagePlaceholder,
                  {
                    backgroundColor:
                      item.service.categoryId === 'cleaning'
                        ? '#4f8c9b'
                        : '#23618f',
                  },
                ]}
              >
                {item.service.imageUrl ? <Image source={{uri: item.service.imageUrl}} style={styles.itemImage} resizeMode="cover" /> : null}
              </View>
              <View style={styles.itemInfo}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemTitle}>{item.service.selectedWorkTitle || item.service.title}</Text>
                  <Pressable onPress={() => removeFromCart(item.service.id, item.service.selectedWorkPriceId || item.service.selectedWorkPrice?.id)}><Trash2 color="#45464d" size={20} /></Pressable>
                </View>
                <Text style={styles.itemDuration}>
                  🕒 {item.service.duration}
                </Text>
                <View style={styles.itemBottomRow}>
                  <Text style={styles.itemPrice}>{formatPkr(item.service.price * item.quantity)}</Text>
                  <View style={styles.quantityControl}>
                    <Pressable style={styles.qtyBtn} onPress={() => updateCartQuantity(item.service.id, item.quantity - 1, item.service.selectedWorkPriceId || item.service.selectedWorkPrice?.id)}><Minus color="#76777d" size={16} /></Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable style={[styles.qtyBtn, {backgroundColor: '#000'}]} onPress={() => updateCartQuantity(item.service.id, item.quantity + 1, item.service.selectedWorkPriceId || item.service.selectedWorkPrice?.id)}><Plus color="#fff" size={16} /></Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}

        {cart.length > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Service Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatPkr(subtotal)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Inspection fee</Text>
              <Text style={styles.summaryValue}>{formatPkr(inspectionFee)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform charges ({appSettings.serviceTaxPercent}%)</Text>
              <Text style={styles.summaryValue}>{formatPkr(tax)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatPkr(total)}</Text>
            </View>


          </View>
        )}
      </ScrollView>

      {/* ── Footer ── */}
      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>Total Amount</Text>
            <Text style={styles.footerTotal}>{formatPkr(total)}</Text>
          </View>
          <Pressable style={styles.proceedBtn} onPress={handleProceed}>
            <Text style={styles.proceedText}>Proceed to Booking</Text>
            <ArrowRight color="#ffffff" size={20} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9ff',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: '#0b1c30',
  },
  badge: {
    backgroundColor: '#6cf8bb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
  },
  badgeText: {
    fontFamily: fontFamily.medium,
    color: '#00714d',
    fontSize: 12,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: '#45464d',
    textAlign: 'center',
    marginTop: 40,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5eeff',
    elevation: 2,
    shadowColor: '#0b1c30',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: rounded.lg,
    marginRight: 16,
  },
  itemImage: {width: '100%', height: '100%', borderRadius: rounded.lg},
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#0b1c30',
  },
  itemDuration: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#45464d',
    marginTop: 4,
    marginBottom: 10,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#0b1c30',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderRadius: rounded.full,
    padding: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#0b1c30',
    marginHorizontal: 12,
  },
  summaryBox: {
    backgroundColor: '#eff4ff',
    borderRadius: rounded.xl,
    padding: 20,
    marginTop: 8,
  },
  summaryTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: '#0b1c30',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#45464d',
  },
  summaryValue: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: '#0b1c30',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#c6c6cd',
    marginVertical: 16,
  },
  summaryTotalLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: '#0b1c30',
  },
  summaryTotalValue: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: '#0b1c30',
  },
  guaranteeBox: {
    flexDirection: 'row',
    backgroundColor: '#d1fae5', // mint green
    borderRadius: rounded.lg,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  guaranteeText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#002113',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5eeff',
  },
  footerLeft: {
    flex: 1,
  },
  footerLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#76777d',
  },
  footerTotal: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: '#0b1c30',
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: rounded.full,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  proceedText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#ffffff',
  },
});
