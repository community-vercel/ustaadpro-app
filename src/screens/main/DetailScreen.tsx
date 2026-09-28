import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Asset,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Phone,
  Star,
  Clock,
  Camera,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { RootStackParamList } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { fontFamily } from '@/theme/typography';
import { formatPkr } from '@/utils/currency';
import { rounded } from '@/theme/layout';
import { ServiceReview } from '@/types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

export function DetailScreen({ navigation, route }: Props): React.JSX.Element {
  const appSettings = useAppStore(state => state.appSettings);
  const services = useAppStore(state => state.services);
  const subcategories = useAppStore(state => state.subcategories);
  const fetchAppContent = useAppStore(state => state.fetchAppContent);
  const fetchServices = useAppStore(state => state.fetchServices);
  const fetchServiceReviews = useAppStore(state => state.fetchServiceReviews);
  const user = useAppStore(state => state.user);
  const addToCart = useAppStore(state => state.addToCart);
  const service = services.find(item => item.id === route.params.serviceId);
  const [selectedWorkIds, setSelectedWorkIds] = useState<number[]>(
    route.params.selectedWorkId !== undefined ? [route.params.selectedWorkId] : [0]
  );
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhotos, setIssuePhotos] = useState<Asset[]>([]);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [areaSqft, setAreaSqft] = useState('');
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  // Full-screen texture preview (zoom-style modal) for the selected design.
  const [previewImage, setPreviewImage] = useState('');

  const promptLogin = () => {
    setLoginPromptVisible(true);
  };

  const goToLogin = () => {
    setLoginPromptVisible(false);
    navigation.navigate('Auth', { screen: 'Login' });
  };

  useEffect(() => {
    if (!services.length) {
      fetchServices();
    }
    void fetchAppContent();
  }, [fetchAppContent, fetchServices, services.length]);

  // Keep service data fresh so admin edits (pricing mode, works, prices)
  // appear the next time this screen is opened.
  useEffect(() => {
    void fetchServices();
  }, [fetchServices, route.params.serviceId]);

  useEffect(() => {
    void fetchServiceReviews(route.params.serviceId).then(setReviews);
  }, [fetchServiceReviews, route.params.serviceId]);

  // Texture designs carry real work-price ids, but the parent card in the
  // category list opens this screen with selectedWorkId 0 (or none). Default
  // to the cheapest design so the area box is visible immediately.
  useEffect(() => {
    const works = (service?.workPrices || []).filter(
      work => work.title && Number(work.price) > 0 && work.pricingMode === 'per_sqft',
    );
    if (!works.length) {
      return;
    }
    const currentIsReal =
      selectedWorkIds.length === 1 &&
      works.some(work => Number(work.id) === Number(selectedWorkIds[0]));
    if (!currentIsReal) {
      const cheapest = [...works].sort((a, b) => Number(a.price) - Number(b.price))[0];
      setSelectedWorkIds([Number(cheapest.id)]);
    }
  }, [service?.id, service?.workPrices]);

  if (!service) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>
          {services.length ? 'Service not found.' : 'Loading service...'}
        </Text>
      </SafeAreaView>
    );
  }

  const dynamicWorkPrices = (service.workPrices || []).filter(
    work => work.title && Number(work.price) > 0,
  );
  // Area-based services (e.g. "Texture Painting" with unit "Per sq. ft.")
  // are charged on the area the customer enters, even when the service has
  // no specific work prices configured in the admin. A subcategory marked
  // per-sqft in the admin applies to every service under it.
  const parentSubcategory = subcategories.find(sub => sub.id === service.subcategoryId);
  const serviceIsPerSqft =
    dynamicWorkPrices.length === 0 &&
    (
      /\bper\s*sq/i.test(service.serviceType || '') ||
      service.pricingMode === 'per_sqft' ||
      parentSubcategory?.pricingMode === 'per_sqft'
    );
  const specificWorks = dynamicWorkPrices.length
    ? dynamicWorkPrices.map((work, index) => ({
      id: Number(work.id ?? index),
      workPriceId: work.id,
      title: work.title,
      subtitle: work.description || 'Professional service',
      imageUrl: work.imageUrl,
      price: Number(work.price),
      pricingMode: work.pricingMode === 'per_sqft' ? 'per_sqft' : 'fixed',
    }))    : [
      {
      id: 0,
      workPriceId: undefined,
      title: service.title,
      subtitle: service.serviceType || 'Standard Visit',
      imageUrl: undefined,
      price: service.price,
      pricingMode: serviceIsPerSqft ? ('per_sqft' as const) : ('fixed' as const),
    },
    ];
  const selectedWorkItems = specificWorks.filter(work => selectedWorkIds.includes(work.id));
  // Texture sub-category mode: the service's designs are area-based, so the
  // picker is titled "Select Texture Sub-Category" instead of generic works.
  const isTextureDesignService =
    dynamicWorkPrices.length > 0 &&
    dynamicWorkPrices.every(work => work.pricingMode === 'per_sqft');

  // Per-sqft designs (e.g. Wall Texture Design A/B/C): customer enters the
  // area size and the total = rate × area. Design work is scheduled at least
  // two days before the appointment.
  const bookingAreaNumber =
    Math.round((Number(String(areaSqft).replace(/[^\d.]/g, '')) || 0) * 100) / 100;
  const selectedPerSqftWorks = selectedWorkItems.filter(
    work => work.pricingMode === 'per_sqft',
  );
  const selectedFixedWorks = selectedWorkItems.filter(
    work => work.pricingMode !== 'per_sqft',
  );
  const areaPricingRequired = selectedPerSqftWorks.length > 0;
  const perSqftRateSum =
    Math.round(
      selectedPerSqftWorks.reduce(
        (sum, work) => sum + Number(work.price || 0),
        0,
      ) * 100,
    ) / 100;
  const estimatedTotal =
    Math.round(
      selectedWorkItems.reduce(
        (sum, work) =>
          sum +
          (work.pricingMode === 'per_sqft'
            ? Number(work.price) * bookingAreaNumber
            : Number(work.price)),
        0,
      ) * 100,
    ) / 100;

  const serviceDetails = service.details?.length ? service.details : [];
  const visibleReviews = reviews.slice(0, 2);
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
    : 0;
  const ratingBadgeText = reviewCount
    ? `${averageRating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'
    })`
    : 'No reviews yet';
  const getReviewCustomerName = (review: ServiceReview) =>
    review.customerName?.trim() || 'UstaadPro customer';
  const formatReviewDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSupportCall = async () => {
    const supportPhone = appSettings.supportPhone?.trim();

    if (!supportPhone) {
      Alert.alert('Support unavailable', 'Support phone number is not set.');
      return;
    }

    const dialUrl = `tel:${supportPhone.replace(/[^\d+]/g, '')}`;
    const canOpen = await Linking.canOpenURL(dialUrl);

    if (!canOpen) {
      Alert.alert(
        'Cannot place call',
        `Please call Ustaad Pro support at ${supportPhone}.`,
      );
      return;
    }

    await Linking.openURL(dialUrl);
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
      message: 'Ustaad Pro uses your camera to attach issue photos.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const addPickedPhotos = (assets?: Asset[]) => {
    const pickedAssets = (assets || []).filter(asset => Boolean(asset.uri));

    if (!pickedAssets.length) {
      return;
    }

    setIssuePhotos(current => [...current, ...pickedAssets].slice(0, 4));
  };

  const pickFromGallery = async () => {
    setPhotoPickerVisible(false);

    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: Math.max(1, 4 - issuePhotos.length),
    });

    if (result.didCancel) {
      return;
    }

    if (result.errorCode) {
      Alert.alert(
        'Upload failed',
        result.errorMessage || 'Could not open your photo library.',
      );
      return;
    }

    addPickedPhotos(result.assets);
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera permission to take a live photo.',
      );
      return;
    }

    setPhotoPickerVisible(false);

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
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

    addPickedPhotos(result.assets);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <Pressable
          style={styles.photoPickerOverlay}
          onPress={() => setPhotoPickerVisible(false)}
        >
          <Pressable style={styles.photoPickerCard}>
            <Text style={styles.photoPickerTitle}>Add issue photo</Text>
            <Text style={styles.photoPickerText}>
              Choose a photo from gallery or take a live camera photo.
            </Text>
            <View style={styles.photoPickerActions}>
              <Pressable style={styles.photoPickerButton} onPress={takePhoto}>
                <Camera color="#ffffff" size={18} />
                <Text style={styles.photoPickerButtonText}>Camera</Text>
              </Pressable>
              <Pressable
                style={styles.photoPickerSecondaryButton}
                onPress={pickFromGallery}
              >
                <Text style={styles.photoPickerSecondaryText}>Gallery</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={loginPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLoginPromptVisible(false)}
      >
        <Pressable
          style={styles.loginPromptOverlay}
          onPress={() => setLoginPromptVisible(false)}
        >
          <Pressable style={styles.loginPromptCard}>
            <View style={styles.loginPromptIcon}>
              <Check color="#0b1c30" size={22} strokeWidth={2.8} />
            </View>
            <Text style={styles.loginPromptTitle}>Login required</Text>
            <Text style={styles.loginPromptText}>
              Please login or create an account to book this service.
            </Text>
            <View style={styles.loginPromptActions}>
              <Pressable
                style={styles.loginPromptSecondaryButton}
                onPress={() => setLoginPromptVisible(false)}
              >
                <Text style={styles.loginPromptSecondaryText}>Not now</Text>
              </Pressable>
              <Pressable style={styles.loginPromptButton} onPress={goToLogin}>
                <Text style={styles.loginPromptButtonText}>Login</Text>
                <ChevronRight color="#ffffff" size={18} strokeWidth={2.6} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0b1c30" size={20} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>{service.title}</Text>
        <Pressable style={styles.iconBtn} onPress={handleSupportCall}>
          <Phone color="#0b1c30" size={20} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroImage, { backgroundColor: '#dce9ff' }]}>
          {service.imageUrl && (
            <Image
              source={{ uri: service.imageUrl }}
              style={styles.heroPhoto}
              resizeMode="cover"
            />
          )}
          {/* Rating Badge */}
          <View style={styles.ratingBadge}>
            <Star
              color="#F59E0B"
              size={14}
              fill={reviewCount ? '#F59E0B' : 'none'}
            />
            <Text style={styles.ratingText}>{ratingBadgeText}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.titlePriceRow}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <View style={styles.priceBlock}>
              <Text style={styles.priceText}>
                {isTextureDesignService && dynamicWorkPrices.length
                  ? `From ${formatPkr(
                      Math.min(
                        ...dynamicWorkPrices.map(work => Number(work.price || 0)),
                      ),
                    )}`
                  : formatPkr(service.price)}
                {isTextureDesignService || serviceIsPerSqft ? ' / sq ft' : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.description}>{service.description}</Text>

          <View style={styles.estimateRow}>
            <Clock color="#006c49" size={16} />
            <Text style={styles.estimateText}>
              {service.serviceType || 'Standard Visit'} - {service.duration}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              {isTextureDesignService
                ? 'Select Texture Sub-Category'
                : 'Select Specific Work'}
            </Text>
            {isTextureDesignService && selectedWorkItems.length > 0 ? (
              <View style={styles.selectionCountChip}>
                <Text style={styles.selectionCountText}>
                  {selectedWorkItems[0].title}
                </Text>
              </View>
            ) : null}
          </View>
          {isTextureDesignService ? (
            <Text style={styles.sectionSubtitle}>
              Choose one texture design — each design has its own rate per
              square feet. Need more than one design? Add it to the cart
              separately.
            </Text>
          ) : null}
          {isTextureDesignService ? (
            <View style={styles.galleryWrap}>
              {/* Featured hero preview of the current selection */}
              <View style={styles.heroPreviewWrap}>
                {(() => {
                  const featuredWork =
                    specificWorks.find(work => work.id === selectedWorkIds[0]) ||
                    specificWorks[0];
                  if (!featuredWork) return null;
                  const featuredSelected = selectedWorkIds.includes(featuredWork.id);
                  return (
                    <>
                      <Pressable onPress={() => setPreviewImage(featuredWork.imageUrl || '')}>
                        {featuredWork.imageUrl ? (
                          <Image
                            source={{uri: featuredWork.imageUrl}}
                            style={styles.heroPreviewImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.heroPreviewImage, styles.designImagePlaceholder]}>
                            <Text style={styles.designImagePlaceholderText}>
                              {featuredWork.title.slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                      {featuredSelected && (
                        <View style={styles.designSelectedBadge}>
                          <Check color="#ffffff" size={13} strokeWidth={3} />
                          <Text style={styles.designSelectedBadgeText}>Selected</Text>
                        </View>
                      )}
                      <View style={styles.heroPreviewInfo}>
                        <View style={{flex: 1, marginRight: 10}}>
                          <Text style={styles.heroPreviewTitle} numberOfLines={1}>
                            {featuredWork.title}
                          </Text>
                          {featuredWork.subtitle ? (
                            <Text style={styles.heroPreviewSubtitle} numberOfLines={1}>
                              {featuredWork.subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.heroPreviewRateBox}>
                          <Text style={styles.heroPreviewRate}>
                            {formatPkr(featuredWork.price)}
                            {featuredWork.pricingMode === 'per_sqft' ? ' / sq ft' : ''}
                          </Text>
                        </View>
                      </View>
                    </>
                  );
                })()}
              </View>

              {/* Thumbnail tiles — tap to select a design */}
              <View style={styles.thumbRow}>
                {specificWorks.map(work => {
                  const thumbSelected = selectedWorkIds.includes(work.id);
                  return (
                    <Pressable
                      key={work.id}
                      style={({pressed}) => [
                        styles.thumbTile,
                        thumbSelected && styles.thumbTileActive,
                        pressed && styles.designCardPressed,
                      ]}
                      onPress={() => {
                        // Single-select: tap a tile to feature and book that
                        // design. Tap the selected tile again to open the
                        // full-screen preview.
                        if (thumbSelected) {
                          setPreviewImage(work.imageUrl || '');
                          return;
                        }
                        setSelectedWorkIds([work.id]);
                      }}>
                      {work.imageUrl ? (
                        <Image
                          source={{uri: work.imageUrl}}
                          style={styles.thumbImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.thumbImage, styles.designImagePlaceholder]}>
                          <Text style={styles.thumbPlaceholderText}>
                            {work.title.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.thumbOverlay}>
                        <Text style={styles.thumbPrice} numberOfLines={1}>
                          {formatPkr(work.price)}
                          {work.pricingMode === 'per_sqft' ? '/sqft' : ''}
                        </Text>
                      </View>
                      {thumbSelected && (
                        <View style={styles.thumbCheck}>
                          <Check color="#ffffff" size={12} strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          {specificWorks.map(work => {
            const isSelected = selectedWorkIds.includes(work.id);
            // Texture designs render as a prominent gallery: the tapped design
            // becomes the featured hero preview at the top, and all designs
            // show as thumbnail tiles below. Other services keep the compact
            // horizontal row layout.
            if (isTextureDesignService) {
              return null;
            }
            return (
              <Pressable
                key={work.id}
                style={[
                  styles.radioCard,
                  isSelected && styles.radioCardActive,
                ]}
                onPress={() => {
                  setSelectedWorkIds(prev => {
                    if (prev.includes(work.id)) {
                      return prev.length > 1 ? prev.filter(id => id !== work.id) : prev;
                    }
                    return [...prev, work.id];
                  });
                }}
              >
                <View
                  style={[
                    styles.radioCircle,
                    isSelected && styles.radioCircleActive,
                  ]}
                >
                  {isSelected && <Check color="#ffffff" size={12} strokeWidth={3} />}
                </View>
                {work.imageUrl ? (
                  <Image
                    source={{ uri: work.imageUrl }}
                    style={styles.radioImage}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={styles.radioContent}>
                  <Text
                    style={[
                      styles.radioTitle,
                      isSelected && styles.radioTitleActive,
                    ]}
                  >
                    {work.title}
                  </Text>
                  <Text style={styles.radioSubtitle}>{work.subtitle}</Text>
                  <Text style={styles.radioPrice}>
                    {formatPkr(work.price)}
                    {work.pricingMode === 'per_sqft' ? ' / sq ft' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {areaPricingRequired ? (
            <View style={styles.areaBox}>
              <Text style={styles.areaBoxTitle}>Area size (square feet)</Text>
              <Text style={styles.areaBoxHint}>
                Enter the total wall area so we can calculate your total.
              </Text>
              <View style={styles.areaInputRow}>
                <TextInput
                  value={areaSqft}
                  onChangeText={setAreaSqft}
                  keyboardType="numeric"
                  placeholder="e.g. 450"
                  placeholderTextColor="#76777d"
                  style={styles.areaInput}
                />
                <Text style={styles.areaUnit}>sq ft</Text>
              </View>
              <View style={styles.areaPresetsRow}>
                {[100, 200, 500, 1000].map(preset => (
                  <Pressable
                    key={preset}
                    style={[
                      styles.areaPresetChip,
                      bookingAreaNumber === preset && styles.areaPresetChipActive,
                    ]}
                    onPress={() => setAreaSqft(String(preset))}
                  >
                    <Text
                      style={[
                        styles.areaPresetText,
                        bookingAreaNumber === preset && styles.areaPresetTextActive,
                      ]}
                    >
                      {preset} sq ft
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Total ({selectedPerSqftWorks.map(work => formatPkr(work.price)).join(' + ')}
                  /sq ft × {bookingAreaNumber || 0} sq ft
                  {selectedFixedWorks.length
                    ? ` + ${selectedFixedWorks.length} fixed work${selectedFixedWorks.length > 1 ? 's' : ''}`
                    : ''})
                </Text>
                <Text style={styles.totalValue}>{formatPkr(estimatedTotal)}</Text>
              </View>
              <View style={styles.advanceNoteBox}>
                <Clock color="#b45309" size={14} />
                <Text style={styles.advanceNoteText}>
                  Design work must be booked at least 2 days before the
                  appointment.
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue Description</Text>
          <TextInput
            value={issueDescription}
            onChangeText={setIssueDescription}
            multiline
            numberOfLines={4}
            placeholder="Describe the problem in detail..."
            placeholderTextColor="#76777d"
            style={styles.textArea}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.divider} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload photos of the issue</Text>
          <View style={styles.photoRow}>
            <Pressable
              style={styles.photoAddBtn}
              disabled={issuePhotos.length >= 4}
              onPress={() => setPhotoPickerVisible(true)}
            >
              <Camera color="#45464d" size={22} />
              <Text style={styles.photoAddLabel}>
                {issuePhotos.length >= 4 ? 'Limit' : 'Add Photo'}
              </Text>
            </Pressable>
            {issuePhotos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreviewImage} />
                <Pressable
                  style={styles.removePhotoButton}
                  onPress={() =>
                    setIssuePhotos(current =>
                      current.filter((_, photoIndex) => photoIndex !== index),
                    )
                  }
                >
                  <Text style={styles.removePhotoText}>Ã—</Text>
                </Pressable>
              </View>
            ))}
            {!issuePhotos.length && <View style={styles.photoPlaceholder} />}
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <Text style={styles.serviceDetailBody}>
            {service.detailDescription ||
              `${service.title} is handled by trained UstaadPro professionals with careful inspection and clear service scope.`}
          </Text>
          {serviceDetails.map((detail, i) => (
            <View key={i} style={styles.checkRow}>
              <Check color="#006c49" size={16} strokeWidth={2.5} />
              <Text style={styles.checkText}>{detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            <Pressable
              style={styles.seeAllRow}
              onPress={() => setReviewsVisible(true)}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight color="#006c49" size={14} />
            </Pressable>
          </View>

          {visibleReviews.length ? (
            visibleReviews.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {getReviewCustomerName(review).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewerName}>
                      {getReviewCustomerName(review)}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          color="#F59E0B"
                          size={12}
                          fill={i <= review.rating ? '#F59E0B' : 'none'}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewTime}>
                    {formatReviewDate(review.createdAt)}
                  </Text>
                </View>
                <Text style={styles.reviewText}>{review.comment}</Text>
              </View>
            ))
          ) : (
            <View style={styles.reviewCard}>
              <Text style={styles.emptyReviewText}>
                No reviews yet. Completed customers can review this service.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      {/* Full-screen texture preview: zoomed photo of the tapped design. */}
      <Modal visible={previewImage !== ''} transparent animationType="fade" onRequestClose={() => setPreviewImage('')}>
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewImage('')}>
          <View style={styles.previewCard}>
            {previewImage ? (
              <Image source={{uri: previewImage}} style={styles.previewImage} resizeMode="contain" />
            ) : null}
            <View style={styles.previewClose}>
              <Text style={styles.previewCloseText}>Tap anywhere to close</Text>
            </View>
          </View>
        </Pressable>
      </Modal>
      <View style={styles.footer}>
        <Pressable
          style={styles.addCartBtn}
          onPress={() => {
            if (areaPricingRequired && bookingAreaNumber <= 0) {
              Alert.alert(
                'Area required',
                'Please enter the area size in square feet to calculate the total.',
              );
              return;
            }
            const worksToAdd = selectedWorkItems.length ? selectedWorkItems : specificWorks.slice(0, 1);
            worksToAdd.forEach(work => {
              const selectedWorkPrice = (service.workPrices || []).find(item => item.id === work.workPriceId);
              const isPerSqft = work.pricingMode === 'per_sqft';
              addToCart({
                ...service,
                price: isPerSqft
                  ? Math.round(Number(work.price) * bookingAreaNumber * 100) / 100
                  : Number(work.price || service.price),
                selectedWorkPrice,
                selectedWorkPriceId: work.workPriceId,
                selectedWorkTitle: work.title || service.title,
                areaSqft: isPerSqft ? bookingAreaNumber : undefined,
                pricePerSqft: isPerSqft ? Number(work.price) : undefined,
                pricingMode: isPerSqft ? 'per_sqft' : undefined,
              });
            });
            navigation.navigate('Cart');
          }}
        >
          <Text style={styles.addCartText}>
            {estimatedTotal > 0
              ? `Book Service - ${formatPkr(estimatedTotal)}`
              : 'Book Service'}
          </Text>
        </Pressable>
      </View>
      {reviewsVisible ? (
        <View style={styles.reviewsModalOverlay}>
          <View style={styles.reviewsModalCard}>
            <View style={styles.reviewsModalHeader}>
              <Text style={styles.reviewsModalTitle}>Service Reviews</Text>
              <Pressable
                style={styles.reviewsCloseButton}
                onPress={() => setReviewsVisible(false)}
              >
                <Text style={styles.reviewsCloseText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {reviews.length ? (
                reviews.map(review => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {getReviewCustomerName(review).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewMeta}>
                        <Text style={styles.reviewerName}>
                          {getReviewCustomerName(review)}
                        </Text>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              color="#F59E0B"
                              size={12}
                              fill={i <= review.rating ? '#F59E0B' : 'none'}
                            />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.reviewTime}>
                        {formatReviewDate(review.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.reviewText}>{review.comment}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyReviewText}>
                  No reviews yet for this service.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  missing: {
    fontFamily: fontFamily.regular,
    color: '#0b1c30',
    padding: 24,
  },
  photoPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  photoPickerCard: {
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  photoPickerTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 18,
    color: '#0b1c30',
    marginBottom: 6,
  },
  photoPickerText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: '#45464d',
    lineHeight: 20,
    marginBottom: 16,
  },
  photoPickerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoPickerButton: {
    flex: 1,
    height: 48,
    borderRadius: rounded.default,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  photoPickerButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  photoPickerSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  photoPickerSecondaryText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#0b1c30',
  },
  loginPromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.46)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  loginPromptCard: {
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5eeff',
    shadowColor: '#0b1c30',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  loginPromptIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eaf6ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loginPromptTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 20,
    color: '#0b1c30',
    marginBottom: 6,
  },
  loginPromptText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: '#45464d',
    marginBottom: 18,
  },
  loginPromptActions: {
    flexDirection: 'row',
    gap: 10,
  },
  loginPromptSecondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loginPromptSecondaryText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#0b1c30',
  },
  loginPromptButton: {
    flex: 1,
    height: 50,
    borderRadius: rounded.default,
    backgroundColor: '#0b1c30',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  loginPromptButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  reviewsModalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(11, 28, 48, 0.45)',
    justifyContent: 'flex-end',
  },
  reviewsModalCard: {
    maxHeight: '78%',
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  reviewsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reviewsModalTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 18,
    color: '#0b1c30',
  },
  reviewsCloseButton: {
    borderRadius: rounded.full,
    backgroundColor: '#eff4ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reviewsCloseText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#f8fafc',
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 16,
    color: '#0b1c30',
  },

  // Hero
  heroImage: {
    position: 'relative',
    height: 220,
    justifyContent: 'flex-end',
    padding: 16,
    overflow: 'hidden',
  },
  heroPhoto: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  ratingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: rounded.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratingText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 13,
  },

  // Content
  content: { paddingBottom: 30 },
  section: { paddingHorizontal: 16, paddingVertical: 16 },
  divider: { height: 1, backgroundColor: '#e5eeff', marginHorizontal: 16 },

  // Title / Price
  titlePriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    fontSize: 22,
    color: '#0b1c30',
    lineHeight: 30,
    marginRight: 12,
  },
  priceBlock: { alignItems: 'flex-end' },
  priceText: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 18,
    color: '#0b1c30',
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#45464d',
    lineHeight: 22,
    marginBottom: 10,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  estimateText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#006c49',
  },

  // Section Titles
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    fontSize: 16,
    color: '#0b1c30',
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: '#64748B',
    marginTop: -8,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionCountChip: {
    backgroundColor: '#e6f2ec',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectionCountText: {
    fontFamily: fontFamily.bold,
    fontSize: 11.5,
    color: '#006c49',
  },

  // Radio Cards
  radioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: rounded.lg,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  radioCardActive: {
    borderColor: '#006c49',
    backgroundColor: '#f0fdf7',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: '#006c49',
    backgroundColor: '#006c49',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#006c49',
  },
  radioImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#e8eef6',
  },
  radioContent: { flex: 1 },
  radioTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 14,
    color: '#0b1c30',
    marginBottom: 3,
  },
  radioTitleActive: { color: '#006c49' },
  radioSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#76777d',
  },
  radioPrice: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: '#0b1c30',
    fontSize: 13,
    marginTop: 5,
  },

  // ── Texture design gallery (hero preview + thumbnail tiles) ──
  galleryWrap: {
    gap: 12,
  },
  heroPreviewWrap: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  heroPreviewImage: {
    width: '100%',
    height: 210,
    backgroundColor: '#e8eef6',
  },
  heroPreviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  heroPreviewTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 16,
    color: '#0b1c30',
  },
  heroPreviewSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: '#76777d',
    marginTop: 2,
  },
  heroPreviewRateBox: {
    backgroundColor: '#006c49',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPreviewRate: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    fontSize: 14.5,
    color: '#ffffff',
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbTile: {
    width: '31.5%',
    aspectRatio: 0.85,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#e8eef6',
  },
  thumbTileActive: {
    borderColor: '#006c49',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 28, 48, 0.72)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  thumbPrice: {
    fontFamily: fontFamily.bold,
    fontSize: 10.5,
    color: '#ffffff',
  },
  thumbCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#006c49',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    color: '#006c49',
  },
  designImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f2ec',
  },
  designImagePlaceholderText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 34,
    color: '#006c49',
  },
  designSelectedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#006c49',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  designSelectedBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: '#ffffff',
  },
  designCardPressed: {
    opacity: 0.92,
  },

  // ── Full-screen texture preview modal ──
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 15, 26, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    width: '92%',
    height: '78%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewClose: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  previewCloseText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },

  // Text Area
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: rounded.default,
    padding: 14,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#0b1c30',
    backgroundColor: '#ffffff',
  },

  // Photos
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoAddBtn: {
    width: 80,
    height: 80,
    borderRadius: rounded.lg,
    borderWidth: 1.5,
    borderColor: '#c6c6cd',
    borderStyle: 'dashed',
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#45464d',
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: rounded.lg,
    backgroundColor: '#e5eeff',
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: rounded.lg,
    overflow: 'hidden',
    backgroundColor: '#e5eeff',
    borderWidth: 1,
    borderColor: '#d9dde8',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 22,
    height: 22,
    borderRadius: rounded.full,
    backgroundColor: 'rgba(11, 28, 48, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 18,
    color: '#ffffff',
  },

  // Service Details
  serviceDetailBody: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#45464d',
    lineHeight: 22,
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  checkText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: '#0b1c30',
  },

  // Reviews
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 13,
    color: '#006c49',
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5eeff',
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: '#dce9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontFamily: fontFamily.bold,
    color: '#0b1c30',
    fontSize: 15,
  },
  reviewMeta: { flex: 1 },
  reviewerName: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 14,
    color: '#0b1c30',
  },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  reviewTime: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#76777d',
  },
  reviewText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: '#45464d',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  emptyReviewText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: '#76777d',
    lineHeight: 20,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5eeff',
  },
  addCartBtn: {
    height: 52,
    backgroundColor: '#0b1c30',
    borderRadius: rounded.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCartText: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: '#ffffff',
    fontSize: 16,
  },

  // Per-sqft area + total
  areaBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e5eeff',
    borderRadius: rounded.lg,
    backgroundColor: '#f8fbff',
    padding: 14,
  },
  areaBoxTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 14,
    color: '#0b1c30',
  },
  areaBoxHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: '#76777d',
    marginTop: 4,
    marginBottom: 10,
  },
  areaInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  areaInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: rounded.default,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#0b1c30',
  },
  areaUnit: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#45464d',
  },
  areaPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  areaPresetChip: {
    borderWidth: 1,
    borderColor: '#c6d8f5',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  areaPresetChipActive: {
    borderColor: '#006c49',
    backgroundColor: '#e7f5ef',
  },
  areaPresetText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#45464d',
  },
  areaPresetTextActive: {
    fontFamily: fontFamily.bold,
    color: '#006c49',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5eeff',
  },
  totalLabel: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#45464d',
    marginRight: 8,
  },
  totalValue: {
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    fontSize: 18,
    color: '#006c49',
  },
  advanceNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#fef3c7',
    borderRadius: rounded.default,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  advanceNoteText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#b45309',
  },
});






