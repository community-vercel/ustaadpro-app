import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
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
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {formatPkr} from '@/utils/currency';
import {rounded} from '@/theme/layout';
import {HomeSlide, ServiceCategory, ServiceCategoryId} from '@/types/models';
import {NotificationCenter} from '@/components/NotificationCenter';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SortOption = 'default' | 'priceLow' | 'priceHigh' | 'rating';
const PROFILE_PHOTO_KEY_PREFIX = 'profile_photo_uri';

function profilePhotoKey(user?: {email?: string; phone?: string} | null) {
  const ownerKey = user?.email || user?.phone;
  return ownerKey
    ? `${PROFILE_PHOTO_KEY_PREFIX}:${ownerKey.toLowerCase()}`
    : null;
}

const INSTANT_SERVICES = [
  {id: 'electrician', label: 'Electrician', Icon: Zap, color: '#F59E0B'},
  {id: 'plumbers', label: 'Plumbers', Icon: Wrench, color: '#0891B2'},
  {id: 'home-cleaning', label: 'Home Cleaning', Icon: Sparkles, color: '#006c49'},
  {id: 'ac-services', label: 'AC Services', Icon: Wind, color: '#4F46E5'},
  {id: 'dry-cleaning', label: 'Dry Cleaning', Icon: PaintBucket, color: '#DB2777'},
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const drawerX = useRef(new Animated.Value(-320)).current;
  const {width: viewportWidth} = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = homeSlides.length ? homeSlides : FALLBACK_HEADER_SLIDES;
  const instantServiceChipWidth = Math.max(86, (viewportWidth - 32) / 3);
  const currentLocationText =
    savedServiceLocation?.address || 'Set your current location';
  const banner = slides[activeSlide] || slides[0];
  const instantServices = categories.length
    ? categories.map(category => ({
        id: category.id,
        label: category.title,
        Icon: categoryIcon(category),
        color: category.tint || '#006c49',
      }))
    : INSTANT_SERVICES;
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
        label: 'Cart',
        Icon: ShoppingCart,
        onPress: () => navigation.navigate('Cart'),
      },
      {
        label: 'About Ustaad Pro',
        Icon: Info,
        onPress: () => navigation.navigate('About'),
      },
      {
        label: 'Privacy Policy',
        Icon: FileText,
        onPress: () => navigation.navigate('PrivacyPolicy'),
      },
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
    [logout, navigation, user],
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
    const timer = setInterval(() => {
      setActiveSlide(current => (current + 1) % slides.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const openDrawer = () => {
    drawerX.setValue(-320);
    setMenuVisible(true);
    requestAnimationFrame(() => {
      Animated.timing(drawerX, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
    });
  };

  const closeDrawer = (afterClose?: () => void) => {
    Animated.timing(drawerX, {
      toValue: -320,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
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
    navigation.navigate('Category', {
      categoryId: slide.categoryId,
      title: slide.categoryTitle,
    });
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
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => closeDrawer()}
      >
        <Pressable style={styles.menuOverlay} onPress={() => closeDrawer()}>
          <Animated.View
            style={[styles.menuPanel, {transform: [{translateX: drawerX}]}]}
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
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => handleMenuPress(item.onPress)}
              >
                <View style={styles.menuItemIcon}>
                  <item.Icon color="#0b1c30" size={18} strokeWidth={2.2} />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
                <ChevronRight color="#76777d" size={18} strokeWidth={2.2} />
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
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
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedCategoryId(item.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}
                    >
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
                    style={[
                      styles.filterOption,
                      isActive && styles.filterOptionActive,
                    ]}
                    onPress={() => setSortOption(item.id as SortOption)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        isActive && styles.filterOptionTextActive,
                      ]}
                    >
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
                onPress={() => setFilterVisible(false)}
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

      <ScrollView
        style={styles.container}
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
        {/* â”€â”€ Header â”€â”€ */}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${banner.categoryTitle}`}
          onPress={() => openBanner(banner)}
          style={({pressed}) => pressed && styles.bannerPressed}
        >
          <LinearGradient
            colors={
              [banner.primaryColor, banner.secondaryColor] as [string, string]
            }
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
              {banner.imageUrl ? (
                <Image
                  source={{uri: banner.imageUrl}}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.bannerImagePlaceholder}>
                  {banner.visual}
                </Text>
              )}
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
              key={slide.title}
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
          <Text style={styles.sectionTitle}>Instant Services</Text>
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
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight color="#006c49" size={16} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {instantServices.map(item => (
            <Pressable
              key={item.id}
              style={[styles.chip, {width: instantServiceChipWidth}]}
              onPress={() =>
                navigation.navigate('Category', {
                  categoryId: item.id as ServiceCategoryId,
                  title: item.label,
                })
              }
            >
              <View
                style={[styles.chipIcon, {backgroundColor: item.color + '18'}]}
              >
                <item.Icon color={item.color} size={25} strokeWidth={2.1} />
              </View>
              <Text style={styles.chipLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* â”€â”€ Our Services â”€â”€ */}
        <View style={styles.servicesHeader}>
          <Text style={styles.sectionTitle2}>
            {normalizedSearch || activeFilterCount ? 'Filtered Services' : 'Our Services'}
          </Text>
          {(normalizedSearch || activeFilterCount > 0) && (
            <Text style={styles.resultCount}>
              {filteredServices.length} found
            </Text>
          )}
        </View>

        {filteredServices.length === 0 && (normalizedSearch || activeFilterCount) ? (
          <View style={styles.noResultsCard}>
            <View style={styles.noResultsIcon}>
              <Search color="#006c49" size={24} strokeWidth={2.2} />
            </View>
            <Text style={styles.noResultsTitle}>No result found</Text>
            <Text style={styles.noResultsText}>
              Try another service name like AC, plumbing, cleaning, geyser,
              sofa, or water tank.
            </Text>
          </View>
        ) : null}

        {filteredServices.map(service => (
          <Pressable
            key={service.id}
            style={styles.serviceCard}
            onPress={() =>
              navigation.navigate('Detail', {serviceId: service.id})
            }
          >
            {/* Service image / hero band */}
            <View
              style={[
                styles.serviceHero,
                {
                  backgroundColor:
                    service.categoryId === 'home-cleaning' ||
                    service.categoryId === 'dry-cleaning' ||
                    service.categoryId === 'cleaning'
                      ? '#e5eeff'
                      : service.categoryId === 'ac-services' ||
                          service.categoryId === 'home'
                        ? '#dce9ff'
                        : '#d3e4fe',
                },
              ]}
            >
              {service.imageUrl ? (
                <Image
                  source={{uri: service.imageUrl}}
                  style={styles.serviceHeroImage}
                  resizeMode="cover"
                />
              ) : null}

              <View style={styles.heroOverlayChip}>
                <Text style={styles.heroOverlayText} numberOfLines={1}>
                  {service.title}
                </Text>
              </View>
            </View>

            {/* Card body */}
            <View style={styles.serviceBody}>
              <Text style={styles.serviceDescription} numberOfLines={1}>
                {service.description}
              </Text>

              <Text style={styles.startsFrom}>
                {service.categoryId === 'subscriptions'
                  ? 'From'
                  : service.serviceType || 'Standard Visit'}
              </Text>

              <View style={styles.priceBookRow}>
                <Text style={styles.servicePrice}>
                  {formatPkr(service.price)}
                </Text>
                <Pressable
                  style={styles.bookBtn}
                  onPress={() =>
                    navigation.navigate('Detail', {serviceId: service.id})
                  }
                >
                  <Text style={styles.bookBtnText}>Book Service</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* â”€â”€ Bottom Tab placeholder line â”€â”€ */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.bg},
  container: {flex: 1},
  content: {paddingBottom: 36},

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.28)',
    alignItems: 'flex-start',
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
    height: 128,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerLeft: {
    flex: 1, 
    paddingRight: 96
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
    right: 14,
    top: 14,
    bottom: 14,
    width: 88,
    borderRadius: rounded.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  bannerImage: {
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
    marginTop: 14,
    marginBottom: 10,
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
  chipLabel: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 12.5,
    color: '#0b1c30',
    textAlign: 'center',
  },

  // Service Cards
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    marginHorizontal: 16,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5eeff',
    elevation: 4,
    shadowColor: '#0b1c30',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
  },
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
  serviceBody: {padding: 13, paddingTop: 11},
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




