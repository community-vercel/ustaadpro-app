import React, {useEffect, useState} from 'react';
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
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Phone,
  Star,
  Clock,
  Camera,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {fontFamily} from '@/theme/typography';
import {formatPkr} from '@/utils/currency';
import {rounded} from '@/theme/layout';
import {ServiceReview} from '@/types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

export function DetailScreen({navigation, route}: Props): React.JSX.Element {
  const {
    appSettings,
    services,
    fetchAppContent,
    fetchServices,
    fetchServiceReviews,
    user,
  } = useAppStore();
  const service = services.find(item => item.id === route.params.serviceId);
  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(
    route.params.selectedWorkId ?? null
  );
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhotos, setIssuePhotos] = useState<Asset[]>([]);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);

  const promptLogin = () => {
    setLoginPromptVisible(true);
  };

  const goToLogin = () => {
    setLoginPromptVisible(false);
    navigation.navigate('Auth', {screen: 'Login'});
  };

  useEffect(() => {
    if (!services.length) {
      fetchServices();
    }
    void fetchAppContent();
  }, [fetchAppContent, fetchServices, services.length]);

  useEffect(() => {
    void fetchServiceReviews(route.params.serviceId).then(setReviews);
  }, [fetchServiceReviews, route.params.serviceId]);

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
  const specificWorks = dynamicWorkPrices.length
    ? dynamicWorkPrices.map((work, index) => ({
        id: Number(work.id ?? index),
        workPriceId: work.id,
        title: work.title,
        subtitle: work.description || 'Professional service',
        imageUrl: work.imageUrl,
        price: Number(work.price),
      }))
    : [
        {
          id: 0,
          workPriceId: undefined,
          title: service.title,
          subtitle: service.serviceType || 'Standard Visit',
          imageUrl: undefined,
          price: service.price,
        },
      ];
  const selectedWorkItem =
    specificWorks.find(work => work.id === selectedWorkId) || specificWorks[0];

  const serviceDetails = service.details?.length ? service.details : [];
  const visibleReviews = reviews.slice(0, 2);
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
    : 0;
  const ratingBadgeText = reviewCount
    ? `${averageRating.toFixed(1)} (${reviewCount} ${
        reviewCount === 1 ? 'review' : 'reviews'
      })`
    : 'No reviews yet';
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
      <Modal
        visible={reviewsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewsVisible(false)}
      >
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
                          {review.customerName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewMeta}>
                        <Text style={styles.reviewerName}>
                          {review.customerName}
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroImage, {backgroundColor: '#dce9ff'}]}>
          {service.imageUrl && (
            <Image
              source={{uri: service.imageUrl}}
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
              <Text style={styles.priceText}>{formatPkr(service.price)}</Text>
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
          <Text style={styles.sectionTitle}>Select Specific Work</Text>
          {specificWorks.map(work => (
            <Pressable
              key={work.id}
              style={[
                styles.radioCard,
                selectedWorkItem?.id === work.id && styles.radioCardActive,
              ]}
              onPress={() => setSelectedWorkId(work.id)}
            >
              <View
                style={[
                  styles.radioCircle,
                  selectedWorkItem?.id === work.id && styles.radioCircleActive,
                ]}
              >
                {selectedWorkItem?.id === work.id && <View style={styles.radioInner} />}
              </View>
              {work.imageUrl ? (
                <Image
                  source={{uri: work.imageUrl}}
                  style={styles.radioImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.radioContent}>
                <Text
                  style={[
                    styles.radioTitle,
                    selectedWorkItem?.id === work.id && styles.radioTitleActive,
                  ]}
                >
                  {work.title}
                </Text>
                <Text style={styles.radioSubtitle}>{work.subtitle}</Text>
                <Text style={styles.radioPrice}>{formatPkr(work.price)}</Text>
              </View>
            </Pressable>
          ))}
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
                <Image source={{uri: photo.uri}} style={styles.photoPreviewImage} />
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
                      {review.customerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewerName}>
                      {review.customerName}
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

        <View style={{height: 100}} />
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={styles.addCartBtn}
          onPress={() => {
            if (!user) {
              promptLogin();
              return;
            }

            navigation.navigate('Booking', {
              serviceId: service.id,
              specificWorkPriceId: selectedWorkItem?.workPriceId,
              specificWorkTitle: selectedWorkItem?.title || service.title,
              specificWorkPrice: selectedWorkItem?.price || service.price,
            });
          }}
        >
          <Text style={styles.addCartText}>Add to cart</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#f8f9ff'},
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
    shadowOffset: {width: 0, height: 12},
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
    flex: 1,
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
  content: {paddingBottom: 30},
  section: {paddingHorizontal: 16, paddingVertical: 16},
  divider: {height: 1, backgroundColor: '#e5eeff', marginHorizontal: 16},

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
  priceBlock: {alignItems: 'flex-end'},
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
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleActive: {borderColor: '#006c49'},
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
  radioContent: {flex: 1},
  radioTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 14,
    color: '#0b1c30',
    marginBottom: 3,
  },
  radioTitleActive: {color: '#006c49'},
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
  photoRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
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
  seeAllRow: {flexDirection: 'row', alignItems: 'center', gap: 2},
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
  reviewMeta: {flex: 1},
  reviewerName: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    fontSize: 14,
    color: '#0b1c30',
  },
  starsRow: {flexDirection: 'row', gap: 2, marginTop: 3},
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
});






