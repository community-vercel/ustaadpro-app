import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {launchImageLibrary} from 'react-native-image-picker';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  Copy,
  Edit2,
  MapPin,
  PackageCheck,
  Star,
  X,
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {Order} from '@/types/models';
import {colors} from '@/theme/colors';
import {fontFamily, type} from '@/theme/typography';
import {rounded} from '@/theme/layout';
import {formatPkr} from '@/utils/currency';
import {NotificationCenter} from '@/components/NotificationCenter';
import {resolveApiAssetUrl} from '@/api/client';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const statusMeta: Record<
  Order['status'],
  {label: string; bg: string; color: string}
> = {
  confirmed: {label: 'Confirmed', bg: '#dcfce7', color: '#006c49'},
  assigned: {label: 'Assigned', bg: '#e5eeff', color: '#0b1c30'},
  in_progress: {label: 'In Progress', bg: '#fef3c7', color: '#92400e'},
  completed: {label: 'Completed', bg: '#eef2ff', color: '#4f46e5'},
  cancelled: {label: 'Cancelled', bg: '#fee2e2', color: '#ba1a1a'},
};

const EASYPAISA_ACCOUNT_NUMBER = '03485838593';
const EASYPAISA_ACCOUNT_TITLE = 'Muhammad Ikram';

const QUICK_TIME_SLOTS = [
  '06:00 AM',
  '08:00 AM',
  '10:00 AM',
  '12:30 PM',
  '02:00 PM',
  '04:30 PM',
  '07:00 PM',
  '09:30 PM',
  '10:30 PM',
];

function getBookingDays() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return Array.from({length: 90}, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      dateObj: date,
      label:
        index === 0
          ? 'Today'
          : date.toLocaleDateString('en-US', {weekday: 'short'}),
      date: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', {month: 'long'}),
      monthShort: date.toLocaleDateString('en-US', {month: 'short'}),
      year: date.getFullYear(),
    };
  });
}

function formatBookingDate(day: ReturnType<typeof getBookingDays>[number]) {
  return `${day.label}, ${day.monthShort} ${day.date}, ${day.year}`;
}

function parseSchedule(
  bookedFor: string,
  bookingDays: ReturnType<typeof getBookingDays>,
) {
  const fallback = {
    selectedDay: 0,
    isRecurring: false,
    recurringEndDay: 7,
    selectedTime: '02:00 PM',
  };
  const timeMatch = bookedFor.match(/(\d{2}:\d{2}\s[AP]M)$/);
  const selectedTime = timeMatch?.[1] || fallback.selectedTime;
  const recurringMatch = bookedFor.match(/^Recurring:\s(.+)\sto\s(.+)\s-\s/);
  const isRecurring = Boolean(recurringMatch);
  const startLabel = isRecurring
    ? recurringMatch?.[1]
    : bookedFor.split(' - ')[0];
  const endLabel = recurringMatch?.[2];
  const selectedDay = Math.max(
    0,
    bookingDays.findIndex(day => formatBookingDate(day) === startLabel),
  );
  const recurringEndDay = Math.max(
    selectedDay,
    endLabel
      ? bookingDays.findIndex(day => formatBookingDate(day) === endLabel)
      : Math.min(selectedDay + 7, bookingDays.length - 1),
  );

  return {
    selectedDay,
    isRecurring,
    recurringEndDay:
      recurringEndDay >= 0
        ? recurringEndDay
        : Math.min(selectedDay + 7, bookingDays.length - 1),
    selectedTime,
  };
}

export function BookingsTab(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const {orders, services, fetchOrders, fetchServices} = useAppStore();
  const submitServiceReview = useAppStore(state => state.submitServiceReview);
  const updateServiceOrder = useAppStore(state => state.updateServiceOrder);
  const cancelServiceOrder = useAppStore(state => state.cancelServiceOrder);
  const uploadPaymentReceipt = useAppStore(state => state.uploadPaymentReceipt);
  const pendingPaymentOrderId = useAppStore(state => state.pendingPaymentOrderId);
  const setPendingPaymentOrderId = useAppStore(state => state.setPendingPaymentOrderId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    orderId: string;
    serviceId: string;
    serviceTitle: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editTarget, setEditTarget] = useState<Order | null>(null);
  const [editServiceId, setEditServiceId] = useState('');
  const [editSelectedDay, setEditSelectedDay] = useState(0);
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurringEndDay, setEditRecurringEndDay] = useState(7);
  const [editSelectedTime, setEditSelectedTime] = useState('02:00 PM');
  const [editAddress, setEditAddress] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Order | null>(null);
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const existingReceiptUrl = paymentTarget?.paymentReceipt?.receiptUrl
    ? resolveApiAssetUrl(paymentTarget.paymentReceipt.receiptUrl)
    : '';
  const visibleReceiptUrl = receiptPreview || existingReceiptUrl;
  const hasUploadedReceipt = Boolean(visibleReceiptUrl);
  const bookingDays = useMemo(() => getBookingDays(), []);
  const editStartDay = bookingDays[editSelectedDay] || bookingDays[0];
  const editEndDay =
    bookingDays[editRecurringEndDay] || bookingDays[editSelectedDay];
  const editOccurrences = editIsRecurring
    ? editRecurringEndDay - editSelectedDay + 1
    : 1;
  const editScheduleLabel = editIsRecurring
    ? `Recurring: ${formatBookingDate(editStartDay)} to ${formatBookingDate(
        editEndDay,
      )} - ${editSelectedTime}`
    : `${formatBookingDate(editStartDay)} - ${editSelectedTime}`;

  const activeOrders = useMemo(
    () =>
      orders.filter(
        order => order.status !== 'completed' && order.status !== 'cancelled',
      ),
    [orders],
  );

  type FilterKey = 'all' | 'active' | 'done';
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredOrders = useMemo(() => {
    if (filter === 'active') return activeOrders;
    if (filter === 'done')
      return orders.filter(
        o => o.status === 'completed' || o.status === 'cancelled',
      );
    return orders;
  }, [orders, activeOrders, filter]);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchServices()]).finally(() =>
      setLoading(false),
    );
  }, [fetchOrders, fetchServices]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const openReview = (target: {
    orderId: string;
    serviceId: string;
    serviceTitle: string;
  }) => {
    setReviewTarget(target);
    setReviewRating(5);
    setReviewComment('');
  };

  const canChangeOrder = (order: Order) =>
    order.status === 'confirmed';

  const openOrderEditor = (order: Order) => {
    const firstService = order.items[0]?.service;
    const schedule = parseSchedule(order.bookedFor || '', bookingDays);
    setEditTarget(order);
    setEditServiceId(firstService?.id || services[0]?.id || '');
    setEditSelectedDay(schedule.selectedDay);
    setEditIsRecurring(schedule.isRecurring);
    setEditRecurringEndDay(schedule.recurringEndDay);
    setEditSelectedTime(schedule.selectedTime);
    setEditAddress(order.address || '');
    setEditInstructions(order.specialInstructions || '');
  };

  const closeOrderEditor = () => {
    setEditTarget(null);
    setEditServiceId('');
    setEditSelectedDay(0);
    setEditIsRecurring(false);
    setEditRecurringEndDay(7);
    setEditSelectedTime('02:00 PM');
    setEditAddress('');
    setEditInstructions('');
  };

  const handleUpdateOrder = async () => {
    if (!editTarget) {
      return;
    }

    if (!editAddress.trim()) {
      Alert.alert('Address required', 'Please enter the service address.');
      return;
    }

    if (!editServiceId) {
      Alert.alert('Service required', 'Please select a service.');
      return;
    }

    try {
      setSavingOrder(true);
      await updateServiceOrder(editTarget.id, {
        address: editAddress.trim(),
        specialInstructions: editInstructions.trim() || null,
        bookedFor: editScheduleLabel,
        recurringOccurrences: editOccurrences,
        items: [{serviceId: editServiceId, quantity: 1}],
      });
      closeOrderEditor();
      Alert.alert('Order updated', 'Your booking details have been updated.');
    } catch (error: any) {
      Alert.alert(
        'Update failed',
        error.response?.data?.message || error.message || 'Please try again.',
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const openCancelModal = (order: Order) => {
    setCancelTarget(order);
    setCancelReason('');
  };

  const closeCancelModal = () => {
    if (submittingCancel) {
      return;
    }
    setCancelTarget(null);
    setCancelReason('');
  };

  const handleCancelOrder = async () => {
    if (!cancelTarget) {
      return;
    }

    const reason = cancelReason.trim();
    if (!reason) {
      Alert.alert('Reason required', 'Please enter why you want to cancel.');
      return;
    }

    try {
      setSubmittingCancel(true);
      await cancelServiceOrder(cancelTarget.id, reason);
      setCancelTarget(null);
      setCancelReason('');
    } catch (error: any) {
      Alert.alert(
        'Cancel failed',
        error.response?.data?.message || error.message || 'Please try again.',
      );
    } finally {
      setSubmittingCancel(false);
    }
  };

  const openPaymentModal = (order?: Order | null) => {
    if (!order) return;
    setPaymentTarget(order);
    setReceiptPreview(null);
  };

  
  const closePaymentModal = () => {
    if (submittingReceipt) {
      return;
    }
    setPaymentTarget(null);
    setReceiptPreview(null);
  };

const openPaymentByOrderId = (orderId?: string) => {
    const order = orderId
      ? orders.find(item => item.id === orderId)
      : orders.find(item => item.status === 'completed');
    openPaymentModal(order || null);
  };

  const isCashPayment = (method?: string | null) =>
    String(method || '').toLowerCase().includes('cash');

  const copyPaymentNumber = () => {
    Clipboard.setString(EASYPAISA_ACCOUNT_NUMBER);
    Alert.alert('Copied', 'EasyPaisa account number copied successfully.');
  };
  const handleUploadReceipt = async () => {
    if (!paymentTarget) return;

    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.8,
    });

    const asset = result.assets?.[0];
    if (!asset?.base64) {
      return;
    }

    const type = asset.type || 'image/jpeg';
    const dataUrl = `data:${type};base64,${asset.base64}`;

    try {
      setSubmittingReceipt(true);
      await uploadPaymentReceipt({
        orderId: paymentTarget.id,
        dataUrl,
        filename: asset.fileName || 'payment-receipt.jpg',
        amount: paymentTarget.total,
      });
      setReceiptPreview(asset.uri || null);
      await fetchOrders();
      Alert.alert('Receipt uploaded', 'Thank you. Your EasyPaisa receipt has been submitted.');
    } catch (error: any) {
      Alert.alert(
        'Upload failed',
        error.response?.data?.message || error.message || 'Please try again.',
      );
    } finally {
      setSubmittingReceipt(false);
    }
  };
  useEffect(() => {
    if (!pendingPaymentOrderId || paymentTarget) {
      return;
    }

    const order = orders.find(item => item.id === pendingPaymentOrderId);
    if (order?.status === 'completed') {
      openPaymentModal(order);
      setPendingPaymentOrderId(null);
    }
  }, [orders, paymentTarget, pendingPaymentOrderId, setPendingPaymentOrderId]);
  const handleSubmitReview = async () => {
    if (!reviewTarget) {
      return;
    }

    if (!reviewComment.trim()) {
      Alert.alert('Review required', 'Please write your review.');
      return;
    }

    try {
      setSubmittingReview(true);
      await submitServiceReview({
        serviceId: reviewTarget.serviceId,
        orderId: reviewTarget.orderId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewTarget(null);
      setReviewComment('');
    } catch (error: any) {
      Alert.alert(
        'Review failed',
        error.response?.data?.message || error.message || 'Please try again.',
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0b1c30" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Modal
        visible={Boolean(reviewTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewTarget(null)}
      >
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewModal}>
            <Text style={styles.reviewModalTitle}>Review service</Text>
            <Text style={styles.reviewModalSubtitle}>
              {reviewTarget?.serviceTitle}
            </Text>
            <View style={styles.ratingPicker}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setReviewRating(star)}>
                  <Star
                    color="#F59E0B"
                    fill={star <= reviewRating ? '#F59E0B' : 'none'}
                    size={30}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              placeholder="Write your review..."
              placeholderTextColor={colors.muted}
              style={styles.reviewInput}
              textAlignVertical="top"
            />
            <View style={styles.reviewActions}>
              <Pressable
                style={styles.reviewCancel}
                onPress={() => setReviewTarget(null)}
                disabled={submittingReview}
              >
                <Text style={styles.reviewCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.reviewSubmit,
                  submittingReview && styles.reviewSubmitDisabled,
                ]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                <Text style={styles.reviewSubmitText}>
                  {submittingReview ? 'Submitting...' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(editTarget)}
        transparent
        animationType="fade"
        onRequestClose={closeOrderEditor}
      >
        <View style={styles.reviewOverlay}><ScrollView
            style={styles.editModalScroll}
            contentContainerStyle={styles.reviewModal}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.reviewModalTitle}>Update booking</Text>
                <Text style={styles.reviewModalSubtitle}>
                  {editTarget?.id}
                </Text>
              </View>
              <Pressable
                style={styles.editCloseButton}
                onPress={closeOrderEditor}
                disabled={savingOrder}
              >
                <X color={colors.ink} size={18} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.editFieldLabel}>Service</Text><ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicePicker}
            >
              {services.map(service => {
                const selected = editServiceId === service.id;

                return (
                  <Pressable
                    key={service.id}
                    style={[
                      styles.serviceOption,
                      selected && styles.serviceOptionActive,
                    ]}
                    onPress={() => setEditServiceId(service.id)}
                    disabled={savingOrder}
                  >
                    <Text
                      style={[
                        styles.serviceOptionTitle,
                        selected && styles.serviceOptionTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {service.title}
                    </Text>
                    <Text
                      style={[
                        styles.serviceOptionPrice,
                        selected && styles.serviceOptionPriceActive,
                      ]}
                    >
                      {formatPkr(service.price)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.editFieldLabel}>Booking type</Text>
            <View style={styles.bookingModeRow}>
              <Pressable
                style={[
                  styles.bookingModeChip,
                  !editIsRecurring && styles.bookingModeChipActive,
                ]}
                onPress={() => setEditIsRecurring(false)}
                disabled={savingOrder}
              >
                <Text
                  style={[
                    styles.bookingModeText,
                    !editIsRecurring && styles.bookingModeTextActive,
                  ]}
                >
                  One-time
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.bookingModeChip,
                  editIsRecurring && styles.bookingModeChipActive,
                ]}
                onPress={() => {
                  setEditIsRecurring(true);
                  setEditRecurringEndDay(current =>
                    Math.max(
                      current,
                      Math.min(editSelectedDay + 7, bookingDays.length - 1),
                    ),
                  );
                }}
                disabled={savingOrder}
              >
                <Text
                  style={[
                    styles.bookingModeText,
                    editIsRecurring && styles.bookingModeTextActive,
                  ]}
                >
                  Recurring
                </Text>
              </Pressable>
            </View>

            <Text style={styles.editFieldLabel}>
              {editIsRecurring ? 'Recurring start' : 'Booking date'}
            </Text><ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.datePicker}
            >
              {bookingDays.map((day, index) => {
                const selected = editSelectedDay === index;

                return (
                  <Pressable
                    key={`${day.year}-${day.monthShort}-${day.date}`}
                    style={[styles.dateChip, selected && styles.dateChipActive]}
                    onPress={() => {
                      setEditSelectedDay(index);
                      if (editIsRecurring && editRecurringEndDay < index) {
                        setEditRecurringEndDay(
                          Math.min(index + 7, bookingDays.length - 1),
                        );
                      }
                    }}
                    disabled={savingOrder}
                  >
                    <Text
                      style={[
                        styles.dateChipLabel,
                        selected && styles.dateChipTextActive,
                      ]}
                    >
                      {day.label}
                    </Text>
                    <Text
                      style={[
                        styles.dateChipDate,
                        selected && styles.dateChipTextActive,
                      ]}
                    >
                      {day.date}
                    </Text>
                    <Text
                      style={[
                        styles.dateChipMonth,
                        selected && styles.dateChipTextActive,
                      ]}
                    >
                      {day.monthShort}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {editIsRecurring && (
              <>
                <View style={styles.recurringHeader}>
                  <Text style={styles.editFieldLabel}>Recurring end</Text>
                  <Text style={styles.recurringMeta}>
                    {editOccurrences} days
                  </Text>
                </View><ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.datePicker}
                >
                  {bookingDays.slice(editSelectedDay).map((day, offset) => {
                    const index = editSelectedDay + offset;
                    const selected = editRecurringEndDay === index;

                    return (
                      <Pressable
                        key={`end-${day.year}-${day.monthShort}-${day.date}`}
                        style={[
                          styles.dateChip,
                          selected && styles.dateChipActive,
                        ]}
                        onPress={() => setEditRecurringEndDay(index)}
                        disabled={savingOrder}
                      >
                        <Text
                          style={[
                            styles.dateChipLabel,
                            selected && styles.dateChipTextActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                        <Text
                          style={[
                            styles.dateChipDate,
                            selected && styles.dateChipTextActive,
                          ]}
                        >
                          {day.date}
                        </Text>
                        <Text
                          style={[
                            styles.dateChipMonth,
                            selected && styles.dateChipTextActive,
                          ]}
                        >
                          {day.monthShort}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <Text style={styles.editFieldLabel}>Preferred time</Text>
            <View style={styles.timeGrid}>
              {QUICK_TIME_SLOTS.map(time => {
                const selected = editSelectedTime === time;

                return (
                  <Pressable
                    key={time}
                    style={[styles.timeChip, selected && styles.timeChipActive]}
                    onPress={() => setEditSelectedTime(time)}
                    disabled={savingOrder}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        selected && styles.timeChipTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.schedulePreview}>
              <Clock3 color="#006c49" size={16} strokeWidth={2.2} />
              <Text style={styles.schedulePreviewText}>
                {editScheduleLabel}
              </Text>
            </View>

            <Text style={styles.editFieldLabel}>Service address</Text>
            <TextInput
              value={editAddress}
              onChangeText={setEditAddress}
              multiline
              placeholder="House, street, area and city"
              placeholderTextColor={colors.muted}
              style={[styles.reviewInput, styles.editAddressInput]}
              textAlignVertical="top"
            />

            <Text style={styles.editFieldLabel}>Special instructions</Text>
            <TextInput
              value={editInstructions}
              onChangeText={setEditInstructions}
              multiline
              placeholder="Any notes for the technician..."
              placeholderTextColor={colors.muted}
              style={styles.reviewInput}
              textAlignVertical="top"
            />

            <View style={styles.reviewActions}>
              <Pressable
                style={styles.reviewCancel}
                onPress={closeOrderEditor}
                disabled={savingOrder}
              >
                <Text style={styles.reviewCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.reviewSubmit,
                  savingOrder && styles.reviewSubmitDisabled,
                ]}
                onPress={handleUpdateOrder}
                disabled={savingOrder}
              >
                <Text style={styles.reviewSubmitText}>
                  {savingOrder ? 'Saving...' : 'Save changes'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal
        visible={Boolean(cancelTarget)}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewModal}>
            <Text style={styles.reviewModalTitle}>Cancel booking</Text>
            <Text style={styles.reviewModalSubtitle}>
              Tell us why you want to cancel {cancelTarget?.id}.
            </Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              placeholder="Write cancellation reason..."
              placeholderTextColor={colors.muted}
              style={[styles.reviewInput, styles.cancelReasonInput]}
              textAlignVertical="top"
              editable={!submittingCancel}
            />
            <View style={styles.reviewActions}>
              <Pressable
                style={styles.reviewCancel}
                onPress={closeCancelModal}
                disabled={submittingCancel}
              >
                <Text style={styles.reviewCancelText}>Keep booking</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.cancelSubmit,
                  submittingCancel && styles.reviewSubmitDisabled,
                ]}
                onPress={handleCancelOrder}
                disabled={submittingCancel}
              >
                <Text style={styles.cancelSubmitText}>
                  {submittingCancel ? 'Cancelling...' : 'Submit cancel'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(paymentTarget)}
        transparent
        animationType="fade"
        onRequestClose={closePaymentModal}
      >
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewModal}>
            <Pressable
              style={styles.paymentModalCloseButton}
              onPress={closePaymentModal}
              disabled={submittingReceipt}
            >
              <X color={colors.ink} size={17} strokeWidth={2.4} />
            </Pressable>
            <Text style={styles.paymentSuccessTitle}>Congrats, work completed</Text>
            <Text style={styles.reviewModalSubtitle}>
              {isCashPayment(paymentTarget?.paymentMethod)
                ? 'Please pay cash to our agent because you selected Cash on Service.'
                : 'Please pay your service amount with EasyPaisa after work done.'}
            </Text>
            <View style={styles.paymentInfoBox}>
              <Text style={styles.paymentInfoLabel}>Amount</Text>
              <Text style={styles.paymentInfoValue}>
                {formatPkr(paymentTarget?.total || 0)}
              </Text>
              <Text style={styles.paymentInfoLabel}>Payment method</Text>
              <Text style={styles.paymentInfoValue}>
                {paymentTarget?.paymentMethod || 'Payment method pending'}
              </Text>
              {!isCashPayment(paymentTarget?.paymentMethod) ? (
                <>
                  <Text style={styles.paymentInfoLabel}>Account number</Text>
                  <View style={styles.paymentNumberRow}>
                    <Text selectable style={[styles.paymentInfoValue, styles.paymentNumberText]}>
                      {EASYPAISA_ACCOUNT_NUMBER}
                    </Text>
                    <Pressable style={styles.copyPaymentButton} onPress={copyPaymentNumber}>
                      <Copy color="#006c49" size={14} strokeWidth={2.4} />
                      <Text style={styles.copyPaymentText}>Copy</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.paymentInfoLabel}>Account title</Text>
                  <Text style={styles.paymentInfoValue}>{EASYPAISA_ACCOUNT_TITLE}</Text>
                </>
              ) : null}
            </View>
            {!isCashPayment(paymentTarget?.paymentMethod) && visibleReceiptUrl ? (
              <View style={styles.uploadedReceiptBox}>
                <Text style={styles.uploadedReceiptLabel}>Uploaded receipt</Text>
                <Image source={{uri: visibleReceiptUrl}} style={styles.receiptPreview} />
                <Text style={styles.uploadedReceiptHint}>
                  Receipt already submitted. Use Reupload only if you need to replace it.
                </Text>
              </View>
            ) : null}
            <View style={styles.reviewActions}>
              <Pressable
                style={styles.reviewCancel}
                onPress={closePaymentModal}
                disabled={submittingReceipt}
              >
                <Text style={styles.reviewCancelText}>Later</Text>
              </Pressable>
              {!isCashPayment(paymentTarget?.paymentMethod) ? (
                <Pressable
                  style={[
                    styles.reviewSubmit,
                    submittingReceipt && styles.reviewSubmitDisabled,
                  ]}
                  onPress={handleUploadReceipt}
                  disabled={submittingReceipt}
                >
                  <Text style={styles.reviewSubmitText}>
                    {submittingReceipt
                      ? 'Uploading...'
                      : hasUploadedReceipt
                        ? 'Reupload receipt'
                        : 'Upload receipt'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable style={styles.reviewSubmit} onPress={closePaymentModal}>
                  <Text style={styles.reviewSubmitText}>Done</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0b1c30"
            colors={['#0b1c30']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
              style={styles.headerBackButton}
              onPress={() => navigation.navigate('Main', {screen: 'Home'})}
            >
              <ArrowLeft color={colors.ink} size={20} strokeWidth={2.3} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Bookings</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Orders, service visits, and status updates.
              </Text>
            </View>
          </View>
          <NotificationCenter onPaymentNotificationPress={openPaymentByOrderId} />
        </View>

        <View style={styles.summaryRow}>
          <Pressable
            style={[styles.summaryCard, filter === 'all' && styles.summaryCardActive]}
            onPress={() => setFilter('all')}>
            <PackageCheck
              color={filter === 'all' ? '#ffffff' : '#006c49'}
              size={22}
              strokeWidth={2.2}
            />
            <Text style={[styles.summaryValue, filter === 'all' && styles.summaryValueActive]}>
              {orders.length}
            </Text>
            <Text style={[styles.summaryLabel, filter === 'all' && styles.summaryLabelActive]}>
              Total
            </Text>
          </Pressable>
          <Pressable
            style={[styles.summaryCard, filter === 'active' && styles.summaryCardActiveAmber]}
            onPress={() => setFilter('active')}>
            <Clock3
              color={filter === 'active' ? '#ffffff' : '#f59e0b'}
              size={22}
              strokeWidth={2.2}
            />
            <Text style={[styles.summaryValue, filter === 'active' && styles.summaryValueActive]}>
              {activeOrders.length}
            </Text>
            <Text style={[styles.summaryLabel, filter === 'active' && styles.summaryLabelActive]}>
              Active
            </Text>
          </Pressable>
          <Pressable
            style={[styles.summaryCard, filter === 'done' && styles.summaryCardActiveIndigo]}
            onPress={() => setFilter('done')}>
            <CheckCircle2
              color={filter === 'done' ? '#ffffff' : '#4f46e5'}
              size={22}
              strokeWidth={2.2}
            />
            <Text style={[styles.summaryValue, filter === 'done' && styles.summaryValueActive]}>
              {orders.length - activeOrders.length}
            </Text>
            <Text style={[styles.summaryLabel, filter === 'done' && styles.summaryLabelActive]}>
              Done
            </Text>
          </Pressable>
        </View>

        {orders.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <CalendarCheck color="#006c49" size={34} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyBody}>
              Once you confirm a service, it will appear here with order ID,
              address, payment method, and live status.
            </Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <CalendarCheck color="#006c49" size={34} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>No {filter === 'active' ? 'active' : 'completed'} orders</Text>
            <Text style={styles.emptyBody}>
              {filter === 'active'
                ? 'You have no active bookings right now.'
                : 'No completed or cancelled bookings yet.'}
            </Text>
          </View>
        ) : (
          filteredOrders.map(order => {
            const status = statusMeta[order.status];
            const serviceCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderIcon}>
                    <CalendarCheck
                      color="#006c49"
                      size={21}
                      strokeWidth={2.2}
                    />
                  </View>
                  <View style={styles.orderHeadCopy}>
                    <Text style={styles.orderId}>{order.id}</Text>
                    <Text style={styles.orderMeta}>{order.bookedFor}</Text>
                  </View>
                  <View style={[styles.status, {backgroundColor: status.bg}]}>
                    <Text style={[styles.statusText, {color: status.color}]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.serviceBox}>
                  {order.items.map(item => (
                    <View key={item.service.id} style={styles.serviceItemBlock}>
                      <View style={styles.serviceRow}>
                        <Text style={styles.itemText} numberOfLines={1}>
                          {item.quantity}x {item.service.selectedWorkTitle || item.service.title}
                        </Text>
                        <Text style={styles.itemPrice}>
                          {formatPkr(item.service.price * item.quantity)}
                        </Text>
                      </View>
                      {item.review ? (
                        <View style={styles.reviewedRow}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              color="#F59E0B"
                              fill={star <= item.review!.rating ? '#F59E0B' : 'none'}
                              size={13}
                            />
                          ))}
                          <Text style={styles.reviewedText}>Reviewed</Text>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.reviewButton}
                          onPress={() =>
                            openReview({
                              orderId: order.id,
                              serviceId: item.service.id,
                              serviceTitle: item.service.selectedWorkTitle || item.service.title,
                            })
                          }
                        >
                          <Star color="#006c49" size={14} />
                          <Text style={styles.reviewButtonText}>Review</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.detailRow}>
                  <MapPin color="#76777d" size={17} strokeWidth={2.1} />
                  <Text style={styles.detailText} numberOfLines={2}>
                    {order.address || 'Address not provided'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <CreditCard color="#76777d" size={17} strokeWidth={2.1} />
                  <Text style={styles.detailText}>
                    {order.paymentMethod || 'Payment method pending'}
                  </Text>
                </View>

                {order.specialInstructions ? (
                  <View style={styles.instructionsBox}>
                    <Text style={styles.instructionsLabel}>Instructions</Text>
                    <Text style={styles.instructionsText}>
                      {order.specialInstructions}
                    </Text>
                  </View>
                ) : null}

                {order.status === 'completed' ? (
                  <Pressable
                    style={styles.paymentRequestButton}
                    onPress={() => openPaymentModal(order)}
                  >
                    <CreditCard color="#006c49" size={15} strokeWidth={2.2} />
                    <Text style={styles.paymentRequestText}>
                      {isCashPayment(order.paymentMethod)
                        ? 'Pay cash to agent'
                        : 'Pay with EasyPaisa / upload receipt'}
                    </Text>
                  </Pressable>
                ) : null}
                {order.status === 'cancelled' && order.cancelReason ? (
                  <View style={styles.cancelReasonBox}>
                    <Text style={styles.cancelReasonLabel}>
                      Cancellation reason
                    </Text>
                    <Text style={styles.cancelReasonText}>
                      {order.cancelReason}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.orderFooter}>
                  <Text style={styles.footerMeta}>
                    {serviceCount} service item(s)
                  </Text>
                  <Text style={styles.total}>{formatPkr(order.total)}</Text>
                </View>
                {canChangeOrder(order) && (
                  <View style={styles.orderActions}>
                    <Pressable
                      style={styles.updateOrderButton}
                      onPress={() => openOrderEditor(order)}
                    >
                      <Edit2 color="#0b1c30" size={15} strokeWidth={2.2} />
                      <Text style={styles.updateOrderText}>Update</Text>
                    </Pressable>
                    <Pressable
                      style={styles.cancelOrderButton}
                      onPress={() => openCancelModal(order)}
                    >
                      <Text style={styles.cancelOrderText}>Cancel order</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.42)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  reviewModal: {
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 18,
  },
  editModalScroll: {
    maxHeight: '88%',
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
  },
  reviewModalTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 20,
  },
  reviewModalSubtitle: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  ratingPicker: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    marginBottom: 14,
  },
  reviewInput: {
    minHeight: 104,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#ffffff',
    padding: 12,
    fontFamily: fontFamily.regular,
    color: colors.ink,
    fontSize: 14,
  },
  cancelReasonInput: {
    marginTop: 16,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 16,
  },
  editCloseButton: {
    width: 34,
    height: 34,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editFieldLabel: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
  editAddressInput: {
    minHeight: 82,
  },
  servicePicker: {
    gap: 10,
    paddingBottom: 2,
  },
  serviceOption: {
    width: 176,
    minHeight: 68,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#d7dbe4',
    backgroundColor: '#ffffff',
    padding: 12,
    justifyContent: 'center',
  },
  serviceOptionActive: {
    borderColor: '#006c49',
    backgroundColor: '#effcf6',
  },
  serviceOptionTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
  },
  serviceOptionTitleActive: {
    color: '#006c49',
  },
  serviceOptionPrice: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
    marginTop: 5,
  },
  serviceOptionPriceActive: {
    color: '#006c49',
  },
  bookingModeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bookingModeChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#d7dbe4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  bookingModeChipActive: {
    backgroundColor: colors.authDark,
    borderColor: colors.authDark,
  },
  bookingModeText: {
    fontFamily: fontFamily.bold,
    color: colors.text,
    fontSize: 13,
  },
  bookingModeTextActive: {
    color: '#ffffff',
  },
  datePicker: {
    gap: 10,
    paddingBottom: 2,
  },
  dateChip: {
    width: 74,
    minHeight: 82,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#d7dbe4',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dateChipActive: {
    backgroundColor: colors.authDark,
    borderColor: colors.authDark,
  },
  dateChipLabel: {
    fontFamily: fontFamily.bold,
    color: colors.muted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  dateChipDate: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 19,
    marginTop: 5,
  },
  dateChipMonth: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  dateChipTextActive: {
    color: '#ffffff',
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurringMeta: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 12,
    marginTop: 12,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    width: '31%',
    minHeight: 42,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#d7dbe4',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipActive: {
    backgroundColor: '#006c49',
    borderColor: '#006c49',
  },
  timeChipText: {
    fontFamily: fontFamily.bold,
    color: colors.text,
    fontSize: 12,
  },
  timeChipTextActive: {
    color: '#ffffff',
  },
  schedulePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: rounded.default,
    backgroundColor: '#effcf6',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 10,
    marginTop: 12,
  },
  schedulePreviewText: {
    flex: 1,
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 12,
    lineHeight: 17,
  },
  paymentInfoBox: {
    marginTop: 16,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#effcf6',
    padding: 12,
    gap: 5,
  },
  paymentInfoLabel: {
    fontFamily: fontFamily.bold,
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  paymentInfoValue: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 15,
  },
    paymentSuccessTitle: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
    paddingRight: 34,
  },
  paymentModalCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#d7dbe4',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  paymentNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  paymentNumberText: {
    flexShrink: 1,
  },
  copyPaymentButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  copyPaymentText: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 12,
  },
  uploadedReceiptBox: {
    marginTop: 12,
    gap: 8,
  },
  uploadedReceiptLabel: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
  },
  uploadedReceiptHint: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  receiptPreview: {
    width: '100%',
    height: 150,
    borderRadius: rounded.default,
    marginTop: 12,
    backgroundColor: '#eef2ff',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  reviewCancel: {
    flex: 1,
    height: 46,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCancelText: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
  },
  reviewSubmit: {
    flex: 1,
    height: 46,
    borderRadius: rounded.default,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSubmitDisabled: {
    opacity: 0.7,
  },
  reviewSubmitText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 48,
    marginBottom: 16,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minWidth: 0,
  },
  headerBackButton: {
    width: 42,
    height: 42,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#e5eeff',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 29,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    minHeight: 100,
    borderRadius: rounded.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 13,
    justifyContent: 'center',
  },
  summaryCardActive: {
    backgroundColor: '#0b1c30',
    borderColor: '#0b1c30',
  },
  summaryCardActiveAmber: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  summaryCardActiveIndigo: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  summaryValue: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 22,
    marginTop: 8,
  },
  summaryValueActive: {
    color: '#ffffff',
  },
  summaryLabel: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  summaryLabelActive: {
    color: 'rgba(255,255,255,0.75)',
  },
  empty: {
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
  emptyTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 20,
  },
  emptyBody: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  orderCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    borderRadius: rounded.xl,
    marginBottom: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: rounded.default,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderHeadCopy: {
    flex: 1,
  },
  orderId: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 16,
  },
  orderMeta: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.full,
  },
  statusText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  serviceBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.default,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  serviceItemBlock: {
    gap: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#effcf6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  reviewButtonText: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 12,
  },
  reviewedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reviewedText: {
    fontFamily: fontFamily.bold,
    color: colors.muted,
    fontSize: 11,
    marginLeft: 4,
  },
  itemText: {
    flex: 1,
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
  },
  itemPrice: {
    fontFamily: fontFamily.bold,
    color: colors.text,
    fontSize: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 12,
  },
  detailText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  instructionsBox: {
    marginTop: 12,
    borderRadius: rounded.default,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 12,
  },
  instructionsLabel: {
    fontFamily: fontFamily.bold,
    color: colors.muted,
    fontSize: 11,
    marginBottom: 4,
  },
  instructionsText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  paymentRequestButton: {
    marginTop: 12,
    minHeight: 42,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#effcf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  paymentRequestText: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 13,
  },
  cancelReasonBox: {
    marginTop: 12,
    borderRadius: rounded.default,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
  },
  cancelReasonLabel: {
    fontFamily: fontFamily.bold,
    color: '#991b1b',
    fontSize: 11,
    marginBottom: 4,
  },
  cancelReasonText: {
    fontFamily: fontFamily.regular,
    color: '#7f1d1d',
    fontSize: 12,
    lineHeight: 17,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eff4ff',
    marginTop: 14,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
  },
  total: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 18,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  updateOrderButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: rounded.default,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  updateOrderText: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
  },
  cancelOrderButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: rounded.default,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelOrderText: {
    fontFamily: fontFamily.bold,
    color: '#ba1a1a',
    fontSize: 13,
  },
  cancelSubmit: {
    flex: 1,
    minHeight: 44,
    borderRadius: rounded.default,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSubmitText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 14,
  },
});













