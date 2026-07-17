import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Image,
  LayoutChangeEvent,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BadgeCheck,
  Plus,
  Banknote,
  Check,
  Zap,
  CheckCircle2,
  Clock3,
  Gift,
  MessageCircle,
  LocateFixed,
  MapPin,
} from 'lucide-react-native';

const easypaisaLogo = require('../../assets/images/easypaisa.png');
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {fontFamily} from '@/theme/typography';
import {formatPkr} from '@/utils/currency';
import {rounded} from '@/theme/layout';
import {playConfirmationCue} from '@/utils/confirmationCue';
import {locateCurrentAddress} from '@/services/locationService';
import {SavedLocation} from '@/types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

interface MessageState {
  title: string;
  body: string;
  tone: 'error' | 'warning';
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getBookingDays() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return Array.from({length: 90}, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    date.setHours(12, 0, 0, 0);

    return {
      label: DAY_LABELS[date.getDay()],
      date: date.getDate(),
      month: MONTH_LABELS[date.getMonth()],
      monthShort: MONTH_LABELS[date.getMonth()].slice(0, 3),
      year: date.getFullYear(),
      key: [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-'),
    };
  });
}

function formatBookingDate(day: ReturnType<typeof getBookingDays>[number]) {
  return `${day.label}, ${day.monthShort} ${day.date}, ${day.year}`;
}

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

const CUSTOM_HOURS = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
];
const CUSTOM_MINUTES = ['00', '15', '30', '45'];
const CUSTOM_PERIODS = ['AM', 'PM'];

function to24Hour(hour: string, period: string): number {
  const hourNumber = Number(hour);

  if (period === 'AM') {
    return hourNumber === 12 ? 0 : hourNumber;
  }

  return hourNumber === 12 ? 12 : hourNumber + 12;
}

function isClosedTime(time: string): boolean {
  const [clock, period] = time.split(' ');
  const [hour] = clock.split(':');
  const hour24 = to24Hour(hour, period);

  return hour24 >= 23 || hour24 < 6;
}

function buildTime(hour: string, minute: string, period: string): string {
  return `${hour}:${minute} ${period}`;
}

function parseTime(time: string): {
  hour: string;
  minute: string;
  period: string;
} {
  const [clock, period] = time.split(' ');
  const [hour, minute] = clock.split(':');

  return {hour, minute, period};
}

const PAYMENT_METHODS = [
  {id: 'Cash on Service', label: 'Cash on Service', Icon: Banknote, image: null, color: '#006c49'},
  {id: 'Easypaisa After Work Done', label: 'Easypaisa after work done', Icon: Banknote, image: easypaisaLogo, color: '#16a34a'},
];
type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapSize = {
  width: number;
  height: number;
};

const MAP_TILE_SIZE = 256;
const MAP_ZOOM = 16;
const MAX_TILE_INDEX = 2 ** MAP_ZOOM;

function lonToTileX(longitude: number) {
  return ((longitude + 180) / 360) * MAX_TILE_INDEX;
}

function latToTileY(latitude: number) {
  const latRad = (latitude * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    MAX_TILE_INDEX
  );
}

function normalizeTileX(tileX: number) {
  return ((tileX % MAX_TILE_INDEX) + MAX_TILE_INDEX) % MAX_TILE_INDEX;
}

function CurrentLocationMapPreview({location}: {location: Coordinate}) {
  const [mapSize, setMapSize] = useState<MapSize>({width: 0, height: 0});
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const centerTileX = lonToTileX(location.longitude);
  const centerTileY = latToTileY(location.latitude);
  const baseTileX = Math.floor(centerTileX);
  const baseTileY = Math.floor(centerTileY);
  const tileOffsets = [-1, 0, 1];

  const handleLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setMapSize({width, height});
  };

  return (
    <View
      pointerEvents="none"
      style={styles.currentLocationMap}
      onLayout={handleLayout}
    >
      {mapSize.width > 0 &&
        !mapLoadFailed &&
        tileOffsets.map(yOffset =>
          tileOffsets.map(xOffset => {
            const tileX = baseTileX + xOffset;
            const tileY = baseTileY + yOffset;
            const left =
              mapSize.width / 2 + (tileX - centerTileX) * MAP_TILE_SIZE;
            const top =
              mapSize.height / 2 + (tileY - centerTileY) * MAP_TILE_SIZE;
            const urlX = normalizeTileX(tileX);
            const urlY = Math.max(0, Math.min(MAX_TILE_INDEX - 1, tileY));

            return (
              <Image
                key={`${tileX}-${tileY}`}
                source={{
                  uri: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${MAP_ZOOM}/${urlY}/${urlX}`,
                }}
                style={[
                  styles.currentLocationMapTile,
                  {
                    left,
                    top,
                  },
                ]}
                onError={() => setMapLoadFailed(true)}
              />
            );
          }),
        )}
      {mapLoadFailed ? (
        <View style={styles.currentLocationMapFallback}>
          <Text style={styles.currentLocationMapFallbackText}>
            Map unavailable
          </Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={styles.currentLocationPinShadow} />
      <View pointerEvents="none" style={styles.currentLocationPin} />
      <View pointerEvents="none" style={styles.currentLocationPinDot} />
    </View>
  );
}

export function BookingScreen({navigation, route}: Props): React.JSX.Element {
  const [selectedDay, setSelectedDay] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEndDay, setRecurringEndDay] = useState(7);
  const [selectedTime, setSelectedTime] = useState('02:00 PM');
  const [customHour, setCustomHour] = useState('02');
  const [customMinute, setCustomMinute] = useState('00');
  const [customPeriod, setCustomPeriod] = useState('PM');
  const [customTimeVisible, setCustomTimeVisible] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null,
  );
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('Easypaisa After Work Done');
  const [useRewardPoints, setUseRewardPoints] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [detailsConfirmVisible, setDetailsConfirmVisible] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    addToCart,
    checkout,
    addresses,
    fetchAddresses,
    addAddress,
    services,
    fetchServices,
    appSettings,
    fetchAppContent,
    user,
    savedServiceLocation,
    setSavedServiceLocation,
  } = useAppStore();
  const service = services.find(s => s.id === route.params.serviceId);
  const bookingDays = getBookingDays();

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  useEffect(() => {
    if (!services.length) {
      fetchServices();
    }
    fetchAppContent();
  }, [fetchAppContent, fetchServices, services.length]);

  useEffect(() => {
    if (selectedAddressId === null && !savedServiceLocation && addresses[0]) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, savedServiceLocation, selectedAddressId]);

  useEffect(() => {
    if (isClosedTime(selectedTime)) {
      setSelectedTime('06:00 AM');
      setCustomHour('06');
      setCustomMinute('00');
      setCustomPeriod('AM');
    }
  }, [selectedTime]);

  useEffect(() => {
    if (recurringEndDay < selectedDay) {
      setRecurringEndDay(Math.min(selectedDay + 7, bookingDays.length - 1));
    }
  }, [bookingDays.length, recurringEndDay, selectedDay]);

  useEffect(() => {
    const pointValue = Math.max(1, Number(appSettings.rewardPointValue || 25));
    const minimumRedeem = Math.max(
      0,
      Number(appSettings.rewardMinimumRedeem || 100),
    );
    const hasEnoughPoints =
      appSettings.rewardEnabled !== false &&
      Number(user?.rewardPoints || 0) * pointValue >= minimumRedeem;

    if (useRewardPoints && !hasEnoughPoints) {
      setUseRewardPoints(false);
    }
  }, [
    appSettings.rewardEnabled,
    appSettings.rewardMinimumRedeem,
    appSettings.rewardPointValue,
    useRewardPoints,
    user?.rewardPoints,
  ]);

  if (!service) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{color: '#0b1c30', padding: 24}}>
          {services.length ? 'Service not found.' : 'Loading service...'}
        </Text>
      </SafeAreaView>
    );
  }

  const inspectionFee = Number(appSettings.inspectionFee || 0);
  const rewardEnabled = appSettings.rewardEnabled !== false;
  const rewardPoints = Number(user?.rewardPoints || 0);
  const rewardPointValue = Math.max(1, Number(appSettings.rewardPointValue || 25));
  const rewardMinimumRedeem = Math.max(
    0,
    Number(appSettings.rewardMinimumRedeem || 100),
  );
  const serviceRewardPointsOnCompletion = Number(
    appSettings.serviceRewardPointsOnCompletion || 0,
  );
  const serviceRewardMaxDiscountPercent = Math.max(
    0,
    Number(appSettings.serviceRewardMaxDiscountPercent || 10),
  );
  const rewardBalanceValue = rewardPoints * rewardPointValue;
  const canRedeemReward =
    rewardEnabled && rewardBalanceValue >= rewardMinimumRedeem;
  const recurringOccurrences = isRecurring
    ? recurringEndDay - selectedDay + 1
    : 1;
  const selectedWorkPrice = route.params.specificWorkPriceId
    ? service.workPrices?.find(
        work => Number(work.id) === Number(route.params.specificWorkPriceId),
      )
    : service.workPrices?.[0];
  const bookingWorkPrice = selectedWorkPrice || {
    id: route.params.specificWorkPriceId || 0,
    title: route.params.specificWorkTitle || service.title,
    description: '',
    price: Number(route.params.specificWorkPrice || service.price),
  };
  const serviceUnitPrice = Number(bookingWorkPrice.price || service.price);
  const serviceSubtotal = serviceUnitPrice * recurringOccurrences;
  const maxRewardDiscount = Math.floor(
    (serviceSubtotal * serviceRewardMaxDiscountPercent) / 100,
  );
  const redeemableRewardPoints = Math.floor(
    Math.min(rewardBalanceValue, maxRewardDiscount) / rewardPointValue,
  );
  const redeemableRewardValue = redeemableRewardPoints * rewardPointValue;
  const canRedeemRewardForBooking =
    canRedeemReward && redeemableRewardValue >= rewardMinimumRedeem;
  const rewardDiscount =
    useRewardPoints && canRedeemRewardForBooking ? redeemableRewardValue : 0;
  const taxableSubtotal = Math.max(0, serviceSubtotal - rewardDiscount);
  const tax = Math.round(
    (taxableSubtotal * Number(appSettings.serviceTaxPercent || 0)) / 100,
  );
  const total = taxableSubtotal + inspectionFee + tax;
  const selectedTimeClosed = isClosedTime(selectedTime);
  const selectedBookingDay = bookingDays[selectedDay] || bookingDays[0];
  const recurringEndBookingDay =
    bookingDays[recurringEndDay] || bookingDays[selectedDay] || bookingDays[0];
  const selectedWorkTitle = bookingWorkPrice.title || service.title;
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
  const serviceLocationAddress = selectedAddress
    ? `${selectedAddress.label}: ${selectedAddress.detail}`
    : savedServiceLocation?.address || '';
  const startDateLabel = formatBookingDate(selectedBookingDay);
  const endDateLabel = formatBookingDate(recurringEndBookingDay);
  const scheduleLabel = isRecurring
    ? `Recurring: ${startDateLabel} to ${endDateLabel} - ${selectedTime}`
    : `${startDateLabel} - ${selectedTime}`;
  const rewardPointsNeeded = Math.max(
    0,
    Math.ceil((rewardMinimumRedeem - rewardBalanceValue) / rewardPointValue),
  );

  const applyTime = (time: string) => {
    const parsed = parseTime(time);
    setCustomHour(parsed.hour);
    setCustomMinute(parsed.minute);
    setCustomPeriod(parsed.period);
    setSelectedTime(time);
  };

  const applyCustomTime = ({
    hour = customHour,
    minute = customMinute,
    period = customPeriod,
  }: {
    hour?: string;
    minute?: string;
    period?: string;
  }) => {
    const nextTime = buildTime(hour, minute, period);

    if (isClosedTime(nextTime)) {
      showMessage({
        title: 'Closed hours',
        body: 'Please choose a time from 6:00 AM to 10:59 PM.',
        tone: 'warning',
      });
      return false;
    }

    setCustomHour(hour);
    setCustomMinute(minute);
    setCustomPeriod(period);
    setSelectedTime(nextTime);
    return true;
  };

  function showMessage(nextMessage: MessageState) {
    if (messageTimer.current) {
      clearTimeout(messageTimer.current);
    }

    setMessage(nextMessage);
    messageTimer.current = setTimeout(() => {
      setMessage(null);
    }, 3600);
  }

  const handleSaveAddress = async () => {
    if (!addressLabel.trim() || !addressDetail.trim()) {
      showMessage({
        title: 'Address required',
        body: 'Please enter an address label and complete address.',
        tone: 'warning',
      });
      return;
    }

    try {
      const saved = await addAddress({
        label: addressLabel.trim(),
        detail: addressDetail.trim(),
      });
      setSelectedAddressId(saved.id);
      setAddressLabel('');
      setAddressDetail('');
      setShowAddressForm(false);
    } catch (error: any) {
      showMessage({
        title: 'Could not save address',
        body: error.response?.data?.message || error.message,
        tone: 'error',
      });
    }
  };

  const saveLocatedServiceAddress = async (location: SavedLocation) => {
    await setSavedServiceLocation(location);
    setSelectedAddressId(null);
  };

  const handleLocateAddress = async () => {
    setLocatingAddress(true);
    try {
      const currentAddress = await locateCurrentAddress();
      const location: SavedLocation = {
        address: currentAddress.address,
        latitude: currentAddress.latitude,
        longitude: currentAddress.longitude,
        isCoordinateFallback: currentAddress.isCoordinateFallback,
        updatedAt: new Date().toISOString(),
      };
      await saveLocatedServiceAddress(location);
      setAddressLabel(current => current || 'Current Location');
      setAddressDetail(currentAddress.address);
      showMessage({
        title: 'Location updated',
        body: currentAddress.isCoordinateFallback
          ? 'Exact street address was unavailable, so we saved your pinned coordinates.'
          : 'Your current location is ready for service booking.',
        tone: currentAddress.isCoordinateFallback ? 'warning' : 'warning',
      });
    } catch (error: any) {
      showMessage({
        title: 'Location unavailable',
        body: error?.message || 'Could not detect your current location.',
        tone: 'error',
      });
    } finally {
      setLocatingAddress(false);
    }
  };

  const handleConfirmBooking = () => {
    if (!user) {
      Alert.alert(
        'Login required',
        'Please login or create an account to place a service booking.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Login',
            onPress: () => navigation.navigate('Auth', {screen: 'Login'}),
          },
        ],
      );
      return;
    }

    if ((!selectedAddressId && !savedServiceLocation) || !selectedPayment) {
      showMessage({
        title: 'Missing details',
        body: 'Please select or detect a service address and payment method before confirming.',
        tone: 'warning',
      });
      return;
    }

    if (selectedTimeClosed) {
      showMessage({
        title: 'Closed hours',
        body: 'UstaadPro is operational from 6:00 AM to 11:00 PM. Please choose 6:00 AM to 10:59 PM.',
        tone: 'warning',
      });
      return;
    }

    setPrivacyAccepted(false);
    setPrivacyError(false);
    setDetailsConfirmVisible(true);
  };

  const handleOpenSupport = async () => {
    const digits = String(appSettings.supportPhone || '')
      .replace(/[^\d+]/g, '')
      .replace(/^\+/, '');
    const messageText = encodeURIComponent(
      `Hi UstaadPro support, I need help with ${selectedWorkTitle}.`,
    );

    if (!digits) {
      showMessage({
        title: 'Support unavailable',
        body: 'Support phone number is not configured yet.',
        tone: 'warning',
      });
      return;
    }

    try {
      await Linking.openURL(`https://wa.me/${digits}?text=${messageText}`);
    } catch {
      showMessage({
        title: 'Could not open WhatsApp',
        body: `Please contact support at ${appSettings.supportPhone}.`,
        tone: 'warning',
      });
    }
  };

  const placeServiceBooking = async () => {
    if (!privacyAccepted) {
      setPrivacyError(true);
      return;
    }

    try {
      setConfirming(true);
      setDetailsConfirmVisible(false);
      addToCart({
        ...service,
        price: serviceUnitPrice,
        selectedWorkPrice: bookingWorkPrice,
        selectedWorkPriceId: bookingWorkPrice.id || undefined,
        selectedWorkTitle,
      });
      await checkout({
        bookedFor: scheduleLabel,
        paymentMethod: selectedPayment,
        address: serviceLocationAddress,
        specialInstructions,
        inspectionFee,
        tax,
        recurringOccurrences,
        useRewardPoints: useRewardPoints && canRedeemRewardForBooking,
      });
      playConfirmationCue();
      setSuccessVisible(true);
      setTimeout(() => {
        setSuccessVisible(false);
        navigation.navigate('Main', {screen: 'Bookings'});
      }, 1600);
    } catch (error: any) {
      showMessage({
        title: 'Booking failed',
        body: error.response?.data?.message || error.message,
        tone: 'error',
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 color="#006c49" size={54} strokeWidth={2.4} />
            </View>
            <Text style={styles.successTitle}>Your order has been placed</Text>
            <Text style={styles.successBody}>
              We have received your booking and saved all service details.
            </Text>
          </View>
        </View>
      </Modal>
      <Modal
        visible={detailsConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Are these details correct?</Text>
            <Text style={styles.confirmSubtitle}>
              Please confirm your address, phone, and email before placing the
              booking.
            </Text>

            <View style={styles.confirmDetailsBox}>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Address</Text>
                <Text style={styles.confirmDetailValue}>
                  {serviceLocationAddress || 'Address not selected'}
                </Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Phone</Text>
                <Text style={styles.confirmDetailValue}>
                  {user?.phone || 'Phone not available'}
                </Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Email</Text>
                <Text style={styles.confirmDetailValue}>
                  {user?.email || 'Email not available'}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.privacyAcceptRow}
              onPress={() => {
                setPrivacyAccepted(current => !current);
                setPrivacyError(false);
              }}
              disabled={confirming}
            >
              <View
                style={[
                  styles.privacyCheckbox,
                  privacyAccepted && styles.privacyCheckboxChecked,
                ]}
              >
                {privacyAccepted ? (
                  <Check color="#ffffff" size={14} strokeWidth={3} />
                ) : null}
              </View>
              <Text style={styles.privacyAcceptText}>
                I accept the{' '}
                <Text
                  style={styles.privacyLink}
                  onPress={() => {
                    setDetailsConfirmVisible(false);
                    navigation.navigate('PrivacyPolicy');
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>
            {privacyError ? (
              <Text style={styles.privacyErrorText}>
                You must accept the Privacy Policy before booking.
              </Text>
            ) : null}

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmEditButton}
                onPress={() => setDetailsConfirmVisible(false)}
                disabled={confirming}
              >
                <Text style={styles.confirmEditText}>Edit details</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmPlaceButton,
                  confirming && styles.confirmPlaceButtonDisabled,
                ]}
                onPress={placeServiceBooking}
                disabled={confirming}
              >
                <Text style={styles.confirmPlaceText}>
                  {confirming ? 'Placing...' : 'Yes, place booking'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={customTimeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomTimeVisible(false)}
      >
        <View style={styles.clockOverlay}>
          <View style={styles.clockSheet}>
            <View style={styles.clockSheetHeader}>
              <View>
                <Text style={styles.clockSheetTitle}>Custom time</Text>
                <Text style={styles.clockSheetSubtitle}>
                  Operational from 6:00 AM to 11:00 PM
                </Text>
              </View>
              <Pressable
                style={styles.clockCloseButton}
                onPress={() => setCustomTimeVisible(false)}
              >
                <Text style={styles.clockCloseText}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.simpleTimePreview}>
              <Clock3 color="#006c49" size={20} />
              <Text style={styles.simpleTimePreviewText}>{selectedTime}</Text>
            </View>

            <View style={styles.clockControls}>
              <Text style={styles.clockControlLabel}>Hour</Text>
              <View style={styles.simpleHourGrid}>
                {CUSTOM_HOURS.map(hour => {
                  const hourClosed = isClosedTime(
                    buildTime(hour, customMinute, customPeriod),
                  );

                  return (
                    <Pressable
                      key={hour}
                      style={[
                        styles.clockMiniChip,
                        styles.simpleHourChip,
                        customHour === hour && styles.clockMiniChipActive,
                        hourClosed && styles.clockMiniChipDisabled,
                      ]}
                      disabled={hourClosed}
                      onPress={() => applyCustomTime({hour})}
                    >
                      <Text
                        style={[
                          styles.clockMiniChipText,
                          customHour === hour && styles.clockMiniChipTextActive,
                          hourClosed && styles.clockMiniChipTextDisabled,
                        ]}
                      >
                        {hour}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.clockControlLabel}>
                Minutes
              </Text>
              <View style={styles.clockChipRow}>
                {CUSTOM_MINUTES.map(minute => {
                  const minuteClosed = isClosedTime(
                    buildTime(customHour, minute, customPeriod),
                  );

                  return (
                    <Pressable
                      key={minute}
                      style={[
                        styles.clockMiniChip,
                        customMinute === minute && styles.clockMiniChipActive,
                        minuteClosed && styles.clockMiniChipDisabled,
                      ]}
                      disabled={minuteClosed}
                      onPress={() => applyCustomTime({minute})}
                    >
                      <Text
                        style={[
                          styles.clockMiniChipText,
                          customMinute === minute &&
                            styles.clockMiniChipTextActive,
                          minuteClosed && styles.clockMiniChipTextDisabled,
                        ]}
                      >
                        {minute}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.clockControlLabel}>
                AM / PM
              </Text>
              <View style={styles.clockChipRow}>
                {CUSTOM_PERIODS.map(period => {
                  const periodClosed = isClosedTime(
                    buildTime(customHour, customMinute, period),
                  );

                  return (
                    <Pressable
                      key={period}
                      style={[
                        styles.clockPeriodChip,
                        customPeriod === period && styles.clockMiniChipActive,
                        periodClosed && styles.clockMiniChipDisabled,
                      ]}
                      disabled={periodClosed}
                      onPress={() => applyCustomTime({period})}
                    >
                      <Text
                        style={[
                          styles.clockMiniChipText,
                          customPeriod === period &&
                            styles.clockMiniChipTextActive,
                          periodClosed && styles.clockMiniChipTextDisabled,
                        ]}
                      >
                        {period}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={styles.clockConfirmButton}
                onPress={() => {
                  if (
                    applyCustomTime({
                      hour: customHour,
                      minute: customMinute,
                      period: customPeriod,
                    })
                  ) {
                    setCustomTimeVisible(false);
                  }
                }}
              >
                <Text style={styles.clockConfirmText}>Use this time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {message && (
        <View
          style={[
            styles.messageBanner,
            message.tone === 'error'
              ? styles.messageBannerError
              : styles.messageBannerWarning,
          ]}
        >
          <Text
            style={[
              styles.messageTitle,
              message.tone === 'error'
                ? styles.messageTextError
                : styles.messageTextWarning,
            ]}
          >
            {message.title}
          </Text>
          <Text
            style={[
              styles.messageBody,
              message.tone === 'error'
                ? styles.messageTextError
                : styles.messageTextWarning,
            ]}
          >
            {message.body}
          </Text>
        </View>
      )}
      {/* â”€â”€ Header â”€â”€ */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0b1c30" size={20} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Review & Booking</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Contact support on WhatsApp"
          style={styles.supportBtn}
          onPress={handleOpenSupport}
        >
          <MessageCircle color="#006c49" size={20} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* â”€â”€ Pro Card â”€â”€ */}
        <View style={styles.proCard}>
          <View style={styles.proAvatar}>
            {service.imageUrl ? (
              <Image source={{uri: service.imageUrl}} style={styles.proAvatarImage} />
            ) : (
              <Text style={styles.proAvatarText}>
                {selectedWorkTitle.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.proInfo}>
            <Text style={styles.proName}>{selectedWorkTitle}</Text>
            <Text style={styles.proSpecialty}>{service.title}</Text>
            <View style={styles.verifiedRow}>
              <BadgeCheck color="#006c49" size={14} fill="#e6faf3" />
              <Text style={styles.verifiedText}>VERIFIED PRO</Text>
            </View>
          </View>
        </View>

        {/* â”€â”€ Date Selector â”€â”€ */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>
              {isRecurring ? 'Recurring Start' : 'Select Date'}
            </Text>
            <Text style={styles.sectionMeta}>
              {selectedBookingDay.month} {selectedBookingDay.year}
            </Text>
          </View>
          <View style={styles.bookingModeRow}>
            <Pressable
              style={[
                styles.bookingModeChip,
                !isRecurring && styles.bookingModeChipActive,
              ]}
              onPress={() => setIsRecurring(false)}
            >
              <Text
                style={[
                  styles.bookingModeText,
                  !isRecurring && styles.bookingModeTextActive,
                ]}
              >
                One-time
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.bookingModeChip,
                isRecurring && styles.bookingModeChipActive,
              ]}
              onPress={() => {
                setIsRecurring(true);
                setRecurringEndDay(current =>
                  Math.max(
                    current,
                    Math.min(selectedDay + 7, bookingDays.length - 1),
                  ),
                );
              }}
            >
              <Text
                style={[
                  styles.bookingModeText,
                  isRecurring && styles.bookingModeTextActive,
                ]}
              >
                Recurring
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayRow}
          >
            {bookingDays.map((day, i) => (
              <Pressable
                key={day.key}
                style={[
                  styles.dayChip,
                  selectedDay === i && styles.dayChipActive,
                ]}
                onPress={() => {
                  setSelectedDay(i);
                  if (isRecurring && recurringEndDay < i) {
                    setRecurringEndDay(Math.min(i + 7, bookingDays.length - 1));
                  }
                }}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    selectedDay === i && styles.dayLabelActive,
                  ]}
                >
                  {day.label}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    selectedDay === i && styles.dayNumActive,
                  ]}
                >
                  {day.date}
                </Text>
                <Text
                  style={[
                    styles.dayMonth,
                    selectedDay === i && styles.dayMonthActive,
                  ]}
                >
                  {day.monthShort}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {isRecurring && (
            <View style={styles.recurringBox}>
              <View style={styles.recurringHeader}>
                <Text style={styles.recurringTitle}>Recurring End</Text>
                <Text style={styles.recurringMeta}>{endDateLabel}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayRow}
              >
                {bookingDays.slice(selectedDay).map((day, offset) => {
                  const dayIndex = selectedDay + offset;

                  return (
                    <Pressable
                      key={day.key}
                      style={[
                        styles.dayChip,
                        recurringEndDay === dayIndex && styles.dayChipActive,
                      ]}
                      onPress={() => setRecurringEndDay(dayIndex)}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          recurringEndDay === dayIndex &&
                            styles.dayLabelActive,
                        ]}
                      >
                        {day.label}
                      </Text>
                      <Text
                        style={[
                          styles.dayNum,
                          recurringEndDay === dayIndex && styles.dayNumActive,
                        ]}
                      >
                        {day.date}
                      </Text>
                      <Text
                        style={[
                          styles.dayMonth,
                          recurringEndDay === dayIndex &&
                            styles.dayMonthActive,
                        ]}
                      >
                        {day.monthShort}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* â”€â”€ Time Slots â”€â”€ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Time</Text>

          <Text style={styles.timeHelp}>
            Choose any available time. Operational daily from 6:00 AM to 11:00 PM.
          </Text>

          <Text style={styles.timePeriodLabel}>QUICK TIMES</Text>
          <View style={styles.timeRow}>
            {QUICK_TIME_SLOTS.map(slot => {
              const slotClosed = isClosedTime(slot);

              return (
                <Pressable
                  key={slot}
                  style={[
                    styles.timeChip,
                    selectedTime === slot && styles.timeChipActive,
                    slotClosed && styles.timeChipDisabled,
                  ]}
                  disabled={slotClosed}
                  onPress={() => applyTime(slot)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedTime === slot && styles.timeTextActive,
                      slotClosed && styles.timeTextDisabled,
                    ]}
                  >
                    {slot}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.customTimeButton}
            onPress={() => setCustomTimeVisible(true)}
          >
            <View style={styles.customTimeButtonIcon}>
              <Clock3 color="#006c49" size={18} />
            </View>
            <View style={styles.customTimeButtonCopy}>
              <Text style={styles.customTimeButtonTitle}>Custom time</Text>
              <Text style={styles.customTimeButtonMeta}>
                Open clock picker
              </Text>
            </View>
            <Text style={styles.customTimeButtonValue}>{selectedTime}</Text>
          </Pressable>
        </View>

        {/* â”€â”€ Service Address â”€â”€ */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Service Address</Text>
            <Pressable
              style={styles.addNewRow}
              onPress={() => setShowAddressForm(value => !value)}
            >
              <Plus color="#006c49" size={14} />
              <Text style={styles.addNewText}>
                {showAddressForm ? 'Close' : 'Add New'}
              </Text>
            </Pressable>
          </View>

          {savedServiceLocation ? (
            <Pressable
              style={[
                styles.currentLocationCard,
                !selectedAddressId && styles.addressCardActive,
              ]}
              onPressIn={() => {
                setSelectedAddressId(null);
              }}
            >
              <View style={styles.addressIconBox}>
                <MapPin
                  color={!selectedAddressId ? '#006c49' : '#45464d'}
                  size={20}
                />
              </View>
              <View style={styles.addressInfo}>
                <View style={styles.currentLocationHeader}>
                  <Text style={styles.addressLabel}>Current location</Text>
                  <Pressable
                    style={styles.currentLocationUpdate}
                    onPress={event => {
                      event.stopPropagation();
                      void handleLocateAddress();
                    }}
                    disabled={locatingAddress}
                  >
                    <LocateFixed color="#006c49" size={14} strokeWidth={2.3} />
                    <Text style={styles.currentLocationUpdateText}>
                      {locatingAddress ? 'Updating...' : 'Update'}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.addressDetail}>
                  {savedServiceLocation.address}
                </Text>
                {typeof savedServiceLocation.latitude === 'number' &&
                typeof savedServiceLocation.longitude === 'number' ? (
                  <CurrentLocationMapPreview
                    location={{
                      latitude: savedServiceLocation.latitude,
                      longitude: savedServiceLocation.longitude,
                    }}
                  />
                ) : null}
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={styles.locateButton}
              onPress={handleLocateAddress}
              disabled={locatingAddress}
            >
              <LocateFixed color="#006c49" size={17} strokeWidth={2.3} />
              <Text style={styles.locateButtonText}>
                {locatingAddress
                  ? 'Detecting location...'
                  : 'Use current location'}
              </Text>
            </Pressable>
          )}

          {addresses.map(addr => (
            <Pressable
              key={addr.id}
              style={[
                styles.addressCard,
                selectedAddressId === addr.id && styles.addressCardActive,
              ]}
              onPress={() => setSelectedAddressId(addr.id)}
            >
              <View style={styles.addressIconBox}>
                <MapPin
                  color={selectedAddressId === addr.id ? '#006c49' : '#45464d'}
                  size={20}
                />
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>{addr.label}</Text>
                <Text style={styles.addressDetail}>{addr.detail}</Text>
              </View>
            </Pressable>
          ))}

          {(showAddressForm || addresses.length === 0) && (
            <View style={styles.addressForm}>
              <Text style={styles.addressFormTitle}>Save a new address</Text>
              {/* <Pressable
                style={[
                  styles.locateButton,
                  locatingAddress && styles.locateButtonDisabled,
                ]}
                onPress={handleLocateAddress}
                disabled={locatingAddress}
              >
                <LocateFixed color="#006c49" size={17} strokeWidth={2.3} />
                <Text style={styles.locateButtonText}>
                  {locatingAddress ? 'Locating...' : 'Locate your location'}
                </Text>
              </Pressable> */}
              <TextInput
                value={addressLabel}
                onChangeText={setAddressLabel}
                placeholder="Label e.g. Home, Office"
                placeholderTextColor="#76777d"
                style={styles.addressInput}
              />
              <TextInput
                value={addressDetail}
                onChangeText={setAddressDetail}
                placeholder="Complete address with area and city"
                placeholderTextColor="#76777d"
                style={[styles.addressInput, styles.addressTextArea]}
                multiline
                textAlignVertical="top"
              />
              <Pressable
                style={styles.saveAddressBtn}
                onPress={handleSaveAddress}
              >
                <Text style={styles.saveAddressText}>Save Address</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* â”€â”€ Special Instructions â”€â”€ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            numberOfLines={3}
            placeholder="e.g. Please bring a tall ladder, or call before arriving."
            placeholderTextColor="#76777d"
            style={styles.textArea}
            textAlignVertical="top"
          />
        </View>

        {/* â”€â”€ Payment Method â”€â”€ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map(method => (
            <Pressable
              key={method.id}
              style={styles.paymentRow}
              onPress={() => setSelectedPayment(method.id)}
            >
              <View
                style={[
                  styles.paymentIconBox,
                  method.image
                    ? styles.paymentIconBoxBrand
                    : {backgroundColor: method.color + '18'},
                ]}
              >
                {method.image ? (
                  <Image
                    source={method.image}
                    style={styles.paymentBrandImage}
                    resizeMode="contain"
                  />
                ) : (
                  method.Icon && <method.Icon color={method.color} size={20} />
                )}
              </View>
              <Text style={styles.paymentLabel}>{method.label}</Text>
              <View
                style={[
                  styles.radioCircle,
                  selectedPayment === method.id && styles.radioCircleActive,
                ]}
              >
                {selectedPayment === method.id && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* â”€â”€ Fee Summary â”€â”€ */}
        {rewardEnabled && user ? (
          <Pressable
            style={[
              styles.rewardBox,
              useRewardPoints && styles.rewardBoxActive,
              !canRedeemRewardForBooking && styles.rewardBoxDisabled,
            ]}
            onPress={() => {
              if (canRedeemRewardForBooking) {
                setUseRewardPoints(current => !current);
              }
            }}
          >
            <View style={styles.rewardIconBox}>
              <Gift color="#006c49" size={20} strokeWidth={2.3} />
            </View>
            <View style={styles.rewardCopy}>
              <Text style={styles.rewardTitle}>Reward points</Text>
              <Text style={styles.rewardText}>
                You have {rewardPoints} points worth{' '}
                {formatPkr(rewardBalanceValue)}.
              </Text>
              <Text style={styles.rewardHint}>
                {canRedeemRewardForBooking
                  ? `Use up to ${formatPkr(
                      redeemableRewardValue,
                    )} off this service. Earn ${serviceRewardPointsOnCompletion} point after completion.`
                  : rewardPointsNeeded > 0
                    ? `${rewardPointsNeeded} more point(s) needed to redeem rewards.`
                    : `Reward discount is below the ${formatPkr(rewardMinimumRedeem)} minimum for this booking.`}
              </Text>
            </View>
            <View
              style={[
                styles.rewardCheckbox,
                useRewardPoints && styles.rewardCheckboxChecked,
              ]}
            >
              {useRewardPoints ? (
                <Check color="#ffffff" size={14} strokeWidth={3} />
              ) : null}
            </View>
          </Pressable>
        ) : null}

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Service Fee
              {isRecurring ? ` (${recurringOccurrences} days)` : ''}
            </Text>
            <Text style={styles.summaryValue}>
              {formatPkr(serviceSubtotal)}
            </Text>
          </View>
          {isRecurring && (
            <View style={styles.summaryRowCompact}>
              <Text style={styles.summaryHint}>
                {formatPkr(serviceUnitPrice)} x {recurringOccurrences} days
              </Text>
            </View>
          )}
          {rewardDiscount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.rewardSummaryLabel}>
                Reward discount ({Math.round(rewardDiscount / rewardPointValue)} points)
              </Text>
              <Text style={styles.rewardSummaryValue}>
                -{formatPkr(rewardDiscount)}
              </Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Inspection Fee</Text>
            <Text style={styles.summaryValue}>{formatPkr(inspectionFee)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Platform charges ({appSettings.serviceTaxPercent}%)
            </Text>
            <Text style={styles.summaryValue}>{formatPkr(tax)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total Amount</Text>
            <Text style={styles.summaryTotal}>{formatPkr(total)}</Text>
          </View>
          <View style={styles.scheduledRow}>
            <Text style={styles.scheduledLabel}>
              Scheduled For: {scheduleLabel}
            </Text>
            <Text style={styles.scheduledPrice}>{formatPkr(total)}</Text>
          </View>
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* â”€â”€ Footer CTA â”€â”€ */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.confirmBtn,
            (confirming || selectedTimeClosed) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={confirming || successVisible || selectedTimeClosed}
        >
          <Text style={styles.confirmText}>
            {confirming ? 'Confirming...' : 'Confirm Booking'}
          </Text>
          <Zap
            color="#ffffff"
            size={18}
            fill="#ffffff"
            style={styles.zapIcon}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#f8f9ff'},
  messageBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: rounded.default,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageBannerWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  messageBannerError: {
    backgroundColor: '#fff7f7',
    borderColor: '#fecaca',
  },
  messageTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  messageBody: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  messageTextWarning: {
    color: '#92400e',
  },
  messageTextError: {
    color: '#93000a',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    elevation: 18,
    shadowColor: '#0b1c30',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 14},
  },
  successIconWrap: {
    width: 86,
    height: 86,
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 20,
    textAlign: 'center',
  },
  successBody: {
    fontFamily: fontFamily.regular,
    color: '#45464d',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    padding: 20,
    elevation: 18,
    shadowColor: '#0b1c30',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 14},
  },
  confirmTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 20,
  },
  confirmSubtitle: {
    fontFamily: fontFamily.regular,
    color: '#45464d',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  confirmDetailsBox: {
    borderRadius: rounded.default,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 12,
    marginTop: 16,
    gap: 10,
  },
  confirmDetailRow: {
    gap: 3,
  },
  confirmDetailLabel: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  confirmDetailValue: {
    fontFamily: fontFamily.medium,
    color: '#0b1c30',
    fontSize: 13,
    lineHeight: 18,
  },
  privacyAcceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  privacyCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyCheckboxChecked: {
    borderColor: '#006c49',
    backgroundColor: '#006c49',
  },
  privacyAcceptText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    color: '#45464d',
    fontSize: 13,
    lineHeight: 18,
  },
  privacyLink: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    textDecorationLine: 'underline',
  },
  privacyErrorText: {
    fontFamily: fontFamily.medium,
    color: '#ba1a1a',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  confirmEditButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmEditText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 13,
  },
  confirmPlaceButton: {
    flex: 1.35,
    minHeight: 46,
    borderRadius: rounded.default,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  confirmPlaceButtonDisabled: {
    opacity: 0.7,
  },
  confirmPlaceText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  supportBtn: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#effcf6',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: '#0b1c30',
  },

  content: {paddingBottom: 20},

  // Pro Card
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  proAvatar: {
    width: 52,
    height: 52,
    borderRadius: rounded.full,
    backgroundColor: '#dce9ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  proAvatarImage: {
    width: '100%',
    height: '100%',
  },
  proAvatarText: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: '#0b1c30',
  },
  proInfo: {flex: 1},
  proName: {fontFamily: fontFamily.bold, fontSize: 16, color: '#0b1c30'},
  proSpecialty: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: '#45464d',
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#006c49',
    letterSpacing: 0.5,
  },

  // Sections
  section: {paddingHorizontal: 16, paddingVertical: 16},
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#0b1c30',
    marginBottom: 14,
  },
  sectionMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#006c49',
  },

  // Days
  bookingModeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  bookingModeChip: {
    flex: 1,
    height: 42,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingModeChipActive: {
    backgroundColor: '#0b1c30',
    borderColor: '#0b1c30',
  },
  bookingModeText: {
    fontFamily: fontFamily.bold,
    color: '#45464d',
    fontSize: 13,
  },
  bookingModeTextActive: {
    color: '#ffffff',
  },
  dayRow: {flexDirection: 'row', gap: 8, paddingRight: 16},
  dayChip: {
    width: 68,
    minHeight: 72,
    alignItems: 'center',
    borderRadius: rounded.lg,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  dayChipActive: {
    backgroundColor: '#0b1c30',
    borderColor: '#0b1c30',
  },
  dayLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: '#76777d',
    letterSpacing: 0.5,
  },
  dayLabelActive: {color: '#bec6e0'},
  dayNum: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    color: '#0b1c30',
    marginTop: 2,
  },
  dayNumActive: {color: '#ffffff'},
  dayMonth: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#76777d',
    marginTop: 2,
  },
  dayMonthActive: {color: '#bec6e0'},
  recurringBox: {
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#e5eeff',
    backgroundColor: '#ffffff',
    padding: 12,
    marginTop: 14,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  recurringTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 14,
  },
  recurringMeta: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fontFamily.medium,
    color: '#006c49',
    fontSize: 12,
  },

  // Time
  timeHelp: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#45464d',
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 14,
  },
  timePeriodLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#76777d',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  timeChip: {
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.default,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  timeChipActive: {
    backgroundColor: '#006c49',
    borderColor: '#006c49',
  },
  timeChipDisabled: {
    backgroundColor: '#f1f2f6',
    borderColor: '#e1e4ed',
    opacity: 0.55,
  },
  timeText: {fontFamily: fontFamily.bold, fontSize: 14, color: '#0b1c30'},
  timeTextActive: {color: '#ffffff'},
  timeTextDisabled: {color: '#76777d'},
  customTimeButton: {
    minHeight: 70,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#d7deec',
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customTimeButtonIcon: {
    width: 42,
    height: 42,
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTimeButtonCopy: {
    flex: 1,
  },
  customTimeButtonTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 15,
  },
  customTimeButtonMeta: {
    fontFamily: fontFamily.regular,
    color: '#76777d',
    fontSize: 12,
    marginTop: 3,
  },
  customTimeButtonValue: {
    fontFamily: fontFamily.extraBold,
    color: '#006c49',
    fontSize: 15,
  },
  clockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.45)',
    justifyContent: 'flex-end',
  },
  clockSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  clockSheetNight: {
    backgroundColor: '#0b1c30',
    borderColor: '#20324d',
  },
  clockSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  clockSheetTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 20,
  },
  clockSheetTitleNight: {
    color: '#ffffff',
  },
  clockSheetSubtitle: {
    fontFamily: fontFamily.regular,
    color: '#45464d',
    fontSize: 12,
    marginTop: 4,
  },
  clockSheetSubtitleNight: {
    color: '#aebbd3',
  },
  clockCloseButton: {
    borderRadius: rounded.full,
    backgroundColor: '#eff4ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  clockCloseButtonNight: {
    backgroundColor: '#172944',
  },
  clockCloseText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 12,
  },
  simpleTimePreview: {
    minHeight: 58,
    borderRadius: rounded.lg,
    backgroundColor: '#effcf6',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  simpleTimePreviewText: {
    fontFamily: fontFamily.extraBold,
    color: '#006c49',
    fontSize: 20,
  },
  simpleHourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  simpleHourChip: {
    flex: 0,
    width: '23%',
  },
  clockCloseTextNight: {
    color: '#dbeafe',
  },
  clockFace: {
    width: 270,
    height: 270,
    borderRadius: 135,
    alignSelf: 'center',
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#dbe5f7',
    marginBottom: 18,
  },
  clockFaceNight: {
    backgroundColor: '#12243d',
    borderColor: '#294568',
  },
  clockCenter: {
    position: 'absolute',
    left: 91,
    top: 91,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cdebdc',
  },
  clockCenterNight: {
    backgroundColor: '#0b1c30',
    borderColor: '#35547a',
  },
  clockCenterTime: {
    fontFamily: fontFamily.extraBold,
    color: '#006c49',
    fontSize: 13,
    marginTop: 5,
  },
  clockCenterTimeNight: {
    color: '#dbeafe',
  },
  clockHourButton: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: rounded.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe5f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHourButtonNight: {
    backgroundColor: '#19304e',
    borderColor: '#35547a',
  },
  clockHourButtonActive: {
    backgroundColor: '#006c49',
    borderColor: '#006c49',
  },
  clockHourButtonNightActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  clockHourButtonDisabled: {
    opacity: 0.35,
  },
  clockHourText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 13,
  },
  clockHourTextNight: {
    color: '#dbeafe',
  },
  clockHourTextActive: {
    color: '#ffffff',
  },
  clockHourTextNightActive: {
    color: '#071525',
  },
  clockHourTextDisabled: {
    color: '#76777d',
  },
  clockControls: {
    gap: 10,
  },
  clockControlLabel: {
    fontFamily: fontFamily.bold,
    color: '#76777d',
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  clockControlLabelNight: {
    color: '#aebbd3',
  },
  clockChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clockMiniChip: {
    flex: 1,
    height: 42,
    borderRadius: rounded.default,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#dbe5f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockMiniChipNight: {
    backgroundColor: '#19304e',
    borderColor: '#35547a',
  },
  clockMiniChipActive: {
    backgroundColor: '#006c49',
    borderColor: '#006c49',
  },
  clockMiniChipNightActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  clockMiniChipDisabled: {
    opacity: 0.35,
  },
  clockMiniChipText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 13,
  },
  clockMiniChipTextNight: {
    color: '#dbeafe',
  },
  clockMiniChipTextActive: {
    color: '#ffffff',
  },
  clockMiniChipTextNightActive: {
    color: '#071525',
  },
  clockMiniChipTextDisabled: {
    color: '#76777d',
  },
  clockPeriodChip: {
    flex: 1,
    height: 44,
    borderRadius: rounded.default,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#dbe5f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockConfirmButton: {
    height: 50,
    borderRadius: rounded.default,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  clockConfirmButtonNight: {
    backgroundColor: '#38bdf8',
  },
  clockConfirmText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 15,
  },
  customTimeBox: {
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    backgroundColor: '#ffffff',
    padding: 14,
  },
  customTimeBoxClosed: {
    borderColor: '#fecaca',
    backgroundColor: '#fff7f7',
  },
  customTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  customTimeTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#0b1c30',
  },
  selectedTimePreview: {
    fontFamily: fontFamily.extraBold,
    color: '#006c49',
    fontSize: 16,
  },
  selectedTimePreviewClosed: {
    color: '#ba1a1a',
  },
  pickerGroup: {
    marginTop: 10,
  },
  pickerLabel: {
    fontFamily: fontFamily.bold,
    color: '#76777d',
    fontSize: 11,
    letterSpacing: 0.7,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerChip: {
    minWidth: 44,
    height: 38,
    borderRadius: rounded.default,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pickerChipActive: {
    backgroundColor: '#0b1c30',
    borderColor: '#0b1c30',
  },
  pickerChipDisabled: {
    backgroundColor: '#eef0f5',
    borderColor: '#e1e4ed',
    opacity: 0.5,
  },
  pickerChipText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 13,
  },
  pickerChipTextActive: {
    color: '#ffffff',
  },
  pickerChipTextDisabled: {
    color: '#76777d',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  periodChip: {
    flex: 1,
    height: 42,
    borderRadius: rounded.default,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedNotice: {
    borderRadius: rounded.default,
    backgroundColor: '#fee2e2',
    padding: 12,
    marginTop: 14,
  },
  closedNoticeTitle: {
    fontFamily: fontFamily.bold,
    color: '#93000a',
    fontSize: 13,
  },
  closedNoticeText: {
    fontFamily: fontFamily.regular,
    color: '#93000a',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  // Address
  addNewRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  addNewText: {fontFamily: fontFamily.bold, fontSize: 13, color: '#006c49'},
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 14,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  addressCardActive: {
    borderColor: '#006c49',
    backgroundColor: '#f0fdf7',
  },
  addressIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.default,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {flex: 1},
  currentLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  currentLocationUpdate: {
    minHeight: 30,
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
  },
  currentLocationUpdateText: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 11,
  },
  currentLocationMap: {
    width: '100%',
    height: 96,
    borderRadius: rounded.default,
    marginTop: 10,
    backgroundColor: '#e5eeff',
    overflow: 'hidden',
  },
  currentLocationMapTile: {
    position: 'absolute',
    width: MAP_TILE_SIZE,
    height: MAP_TILE_SIZE,
  },
  currentLocationMapFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef3f8',
  },
  currentLocationMapFallbackText: {
    fontFamily: fontFamily.bold,
    color: '#45464d',
    fontSize: 12,
  },
  currentLocationPinShadow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 14,
    height: 6,
    marginLeft: -7,
    marginTop: 10,
    borderRadius: 7,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
  },
  currentLocationPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -24,
    borderRadius: 12,
    borderBottomRightRadius: 4,
    backgroundColor: '#0b1c30',
    borderWidth: 3,
    borderColor: '#ffffff',
    transform: [{rotate: '45deg'}],
  },
  currentLocationPinDot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 7,
    height: 7,
    marginLeft: -3.5,
    marginTop: -15.5,
    borderRadius: 3.5,
    backgroundColor: '#ffffff',
  },  addressLabel: {fontFamily: fontFamily.bold, fontSize: 14, color: '#0b1c30'},
  addressDetail: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#45464d',
    marginTop: 2,
    lineHeight: 17,
  },
  addressForm: {
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#e5eeff',
    backgroundColor: '#ffffff',
    padding: 14,
    marginTop: 6,
  },
  addressFormTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 14,
    marginBottom: 10,
  },
  locateButton: {
    minHeight: 46,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#effcf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  locateButtonDisabled: {
    opacity: 0.7,
  },
  locateButtonText: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 13,
  },
  addressInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: rounded.default,
    paddingHorizontal: 12,
    fontFamily: fontFamily.regular,
    color: '#0b1c30',
    marginBottom: 10,
  },
  addressTextArea: {
    minHeight: 76,
    paddingTop: 12,
  },
  saveAddressBtn: {
    height: 46,
    borderRadius: rounded.default,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAddressText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 14,
  },

  // Special Instructions
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: rounded.default,
    padding: 14,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#0b1c30',
    backgroundColor: '#ffffff',
  },

  // Payment
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5eeff',
    gap: 14,
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconBoxBrand: {
    width: 40,
    height: 40,
    borderRadius: rounded.default,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBrandImage: {
    width: 40,
    height: 40,
  },
  paymentLabel: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: '#0b1c30',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {borderColor: '#006c49'},
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#006c49',
  },

  // Rewards
  rewardBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#d7e4ef',
    backgroundColor: '#ffffff',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardBoxActive: {
    borderColor: '#006c49',
    backgroundColor: '#f0fbf6',
  },
  rewardBoxDisabled: {
    opacity: 0.74,
  },
  rewardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCopy: {
    flex: 1,
  },
  rewardTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 15,
    marginBottom: 3,
  },
  rewardText: {
    fontFamily: fontFamily.regular,
    color: '#45464d',
    fontSize: 12,
    lineHeight: 17,
  },
  rewardHint: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  rewardCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCheckboxChecked: {
    borderColor: '#006c49',
    backgroundColor: '#006c49',
  },

  // Summary
  summaryBox: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryRowCompact: {
    paddingBottom: 6,
    marginTop: -4,
  },
  summaryLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#45464d',
  },
  summaryHint: {
    fontFamily: fontFamily.medium,
    color: '#76777d',
    fontSize: 12,
  },
  rewardSummaryLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#006c49',
  },
  rewardSummaryValue: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#006c49',
  },
  summaryValue: {fontFamily: fontFamily.medium, fontSize: 14, color: '#0b1c30'},
  summaryDivider: {height: 1, backgroundColor: '#e5eeff', marginVertical: 4},
  summaryTotalLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#0b1c30',
  },
  summaryTotal: {fontFamily: fontFamily.bold, fontSize: 16, color: '#0b1c30'},
  scheduledRow: {
    backgroundColor: '#f8f9ff',
    borderRadius: rounded.default,
    padding: 12,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduledLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#45464d',
    flex: 1,
  },
  scheduledPrice: {fontFamily: fontFamily.bold, fontSize: 14, color: '#0b1c30'},

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5eeff',
  },
  confirmBtn: {
    height: 54,
    backgroundColor: '#0b1c30',
    borderRadius: rounded.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnDisabled: {
    opacity: 0.72,
  },
  confirmText: {fontFamily: fontFamily.bold, color: '#ffffff', fontSize: 16},
  zapIcon: {marginLeft: 4},
});



