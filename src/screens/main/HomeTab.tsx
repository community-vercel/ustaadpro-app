import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {ClipPath, Defs, Image as SvgImage, Path} from 'react-native-svg';
import {
  Menu,
  Search,
  SlidersHorizontal,
  XCircle,
  Zap,
  Wrench,
  Sparkles,
  Wind,
  PaintBucket,
  ChevronRight,
  CalendarCheck,
  FileText,
  Info,
  LogOut,
  MapPin,
  PackageCheck,
  ShoppingCart,
  User,
  X,
  Hammer,
  Anvil,
  Cctv,
  Layers,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {formatPkr} from '@/utils/currency';
import {rounded} from '@/theme/layout';
import {HomeSlide, ServiceCategory, ServiceCategoryId} from '@/types/models';
import {NotificationCenter} from '@/components/NotificationCenter';
import {apiClient} from '@/api/client';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SortOption = 'default' | 'priceLow' | 'priceHigh' | 'rating';
const PROFILE_PHOTO_KEY_PREFIX = 'profile_photo_uri';

function profilePhotoKey(user?: {email?: string; phone?: string} | null) {
  const ownerKey = user?.email || user?.phone;
  return ownerKey
    ? `${PROFILE_PHOTO_KEY_PREFIX}:${ownerKey.toLowerCase()}`
    : null;
}

const FALLBACK_HEADER_SLIDES: HomeSlide[] = [
  {
    id: 'flash-cleaning',
    badge: 'Flash Sale',
    title: 'Flat 15% Off\nDeep Cleaning',
    subtitle: 'Quality service guaranteed.\nStarting from PKR 2,500.',
    buttonLabel: 'Book Now',
    categoryId: 'home-cleaning' as const,
    categoryTitle: 'Home Cleaning',
    visual: '15%',
    imageUrl: '',
    primaryColor: '#131b2e',
    secondaryColor: '#213145',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'quick-ac',
    badge: 'Quick Help',
    title: 'AC Repair\nAt Your Doorstep',
    subtitle: 'Book verified cooling experts.\nSame-day slots available.',
    buttonLabel: 'Fix AC',
    categoryId: 'ac-services' as const,
    categoryTitle: 'AC Services',
    visual: 'AC',
    imageUrl: '',
    primaryColor: '#0f766e',
    secondaryColor: '#134e4a',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'care-plan',
    badge: 'Care Plan',
    title: 'Save More With\nMaintenance Plans',
    subtitle:
      'Routine checks, priority service,\nand predictable monthly care.',
    buttonLabel: 'View Plans',
    categoryId: 'subscriptions' as const,
    categoryTitle: 'Subscriptions',
    visual: 'PRO',
    imageUrl: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#312e81',
    sortOrder: 3,
    isActive: true,
  },
];

function categoryIcon(category: ServiceCategory) {
  const iconName = (category.icon || '').toLowerCase();
  const id = (category.id || '').toLowerCase();

  if (iconName.includes('sparkle') || id.includes('cleaning')) {
    return Sparkles;
  }
  if (
    iconName.includes('wrench') ||
    iconName.includes('pipe') ||
    id.includes('plumber')
  ) {
    return Wrench;
  }
  if (
    iconName.includes('air-conditioner') ||
    iconName.includes('wind') ||
    id.includes('ac-services')
  ) {
    return Wind;
  }
  if (iconName.includes('calendar') || id.includes('subscription')) {
    return CalendarCheck;
  }
  if (iconName.includes('paint') || id.includes('painter')) {
    return PaintBucket;
  }
  if (iconName.includes('hammer') || id.includes('carpenter')) {
    return Hammer;
  }
  if (iconName.includes('anvil') || id.includes('welder')) {
    return Anvil;
  }
  if (iconName.includes('cctv') || id.includes('cctv')) {
    return Cctv;
  }
  if (
    iconName.includes('user') ||
    iconName.includes('salon') ||
    id.includes('salon')
  ) {
    return User;
  }
  if (
    iconName.includes('lightning') ||
    iconName.includes('bolt') ||
    iconName.includes('zap') ||
    id.includes('electrician')
  ) {
    return Zap;
  }
  return Zap;
}

export function HomeTab(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const {
    user,
    isGuest,
    services,
    categories,
    subcategories,
    homeSlides,
    fetchServices,
    fetchAppContent,
    logout,
    savedServiceLocation,
    setLocationPromptVisible,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [homeContentVersion, setHomeContentVersion] = useState(0);
  const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const drawerX = useRef(new Animated.Value(-320)).current;
  const homeScrollRef = useRef<ScrollView>(null);
  const drawerClosing = useRef(false);
  const drawerOverlayOpacity = useRef(new Animated.Value(0)).current;
  const {width: viewportWidth} = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderImagesReady, setSliderImagesReady] = useState(false);
  const slides = homeSlides.length ? homeSlides : FALLBACK_HEADER_SLIDES;
  const instantServiceChipWidth = Math.max(64, (viewportWidth - 56) / 4);
  const currentLocationText =
    savedServiceLocation?.address || 'Set your current location';
  const banner = slides[activeSlide] || slides[0];
  // Main categories are managed from the admin catalogue. An empty catalogue
  // must stay empty instead of falling back to demo categories.
  const instantServices = categories.map(category => ({
    id: category.id,
    label: category.title,
    Icon: categoryIcon(category),
    color: category.tint || '#006c49',
    imageUrl: category.mobileIconUrl || category.imageUrl || '',
  }));
  const quickServices = useMemo(() =>
    subcategories
      .map(subcategory => {
        const category = categories.find(item => item.id === subcategory.categoryId);
        const firstService = services.find(item => item.subcategoryId === subcategory.id);
        return {id: subcategory.id, title: subcategory.title, categoryTitle: category?.title || 'Home Services', imageUrl: subcategory.mobileIconUrl || subcategory.webImageUrl || subcategory.imageUrl || firstService?.imageUrl || '', serviceCount: services.filter(item => item.subcategoryId === subcategory.id).length};
      })
      .filter(item => item.serviceCount > 0),
    [categories, services, subcategories],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredServices = useMemo(() => {
    const terms = normalizedSearch.split(/\s+/).filter(Boolean);
    const categorySearchIds =
      terms.length === 1
        ? categories
            .filter(category => {
              const categoryText = `${category.id} ${category.title}`.toLowerCase();
              return categoryText.includes(terms[0]);
            })
            .map(category => category.id)
        : [];
    const nextServices = services.filter(service => {
      const matchesCategory =
        selectedCategoryId === 'all' ||
        service.categoryId === selectedCategoryId ||
        service.subcategoryId === selectedCategoryId;

      if (!matchesCategory) {
        return false;
      }

      if (
        selectedCategoryId === 'all' &&
        categorySearchIds.length > 0 &&
        !categorySearchIds.includes(service.categoryId) &&
        (!service.subcategoryId || !categorySearchIds.includes(service.subcategoryId))
      ) {
        return false;
      }

      if (!terms.length) {
        return true;
      }

      const category = categories.find(item => item.id === service.categoryId);
      const haystack = [
        service.title,
        service.description,
        service.serviceType,
        service.badge,
        service.categoryId,
        category?.title,
        category?.subtitle,
        service.detailDescription,
        ...(service.includes || []),
        ...(service.details || []),
        ...(service.excludes || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return terms.every(term => haystack.includes(term));
    });

    return [...nextServices].sort((left, right) => {
      if (sortOption === 'priceLow') {
        return left.price - right.price;
      }
      if (sortOption === 'priceHigh') {
        return right.price - left.price;
      }
      if (sortOption === 'rating') {
        return right.rating - left.rating;
      }
      return 0;
    });
  }, [categories, normalizedSearch, selectedCategoryId, services, sortOption]);
  const activeFilterCount =
    (selectedCategoryId !== 'all' ? 1 : 0) + (sortOption !== 'default' ? 1 : 0);

  const confirmDeleteAccount = () => {
    if (deletingAccount) return;
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (deletingAccount) return;
    setDeleteModalVisible(false);
    setMenuVisible(false);
    drawerClosing.current = false;
    drawerX.setValue(-320);
    drawerOverlayOpacity.setValue(0);
    // Android can leave the underlying native ScrollView surface blank after
    // dismissing a transparent modal. Remount only its content surface.
    setHomeContentVersion(version => version + 1);
  };

  const deleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await apiClient.delete('/auth/account');
      setDeleteModalVisible(false);
      setDeleteSuccessVisible(true);
    } catch (error: any) {
      Alert.alert('Could not delete account', error.response?.data?.message || 'Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };
  const finishDeletedAccount = async () => {
    setDeleteSuccessVisible(false);
    await logout();
  };
  const menuItems = useMemo(
    () => [
      {
        label: user ? 'My Profile' : 'Login / Sign up',
        Icon: User,
        onPress: () =>
          user
            ? navigation.navigate('Main', {screen: 'Profile'})
            : navigation.navigate('Auth', {screen: 'Login'}),
      },
      {
        label: 'My Bookings',
        Icon: CalendarCheck,
        onPress: () =>
          user
            ? navigation.navigate('Main', {screen: 'Bookings'})
            : navigation.navigate('Auth', {screen: 'Login'}),
      },
      {
        label: 'My Store Orders',
        Icon: PackageCheck,
        onPress: () =>
          user
            ? navigation.navigate('ShoppingOrders')
            : navigation.navigate('Auth', {screen: 'Login'}),
      },
      {
        label: 'Service Cart',
        Icon: ShoppingCart,
        onPress: () => navigation.navigate('Cart'),
      },
      {
        label: 'About Ustaad Pro',
        Icon: Info,
        onPress: () => navigation.navigate('About'),
      },
      {
        label: 'Complaints',
        Icon: AlertCircle,
        onPress: () =>
          user
            ? navigation.navigate('Complaints')
            : navigation.navigate('Auth', {screen: 'Login'}),
      },
      {
        label: 'Privacy Policy',
        Icon: FileText,
        onPress: () => navigation.navigate('PrivacyPolicy'),
      },
      ...(user
        ? [{label: deletingAccount ? 'Deleting Account...' : 'Delete Account', Icon: Trash2, onPress: confirmDeleteAccount}]
        : []),
      user
        ? {
            label: 'Sign out',
            Icon: LogOut,
            onPress: () => {
              void logout();
            },
          }
        : {
            label: 'Exit guest mode',
            Icon: LogOut,
            onPress: () => {
              void logout();
            },
          },
    ],
    [deletingAccount, logout, navigation, user],
  );

  useEffect(() => {
    Promise.all([fetchServices(), fetchAppContent()]).then(() =>
      setLoading(false),
    );
  }, [fetchAppContent, fetchServices]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const storageKey = profilePhotoKey(user);

      if (!storageKey) {
        setProfilePhotoUri(null);
        return () => {
          active = false;
        };
      }

      AsyncStorage.getItem(storageKey)
        .then(uri => {
          if (active) {
            setProfilePhotoUri(uri || null);
          }
        })
        .catch(error => {
          console.error('Load home profile photo error:', error);
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  useEffect(() => {
    let active = true;
    const imageUrls = slides
      .map(slide => slide.imageUrl)
      .filter((imageUrl): imageUrl is string => Boolean(imageUrl));
    setSliderImagesReady(imageUrls.length === 0);
    Promise.allSettled(imageUrls.map(imageUrl => Image.prefetch(imageUrl))).then(
      () => {
        if (active) setSliderImagesReady(true);
      },
    );
    return () => {
      active = false;
    };
  }, [slides]);

  useEffect(() => {
    if (!sliderImagesReady || slides.length < 2) {
      return undefined;
    }
    const timer = setInterval(() => {
      setActiveSlide(current => (current + 1) % slides.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [sliderImagesReady, slides.length]);

  const openDrawer = () => {
    drawerClosing.current = false;
    drawerX.setValue(-320);
    drawerOverlayOpacity.setValue(0);
    setMenuVisible(true);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(drawerX, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(drawerOverlayOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeDrawer = (afterClose?: () => void) => {
    if (drawerClosing.current) return;
    drawerClosing.current = true;
    Animated.parallel([
      Animated.timing(drawerX, {
        toValue: -320,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(drawerOverlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({finished}) => {
      if (!finished) return;
      setMenuVisible(false);
      drawerClosing.current = false;
      afterClose?.();
    });
  };
  const handleMenuPress = (onPress: () => void) => {
    closeDrawer(onPress);
  };

  const handleNextSlide = () => {
    setActiveSlide(current => (current + 1) % slides.length);
  };

  const openBanner = (slide: HomeSlide) => {
    if (slide.redirectType === 'all_services') {
      navigation.navigate('Category', {categoryId: 'all' as ServiceCategoryId, title: 'All Services'});
      return;
    }
    if (slide.redirectType === 'quick_services') {
      navigation.navigate('Category', {categoryId: 'all-subcategories' as ServiceCategoryId, title: 'Quick Services'});
      return;
    }
    if (slide.redirectType === 'subscriptions') {
      navigation.navigate('Category', {categoryId: 'subscriptions' as ServiceCategoryId, title: 'Maintenance Packages'});
      return;
    }
    const categoryHasServices = services.some(service => service.categoryId === slide.categoryId);
    if (!categoryHasServices) {
      navigation.navigate('Category', {categoryId: 'all' as ServiceCategoryId, title: 'All Services'});
      return;
    }
    navigation.navigate('Category', {categoryId: slide.categoryId, title: slide.categoryTitle});
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchServices(), fetchAppContent()]);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {menuVisible ? (

        <Animated.View style={[styles.menuOverlay, {opacity: drawerOverlayOpacity}]}>
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => closeDrawer()}
          />
          <Animated.View
            style={[styles.menuPanel, {transform: [{translateX: drawerX}]}]}
          
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.menuHeader}>
              <Pressable
                style={({pressed}) => [
                  styles.menuProfileButton,
                  pressed && styles.menuProfileButtonPressed,
                ]}
                onPress={() =>
                  handleMenuPress(() =>
                    user
                      ? navigation.navigate('Main', {screen: 'Profile'})
                      : navigation.navigate('Auth', {screen: 'Login'}),
                  )
                }
              >
                <View style={styles.menuAvatar}>
                  {profilePhotoUri ? (
                    <Image
                      source={{uri: profilePhotoUri}}
                      style={styles.menuAvatarImage}
                    />
                  ) : (
                    <Text style={styles.menuAvatarText}>
                      {user?.name?.slice(0, 1) || 'U'}
                    </Text>
                  )}
                </View>
                <View style={styles.menuUserCopy}>
                  <View style={styles.menuNameRow}>
                    <Text style={styles.menuName}>
                      {user?.name || 'Guest mode'}
                    </Text>
                    {isGuest && (
                      <View style={styles.guestPill}>
                        <Text style={styles.guestPillText}>Guest</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.menuEmail}>
                    {user?.email || 'Login to book services and place orders'}
                  </Text>
                </View>
              </Pressable>
              <Pressable style={styles.menuClose} onPress={() => closeDrawer()}>
                <X color="#0b1c30" size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={styles.menuDivider} />

            {menuItems.map(item => (
              <Pressable
                key={item.label}
                style={({pressed}) => [
                  styles.menuItem,
                  item.label.includes('Account') && styles.menuItemDanger,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => handleMenuPress(item.onPress)}
              >
                <View style={styles.menuItemIcon}>
                  <item.Icon color={item.label.includes('Account') ? '#ba1a1a' : '#0b1c30'} size={18} strokeWidth={2.2} />
                </View>
                <Text style={[styles.menuItemText, item.label.includes('Account') && styles.menuItemDangerText]}>{item.label}</Text>
                <ChevronRight color="#76777d" size={18} strokeWidth={2.2} />
              </Pressable>
            ))}
          </Animated.View>
        </Animated.View>
      ) : null}

      {deleteModalVisible ? (
      <Modal
        visible
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDeleteModal}>
        <Pressable style={styles.deleteOverlay} onPress={closeDeleteModal}>
          <Pressable style={styles.deleteDialog} onPress={event => event.stopPropagation()}>
            <View style={styles.deleteIconWrap}>
              <Trash2 color="#ba1a1a" size={25} strokeWidth={2.3} />
            </View>
            <Text style={styles.deleteTitle}>Delete account permanently?</Text>
            <Text style={styles.deleteMessage}>
              This will permanently delete your profile, bookings, store orders,
              addresses, reviews, complaints, wallet balance, and reward points.
              This action cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <Pressable disabled={deletingAccount} style={({pressed}) => [styles.deleteCancelButton, pressed && styles.pressed]} onPress={closeDeleteModal}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </Pressable>
              <Pressable disabled={deletingAccount} style={({pressed}) => [styles.deleteConfirmButton, deletingAccount && styles.deleteButtonDisabled, pressed && styles.pressed]} onPress={deleteAccount}>
                {deletingAccount ? <ActivityIndicator color="#ffffff" size="small" /> : null}
                <Text style={styles.deleteConfirmText}>{deletingAccount ? 'Deleting...' : 'Yes, Delete'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}
      <Modal
        visible={deleteSuccessVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => void finishDeletedAccount()}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteDialog}>
            <View style={styles.deleteSuccessIconWrap}>
              <CheckCircle2 color="#ffffff" size={28} strokeWidth={2.6} />
            </View>
            <Text style={styles.deleteTitle}>Account deleted</Text>
            <Text style={styles.deleteMessage}>
              Your UstaadPro account and associated information have been
              permanently deleted.
            </Text>
            <Pressable style={({pressed}) => [styles.deleteContinueButton, pressed && styles.pressed]} onPress={() => void finishDeletedAccount()}>
              <Text style={styles.deleteConfirmText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable
          style={styles.filterOverlay}
          onPress={() => setFilterVisible(false)}
        >
          <Pressable style={styles.filterSheet} onPress={event => event.stopPropagation()}>
            <View style={styles.filterSheetHeader}>
              <View>
                <Text style={styles.filterEyebrow}>Refine services</Text>
                <Text style={styles.filterTitle}>Filters</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close filters"
                style={styles.filterCloseButton}
                onPress={() => setFilterVisible(false)}
              >
                <X color="#0b1c30" size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            <Text style={styles.filterGroupTitle}>Category</Text>
            <View style={styles.filterChipWrap}>
              {[{id: 'all', title: 'All Services'}, ...categories].map(item => {
                const isActive = selectedCategoryId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setSelectedCategoryId(item.id)}>
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterGroupTitle}>Sort by</Text>
            <View style={styles.filterOptionList}>
              {[
                {id: 'default', label: 'Default order'},
                {id: 'priceLow', label: 'Price: low to high'},
                {id: 'priceHigh', label: 'Price: high to low'},
                {id: 'rating', label: 'Highest rated'},
              ].map(item => {
                const isActive = sortOption === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.filterOption, isActive && styles.filterOptionActive]}
                    onPress={() => setSortOption(item.id as SortOption)}>
                    <Text style={[styles.filterOptionText, isActive && styles.filterOptionTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.filterActions}>
              <Pressable
                style={styles.clearFilterButton}
                onPress={() => {
                  setSelectedCategoryId('all');
                  setSortOption('default');
                }}
              >
                <Text style={styles.clearFilterText}>Clear</Text>
              </Pressable>
              <Pressable
                style={styles.applyFilterButton}
                onPress={() => {
                  setFilterVisible(false);
                  requestAnimationFrame(() => {
                    homeScrollRef.current?.scrollTo({y: 0, animated: false});
                  });
                }}
              >
                <Text style={styles.applyFilterText}>
                  Show {filteredServices.length} service
                  {filteredServices.length === 1 ? '' : 's'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          style={({pressed}) => [styles.menuBtn, pressed && styles.pressed]}
          onPress={openDrawer}
        >
          <Menu color="#0b1c30" size={22} strokeWidth={2.2} />
        </Pressable>
        <Pressable 
          style={({pressed}) => [styles.locationField, pressed && {opacity: 0.7}]}
          onPress={() => setLocationPromptVisible(true)}
        >
          <View style={styles.locationIconBubble}>
            <MapPin color="#006c49" size={15} strokeWidth={2.5} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel} numberOfLines={1}>
              {isGuest ? 'Guest Location' : 'Current Location'}
            </Text>
            <Text style={styles.locationText} numberOfLines={2}>
              {currentLocationText}
            </Text>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <NotificationCenter />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={user ? 'Open profile' : 'Login'}
            style={({pressed}) => [styles.avatar, pressed && styles.pressed]}
            onPress={() =>
              user
                ? navigation.navigate('Main', {screen: 'Profile'})
                : navigation.navigate('Auth', {screen: 'Login'})
            }
          >
            {profilePhotoUri ? (
              <Image
                source={{uri: profilePhotoUri}}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.slice(0, 1) || 'U'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        key={`home-content-${homeContentVersion}`}
        ref={homeScrollRef}
        style={{flex: 1}}
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
        {/* â”€â”€ Search â”€â”€ */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search color="#76777d" size={18} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for home services..."
              placeholderTextColor="#76777d"
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={() => setSearchQuery('')}
              >
                <XCircle color="#76777d" size={18} strokeWidth={2.2} />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            style={({pressed}) => [styles.filterBtn, pressed && styles.pressed]}
            onPress={() => setFilterVisible(true)}
          >
            <SlidersHorizontal color="#ffffff" size={18} strokeWidth={2.2} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* â”€â”€ Flash Sale Banner â”€â”€ */}
        {!(normalizedSearch || activeFilterCount > 0) && (
          <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${banner.categoryTitle}`}
          onPress={() => openBanner(banner)}
          style={({pressed}) => pressed && styles.bannerPressed}
        >
          <LinearGradient
            colors={['#006C49', '#006C49'] as [string, string]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.banner}
          >
            <View style={styles.bannerLeft}>
              <View style={styles.flashBadge}>
                <Text style={styles.flashBadgeText}>{banner.badge}</Text>
              </View>
              <Text style={styles.bannerTitle} numberOfLines={2}>
                {banner.title}
              </Text>
              <Text style={styles.bannerSubtitle} numberOfLines={2}>
                {banner.subtitle}
              </Text>
              <Pressable
                style={styles.bannerBtn}
                onPress={() => openBanner(banner)}
              >
                <Text style={styles.bannerBtnText}>{banner.buttonLabel}</Text>
              </Pressable>
            </View>
            <View style={styles.bannerImageBox}>
              {slides.map((slide, slideIndex) =>
                slide.imageUrl ? (
                  <Svg
                    key={slide.id || `banner-image-${slideIndex}`}
                    width="100%"
                    height="100%"
                    pointerEvents="none"
                    style={[
                      styles.bannerImage,
                      {opacity: slideIndex === activeSlide ? 1 : 0},
                    ]}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="xMidYMid slice">
                    <Defs>
                      <ClipPath id={`bannerImageCurveClip-${slideIndex}`}>
                        <Path d="M0 0 H100 V100 H0 C20 76 20 24 0 0 Z" />
                      </ClipPath>
                    </Defs>
                    <SvgImage
                      href={{uri: slide.imageUrl}}
                      width="100"
                      height="100"
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#bannerImageCurveClip-${slideIndex})`}
                    />
                  </Svg>
                ) : null,
              )}
              {!banner.imageUrl ? (
                <Text style={styles.bannerImagePlaceholder}>
                  {banner.visual}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show next banner"
              style={styles.nextSlideBtn}
              onPress={event => {
                event.stopPropagation();
                handleNextSlide();
              }}
            >
              <ChevronRight color="#ffffff" size={18} strokeWidth={2.6} />
            </Pressable>
          </LinearGradient>
        </Pressable>

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {slides.map((slide, slideIndex) => (
            <Pressable
              key={`${slide.id || 'slide'}-${slideIndex}`}
              accessibilityRole="button"
              accessibilityLabel={`Show banner ${slideIndex + 1}`}
              onPress={() => setActiveSlide(slideIndex)}
              style={[
                styles.dot,
                slideIndex === activeSlide && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* â”€â”€ Instant Services â”€â”€ */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View all services"
            style={({pressed}) => [
              styles.viewAllRow,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              navigation.navigate('Category', {
                categoryId: 'all',
                title: 'All Services',
              })
            }
          >
            <Text style={styles.viewAllText}>See All</Text>
            <ChevronRight color="#006c49" size={16} />
          </Pressable>
        </View>

        <View style={styles.categoryGrid}>
          {instantServices.slice(0, 8).map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${item.label} services`}
              style={({pressed}) => [
                styles.categoryCard,
                {width: instantServiceChipWidth},
                pressed && styles.categoryCardPressed,
              ]}
              onPress={() =>
                navigation.navigate('Category', {
                  categoryId: item.id as ServiceCategoryId,
                  title: item.label,
                })
              }
            >
              <View style={styles.categoryImageFrame}>
                {item.imageUrl ? (
                  <Image source={{uri: item.imageUrl}} style={styles.categoryImage} />
                ) : (
                  <View style={[styles.categoryIconFallback, {backgroundColor: item.color + '18'}]}>
                    <item.Icon color={item.color} size={27} strokeWidth={2.1} />
                  </View>
                )}
              </View>
              <Text style={styles.chipLabel} numberOfLines={2}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {quickServices.length > 0 && (
          <View style={styles.quickSection}>
            <View style={styles.quickHeader}>
              <View>
                <Text style={styles.quickTitle}>Quick Services</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="View all services" style={({pressed}) => [styles.viewAllRow, pressed && styles.pressed]} onPress={() => navigation.navigate('Category', {categoryId: 'all-subcategories' as ServiceCategoryId, title: 'Quick Services'})}>
                <Text style={styles.viewAllText}>View All</Text>
                <ChevronRight color="#006c49" size={16} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScrollContent}>
              {quickServices.map(item => (
                <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Explore ' + item.title} style={({pressed}) => [styles.quickCard, pressed && styles.categoryCardPressed]} onPress={() => navigation.navigate('Category', {categoryId: item.id as ServiceCategoryId, title: item.title, showServices: true})}>
                  <View style={styles.quickImageWrap}>
                    {item.imageUrl ? <Image source={{uri: item.imageUrl}} style={styles.quickImage} /> : <Layers color="#006c49" size={25} />}
                  </View>
                  <Text style={styles.quickCardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.quickCardMeta} numberOfLines={1}>{item.categoryTitle} ? {item.serviceCount} service{item.serviceCount === 1 ? '' : 's'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

          </>
        )}

        {(normalizedSearch || activeFilterCount > 0) && (
          <View style={styles.servicesHeader}>
            <Text style={styles.sectionTitle2}>Filtered Services</Text>
            <Text style={styles.resultCount}>{filteredServices.length} found</Text>
          </View>
        )}
        {(normalizedSearch || activeFilterCount > 0) && filteredServices.map(service => (
          <Pressable
            key={service.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${service.title}`}
            style={({pressed}) => [styles.serviceCard, pressed && styles.serviceCardPressed]}
            onPress={() => navigation.navigate('Detail', {serviceId: service.id})}>
            <View style={styles.serviceThumb}>
              {service.imageUrl ? (
                <Image source={{uri: service.imageUrl}} style={styles.serviceThumbImage} />
              ) : (
                <Wrench color="#006c49" size={25} strokeWidth={2} />
              )}
            </View>
            <View style={styles.serviceBody}>
              <Text style={styles.serviceName} numberOfLines={2}>{service.title}</Text>
              <Text style={styles.serviceDesc} numberOfLines={1}>{service.description}</Text>
              <View style={styles.resultPriceRow}>
                <View>
                  <Text style={styles.resultPriceLabel}>Starting from</Text>
                  <Text style={styles.servicePrice}>{formatPkr(service.price)}</Text>
                </View>
                <View style={styles.resultArrow}>
                  <ChevronRight color="#ffffff" size={17} strokeWidth={2.6} />
                </View>
              </View>
            </View>
          </Pressable>
        ))}
        {(normalizedSearch || activeFilterCount > 0) && filteredServices.length === 0 && (
          <View style={styles.noResultsCard}>
            <View style={styles.noResultsIcon}>
              <Search color="#006c49" size={24} strokeWidth={2} />
            </View>
            <Text style={styles.noResultsTitle}>No services found</Text>
            <Text style={styles.noResultsText}>Try another service name or clear the selected filters.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  container: {flex: 1},
  content: {paddingBottom: 36},

  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.28)',
    alignItems: 'flex-start',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuPanel: {
    width: 304,
    height: '100%',
    borderTopRightRadius: rounded.xl,
    borderBottomRightRadius: rounded.xl,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 22,
    elevation: 18,
    shadowColor: '#0b1c30',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 14},
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  menuProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: rounded.default,
    paddingVertical: 4,
    paddingRight: 8,
  },
  menuProfileButtonPressed: {
    backgroundColor: '#f8f9ff',
  },
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: rounded.full,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  menuAvatarImage: {
    width: '100%',
    height: '100%',
  },
  menuAvatarText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 16,
  },
  menuUserCopy: {
    flex: 1,
  },
  menuNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuName: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 14,
  },
  guestPill: {
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  guestPillText: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 10,
  },
  menuEmail: {
    marginTop: 2,
    fontFamily: fontFamily.regular,
    color: '#76777d',
    fontSize: 11,
  },
  menuClose: {
    width: 34,
    height: 34,
    borderRadius: rounded.full,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5eeff',
    marginVertical: 12,
  },
  menuItem: {
    minHeight: 48,
    borderRadius: rounded.default,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },
  menuItemPressed: {
    backgroundColor: '#eff4ff',
  },
  menuItemDanger: {backgroundColor: '#fff5f5', marginTop: 6},
  menuItemDangerText: {color: '#ba1a1a'},
  deleteOverlay: {flex: 1, backgroundColor: 'rgba(11,28,48,0.56)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22},
  deleteDialog: {width: '100%', maxWidth: 390, borderRadius: 24, backgroundColor: '#ffffff', padding: 22, elevation: 18, shadowColor: '#0b1c30', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: {width: 0, height: 12}},
  deleteIconWrap: {width: 50, height: 50, borderRadius: 25, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  deleteTitle: {fontFamily: fontFamily.extraBold, fontWeight: '900', color: '#0b1c30', fontSize: 20},
  deleteMessage: {fontFamily: fontFamily.regular, color: '#5f6470', fontSize: 13.5, lineHeight: 20, marginTop: 8},
  deleteActions: {flexDirection: 'row', gap: 10, marginTop: 22},
  deleteCancelButton: {flex: 1, height: 48, borderRadius: 13, borderWidth: 1, borderColor: '#d7dbe4', alignItems: 'center', justifyContent: 'center'},
  deleteCancelText: {fontFamily: fontFamily.bold, color: '#0b1c30', fontSize: 14},
  deleteConfirmButton: {flex: 1.25, height: 48, borderRadius: 13, backgroundColor: '#ba1a1a', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center'},
  deleteConfirmText: {fontFamily: fontFamily.bold, color: '#ffffff', fontSize: 14},
  deleteButtonDisabled: {opacity: 0.7},
  deleteSuccessIconWrap: {width: 54, height: 54, borderRadius: 27, backgroundColor: '#006c49', alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  deleteContinueButton: {height: 48, marginTop: 22, borderRadius: 13, backgroundColor: '#006c49', alignItems: 'center', justifyContent: 'center'},
  menuItemIcon: {
    width: 34,
    height: 34,
    borderRadius: rounded.default,
    backgroundColor: '#f8f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 13,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bg,
    zIndex: 10,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: rounded.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  bannerPressed: {
    opacity: 0.94,
  },
  locationField: {
    flex: 1,
    minHeight: 48,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: '#d7efe7',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginHorizontal: 6,
    shadowColor: '#092318',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  locationIconBubble: {
    width: 28,
    height: 28,
    borderRadius: rounded.full,
    backgroundColor: '#e9f8f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationLabel: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 9,
    marginBottom: 1,
  },
  locationText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 11.5,
    lineHeight: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: rounded.full,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 16,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: rounded.default,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchIcon: {marginRight: 10},
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0b1c30',
    fontFamily: fontFamily.regular,
    padding: 0,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: rounded.default,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#006c49',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 10,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.42)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  filterEyebrow: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  filterTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 22,
    marginTop: 3,
  },
  filterCloseButton: {
    width: 38,
    height: 38,
    borderRadius: rounded.full,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterGroupTitle: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 14,
    marginBottom: 10,
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 18,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#0b1c30',
    borderColor: '#0b1c30',
  },
  filterChipText: {
    fontFamily: fontFamily.bold,
    color: '#45464d',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterOptionList: {
    gap: 8,
  },
  filterOption: {
    minHeight: 44,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#e5eeff',
    backgroundColor: '#f8f9ff',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  filterOptionActive: {
    borderColor: '#006c49',
    backgroundColor: '#effcf6',
  },
  filterOptionText: {
    fontFamily: fontFamily.bold,
    color: '#45464d',
    fontSize: 13,
  },
  filterOptionTextActive: {
    color: '#006c49',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  clearFilterButton: {
    flex: 0.42,
    height: 48,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFilterText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 14,
  },
  applyFilterButton: {
    flex: 1,
    height: 48,
    borderRadius: rounded.default,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 14,
  },

  // Flash Sale Banner
  banner: {
    marginHorizontal: 16,
    borderRadius: rounded.xl,
    padding: 14,
    flexDirection: 'row',
    minHeight: 168,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerLeft: {
    // Keep all copy clear of the image curve on narrow phones.
    width: '45%',
    zIndex: 1,
  },
  flashBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#006c49',
    borderRadius: rounded.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  flashBadgeText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 10,
  },
  bannerTitle: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10.5,
    lineHeight: 14,
    marginBottom: 7,
  },
  bannerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#006c49',
    borderRadius: rounded.full,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  bannerBtnText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 12,
  },
  bannerImageBox: {
    position: 'absolute',
    // One-pixel bleed prevents device-scale rounding from exposing gaps.
    right: -1,
    top: -1,
    bottom: -1,
    width: '49%',
    backgroundColor: '#006C49',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  bannerImagePlaceholder: {
    fontFamily: fontFamily.bold,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 24,
  },
  nextSlideBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: rounded.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c6c6cd',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#0b1c30',
  },

  // Section Header
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    fontSize: 21,
    color: '#0b1c30',
  },
  sectionTitle2: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    fontSize: 21,
    color: '#0b1c30',
  },
  servicesHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultCount: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
    fontSize: 12,
  },
  noResultsCard: {
    minHeight: 168,
    marginHorizontal: 16,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  noResultsIcon: {
    width: 52,
    height: 52,
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  noResultsTitle: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: '#0b1c30',
    fontSize: 18,
  },
  noResultsText: {
    marginTop: 4,
    fontFamily: fontFamily.regular,
    color: '#76777d',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  viewAllRow: {flexDirection: 'row', alignItems: 'center', gap: 2},
  viewAllText: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 13,
    color: '#006c49',
  },

  // Instant Service Chips
  chipRow: {
    paddingHorizontal: 16,
    paddingRight: 24,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    rowGap: 8,
    marginBottom: 20,
  },
  categoryCard: {
    minHeight: 78,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDF0F5',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 7,
    paddingHorizontal: 3,
  },
  categoryCardPressed: {
    opacity: 0.82,
    transform: [{scale: 0.96}],
  },
  categoryImageFrame: {
    width: 42,
    height: 42,
    borderRadius: 13,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  categoryIconFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  chipIcon: {
    width: 62,
    height: 62,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipImage: {width: '100%', height: '100%', borderRadius: rounded.full},
  chipLabel: {
    marginTop: 5,
    paddingHorizontal: 1,
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    fontSize: 10,
    lineHeight: 12,
    color: '#172033',
    textAlign: 'center',
  },

  quickSection: {marginTop: 2, marginBottom: 20},
  quickHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12},
  quickTitle: {fontFamily: fontFamily.extraBold, fontWeight: '900', fontSize: 21, color: '#0b1c30'},
  quickScrollContent: {paddingHorizontal: 16, paddingRight: 30, gap: 12},
  quickCard: {width: 148, padding: 8, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8ECF2', shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: {width: 0, height: 4}, elevation: 2},
  quickImageWrap: {height: 88, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EFF8F4', alignItems: 'center', justifyContent: 'center'},
  quickImage: {width: '100%', height: '100%'},
  quickCardTitle: {fontFamily: fontFamily.bold, fontSize: 13, lineHeight: 17, color: '#172033', marginTop: 9, minHeight: 34},
  quickCardMeta: {fontFamily: fontFamily.regular, fontSize: 10, color: '#667085', marginTop: 3},

  // Service Cards
  serviceName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    lineHeight: 19,
    color: '#0b1c30',
  },
  serviceDesc: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#76777d',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5eeff',
    elevation: 2,
    shadowColor: '#0b1c30',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  serviceCardPressed: {opacity: 0.88, transform: [{scale: 0.985}]},
  serviceThumb: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#eff8f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceThumbImage: {width: '100%', height: '100%'},
  serviceHero: {
    height: 128,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  serviceHeroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  heroOverlayChip: {
    position: 'absolute',
    left: 10,
    bottom: 7,
    maxWidth: '86%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: rounded.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#0b1c30',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  heroOverlayText: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: '#006c49',
    fontSize: 12,
  },
  serviceBody: {flex: 1, paddingLeft: 12},
  serviceDescription: {
    fontFamily: fontFamily.medium,
    fontSize: 13.5,
    color: '#45464d',
    lineHeight: 18,
    marginBottom: 6,
  },
  startsFrom: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: '#76777d',
    marginBottom: 0,
  },
  priceBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  servicePrice: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    fontSize: 17,
    color: '#0b1c30',
  },
  resultPriceRow: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 7},
  resultPriceLabel: {fontFamily: fontFamily.medium, fontSize: 9.5, color: '#76777d', marginBottom: 1},
  resultArrow: {width: 30, height: 30, borderRadius: 15, backgroundColor: '#006c49', alignItems: 'center', justifyContent: 'center'},
  bookBtn: {
    backgroundColor: '#0b1c30',
    borderRadius: rounded.default,
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  bookBtnText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 12,
  },
});




