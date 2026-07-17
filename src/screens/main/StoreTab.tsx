import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Check,
  Gift,
  LocateFixed,
  MapPin,
  Minus,
  Package,
  Plus,
  Search,
  CheckCircle2,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react-native';
import {RootStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {ShopProduct} from '@/types/models';
import {colors} from '@/theme/colors';
import {fontFamily, type} from '@/theme/typography';
import {rounded} from '@/theme/layout';
import {formatPkr} from '@/utils/currency';
import {playConfirmationCue} from '@/utils/confirmationCue';
import {resolveApiAssetUrl} from '@/api/client';
import {locateCurrentAddress} from '@/services/locationService';
import {SavedLocation} from '@/types/models';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StoreTab(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    shopProducts,
    shopCategories,
    shopProductsLoading,
    shopProductsHasMore,
    shopProductsLoadingMore,
    shopCart,
    shopCartOpenRequestId,
    appSettings,
    user,
    fetchShopProducts,
    fetchShopOrders,
    fetchAppContent,
    addShopProductToCart,
    removeShopProductFromCart,
    updateShopCartQuantity,
    checkoutShopCart,
    savedShopLocation,
    setSavedShopLocation,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [cartVisible, setCartVisible] = useState(false);
  const [addedProduct, setAddedProduct] = useState<ShopProduct | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [detailsConfirmVisible, setDetailsConfirmVisible] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [locatingShopLocation, setLocatingShopLocation] = useState(false);
  const [useRewardPoints, setUseRewardPoints] = useState(false);

  useEffect(() => {
    Promise.all([fetchShopProducts({reset: true, category: 'All'}), fetchAppContent()]).finally(() =>
      setLoading(false),
    );
  }, [fetchAppContent, fetchShopProducts]);

  useFocusEffect(
    useCallback(() => {
      fetchShopProducts({reset: true, category: activeCategory}).catch(() =>
        setMessage('Could not refresh store products.'),
      );
    }, [activeCategory, fetchShopProducts]),
  );

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (shopCartOpenRequestId > 0) {
      setAddedProduct(null);
      setSelectedProduct(null);
      setSuccessVisible(false);
      setCartVisible(true);
    }
  }, [shopCartOpenRequestId]);

  useEffect(() => {
    if (!deliveryLocation.trim() && savedShopLocation?.address) {
      setDeliveryLocation(savedShopLocation.address);
    }
  }, [deliveryLocation, savedShopLocation]);

  const categories = useMemo(() => {
    const total = shopCategories.reduce((sum, category) => sum + category.total, 0);
    return [{name: 'All', total}, ...shopCategories];
  }, [shopCategories]);

  const activeCategoryTotal = useMemo(() => {
    if (activeCategory === 'All') {
      return categories[0]?.total || shopProducts.length;
    }
    return categories.find(category => category.name === activeCategory)?.total || 0;
  }, [activeCategory, categories, shopProducts.length]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return shopProducts.filter(product => {
      const matchesQuery =
        !normalizedQuery ||
        product.title.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery);
      return matchesQuery;
    });
  }, [query, shopProducts]);

  const cartCount = useMemo(
    () => shopCart.reduce((sum, item) => sum + item.quantity, 0),
    [shopCart],
  );
  const subtotal = useMemo(
    () =>
      shopCart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      ),
    [shopCart],
  );
  const shippingCost = Number(appSettings.shippingCost || 0);
  const rewardEnabled = appSettings.rewardEnabled !== false;
  const rewardPointValue = Math.max(1, Number(appSettings.rewardPointValue || 25));
  const rewardMinimumRedeem = Math.max(
    0,
    Number(appSettings.rewardMinimumRedeem || 100),
  );
  const shopRewardMaxDiscountPercent = Math.max(
    0,
    Number(appSettings.shopRewardMaxDiscountPercent || 5),
  );
  const rewardPoints = Number(user?.rewardPoints || 0);
  const rewardBalanceValue = rewardPoints * rewardPointValue;
  const maxShopRewardDiscount = Math.floor(
    (subtotal * shopRewardMaxDiscountPercent) / 100,
  );
  const redeemableRewardPoints = Math.floor(
    Math.min(rewardBalanceValue, maxShopRewardDiscount) / rewardPointValue,
  );
  const redeemableRewardValue = redeemableRewardPoints * rewardPointValue;
  const canRedeemReward =
    rewardEnabled &&
    rewardBalanceValue >= rewardMinimumRedeem &&
    redeemableRewardValue >= rewardMinimumRedeem;
  const rewardDiscount =
    useRewardPoints && canRedeemReward ? redeemableRewardValue : 0;
  const total = Math.max(0, subtotal - rewardDiscount) + shippingCost;
  const selectedCartItem = selectedProduct
    ? shopCart.find(item => item.product.id === selectedProduct.id)
    : undefined;
  const pointsNeeded = Math.max(
    0,
    Math.ceil((rewardMinimumRedeem - rewardBalanceValue) / rewardPointValue),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchShopProducts({reset: true, category: activeCategory}), fetchAppContent()]);
    setRefreshing(false);
  };

  const handleProductsScroll = ({nativeEvent}: any) => {
    const distanceFromBottom =
      nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
      nativeEvent.contentSize.height - 260;

    if (distanceFromBottom && shopProductsHasMore && !shopProductsLoadingMore) {
      void fetchShopProducts({category: activeCategory});
    }
  };

  const addProduct = (product: ShopProduct) => {
    if (product.stock <= 0) {
      setMessage(`${product.title} is out of stock.`);
      setAddedProduct(null);
      return;
    }

    addShopProductToCart(product);
    setMessage(`${product.title} added to cart.`);
    setAddedProduct(product);
  };

  const changeProductQuantity = (product: ShopProduct, quantity: number) => {
    if (quantity <= 0) {
      removeShopProductFromCart(product.id);
      setMessage(`${product.title} removed from cart.`);
      return;
    }

    updateShopCartQuantity(product.id, quantity);
  };

  const handleCheckout = () => {
    if (!user) {
      setCartVisible(false);
      Alert.alert(
        'Login required',
        'Please login or create an account to place a shopping order.',
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

    if (!deliveryLocation.trim()) {
      setMessage('Please enter your delivery location for this shop order.');
      return;
    }

    setDetailsConfirmVisible(true);
  };

  const handleLocateShopLocation = async () => {
    setLocatingShopLocation(true);
    try {
      const currentAddress = await locateCurrentAddress();
      const location: SavedLocation = {
        address: currentAddress.address,
        latitude: currentAddress.latitude,
        longitude: currentAddress.longitude,
        isCoordinateFallback: currentAddress.isCoordinateFallback,
        updatedAt: new Date().toISOString(),
      };
      await setSavedShopLocation(location);
      setDeliveryLocation(currentAddress.address);
      setMessage('Shop delivery location updated.');
    } catch (error: any) {
      setMessage(error?.message || 'Could not detect your current location.');
    } finally {
      setLocatingShopLocation(false);
    }
  };

  const handleSaveManualShopLocation = async () => {
    const location = deliveryLocation.trim();
    if (!location) {
      setMessage('Please enter a delivery address first.');
      return;
    }

    await setSavedShopLocation({
      address: location,
      latitude: savedShopLocation?.address === location
        ? savedShopLocation.latitude
        : undefined,
      longitude: savedShopLocation?.address === location
        ? savedShopLocation.longitude
        : undefined,
      isCoordinateFallback: savedShopLocation?.address === location
        ? savedShopLocation.isCoordinateFallback
        : undefined,
      updatedAt: new Date().toISOString(),
    });
    setDeliveryLocation(location);
    setMessage('Manual shop delivery address saved.');
  };

  const placeShopOrder = async () => {
    const location = deliveryLocation.trim();
    if (!location) {
      setMessage('Please enter your delivery location for this shop order.');
      return;
    }

    setCheckingOut(true);
    try {
      setDetailsConfirmVisible(false);
      setCartVisible(false);
      await checkoutShopCart({
        address: location,
        paymentMethod: 'Cash on Delivery',
        useRewardPoints: useRewardPoints && canRedeemReward,
      });
      await setSavedShopLocation({
        address: location,
        latitude: savedShopLocation?.address === location
          ? savedShopLocation.latitude
          : undefined,
        longitude: savedShopLocation?.address === location
          ? savedShopLocation.longitude
          : undefined,
        isCoordinateFallback: savedShopLocation?.address === location
          ? savedShopLocation.isCoordinateFallback
          : undefined,
        updatedAt: new Date().toISOString(),
      });
      await fetchShopOrders();
      setSelectedProduct(null);
      setAddedProduct(null);
      setUseRewardPoints(false);
      playConfirmationCue();
      setSuccessVisible(true);
      setMessage('Store order placed successfully.');
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setSuccessVisible(false);
        navigation.navigate('ShoppingOrders');
      }, 2000);
    } catch (error: any) {
      setMessage(
        error.response?.data?.message || error.message || 'Checkout failed.',
      );
    } finally {
      setCheckingOut(false);
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
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 color={colors.secondary} size={54} strokeWidth={2.4} />
            </View>
            <Text style={styles.successTitle}>Shopping completed</Text>
            <Text style={styles.successBody}>
              Your store order has been placed successfully.
            </Text>
            <Pressable
              style={styles.successButton}
              onPress={() => {
                if (successTimerRef.current) {
                  clearTimeout(successTimerRef.current);
                  successTimerRef.current = null;
                }
                setSuccessVisible(false);
                navigation.navigate('ShoppingOrders');
              }}
            >
              <Text style={styles.successButtonText}>View shopping orders</Text>
            </Pressable>
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
              Please confirm your delivery address, phone, and email before
              placing the shopping order.
            </Text>

            <View style={styles.confirmDetailsBox}>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Address</Text>
                <Text style={styles.confirmDetailValue}>
                  {deliveryLocation.trim() || 'Delivery location not entered'}
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

            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmEditButton}
                onPress={() => setDetailsConfirmVisible(false)}
                disabled={checkingOut}
              >
                <Text style={styles.confirmEditText}>Edit details</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmPlaceButton,
                  checkingOut && styles.confirmPlaceButtonDisabled,
                ]}
                onPress={placeShopOrder}
                disabled={checkingOut}
              >
                <Text style={styles.confirmPlaceText}>
                  {checkingOut ? 'Placing...' : 'Yes, place order'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(addedProduct)}
        transparent
        animationType="fade"
        onRequestClose={() => setAddedProduct(null)}
      >
        <View style={styles.addedOverlay}>
          <View style={styles.addedCard}>
            <View style={styles.addedTop}>
              <View style={styles.addedIcon}>
                <CheckCircle2 color={colors.secondary} size={24} strokeWidth={2.5} />
              </View>
              <Pressable
                style={styles.iconButton}
                onPress={() => setAddedProduct(null)}
              >
                <X color={colors.ink} size={18} strokeWidth={2.3} />
              </Pressable>
            </View>
            {addedProduct && (
              <>
                <Text style={styles.addedTitle}>Added to cart</Text>
                <Text style={styles.addedProductName} numberOfLines={2}>
                  {addedProduct.title}
                </Text>
                <View style={styles.addedActions}>
                  <Pressable
                    style={styles.secondaryAction}
                    onPress={() => setAddedProduct(null)}
                  >
                    <Text style={styles.secondaryActionText}>Continue</Text>
                  </Pressable>
                  <Pressable
                    style={styles.primaryAction}
                    onPress={() => {
                      setAddedProduct(null);
                      setCartVisible(true);
                    }}
                  >
                    <Text style={styles.primaryActionText}>View cart</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedProduct)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.productSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Product details</Text>
                <Text style={styles.sheetSubtitle}>Review before adding to cart</Text>
              </View>
              <Pressable
                style={styles.iconButton}
                onPress={() => setSelectedProduct(null)}
              >
                <X color={colors.ink} size={18} strokeWidth={2.3} />
              </Pressable>
            </View>

            {selectedProduct && (
              <>
                <View style={styles.detailImageBox}>
                  {selectedProduct.imageUrl ? (
                    <Image
                      source={{uri: selectedProduct.imageUrl}}
                      style={styles.detailImage}
                    />
                  ) : (
                    <Package color={colors.secondary} size={44} />
                  )}
                </View>
                <Text style={styles.detailCategory}>
                  {selectedProduct.category}
                </Text>
                <Text style={styles.detailTitle}>{selectedProduct.title}</Text>
                <Text style={styles.detailDescription}>
                  {selectedProduct.description}
                </Text>
                <View style={styles.detailMetaRow}>
                  <View>
                    <Text style={styles.detailPrice}>
                      {formatPkr(selectedProduct.price)}
                    </Text>
                    {selectedProduct.originalPrice > selectedProduct.price && (
                      <Text style={styles.originalPrice}>
                        {formatPkr(selectedProduct.originalPrice)}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.detailStock,
                      selectedProduct.stock <= 0 && styles.outOfStockText,
                    ]}
                  >
                    {selectedProduct.stock > 0
                      ? `${selectedProduct.stock} in stock`
                      : 'Out of stock'}
                  </Text>
                </View>
                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Payment</Text>
                    <Text style={styles.detailInfoText}>Cash on Delivery</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Delivery</Text>
                    <Text style={styles.detailInfoText} numberOfLines={1}>
                      Add delivery location at checkout
                    </Text>
                  </View>
                </View>
                {selectedCartItem ? (
                  <View style={styles.detailQtyPanel}>
                    <View>
                      <Text style={styles.detailQtyLabel}>In cart</Text>
                      <Text style={styles.detailQtyTotal}>
                        {formatPkr(
                          selectedProduct.price * selectedCartItem.quantity,
                        )}
                      </Text>
                    </View>
                    <View style={styles.detailQtyControl}>
                      <Pressable
                        style={styles.detailQtyButton}
                        onPress={() =>
                          changeProductQuantity(
                            selectedProduct,
                            selectedCartItem.quantity - 1,
                          )
                        }
                      >
                        <Minus color={colors.ink} size={17} strokeWidth={2.4} />
                      </Pressable>
                      <Text style={styles.detailQtyText}>
                        {selectedCartItem.quantity}
                      </Text>
                      <Pressable
                        style={[
                          styles.detailQtyButton,
                          selectedCartItem.quantity >= selectedProduct.stock &&
                            styles.detailQtyButtonDisabled,
                        ]}
                        onPress={() =>
                          changeProductQuantity(
                            selectedProduct,
                            selectedCartItem.quantity + 1,
                          )
                        }
                        disabled={selectedCartItem.quantity >= selectedProduct.stock}
                      >
                        <Plus
                          color={
                            selectedCartItem.quantity >= selectedProduct.stock
                              ? colors.muted
                              : colors.ink
                          }
                          size={17}
                          strokeWidth={2.4}
                        />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
                <View style={styles.detailFooterActions}>
                  <Pressable
                    style={[
                      styles.detailAddButton,
                      styles.detailFooterButton,
                      (selectedProduct.stock <= 0 ||
                        Boolean(
                          selectedCartItem &&
                            selectedCartItem.quantity >= selectedProduct.stock,
                        )) && styles.disabledAddButton,
                    ]}
                    onPress={() => addProduct(selectedProduct)}
                    disabled={
                      selectedProduct.stock <= 0 ||
                      Boolean(
                        selectedCartItem &&
                          selectedCartItem.quantity >= selectedProduct.stock,
                      )
                    }
                  >
                    <ShoppingCart color="#ffffff" size={18} strokeWidth={2.3} />
                    <Text style={styles.detailAddText}>
                      {selectedProduct.stock <= 0
                        ? 'Out of stock'
                        : selectedCartItem
                          ? 'Add one more'
                          : 'Add to cart'}
                    </Text>
                  </Pressable>
                  {cartCount > 0 ? (
                    <Pressable
                      style={styles.detailShowCartButton}
                      onPress={() => {
                        setAddedProduct(null);
                        setSelectedProduct(null);
                        setCartVisible(true);
                      }}
                    >
                      <Text style={styles.detailShowCartText}>Show cart</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={cartVisible && !successVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cartSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Shopping cart</Text>
                <Text style={styles.sheetSubtitle}>
                  {cartCount} item(s) ready for checkout
                </Text>
              </View>
              <Pressable
                style={styles.iconButton}
                onPress={() => setCartVisible(false)}
              >
                <X color={colors.ink} size={18} strokeWidth={2.3} />
              </Pressable>
            </View>

            {shopCart.length === 0 ? (
              <View style={styles.emptyCartSheet}>
                <ShoppingBag color={colors.secondary} size={34} />
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptyText}>
                  Add products from the store grid to checkout.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.cartBodyScroll}
                contentContainerStyle={styles.cartBodyContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.cartItemsBox}>
                  <View style={styles.cartSectionHeader}>
                    <View>
                      <Text style={styles.cartSectionTitle}>Items in cart</Text>
                      <Text style={styles.cartSectionSubtitle}>
                        Update quantity or remove products before checkout.
                      </Text>
                    </View>
                    <Text style={styles.cartSectionCount}>{cartCount}</Text>
                  </View>

                  <View style={styles.cartList}>
                    {shopCart.map(item => (
                      <View key={item.product.id} style={styles.cartRow}>
                        <View style={styles.cartThumb}>
                          {item.product.imageUrl ? (
                            <Image
                              source={{uri: item.product.imageUrl}}
                              style={styles.cartThumbImage}
                            />
                          ) : (
                            <Package color={colors.secondary} size={20} />
                          )}
                        </View>
                        <View style={styles.cartInfo}>
                          <Text style={styles.cartTitle} numberOfLines={2}>
                            {item.product.title}
                          </Text>
                          <Text style={styles.cartMeta}>
                            {formatPkr(item.product.price)} each
                          </Text>
                          <View style={styles.cartLineRow}>
                            <Text style={styles.cartLineTotal}>
                              {formatPkr(item.product.price * item.quantity)}
                            </Text>
                            <Text style={styles.cartStockText}>
                              Stock {item.product.stock}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.cartActions}>
                          <Pressable
                            style={styles.deleteCartButton}
                            onPress={() => changeProductQuantity(item.product, 0)}
                          >
                            <Trash2 color={colors.error} size={16} strokeWidth={2.4} />
                          </Pressable>
                          <View style={styles.qtyControl}>
                            <Pressable
                              style={styles.qtyButton}
                              onPress={() =>
                                changeProductQuantity(
                                  item.product,
                                  item.quantity - 1,
                                )
                              }
                            >
                              <Minus color={colors.ink} size={15} />
                            </Pressable>
                            <Text style={styles.qtyText}>{item.quantity}</Text>
                            <Pressable
                              style={[
                                styles.qtyButton,
                                item.quantity >= item.product.stock &&
                                  styles.qtyButtonDisabled,
                              ]}
                              onPress={() =>
                                changeProductQuantity(
                                  item.product,
                                  item.quantity + 1,
                                )
                              }
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus
                                color={
                                  item.quantity >= item.product.stock
                                    ? colors.muted
                                    : colors.ink
                                }
                                size={15}
                              />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.checkoutBox}>
                  <View style={styles.checkoutHeaderBox}>
                    <ShoppingBag color={colors.secondary} size={21} strokeWidth={2.3} />
                    <View style={{flex: 1}}>
                      <Text style={styles.checkoutHeading}>Checkout summary</Text>
                      <Text style={styles.checkoutSubheading}>
                        Confirm delivery details and complete shopping.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.deliveryBox}>
                    <Text style={styles.deliveryLabel}>Delivery location</Text>
                    <Text style={styles.deliveryText}>
                      This location is only for your shop order and does not
                      depend on service booking addresses.
                    </Text>
                    <TextInput
                      value={deliveryLocation}
                      onChangeText={setDeliveryLocation}
                      placeholder="House, street, area and city"
                      placeholderTextColor={colors.muted}
                      style={[styles.editorInput, styles.editorTextArea]}
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.deliveryActions}>
                      <Pressable
                        style={styles.manualDeliveryButton}
                        onPress={handleSaveManualShopLocation}
                      >
                        <MapPin
                          color={colors.secondary}
                          size={16}
                          strokeWidth={2.3}
                        />
                        <Text style={styles.manualDeliveryText}>
                          Save manual address
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.locateDeliveryButton,
                          locatingShopLocation && styles.locateDeliveryButtonDisabled,
                        ]}
                        onPress={handleLocateShopLocation}
                        disabled={locatingShopLocation}
                      >
                        <LocateFixed
                          color={colors.secondary}
                          size={16}
                          strokeWidth={2.3}
                        />
                        <Text style={styles.locateDeliveryText}>
                          {locatingShopLocation
                            ? 'Detecting...'
                            : 'Use current location'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  {rewardEnabled && user ? (
                    <Pressable
                      style={[
                        styles.rewardBox,
                        useRewardPoints && styles.rewardBoxActive,
                        !canRedeemReward && styles.rewardBoxDisabled,
                      ]}
                      onPress={() => {
                        if (canRedeemReward) {
                          setUseRewardPoints(current => !current);
                        }
                      }}
                    >
                      <View style={styles.rewardIconBox}>
                        <Gift color={colors.secondary} size={19} strokeWidth={2.3} />
                      </View>
                      <View style={styles.rewardCopy}>
                        <Text style={styles.rewardTitle}>Reward points</Text>
                        <Text style={styles.rewardText}>
                          {rewardPoints} point(s) worth{' '}
                          {formatPkr(rewardBalanceValue)}.
                        </Text>
                        <Text style={styles.rewardHint}>
                          {canRedeemReward
                            ? `Use ${formatPkr(
                                redeemableRewardValue,
                              )} off this shop order.`
                            : pointsNeeded > 0
                              ? `${pointsNeeded} more point(s) needed to redeem rewards.`
                              : `Reward discount is below the ${formatPkr(
                                  rewardMinimumRedeem,
                                )} minimum for this order.`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.rewardCheckbox,
                          useRewardPoints && styles.rewardCheckboxChecked,
                        ]}
                      >
                        {useRewardPoints ? (
                          <Check color="#ffffff" size={13} strokeWidth={3} />
                        ) : null}
                      </View>
                    </Pressable>
                  ) : null}
                  <View style={styles.priceBreakdown}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Products subtotal</Text>
                      <Text style={styles.priceValue}>{formatPkr(subtotal)}</Text>
                    </View>
                    {rewardDiscount > 0 ? (
                      <View style={styles.priceRow}>
                        <Text style={styles.rewardPriceLabel}>
                          Reward discount ({Math.round(
                            rewardDiscount / rewardPointValue,
                          )}{' '}
                          pts)
                        </Text>
                        <Text style={styles.rewardPriceValue}>
                          -{formatPkr(rewardDiscount)}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Shipping cost</Text>
                      <Text style={styles.priceValue}>
                        {formatPkr(shippingCost)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cartTotalRow}>
                    <View>
                      <Text style={styles.cartTotalLabel}>Payable total</Text>
                      <Text style={styles.paymentMethod}>Cash on Delivery</Text>
                    </View>
                    <Text style={styles.cartTotal}>{formatPkr(total)}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.checkoutButton,
                      checkingOut && styles.checkoutButtonDisabled,
                    ]}
                    onPress={handleCheckout}
                    disabled={checkingOut}
                  >
                    <Text style={styles.checkoutText}>
                      {checkingOut ? 'Placing order...' : 'Complete shopping'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
        onScroll={handleProductsScroll}
        scrollEventThrottle={250}
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
              <Text style={styles.title}>Store</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Products for repairs, cleaning, and home care.
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.ordersButton}
              onPress={() => navigation.navigate('ShoppingOrders')}
            >
              <Text style={styles.ordersButtonText}>Orders</Text>
            </Pressable>
            <Pressable style={styles.cartBadge} onPress={() => setCartVisible(true)}>
              <ShoppingCart color={colors.secondary} size={20} strokeWidth={2.3} />
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </Pressable>
          </View>
        </View>

        {message ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ShoppingBag color={colors.secondary} size={26} strokeWidth={2.3} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Service essentials</Text>
            <Text style={styles.heroText}>
              Buy products recommended for UstaadPro services and home upkeep.
            </Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Search color={colors.muted} size={18} strokeWidth={2.2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map(category => (
            <Pressable
              key={category.name}
              style={[
                styles.categoryChip,
                activeCategory === category.name && styles.categoryChipActive,
              ]}
              onPress={() => {
                setActiveCategory(category.name);
                setQuery('');
                void fetchShopProducts({reset: true, category: category.name});
              }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  activeCategory === category.name && styles.categoryChipTextActive,
                ]}
              >
{category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Products</Text>
          <Text style={styles.sectionMeta}>{filteredProducts.length} / {activeCategoryTotal} items</Text>
        </View>

        {shopProductsLoading && filteredProducts.length === 0 ? (
          <View style={styles.productLoadingFooter}>
            <ActivityIndicator color={colors.secondary} size="small" />
            <Text style={styles.productLoadingText}>Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Package color={colors.secondary} size={30} strokeWidth={2.2} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              Try another category or search term.
            </Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map(product => {
              const inCart = shopCart.find(item => item.product.id === product.id);
              return (
                <Pressable
                  key={product.id}
                  style={({pressed}) => [
                    styles.productCard,
                    pressed && {opacity: 0.92},
                  ]}
                  onPress={() => setSelectedProduct(product)}
                >
                  <View style={styles.productImageBox}>
                    {product.imageUrl ? (
                      <Image
                        source={{uri: resolveApiAssetUrl(product.imageUrl)}}
                        style={styles.productImage}
                      />
                    ) : (
                      <Package color={colors.secondary} size={28} />
                    )}
                    {inCart && (
                      <View style={styles.inCartPill}>
                        <Text style={styles.inCartPillText}>x{inCart.quantity}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.productCategory} numberOfLines={1}>
                    {product.category}
                  </Text>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {product.title}
                  </Text>
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>
                      {formatPkr(product.price)}
                    </Text>
                    {inCart ? (
                      <View style={styles.cardQtyControl}>
                        <Pressable
                          style={styles.cardQtyButton}
                          onPress={event => {
                            event.stopPropagation();
                            changeProductQuantity(product, inCart.quantity - 1);
                          }}
                        >
                          <Minus color={colors.ink} size={14} strokeWidth={2.4} />
                        </Pressable>
                        <Text style={styles.cardQtyText}>{inCart.quantity}</Text>
                        <Pressable
                          style={[
                            styles.cardQtyButton,
                            inCart.quantity >= product.stock &&
                              styles.cardQtyButtonDisabled,
                          ]}
                          onPress={event => {
                            event.stopPropagation();
                            changeProductQuantity(product, inCart.quantity + 1);
                          }}
                          disabled={inCart.quantity >= product.stock}
                        >
                          <Plus
                            color={
                              inCart.quantity >= product.stock
                                ? colors.muted
                                : colors.ink
                            }
                            size={14}
                            strokeWidth={2.4}
                          />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={[
                          styles.addIconButton,
                          product.stock <= 0 && styles.disabledAddIconButton,
                        ]}
                        onPress={event => {
                          event.stopPropagation();
                          addProduct(product);
                        }}
                        disabled={product.stock <= 0}
                      >
                        <Plus color="#ffffff" size={17} strokeWidth={2.5} />
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {shopProductsLoadingMore ? (
          <View style={styles.productLoadingFooter}>
            <ActivityIndicator color={colors.secondary} size="small" />
            <Text style={styles.productLoadingText}>Loading more products...</Text>
          </View>
        ) : shopProductsHasMore ? (
          <Pressable
            style={styles.productLoadHint}
            onPress={() => fetchShopProducts({category: activeCategory})}
          >
            <Text style={styles.productLoadHintText}>Load more products</Text>
          </Pressable>
        ) : shopProducts.length > 0 ? (
          <View style={styles.productLoadHint}>
            <Text style={styles.productLoadHintText}>All products loaded</Text>
          </View>
        ) : null}

        <View style={{height: 120}} />
      </ScrollView>
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
  content: {padding: 20, paddingBottom: 110},
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
    fontWeight: '900',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 42,
    gap: 8,
  },
  ordersButton: {
    height: 42,
    borderRadius: rounded.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  ordersButtonText: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.ink,
    fontSize: 12,
  },
  cartBadge: {
    minWidth: 54,
    height: 44,
    borderRadius: rounded.full,
    backgroundColor: '#effcf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cartBadgeText: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.secondary,
    fontSize: 13,
  },
  notice: {
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {fontFamily: fontFamily.medium, color: colors.text, fontSize: 12},
  heroCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: rounded.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: rounded.default,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroCopy: {flex: 1},
  heroTitle: {fontFamily: fontFamily.bold, fontWeight: '900', color: '#ffffff', fontSize: 18},
  heroText: {
    fontFamily: fontFamily.regular,
    color: colors.inversePrimary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  searchBox: {
    height: 48,
    borderRadius: rounded.default,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    padding: 0,
  },
  categoryRow: {gap: 10, paddingBottom: 18},
  categoryChip: {
    height: 38,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: colors.authDark,
    borderColor: colors.authDark,
  },
  categoryChipText: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.text,
    fontSize: 12,
  },
  categoryChipTextActive: {color: '#ffffff'},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 18,
  },
  sectionMeta: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.secondary,
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {fontFamily: fontFamily.bold, color: colors.ink, marginTop: 10},
  emptyText: {fontFamily: fontFamily.regular, color: colors.muted, marginTop: 4},
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  productCard: {
    width: '48%',
    minHeight: 238,
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 10,
  },
  productImageBox: {
    height: 124,
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  productImage: {width: '100%', height: '100%'},
  inCartPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inCartPillText: {
    color: '#ffffff',
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
  productCategory: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  productTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    minHeight: 36,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 10,
  },
  productPrice: {
    flex: 1,
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 13,
  },
  productLoadingFooter: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
    borderRadius: rounded.default,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eeff',
  },
  productLoadingText: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 12,
  },
  productLoadHint: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  productLoadHintText: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
  },
  addIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardQtyControl: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: '#d8e3f4',
    overflow: 'hidden',
  },
  cardQtyButton: {
    width: 31,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardQtyButtonDisabled: {
    opacity: 0.55,
  },
  cardQtyText: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
  },
  disabledAddIconButton: {
    backgroundColor: colors.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.5)',
    justifyContent: 'flex-end',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 21,
  },
  successBody: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  successButton: {
    height: 44,
    borderRadius: rounded.default,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 18,
    alignSelf: 'stretch',
  },
  successButtonText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 14,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.45)',
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
  },
  confirmTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 20,
  },
  confirmSubtitle: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  confirmDetailsBox: {
    borderRadius: rounded.default,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    padding: 12,
    marginTop: 16,
    gap: 10,
  },
  confirmDetailRow: {
    gap: 3,
  },
  confirmDetailLabel: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  confirmDetailValue: {
    fontFamily: fontFamily.medium,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
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
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmEditText: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
  },
  confirmPlaceButton: {
    flex: 1.35,
    minHeight: 46,
    borderRadius: rounded.default,
    backgroundColor: colors.authDark,
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
  addedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.42)',
    justifyContent: 'center',
    padding: 22,
  },
  addedCard: {
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    padding: 18,
  },
  addedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  addedIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedTitle: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 21,
  },
  addedProductName: {
    fontFamily: fontFamily.medium,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  addedActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryAction: {
    flex: 1,
    height: 46,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 14,
  },
  primaryAction: {
    flex: 1,
    height: 46,
    borderRadius: rounded.default,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 14,
  },
  productSheet: {
    maxHeight: '88%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  cartSheet: {
    maxHeight: '86%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 19,
  },
  sheetSubtitle: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImageBox: {
    height: 240,
    borderRadius: rounded.xl,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailImage: {width: '100%', height: '100%'},
  detailCategory: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.secondary,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  detailTitle: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 24,
    lineHeight: 31,
    marginTop: 6,
  },
  detailDescription: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  detailMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: rounded.default,
    padding: 14,
    marginTop: 18,
  },
  detailInfoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  detailInfoItem: {
    flex: 1,
    borderRadius: rounded.default,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  detailInfoLabel: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  detailInfoText: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.ink,
    fontSize: 13,
    marginTop: 5,
  },
  detailPrice: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 22,
  },
  originalPrice: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  detailStock: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.secondary,
    fontSize: 12,
  },
  outOfStockText: {
    color: colors.error,
  },
  detailAddButton: {
    height: 54,
    borderRadius: rounded.default,
    backgroundColor: colors.authDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  disabledAddButton: {
    backgroundColor: colors.muted,
  },
  detailFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  detailFooterButton: {
    flex: 1,
    marginTop: 0,
  },
  detailShowCartButton: {
    height: 54,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: colors.authDark,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  detailShowCartText: {
    fontFamily: fontFamily.bold,
    color: colors.authDark,
    fontSize: 15,
  },
  detailAddText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 16,
  },
  detailQtyPanel: {
    minHeight: 58,
    borderRadius: rounded.default,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#d8e3f4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginTop: 16,
  },
  detailQtyLabel: {
    fontFamily: fontFamily.bold,
    color: colors.muted,
    fontSize: 12,
  },
  detailQtyTotal: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 16,
    marginTop: 2,
  },
  detailQtyControl: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e3f4',
    overflow: 'hidden',
  },
  detailQtyButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailQtyButtonDisabled: {
    opacity: 0.55,
  },
  detailQtyText: {
    minWidth: 30,
    textAlign: 'center',
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 14,
  },
  emptyCartSheet: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    padding: 20,
  },
  cartBodyScroll: {
    maxHeight: '100%',
  },
  cartBodyContent: {
    paddingBottom: 8,
  },
  cartItemsBox: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    padding: 14,
    marginBottom: 12,
  },
  cartSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cartSectionTitle: {
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 15,
  },
  cartSectionSubtitle: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  cartSectionCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#effcf6',
    color: colors.secondary,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    overflow: 'hidden',
  },
  cartList: {
    gap: 10,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fbff',
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#e5eeff',
    padding: 10,
  },
  cartThumb: {
    width: 54,
    height: 54,
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  cartThumbImage: {width: '100%', height: '100%'},
  cartInfo: {flex: 1},
  cartTitle: {fontFamily: fontFamily.bold, fontWeight: '800', color: colors.ink, fontSize: 13},
  cartMeta: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  cartLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cartLineTotal: {
    fontFamily: fontFamily.extraBold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 13,
  },
  cartStockText: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 10,
  },
  cartActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  deleteCartButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyControl: {flexDirection: 'row', alignItems: 'center', gap: 8},
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.55,
  },
  qtyText: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    minWidth: 18,
    textAlign: 'center',
  },
  checkoutBox: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.xl,
    padding: 16,
    marginTop: 12,
  },
  checkoutHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: rounded.default,
    backgroundColor: '#effcf6',
    padding: 12,
    marginBottom: 12,
  },
  checkoutHeading: {
    fontFamily: fontFamily.bold,
    fontWeight: '900',
    color: colors.ink,
    fontSize: 14,
  },
  checkoutSubheading: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  deliveryBox: {
    borderRadius: rounded.default,
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    marginBottom: 12,
  },
  deliveryLabel: {
    fontFamily: fontFamily.bold,
    fontWeight: '800',
    color: colors.ink,
    fontSize: 12,
    marginBottom: 4,
  },
  editorInput: {
    minHeight: 44,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    fontFamily: fontFamily.regular,
    color: colors.ink,
    fontSize: 13,
    marginBottom: 10,
  },
  editorTextArea: {
    minHeight: 78,
    paddingTop: 10,
  },
  deliveryText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  deliveryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  manualDeliveryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  manualDeliveryText: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 12,
    textAlign: 'center',
  },
  locateDeliveryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#effcf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  locateDeliveryButtonDisabled: {
    opacity: 0.7,
  },
  locateDeliveryText: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 12,
  },
  rewardBox: {
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#d7e4ef',
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardBoxActive: {
    borderColor: colors.secondary,
    backgroundColor: '#f0fbf6',
  },
  rewardBoxDisabled: {
    opacity: 0.72,
  },
  rewardIconBox: {
    width: 38,
    height: 38,
    borderRadius: rounded.default,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCopy: {
    flex: 1,
  },
  rewardTitle: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
  },
  rewardText: {
    fontFamily: fontFamily.regular,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  rewardHint: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  rewardCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCheckboxChecked: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  priceBreakdown: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eff4ff',
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  priceLabel: {
    fontFamily: fontFamily.medium,
    color: colors.muted,
    fontSize: 12,
  },
  priceValue: {
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 13,
  },
  rewardPriceLabel: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 12,
  },
  rewardPriceValue: {
    fontFamily: fontFamily.bold,
    color: colors.secondary,
    fontSize: 13,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartTotalLabel: {fontFamily: fontFamily.bold, color: colors.text},
  paymentMethod: {
    fontFamily: fontFamily.regular,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  cartTotal: {fontFamily: fontFamily.extraBold, fontWeight: '900', color: colors.ink, fontSize: 20},
  checkoutButton: {
    height: 50,
    borderRadius: rounded.default,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  checkoutButtonDisabled: {
    opacity: 0.65,
  },
  checkoutText: {fontFamily: fontFamily.bold, color: '#ffffff', fontSize: 15},
});

