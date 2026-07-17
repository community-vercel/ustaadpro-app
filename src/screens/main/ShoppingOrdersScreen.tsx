import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {ShopOrderStatus} from '@/types/models';
import {colors} from '@/theme/colors';
import {fontFamily, type} from '@/theme/typography';
import {rounded} from '@/theme/layout';
import {formatPkr} from '@/utils/currency';
import {resolveApiAssetUrl} from '@/api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'ShoppingOrders'>;

const statusMeta: Record<
  ShopOrderStatus,
  {label: string; bg: string; color: string; Icon: typeof Clock3}
> = {
  placed: {label: 'Placed', bg: '#e5eeff', color: '#0b1c30', Icon: Clock3},
  processing: {
    label: 'Processing',
    bg: '#fef3c7',
    color: '#92400e',
    Icon: Package,
  },
  shipped: {label: 'Shipped', bg: '#dbeafe', color: '#1d4ed8', Icon: Truck},
  delivered: {
    label: 'Delivered',
    bg: '#dcfce7',
    color: '#006c49',
    Icon: CheckCircle2,
  },
  cancelled: {label: 'Cancelled', bg: '#fee2e2', color: '#ba1a1a', Icon: XCircle},
};

export function ShoppingOrdersScreen({navigation}: Props): React.JSX.Element {
  const {shopOrders, fetchShopOrders, cancelShopOrder} = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchShopOrders().finally(() => setLoading(false));
  }, [fetchShopOrders]);

  const activeCount = useMemo(
    () =>
      shopOrders.filter(
        order => order.status !== 'delivered' && order.status !== 'cancelled',
      ).length,
    [shopOrders],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchShopOrders();
    setRefreshing(false);
  };

  const handleCancelRequest = (orderId: string) => {
    setCancellingOrderId(orderId);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrderId) return;
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation.');
      return;
    }
    setCancelling(true);
    try {
      await cancelShopOrder(cancellingOrderId, cancelReason.trim());
      setCancelModalVisible(false);
      setCancellingOrderId(null);
    } catch (error: any) {
      Alert.alert(
        'Cancellation Failed',
        error.response?.data?.message || 'Could not cancel the order.',
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.authDark} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.ink} size={20} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Shopping Orders</Text>
          <Text style={styles.subtitle}>Products you purchased from Store</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.authDark}
            colors={[colors.authDark]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <ShoppingBag color={colors.secondary} size={22} strokeWidth={2.2} />
            <Text style={styles.summaryValue}>{shopOrders.length}</Text>
            <Text style={styles.summaryLabel}>Total orders</Text>
          </View>
          <View style={styles.summaryCard}>
            <Truck color="#1d4ed8" size={22} strokeWidth={2.2} />
            <Text style={styles.summaryValue}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>In progress</Text>
          </View>
        </View>

        {shopOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <ShoppingBag color={colors.secondary} size={34} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>No shopping orders yet</Text>
            <Text style={styles.emptyBody}>
              Products you buy from the Store will appear here with status,
              delivery address, and item details.
            </Text>
          </View>
        ) : (
          shopOrders.map(order => {
            const meta = statusMeta[order.status];
            const Icon = meta.Icon;
            const itemCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderIcon}>
                    <Icon color={meta.color} size={20} strokeWidth={2.2} />
                  </View>
                  <View style={styles.orderHeadCopy}>
                    <Text style={styles.orderId}>{order.id}</Text>
                    <Text style={styles.orderMeta}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: meta.bg}]}>
                    <Text style={[styles.statusText, {color: meta.color}]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.productsBox}>
                  {order.items.map(item => (
                    <View key={item.product.id} style={styles.productRow}>
                      <View style={styles.productThumb}>
                        {item.product.imageUrl ? (
                          <Image
                            source={{uri: resolveApiAssetUrl(item.product.imageUrl)}}
                            style={styles.productImage}
                          />
                        ) : (
                          <Package color={colors.secondary} size={20} />
                        )}
                      </View>
                      <View style={styles.productCopy}>
                        <Text style={styles.productTitle} numberOfLines={1}>
                          {item.product.title}
                        </Text>
                        <Text style={styles.productMeta}>
                          {item.quantity}x {formatPkr(item.price)}
                        </Text>
                      </View>
                      <Text style={styles.productTotal}>
                        {formatPkr(item.quantity * item.price)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailRow}>
                  <MapPin color={colors.muted} size={16} strokeWidth={2.1} />
                  <Text style={styles.detailText} numberOfLines={2}>
                    {order.address || 'Address not provided'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Truck color={colors.muted} size={16} strokeWidth={2.1} />
                  <Text style={styles.detailText}>
                    Shipping cost: {formatPkr(order.shippingCost || 0)}
                  </Text>
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.footerMeta}>{itemCount} product item(s)</Text>
                  <Text style={styles.total}>{formatPkr(order.total)}</Text>
                </View>

                {order.status === 'cancelled' && order.cancelReason && (
                  <View style={styles.cancelReasonBox}>
                    <Text style={styles.cancelReasonLabel}>Cancellation Reason:</Text>
                    <Text style={styles.cancelReasonText}>{order.cancelReason}</Text>
                  </View>
                )}

                {(order.status === 'placed' || order.status === 'processing') && (
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => handleCancelRequest(order.id)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Order</Text>
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !cancelling && setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalBody}>
              Please provide a reason for cancelling this order.
            </Text>
            <TextInput
              style={styles.cancelInput}
              placeholder="Reason for cancellation"
              placeholderTextColor={colors.muted}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              editable={!cancelling}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
                disabled={cancelling}
              >
                <Text style={styles.modalCancelBtnText}>Back</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: rounded.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {flex: 1},
  title: {...type.h1, color: colors.ink},
  subtitle: {...type.body, color: colors.muted, marginTop: 2},
  content: {padding: 20, paddingBottom: 112},
  summaryRow: {flexDirection: 'row', gap: 12, marginBottom: 18},
  summaryCard: {
    flex: 1,
    minHeight: 98,
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 14,
    justifyContent: 'center',
  },
  summaryValue: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 24,
    marginTop: 8,
  },
  summaryLabel: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyCard: {
    minHeight: 280,
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {fontFamily: fontFamily.bold, color: colors.ink, fontSize: 20},
  emptyBody: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    lineHeight: 22,
  },
  cancelReasonBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff1f2',
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  cancelReasonLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: '#9f1239',
    marginBottom: 4,
  },
  cancelReasonText: {
    ...type.body,
    color: '#be123c',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#fee2e2',
    borderRadius: rounded.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#ba1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: rounded.xl,
    padding: 24,
    shadowColor: colors.ink,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
    marginBottom: 8,
  },
  modalBody: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
  },
  cancelInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: rounded.lg,
    padding: 16,
    ...type.body,
    color: colors.ink,
    minHeight: 100,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: rounded.lg,
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: rounded.lg,
    backgroundColor: '#ef4444',
  },
  modalConfirmBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#fff',
  },
  orderCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    borderRadius: rounded.xl,
    marginBottom: 14,
  },
  orderHeader: {flexDirection: 'row', alignItems: 'center', gap: 12},
  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderHeadCopy: {flex: 1},
  orderId: {fontFamily: fontFamily.extraBold, color: colors.ink, fontSize: 15},
  orderMeta: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: rounded.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {fontFamily: fontFamily.bold, fontSize: 10},
  productsBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.default,
    padding: 10,
    marginTop: 14,
    gap: 10,
  },
  productRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  productThumb: {
    width: 42,
    height: 42,
    borderRadius: rounded.default,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {width: '100%', height: '100%'},
  productCopy: {flex: 1},
  productTitle: {fontFamily: fontFamily.bold, color: colors.ink, fontSize: 13},
  productMeta: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  productTotal: {fontFamily: fontFamily.bold, color: colors.ink, fontSize: 12},
  detailRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#eff4ff',
  },
  detailText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  orderFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {fontFamily: fontFamily.medium, color: colors.muted, fontSize: 12},
  total: {fontFamily: fontFamily.extraBold, color: colors.ink, fontSize: 18},
});
