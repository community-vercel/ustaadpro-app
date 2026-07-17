import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CalendarCheck,
  Camera,
  ChevronRight,
  Edit2,
  Gift,
  LogOut,
  Mail,
  MapPin,
  ShoppingCart,
  X,
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {Order, UserAddress} from '@/types/models';
import {colors} from '@/theme/colors';
import {fontFamily, type} from '@/theme/typography';
import {rounded} from '@/theme/layout';
import {formatPkr} from '@/utils/currency';
import {NotificationCenter} from '@/components/NotificationCenter';

const statusCopy: Record<Order['status'], string> = {
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PROFILE_PHOTO_KEY_PREFIX = 'profile_photo_uri';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function initials(name?: string): string {
  if (!name) {
    return 'U';
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function profilePhotoKey(user?: {email?: string; phone?: string} | null) {
  const ownerKey = user?.email || user?.phone;
  return ownerKey
    ? `${PROFILE_PHOTO_KEY_PREFIX}:${ownerKey.toLowerCase()}`
    : null;
}

export function ProfileTab(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const {
    user,
    orders,
    addresses,
    fetchOrders,
    fetchAddresses,
    fetchAppContent,
    appSettings,
    updateAddress,
    logout,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(
    null,
  );
  const [addressLabel, setAddressLabel] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchAddresses(), fetchAppContent()]).finally(() =>
      setLoading(false),
    );
  }, [fetchAddresses, fetchAppContent, fetchOrders]);

  useEffect(() => {
    const storageKey = profilePhotoKey(user);

    if (!storageKey) {
      setProfilePhotoUri(null);
      return;
    }

    AsyncStorage.getItem(storageKey)
      .then(uri => {
        setProfilePhotoUri(uri || null);
      })
      .catch(error => {
        console.error('Load profile photo error:', error);
      });
  }, [user]);

  const visibleOrders = useMemo(
    () => (showAllBookings ? orders : orders.slice(0, 4)),
    [orders, showAllBookings],
  );
  const hasMoreBookings = orders.length > 4 && !showAllBookings;

  const defaultAddress = useMemo(
    () => addresses.find(address => address.isDefault) || addresses[0],
    [addresses],
  );
  const rewardPoints = Number(user?.rewardPoints || 0);
  const rewardPointValue = Math.max(1, Number(appSettings.rewardPointValue || 25));
  const rewardBalanceValue = rewardPoints * rewardPointValue;
  const rewardMinimumRedeem = Math.max(
    0,
    Number(appSettings.rewardMinimumRedeem || 100),
  );
  const rewardProgress =
    rewardMinimumRedeem > 0
      ? Math.min(100, (rewardBalanceValue / rewardMinimumRedeem) * 100)
      : 100;
  const pointsNeeded = Math.max(
    0,
    Math.ceil((rewardMinimumRedeem - rewardBalanceValue) / rewardPointValue),
  );

  const openAddressEditor = (address: UserAddress) => {
    setEditingAddress(address);
    setAddressLabel(address.label);
    setAddressDetail(address.detail);
  };

  const closeAddressEditor = () => {
    setEditingAddress(null);
    setAddressLabel('');
    setAddressDetail('');
  };

  const handleSaveAddress = async () => {
    if (!editingAddress || !addressLabel.trim() || !addressDetail.trim()) {
      return;
    }

    setSavingAddress(true);
    try {
      await updateAddress(editingAddress.id, {
        label: addressLabel.trim(),
        detail: addressDetail.trim(),
        isDefault: editingAddress.isDefault,
      });
      closeAddressEditor();
    } finally {
      setSavingAddress(false);
    }
  };

  const saveProfilePhoto = async (uri?: string) => {
    if (!uri) {
      Alert.alert('Photo not selected', 'Please choose an image to upload.');
      return;
    }

    const storageKey = profilePhotoKey(user);

    if (!storageKey) {
      Alert.alert('Profile unavailable', 'Please sign in again to save photo.');
      return;
    }

    await AsyncStorage.setItem(storageKey, uri);
    setProfilePhotoUri(uri);
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
    const alreadyGranted = await PermissionsAndroid.check(permission);

    if (alreadyGranted) {
      return true;
    }

    const result = await PermissionsAndroid.request(permission, {
      title: 'Allow camera access',
      message: 'Ustaad Pro uses your camera to update your profile picture.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickProfileFromGallery = async () => {
    try {
      setPhotoPickerVisible(false);
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });

      if (result.errorCode) {
        Alert.alert(
          'Upload failed',
          result.errorMessage || 'Could not open your photo library.',
        );
        return;
      }

      if (result.didCancel) {
        return;
      }

      const asset = result.assets?.[0];
      await saveProfilePhoto(asset?.uri);
    } catch (error) {
      console.error('Profile photo upload error:', error);
      const message =
        error instanceof Error ? error.message : 'Could not open your photo library.';
      const needsRebuild =
        message.includes('launchImageLibrary') ||
        message.includes('ImagePicker') ||
        message.includes('Native');

      Alert.alert(
        'Upload failed',
        needsRebuild
          ? 'Photo picker is not available in this app build. Please rebuild and reinstall the Android app.'
          : message,
      );
    }
  };

  const takeProfilePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();

      if (!hasPermission) {
        Alert.alert(
          'Camera permission needed',
          'Please allow camera permission to take a live profile photo.',
        );
        return;
      }

      setPhotoPickerVisible(false);
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Upload failed',
          result.errorMessage || 'Could not open your camera.',
        );
        return;
      }

      await saveProfilePhoto(result.assets?.[0]?.uri);
    } catch (error) {
      console.error('Profile camera photo error:', error);
      const message =
        error instanceof Error ? error.message : 'Could not open your camera.';
      Alert.alert('Upload failed', message);
    }
  };

  const handleUploadPhoto = () => {
    setPhotoPickerVisible(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchAddresses()]);
    setRefreshing(false);
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
        visible={Boolean(editingAddress)}
        transparent
        animationType="fade"
        onRequestClose={closeAddressEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit saved address</Text>
              <Pressable style={styles.modalClose} onPress={closeAddressEditor}>
                <X color={colors.ink} size={18} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Address label</Text>
            <TextInput
              value={addressLabel}
              onChangeText={setAddressLabel}
              placeholder="Home"
              placeholderTextColor={colors.muted}
              style={styles.modalInput}
            />

            <Text style={styles.fieldLabel}>Complete address</Text>
            <TextInput
              value={addressDetail}
              onChangeText={setAddressDetail}
              placeholder="House, street, area and city"
              placeholderTextColor={colors.muted}
              style={[styles.modalInput, styles.modalTextArea]}
              multiline
            />

            <Pressable
              style={({pressed}) => [
                styles.saveAddressButton,
                pressed && {opacity: 0.9},
              ]}
              onPress={handleSaveAddress}
              disabled={savingAddress}
            >
              <Text style={styles.saveAddressText}>
                {savingAddress ? 'Saving...' : 'Save address'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPhotoPickerVisible(false)}
        >
          <Pressable style={styles.photoPickerCard}>
            <Text style={styles.modalTitle}>Update profile picture</Text>
            <Text style={styles.photoPickerText}>
              Take a live photo or choose one from your gallery.
            </Text>
            <View style={styles.photoPickerActions}>
              <Pressable
                style={styles.photoPickerPrimary}
                onPress={takeProfilePhoto}
              >
                <Camera color="#ffffff" size={17} strokeWidth={2.2} />
                <Text style={styles.photoPickerPrimaryText}>Camera</Text>
              </Pressable>
              <Pressable
                style={styles.photoPickerSecondary}
                onPress={pickProfileFromGallery}
              >
                <Text style={styles.photoPickerSecondaryText}>Gallery</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Your account and bookings
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <NotificationCenter />
            <View style={styles.smallAvatar}>
              {profilePhotoUri ? (
                <Image
                  source={{uri: profilePhotoUri}}
                  style={styles.smallAvatarImage}
                />
              ) : (
                <Text style={styles.smallAvatarText}>
                  {initials(user?.name)}
                </Text>
              )}
            </View>
          </View>
        </View>

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
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.mainAvatar}>
              {profilePhotoUri ? (
                <Image
                  source={{uri: profilePhotoUri}}
                  style={styles.mainAvatarImage}
                />
              ) : (
                <Text style={styles.mainAvatarText}>
                  {initials(user?.name)}
                </Text>
              )}
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.userName}>
                {user?.name || 'UstaadPro User'}
              </Text>
              <Text style={styles.userMeta}>
                {user?.email || 'No email added'}
              </Text>
              <Text style={styles.userMeta}>
                {user?.phone || 'No phone added'}
              </Text>
            </View>
          </View>

          <View style={styles.profileNote}>
            <Mail color="#006c49" size={16} strokeWidth={2.2} />
            <Text style={styles.profileNoteText} numberOfLines={1}>
              Email and phone are verified and cannot be edited here.
            </Text>
          </View>

          <Pressable style={styles.uploadPhotoBtn} onPress={handleUploadPhoto}>
            <Camera color="#0b1c30" size={16} strokeWidth={2.2} />
            <Text style={styles.uploadPhotoText}>Upload profile picture</Text>
          </Pressable>
        </View>

        {appSettings.rewardEnabled !== false ? (
          <View style={styles.rewardCard}>
            <View style={styles.rewardIcon}>
              <Gift color="#006c49" size={21} strokeWidth={2.3} />
            </View>
            <View style={styles.rewardCopy}>
              <View style={styles.rewardHeader}>
                <Text style={styles.rewardTitle}>Reward points</Text>
                <Text style={styles.rewardPoints}>
                  {formatPkr(rewardBalanceValue)}
                </Text>
              </View>
              <Text style={styles.rewardText}>
                {rewardPoints} point(s). Earn{' '}
                {appSettings.serviceRewardPointsOnCompletion || 1} point after
                each completed service booking.
              </Text>
              <View style={styles.rewardProgressTrack}>
                <View
                  style={[
                    styles.rewardProgressFill,
                    {width: `${rewardProgress}%`},
                  ]}
                />
              </View>
              <Text style={styles.rewardHint}>
                {pointsNeeded === 0
                  ? 'You can redeem rewards on eligible bookings.'
                  : `${pointsNeeded} more point(s) to unlock reward redemption.`}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <View>
              <Text style={styles.sectionTitle}>Saved address</Text>
              <Text style={styles.addressSubtitle}>
                Edit the address used for future bookings.
              </Text>
            </View>
            {defaultAddress && (
              <Pressable
                style={styles.addressEditButton}
                onPress={() => openAddressEditor(defaultAddress)}
              >
                <Edit2 color="#0b1c30" size={15} strokeWidth={2.2} />
                <Text style={styles.addressEditText}>Edit</Text>
              </Pressable>
            )}
          </View>

          {defaultAddress ? (
            <View style={styles.addressBody}>
              <View style={styles.addressIcon}>
                <MapPin color="#006c49" size={19} strokeWidth={2.2} />
              </View>
              <View style={styles.addressCopy}>
                <Text style={styles.addressLabel}>{defaultAddress.label}</Text>
                <Text style={styles.addressDetail}>
                  {defaultAddress.detail}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyAddress}>
              <MapPin color="#006c49" size={24} strokeWidth={2.2} />
              <Text style={styles.emptyAddressText}>
                No saved address yet. Add one while booking a service.
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={({pressed}) => [
            styles.shoppingOrdersCard,
            pressed && styles.shoppingOrdersCardPressed,
          ]}
          onPress={() => navigation.navigate('ShoppingOrders')}
        >
          <View style={styles.shoppingOrdersIcon}>
            <ShoppingCart color="#006c49" size={21} strokeWidth={2.2} />
          </View>
          <View style={styles.shoppingOrdersCopy}>
            <Text style={styles.shoppingOrdersTitle}>Shopping orders</Text>
            <Text style={styles.shoppingOrdersText}>
              View products you purchased and track delivery status.
            </Text>
          </View>
          <ChevronRight color="#76777d" size={19} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent bookings</Text>
          <Text style={styles.sectionMeta}>{orders.length} total</Text>
        </View>

        {visibleOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <CalendarCheck color="#006c49" size={28} strokeWidth={2.1} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyBody}>
              Confirmed bookings will appear here with service, time, address,
              and status.
            </Text>
          </View>
        ) : (
          visibleOrders.map(order => {
            const firstItem = order.items[0];
            return (
              <View key={order.id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View style={styles.bookingIcon}>
                    <CalendarCheck
                      color="#006c49"
                      size={20}
                      strokeWidth={2.2}
                    />
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingTitle} numberOfLines={1}>
                      {firstItem?.service.title || 'Service booking'}
                    </Text>
                    <Text style={styles.bookingTime}>{order.bookedFor}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {statusCopy[order.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingDetailRow}>
                  <MapPin color="#76777d" size={16} strokeWidth={2.1} />
                  <Text style={styles.bookingAddress} numberOfLines={2}>
                    {order.address || 'Address not provided'}
                  </Text>
                </View>

                <View style={styles.bookingFooter}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderTotal}>
                    {formatPkr(order.total)}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {hasMoreBookings && (
          <Pressable
            style={styles.showAllButton}
            onPress={() => setShowAllBookings(true)}
          >
            <Text style={styles.showAllText}>Show all bookings</Text>
          </Pressable>
        )}

        <Pressable style={styles.logoutButton} onPress={() => void logout()}>
          <LogOut color="#ba1a1a" size={18} strokeWidth={2.2} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>

        <View style={{height: 42}} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 29,
    color: colors.ink,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 42,
    gap: 14,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ba1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.48)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    padding: 18,
  },
  photoPickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    padding: 18,
  },
  photoPickerText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  photoPickerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  photoPickerPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: rounded.default,
    backgroundColor: colors.authDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  photoPickerPrimaryText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 14,
  },
  photoPickerSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerSecondaryText: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 18,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 12,
    marginBottom: 7,
  },
  modalInput: {
    minHeight: 50,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 13,
    color: colors.ink,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    marginBottom: 14,
  },
  modalTextArea: {
    minHeight: 94,
    paddingTop: 13,
    textAlignVertical: 'top',
  },
  saveAddressButton: {
    height: 48,
    borderRadius: rounded.default,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveAddressText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 14,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  smallAvatarImage: {
    width: '100%',
    height: '100%',
  },
  smallAvatarText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: '#ffffff',
  },
  content: {
    padding: 20,
    paddingBottom: 112,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 18,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mainAvatar: {
    width: 76,
    height: 76,
    borderRadius: rounded.full,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainAvatarImage: {
    width: '100%',
    height: '100%',
  },
  mainAvatarText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    color: '#ffffff',
  },
  profileCopy: {
    flex: 1,
  },
  userName: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.ink,
  },
  userMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  profileNote: {
    minHeight: 42,
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    marginTop: 18,
  },
  profileNoteText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    color: colors.text,
    fontSize: 12,
  },
  uploadPhotoBtn: {
    height: 42,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadPhotoText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.ink,
  },
  rewardCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#d7e4ef',
    padding: 16,
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  rewardIcon: {
    width: 44,
    height: 44,
    borderRadius: rounded.default,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCopy: {
    flex: 1,
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rewardTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 15,
  },
  rewardPoints: {
    fontFamily: fontFamily.extraBold,
    color: '#006c49',
    fontSize: 20,
  },
  rewardText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  rewardProgressTrack: {
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: '#e5eeff',
    overflow: 'hidden',
    marginTop: 10,
  },
  rewardProgressFill: {
    height: '100%',
    borderRadius: rounded.full,
    backgroundColor: '#006c49',
  },
  rewardHint: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 18,
    marginTop: 14,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressSubtitle: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  addressEditButton: {
    height: 34,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  addressEditText: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 12,
  },
  addressBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.default,
    padding: 13,
  },
  addressIcon: {
    width: 38,
    height: 38,
    borderRadius: rounded.default,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressCopy: {
    flex: 1,
  },
  addressLabel: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
  },
  addressDetail: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  emptyAddress: {
    minHeight: 96,
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 16,
  },
  emptyAddressText: {
    fontFamily: fontFamily.medium,
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  shoppingOrdersCard: {
    minHeight: 74,
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shoppingOrdersCardPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  shoppingOrdersIcon: {
    width: 44,
    height: 44,
    borderRadius: rounded.default,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingOrdersCopy: {
    flex: 1,
  },
  shoppingOrdersTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 15,
  },
  shoppingOrdersText: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  contactGrid: {
    gap: 10,
    marginTop: 18,
  },
  contactItem: {
    height: 44,
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  contactText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    color: colors.text,
    fontSize: 13,
  },
  editProfileBtn: {
    height: 42,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editProfileText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.ink,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 13,
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 21,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.ink,
  },
  sectionMeta: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.success,
  },
  emptyCard: {
    minHeight: 188,
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 18,
    marginTop: 10,
  },
  emptyBody: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 16,
    marginBottom: 12,
  },
  bookingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookingIcon: {
    width: 42,
    height: 42,
    borderRadius: rounded.default,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
  },
  bookingTime: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: rounded.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontFamily: fontFamily.bold,
    color: colors.success,
    fontSize: 10,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#eff4ff',
  },
  bookingAddress: {
    flex: 1,
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  bookingFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderId: {
    fontFamily: fontFamily.bold,
    color: colors.muted,
    fontSize: 12,
  },
  orderTotal: {
    fontFamily: fontFamily.extraBold,
    color: colors.ink,
    fontSize: 16,
  },
  showAllButton: {
    height: 48,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  showAllText: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
  },
  settingsBox: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 18,
    marginTop: 12,
  },
  settingsList: {
    marginTop: 8,
  },
  settingsRow: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eff4ff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    flex: 1,
    fontFamily: fontFamily.medium,
    color: colors.text,
    fontSize: 14,
  },
  cartBadge: {
    minWidth: 26,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: rounded.full,
    backgroundColor: '#dcfce7',
    color: colors.success,
    fontFamily: fontFamily.bold,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoutButton: {
    height: 50,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#ffd6d6',
    backgroundColor: '#fff7f7',
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontFamily: fontFamily.bold,
    color: colors.danger,
    fontSize: 14,
  },
});
