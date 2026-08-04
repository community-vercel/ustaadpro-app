import React, {useEffect, useMemo} from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowLeft, Star, ChevronRight, PackageSearch, Layers} from 'lucide-react-native';
import {subscriptions} from '@/data/mockData';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';
import {formatPkr} from '@/utils/currency';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

type FlatServiceItem = {
  id: string;
  workId: number;
  title: string;
  description: string;
  price: number;
  originalPrice: number;
  imageUrl?: string;
  rating: number;
  reviews: number;
  duration: string;
  badge?: string;
};

export function CategoryScreen({navigation, route}: Props): React.JSX.Element {
  const {services, categories, subcategories, fetchServices} = useAppStore();
  const isAllCategories = route.params.categoryId === 'all';
  const isAllSubcategories = route.params.categoryId === 'all-subcategories';
  const isMainService = !isAllCategories && !isAllSubcategories && !route.params.showServices;

  const subservices = useMemo(() => {
    if (!isMainService) return [];
    const seen = new Map<string, {id: string; title: string; imageUrl?: string; count: number}>();
    services
      .filter(item => item.categoryId === route.params.categoryId && item.subcategoryId)
      .forEach(item => {
        const id = item.subcategoryId as string;
        const previous = seen.get(id);
        seen.set(id, {
          id,
          title: subcategories.find(item => item.id === id)?.title || id.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
          imageUrl: previous?.imageUrl || subcategories.find(item => item.id === id)?.mobileIconUrl || subcategories.find(item => item.id === id)?.webImageUrl || subcategories.find(item => item.id === id)?.imageUrl || item.imageUrl,
          count: (previous?.count || 0) + 1,
        });
      });
    return Array.from(seen.values());
  }, [isMainService, route.params.categoryId, services, subcategories]);

  const allSubservices = useMemo(() =>
    subcategories
      .map(subcategory => {
        const matchingServices = services.filter(service => service.subcategoryId === subcategory.id);
        return {
          id: subcategory.id,
          title: subcategory.title,
          imageUrl: subcategory.mobileIconUrl || subcategory.webImageUrl || subcategory.imageUrl || matchingServices[0]?.imageUrl,
          count: matchingServices.length,
        };
      })
      .filter(subcategory => subcategory.count > 0),
    [services, subcategories],
  );
  const displayedSubservices = isAllSubcategories ? allSubservices : subservices;

  const categoryServices = useMemo(() => {
    if (route.params.categoryId === 'all') return services;
    if (isMainService) {
      // Main services without a sub-service remain bookable directly.
      return services.filter(item => item.categoryId === route.params.categoryId && !item.subcategoryId);
    }
    return services.filter(item => item.subcategoryId === route.params.categoryId);
  }, [isMainService, route.params.categoryId, services]);
  // Main categories with sub-services are navigation-only. This preserves the
  // intended category -> subcategory -> service journey.
  const showServiceList = !isAllCategories && !isAllSubcategories && (!isMainService || subservices.length === 0);

  // Flatten services into individual specific work items so each
  // work price (e.g. "Fan Installation", "Breaker Replacement") shows as its own card.
  const serviceList = useMemo<FlatServiceItem[]>(() => {
    if (isAllCategories) return [];
    const list: FlatServiceItem[] = [];

    categoryServices.forEach(service => {
      const dynamicWorkPrices = (service.workPrices || []).filter(
        work => work.title && Number(work.price) > 0,
      );

      if (dynamicWorkPrices.length) {
        dynamicWorkPrices.forEach((work, index) => {
          const workId = Number(work.id ?? index);
          list.push({
            id: service.id,
            workId,
            title: work.title,
            description:
              work.description || service.description || 'Professional service',
            price: Number(work.price),
            originalPrice:
              service.originalPrice > service.price
                ? Math.round(
                    Number(work.price) *
                      (service.originalPrice / service.price),
                  )
                : Number(work.price),
            imageUrl: work.imageUrl || service.imageUrl,
            rating: service.rating,
            reviews: service.reviews,
            duration: service.duration,
            badge: index === 0 ? service.badge : undefined,
          });
        });
      } else {
        // No work prices — show the parent service itself
        list.push({
          id: service.id,
          workId: 0,
          title: service.title,
          description: service.description,
          price: service.price,
          originalPrice: service.originalPrice,
          imageUrl: service.imageUrl,
          rating: service.rating,
          reviews: service.reviews,
          duration: service.duration,
          badge: service.badge,
        });
      }
    });

    return list;
  }, [categoryServices, isAllCategories]);

  useEffect(() => {
    if (!services.length) {
      fetchServices();
    }
  }, [fetchServices, services.length]);

  const isLoading = !services.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.ink} size={24} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.title}>{route.params.title}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {isAllCategories && (
          <View style={styles.allCatalogueSection}>
            <View style={styles.allCatalogueIntro}>
              <View>
                <Text style={styles.allCatalogueKicker}>SERVICE CATALOGUE</Text>
                <Text style={styles.allCatalogueTitle}>Explore our services</Text>
                <Text style={styles.allCatalogueSubtitle}>Choose a category and find a trusted professional.</Text>
              </View>
              <View style={styles.allCatalogueCount}><Text style={styles.allCatalogueCountNumber}>{categories.length}</Text><Text style={styles.allCatalogueCountLabel}>categories</Text></View>
            </View>
            <View style={styles.allCategoryGrid}>
              {categories.map((category, index) => {
                const count = services.filter(service => service.categoryId === category.id).length;
                const imageUrl = category.webImageUrl || category.mobileIconUrl || category.imageUrl;
                const tint = category.tint || '#006C49';
                const featured = index === 0;
                return <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={'Explore ' + category.title} style={({pressed}) => [styles.allCategoryCard, featured && styles.allCategoryFeatured, pressed && styles.cardPressed]} onPress={() => navigation.push('Category', {categoryId: category.id, title: category.title})}>
                  <View style={[styles.allCategoryImageWrap, featured && styles.allCategoryFeaturedImageWrap, {backgroundColor: tint + '14'}]}>{imageUrl ? <Image source={{uri: imageUrl}} style={styles.allCategoryImage} /> : <Layers color={tint} size={30} />}</View>
                  <View style={[styles.allCategoryBody, featured && styles.allCategoryFeaturedBody]}><Text style={[styles.allCategoryTitle, featured && styles.allCategoryFeaturedTitle]} numberOfLines={2}>{category.title}</Text><View style={styles.allCategoryMetaRow}><Text style={styles.allCategoryMeta}>{count} service{count === 1 ? '' : 's'}</Text><View style={[styles.allCategoryArrow, {backgroundColor: tint}]}><ChevronRight color="#FFFFFF" size={15} strokeWidth={2.8} /></View></View></View>
                </Pressable>;
              })}
            </View>
          </View>
        )}

        {displayedSubservices.length > 0 && (
          <View style={styles.subserviceSection}>
            <Text style={styles.sectionTitle}>{isAllSubcategories ? 'All Quick Services' : 'Choose a service type'}</Text>
            <Text style={styles.sectionSubtitle}>{isAllSubcategories ? 'Choose a service type to see available work.' : 'Select a sub-service to see available work.'}</Text>
            <View style={styles.subserviceGrid}>
              {displayedSubservices.map(subservice => (
                <Pressable
                  key={subservice.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Explore ${subservice.title}`}
                  style={({pressed}) => [styles.subserviceGridCard, pressed && styles.cardPressed]}
                  onPress={() => navigation.push('Category', {
                    categoryId: subservice.id,
                    title: subservice.title,
                    showServices: true,
                  })}>
                  <View style={styles.subserviceGridImageWrap}>
                    {subservice.imageUrl ? (
                      <Image source={{uri: subservice.imageUrl}} style={styles.subserviceGridImage} />
                    ) : (
                      <Layers color="#006c49" size={28} />
                    )}
                    <View style={styles.subserviceArrow}>
                      <ChevronRight color="#ffffff" size={16} strokeWidth={2.6} />
                    </View>
                  </View>
                  <Text style={styles.subserviceGridTitle} numberOfLines={2}>{subservice.title}</Text>
                  <Text style={styles.subserviceCount}>{subservice.count} service{subservice.count === 1 ? '' : 's'} available</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}


        {/* Empty / Loading state */}
        {showServiceList && serviceList.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <PackageSearch color="#006c49" size={32} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>
              {isLoading ? 'Loading services…' : 'No services yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {isLoading
                ? 'Please wait while we fetch services for you.'
                : 'Services for this category will appear here once they are added from the admin dashboard.'}
            </Text>
          </View>
        )}

        {/* Service cards */}
        {showServiceList && serviceList.map(service => (
          <Pressable
            key={`${service.id}-${service.workId}`}
            style={({pressed}) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              navigation.navigate('Detail', {
                serviceId: service.id,
                selectedWorkId: service.workId,
              })
            }>
            <View style={styles.cardTop}>
              <View style={styles.thumbnail}>
                {service.imageUrl ? (
                  <Image
                    source={{uri: service.imageUrl}}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.thumbnailText}>
                    {service.title.slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.cardCopy}>
                <View style={styles.titleRow}>
                  <Text style={styles.serviceTitle} numberOfLines={2}>
                    {service.title}
                  </Text>
                  {service.badge && (
                    <View style={styles.badgeWrap}>
                      <Text style={styles.badge}>{service.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.description} numberOfLines={2}>
                  {service.description}
                </Text>

                <View style={styles.metaRow}>
                  <View style={styles.ratingBadge}>
                    <Star color="#F59E0B" fill="#F59E0B" size={12} />
                    <Text style={styles.ratingText}>{service.rating}</Text>
                  </View>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaText}>{service.reviews} reviews</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaText}>{service.duration}</Text>
                </View>
              </View>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceCol}>
                <Text style={styles.priceLabel}>Starting from</Text>
                <View style={styles.priceWrap}>
                  <Text style={styles.price}>{formatPkr(service.price)}</Text>
                  {service.originalPrice > service.price && (
                    <Text style={styles.originalPrice}>
                      {formatPkr(service.originalPrice)}
                    </Text>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.bookBtn}
                onPress={() =>
                  navigation.navigate('Detail', {
                    serviceId: service.id,
                    selectedWorkId: service.workId,
                  })
                }>
                <Text style={styles.bookBtnText}>Book Now</Text>
                <ChevronRight color="#fff" size={16} strokeWidth={2.5} />
              </Pressable>
            </View>
          </Pressable>
        ))}

        {/* Subscriptions section */}
        {route.params.categoryId === 'subscriptions' && (
          <View style={styles.packageWrap}>
            <Text style={styles.sectionTitle}>Maintenance packages</Text>
            {subscriptions.map(pack => (
              <View key={pack.id} style={styles.packageCard}>
                <View style={styles.packageCopy}>
                  <Text style={styles.packageTitle}>{pack.title}</Text>
                  <Text style={styles.packageDuration}>{pack.duration}</Text>
                </View>
                <View style={styles.packagePriceWrap}>
                  <Text style={styles.packagePrice}>
                    {formatPkr(pack.price)}
                  </Text>
                  <Pressable style={styles.packageBtn}>
                    <Text style={styles.packageBtnText}>Select</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  spacer: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  /* ── Empty state ── */
  allCatalogueSection: {paddingTop: 14, paddingBottom: 8},
  allCatalogueIntro: {backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EDF3', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, shadowColor: '#0F172A', shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: {width: 0, height: 5}, elevation: 1},
  allCatalogueKicker: {fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.1, color: '#00805B'},
  allCatalogueTitle: {fontFamily: fontFamily.extraBold, fontSize: 21, lineHeight: 27, color: '#102238', marginTop: 3},
  allCatalogueSubtitle: {fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17, color: '#667085', marginTop: 3, maxWidth: 220},
  allCatalogueCount: {width: 58, height: 58, borderRadius: 18, backgroundColor: '#EAF8F2', alignItems: 'center', justifyContent: 'center'},
  allCatalogueCountNumber: {fontFamily: fontFamily.extraBold, fontSize: 20, color: '#007A56', lineHeight: 23},
  allCatalogueCountLabel: {fontFamily: fontFamily.medium, fontSize: 9, color: '#347C67'},
  allCategoryGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  allCategoryCard: {width: '48.2%', backgroundColor: '#FFFFFF', borderRadius: 18, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#E7ECF2', shadowColor: '#0F172A', shadowOpacity: 0.055, shadowRadius: 12, shadowOffset: {width: 0, height: 5}, elevation: 2},
  allCategoryFeatured: {width: '100%', flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#FFFFFF'},
  allCategoryFeaturedImageWrap: {width: '52%', height: 138, borderRadius: 14},
  allCategoryFeaturedBody: {flex: 1, paddingLeft: 14, paddingRight: 5, paddingVertical: 6},
  allCategoryFeaturedTitle: {fontSize: 18, lineHeight: 23, minHeight: 46},
  allCategoryImageWrap: {height: 116, alignItems: 'center', justifyContent: 'center', padding: 10},
  allCategoryImage: {width: '100%', height: '100%', borderRadius: 12},
  allCategoryBody: {paddingHorizontal: 11, paddingTop: 10, paddingBottom: 9},
  allCategoryTitle: {fontFamily: fontFamily.bold, color: '#14233A', fontSize: 14, lineHeight: 18, minHeight: 36},
  allCategoryMetaRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7},
  allCategoryMeta: {fontFamily: fontFamily.medium, color: '#6B778C', fontSize: 11},
  allCategoryArrow: {width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},

  emptyState: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    color: '#0F172A',
    fontSize: 17,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fontFamily.regular,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  /* ── Cards ── */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{scale: 0.99}],
  },
  cardTop: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailText: {
    fontFamily: fontFamily.extraBold,
    color: '#4F46E5',
    fontSize: 20,
  },
  cardCopy: {
    flex: 1,
    marginLeft: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 21,
  },
  badgeWrap: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  badge: {
    fontFamily: fontFamily.bold,
    color: '#EF4444',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  description: {
    fontFamily: fontFamily.regular,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    fontFamily: fontFamily.bold,
    color: '#B45309',
    fontSize: 11,
  },
  metaText: {
    fontFamily: fontFamily.medium,
    color: '#64748B',
    fontSize: 12,
  },
  metaDot: {
    color: '#CBD5E1',
    marginHorizontal: 5,
    fontSize: 10,
  },
  priceRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceCol: {
    flex: 1,
  },
  priceLabel: {
    fontFamily: fontFamily.medium,
    color: '#64748B',
    fontSize: 11,
    marginBottom: 2,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontFamily: fontFamily.extraBold,
    color: '#0F172A',
    fontSize: 18,
  },
  originalPrice: {
    fontFamily: fontFamily.medium,
    color: '#94A3B8',
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  bookBtn: {
    backgroundColor: '#006c49',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  bookBtnText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 13,
  },
  /* ── Subscriptions ── */
  subserviceSection: {paddingTop: 18, paddingBottom: 8},
  sectionSubtitle: {fontFamily: fontFamily.regular, color: '#64748B', fontSize: 13, marginTop: 3, marginBottom: 16},
  subserviceGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  subserviceGridCard: {width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7EFE7', borderRadius: 18, padding: 9, marginBottom: 14, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: {width: 0, height: 4}, elevation: 2},
  subserviceGridImageWrap: {height: 112, borderRadius: 13, backgroundColor: '#E9F8F1', overflow: 'hidden', alignItems: 'center', justifyContent: 'center'},
  subserviceGridImage: {width: '100%', height: '100%'},
  subserviceArrow: {position: 'absolute', right: 7, bottom: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: '#006C49', alignItems: 'center', justifyContent: 'center'},
  subserviceGridTitle: {fontFamily: fontFamily.bold, color: '#0B1C30', fontSize: 13, lineHeight: 18, marginTop: 10, minHeight: 36},
  subserviceCount: {fontFamily: fontFamily.regular, color: '#64748B', fontSize: 11, marginTop: 3},
  directServicesTitle: {fontFamily: fontFamily.bold, color: '#0B1C30', fontSize: 17, marginHorizontal: 16, marginTop: 16, marginBottom: 8},
  packageWrap: {
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    color: '#0F172A',
    fontSize: 18,
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  packageCopy: {
    flex: 1,
    paddingRight: 12,
  },
  packageTitle: {
    fontFamily: fontFamily.bold,
    color: '#0F172A',
    fontSize: 15,
    marginBottom: 4,
  },
  packageDuration: {
    fontFamily: fontFamily.regular,
    color: '#64748B',
    fontSize: 13,
  },
  packagePriceWrap: {
    alignItems: 'flex-end',
    gap: 8,
  },
  packagePrice: {
    fontFamily: fontFamily.extraBold,
    color: '#0F172A',
    fontSize: 16,
  },
  packageBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  packageBtnText: {
    fontFamily: fontFamily.bold,
    color: '#4F46E5',
    fontSize: 12,
  },
});
