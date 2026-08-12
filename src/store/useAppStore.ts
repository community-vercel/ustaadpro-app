import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppSettings,
  CartItem,
  AppNotification,
  HomeSlide,
  Order,
  ServiceCategory,
  ServiceSubcategory,
  ServiceItem,
  ShopCartItem,
  ShopOrder,
  ShopProduct,
  ServiceReview,
  SavedLocation,
  User,
  UserAddress,
} from '@/types/models';
import {apiClient, resolveApiAssetUrl} from '@/api/client';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_SESSION_KEY = 'auth_session';
const GUEST_SESSION_KEY = 'guest_session';
const SERVICE_LOCATION_KEY = 'saved_service_location';
const SHOP_LOCATION_KEY = 'saved_shop_location';
const PENDING_PAYMENT_ORDER_ID_KEY = 'pending_service_payment_order_id';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

let ordersRequest: Promise<void> | null = null;
let lastOrdersFingerprint = '';

const LEGACY_CATEGORY_ALIASES: Record<string, {id: string; title: string} | null> = {
  'ac-services': {id: 'hvac', title: 'HVAC'},
  hvac: {id: 'hvac', title: 'HVAC'},
  cleaning: {id: 'home-services', title: 'Home Services'},
  'cleaning-service': {id: 'home-services', title: 'Home Services'},
  'home-cleaning': {id: 'home-services', title: 'Home Services'},
  'dry-cleaning': {id: 'home-services', title: 'Home Services'},
  'home-service': {id: 'home-services', title: 'Home Services'},
  'home-services': {id: 'home-services', title: 'Home Services'},
  painter: {id: 'painter', title: 'Painter'},
  painters: {id: 'painter', title: 'Painter'},
  plumber: {id: 'plumber', title: 'Plumber'},
  plumbers: {id: 'plumber', title: 'Plumber'},
  welder: {id: 'welder', title: 'Welder'},
  'welder-fabricator': {id: 'welder', title: 'Welder'},
  subscriptions: null,
};

function canonicalCategory(id?: string, title?: string) {
  const key = String(id || title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return LEGACY_CATEGORY_ALIASES[key] === undefined
    ? {id: id || key, title: title || id || 'Services'}
    : LEGACY_CATEGORY_ALIASES[key];
}

type StoredAuthSession = {
  user: User;
  expiresAt: number;
};

function normalizeUser(user: any): User {
  return {
    ...user,
    walletBalance: Number(user.walletBalance ?? user.wallet_balance ?? 0),
    coins: Number(user.coins ?? 0),
    rewardPoints: Number(user.rewardPoints ?? user.reward_points ?? 0),
  };
}

async function saveAuthSession(token: string, user: User) {
  const session: StoredAuthSession = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_SESSION_KEY, JSON.stringify(session)],
  ]);
  await AsyncStorage.removeItem(GUEST_SESSION_KEY);
}

async function clearAuthSession() {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_SESSION_KEY]);
}
async function refreshProfileState(setState: (partial: Partial<AppState>) => void) {
  try {
    const response = await apiClient.get('/auth/profile');
    const freshUser = normalizeUser(response.data);
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      await saveAuthSession(token, freshUser);
    }
    setState({user: freshUser});
  } catch (error) {
    console.error('Profile reward refresh error:', error);
  }
}

interface AppState {
  isOnboarded: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  user: User | null;
  cart: CartItem[];
  shopCart: ShopCartItem[];
  orders: Order[];
  shopOrders: ShopOrder[];
  addresses: UserAddress[];
  savedServiceLocation: SavedLocation | null;
  savedShopLocation: SavedLocation | null;
  categories: ServiceCategory[];
  subcategories: ServiceSubcategory[];
  services: ServiceItem[];
  shopProducts: ShopProduct[];
  shopCategories: Array<{name: string; total: number}>;
  shopProductsHasMore: boolean;
  shopProductsLoading: boolean;
  shopProductsLoadingMore: boolean;
  homeSlides: HomeSlide[];
  appSettings: AppSettings;
  notifications: AppNotification[];
  pendingPaymentOrderId: string | null;
  shopCartOpenRequestId: number;
  locationPromptVisible: boolean;

  hydrateAppState: () => Promise<void>;
  completeOnboarding: () => void;
  continueAsGuest: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  requestLoginOtp: (payload: {phone: string}) => Promise<void>;
  verifyLoginOtp: (payload: {phone: string; code: string}) => Promise<void>;
  requestPasswordResetOtp: (payload: {
    channel: 'email' | 'phone';
    email?: string;
    phone?: string;
  }) => Promise<void>;
  resetPasswordWithOtp: (payload: {
    channel: 'email' | 'phone';
    email?: string;
    phone?: string;
    code: string;
    newPassword: string;
  }) => Promise<void>;
  signup: (payload: {
    name: string;
    phone: string;
    email: string;
    password: string;
    verificationChannel?: 'email' | 'phone';
  }) => Promise<void>;
  verifySignupOtp: (payload: {
    email?: string;
    phone?: string;
    code: string;
    verificationChannel?: 'email' | 'phone';
  }) => Promise<void>;
  logout: () => Promise<void>;

  fetchServices: () => Promise<void>;
  fetchAppContent: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchShopProducts: (options?: {reset?: boolean; category?: string; search?: string}) => Promise<void>;
  fetchShopOrders: () => Promise<void>;
  fetchServiceReviews: (serviceId: string) => Promise<ServiceReview[]>;
  submitServiceReview: (payload: {
    serviceId: string;
    orderId: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
  updateServiceOrder: (
    orderId: string,
    payload: {
      address: string;
      specialInstructions?: string | null;
      bookedFor?: string;
      recurringOccurrences?: number;
      items?: Array<{serviceId: string; quantity: number}>;
    },
  ) => Promise<Order>;
  cancelServiceOrder: (orderId: string, cancelReason: string) => Promise<void>;
  uploadPaymentReceipt: (payload: {
    orderId: string;
    dataUrl: string;
    filename?: string;
    amount: number;
  }) => Promise<void>;
  cancelShopOrder: (orderId: string, cancelReason: string) => Promise<void>;
  fetchAddresses: () => Promise<void>;
  hydrateNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & Partial<Pick<AppNotification, 'id' | 'createdAt'>>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  setPendingPaymentOrderId: (orderId: string | null) => Promise<void>;
  requestOpenShopCart: () => void;
  setLocationPromptVisible: (visible: boolean) => void;
  addAddress: (payload: {
    label: string;
    detail: string;
  }) => Promise<UserAddress>;
  updateAddress: (
    id: number,
    payload: {
      label: string;
      detail: string;
      isDefault?: boolean;
    },
  ) => Promise<UserAddress>;
  setSavedServiceLocation: (location: SavedLocation | null) => Promise<void>;
  setSavedShopLocation: (location: SavedLocation | null) => Promise<void>;

  addToCart: (service: ServiceItem) => void;
  removeFromCart: (serviceId: string, serviceWorkPriceId?: number) => void;
  updateCartQuantity: (serviceId: string, quantity: number, serviceWorkPriceId?: number) => void;
  clearCart: () => void;
  checkout: (checkoutDetails: any) => Promise<Order>;
  addShopProductToCart: (product: ShopProduct) => void;
  removeShopProductFromCart: (productId: string) => void;
  updateShopCartQuantity: (productId: string, quantity: number) => void;
  clearShopCart: () => void;
  checkoutShopCart: (checkoutDetails: {
    address: string;
    paymentMethod: string;
    useRewardPoints?: boolean;
  }) => Promise<ShopOrder>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isOnboarded: false,
  isAuthenticated: false,
  isGuest: false,
  user: null,
  cart: [],
  shopCart: [],
  orders: [],
  shopOrders: [],
  addresses: [],
  savedServiceLocation: null,
  savedShopLocation: null,
  categories: [],
  subcategories: [],
  services: [],
  shopProducts: [],
  shopCategories: [],
  shopProductsHasMore: true,
  shopProductsLoading: false,
  shopProductsLoadingMore: false,
  homeSlides: [],
  notifications: [],
  pendingPaymentOrderId: null,
  shopCartOpenRequestId: 0,
  locationPromptVisible: false,
  appSettings: {
    inspectionFee: 500,
    serviceTaxPercent: 12,
    minimumBookingLeadHours: 4,
    currency: 'PKR',
    supportPhone: '+923001234567',
    shippingCost: 200,
    rewardEnabled: true,
    rewardPointValue: 25,
    rewardMinimumRedeem: 100,
    serviceRewardPointsOnCompletion: 1,
    serviceRewardMaxDiscountPercent: 10,
    shopRewardEarnPercent: 0.5,
    shopRewardMaxDiscountPercent: 5,
  },

  hydrateAppState: async () => {
    try {
      const [
        onboarded,
        token,
        rawSession,
        guestSession,
        rawServiceLocation,
        rawShopLocation,
        pendingPaymentOrderId,
      ] = await Promise.all([
        AsyncStorage.getItem('onboarding_complete'),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_SESSION_KEY),
        AsyncStorage.getItem(GUEST_SESSION_KEY),
        AsyncStorage.getItem(SERVICE_LOCATION_KEY),
        AsyncStorage.getItem(SHOP_LOCATION_KEY),
        AsyncStorage.getItem(PENDING_PAYMENT_ORDER_ID_KEY),
      ]);

      const nextState: Partial<AppState> = {
        isOnboarded: onboarded === 'true',
        isGuest: guestSession === 'true',
        savedServiceLocation: rawServiceLocation
          ? JSON.parse(rawServiceLocation)
          : null,
        savedShopLocation: rawShopLocation ? JSON.parse(rawShopLocation) : null,
        pendingPaymentOrderId,
      };

      if (token && rawSession) {
        const session = JSON.parse(rawSession) as StoredAuthSession;

        if (session.expiresAt > Date.now()) {
          nextState.isAuthenticated = true;
          nextState.isGuest = false;
          nextState.user = normalizeUser(session.user);

          apiClient
            .get('/auth/profile')
            .then(response => {
              const freshUser = normalizeUser(response.data);
              void AsyncStorage.setItem(
                AUTH_SESSION_KEY,
                JSON.stringify({
                  user: freshUser,
                  expiresAt: session.expiresAt,
                }),
              );
              set({user: freshUser});
            })
            .catch(error => {
              console.error('Session profile refresh error:', error);
              void clearAuthSession();
              set({isAuthenticated: false, user: null});
            });
        } else {
          await clearAuthSession();
        }
      }

      set(nextState);
    } catch (error) {
      console.error('Hydrate app state error:', error);
      await clearAuthSession();
      set({isAuthenticated: false, user: null});
    }
  },

  hydrateNotifications: async () => {
    try {
      const raw = await AsyncStorage.getItem('push_notifications');
      const notifications = raw ? (JSON.parse(raw) as AppNotification[]) : [];
      set({notifications: notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt))});
    } catch (error) {
      console.error('Hydrate notifications error:', error);
    }
  },

  addNotification: async notification => {
    try {
      const nextNotification: AppNotification = {
        id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt || new Date().toISOString(),
        read: false,
        orderId: notification.orderId,
        status: notification.status,
      };

      let nextNotifications: AppNotification[] = [];
      set(state => {
        nextNotifications = [nextNotification, ...state.notifications].slice(0, 100);
        return {notifications: nextNotifications};
      });
      await AsyncStorage.setItem('push_notifications', JSON.stringify(nextNotifications));
    } catch (error) {
      console.error('Add notification error:', error);
    }
  },

  markNotificationRead: async id => {
    try {
      let nextNotifications: AppNotification[] = [];
      set(state => {
        nextNotifications = state.notifications.map(item =>
          item.id === id ? {...item, read: true} : item,
        );
        return {notifications: nextNotifications};
      });
      await AsyncStorage.setItem('push_notifications', JSON.stringify(nextNotifications));
    } catch (error) {
      console.error('Mark notification read error:', error);
    }
  },

  setPendingPaymentOrderId: async orderId => {
    set({pendingPaymentOrderId: orderId});
    if (orderId) {
      await AsyncStorage.setItem(PENDING_PAYMENT_ORDER_ID_KEY, orderId);
    } else {
      await AsyncStorage.removeItem(PENDING_PAYMENT_ORDER_ID_KEY);
    }
  },
  requestOpenShopCart: () => set({shopCartOpenRequestId: Date.now()}),
  setLocationPromptVisible: visible => set({locationPromptVisible: visible}),

  markAllNotificationsRead: async () => {
    try {
      let nextNotifications: AppNotification[] = [];
      set(state => {
        nextNotifications = state.notifications.map(item => ({...item, read: true}));
        return {notifications: nextNotifications};
      });
      await AsyncStorage.setItem('push_notifications', JSON.stringify(nextNotifications));
    } catch (error) {
      console.error('Mark all notifications read error:', error);
    }
  },

  completeOnboarding: () => {
    void AsyncStorage.setItem('onboarding_complete', 'true');
    set({isOnboarded: true});
  },

  continueAsGuest: async () => {
    set({
      isAuthenticated: false,
      isGuest: true,
      user: null,
      orders: [],
      shopOrders: [],
      addresses: [],
    });

    try {
      await clearAuthSession();
      await AsyncStorage.setItem(GUEST_SESSION_KEY, 'true');
    } catch (error) {
      console.error('Continue as guest error:', error);
    }
  },

  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', {email, password});
      const {token} = response.data;
      const user = normalizeUser(response.data.user);
      await saveAuthSession(token, user);

      set({
        isAuthenticated: true,
        isGuest: false,
        user,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  loginWithPhone: async phone => {
    try {
      const response = await apiClient.post('/auth/login-phone', {phone});
      const {token} = response.data;
      const user = normalizeUser(response.data.user);
      await saveAuthSession(token, user);

      set({
        isAuthenticated: true,
        isGuest: false,
        user,
      });
    } catch (error) {
      // LoginScreen presents expected API failures, including deleted accounts.
      // Avoid sending handled 404 responses to React Native development LogBox.
      throw error;
    }
  },

  requestLoginOtp: async payload => {
    try {
      await apiClient.post('/auth/request-login-otp', payload);
    } catch (error) {
      console.error('Login OTP request error:', error);
      throw error;
    }
  },

  verifyLoginOtp: async payload => {
    try {
      const response = await apiClient.post('/auth/verify-login-otp', payload);
      const {token} = response.data;
      const user = normalizeUser(response.data.user);
      await saveAuthSession(token, user);

      set({
        isAuthenticated: true,
        isGuest: false,
        user,
      });
    } catch (error) {
      console.error('Login OTP verification error:', error);
      throw error;
    }
  },

  requestPasswordResetOtp: async payload => {
    try {
      await apiClient.post('/auth/forgot-password/request-otp', payload);
    } catch (error) {
      console.error('Password reset OTP request error:', error);
      throw error;
    }
  },

  resetPasswordWithOtp: async payload => {
    try {
      await apiClient.post('/auth/forgot-password/reset', payload);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },

  signup: async payload => {
    try {
      await apiClient.post('/auth/signup', payload);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  verifySignupOtp: async payload => {
    try {
      const response = await apiClient.post('/auth/verify-signup-otp', payload);
      const {token} = response.data;
      const user = normalizeUser(response.data.user);
      await saveAuthSession(token, user);

      set({
        isAuthenticated: true,
        isGuest: false,
        user,
      });
    } catch (error) {
      console.error('Signup OTP verification error:', error);
      throw error;
    }
  },

  logout: async () => {
    await clearAuthSession();
    await AsyncStorage.removeItem(GUEST_SESSION_KEY);
    set({
      isAuthenticated: false,
      isGuest: false,
      user: null,
      cart: [],
      shopCart: [],
      orders: [],
      shopOrders: [],
      addresses: [],
    });
  },

  fetchServices: async () => {
    try {
      const response = await apiClient.get('/catalog');
      const catalog = Array.isArray(response.data) ? response.data : [];
      const categories: ServiceCategory[] = catalog.map((category: any) => ({
        id: category.id,
        title: category.title,
        subtitle: category.subtitle || 'Explore services',
        icon: category.icon || 'tool',
        tint: category.tint || '#006C49',
        imageUrl: resolveApiAssetUrl(category.imageUrl || category.image_url || category.mainCategory?.mobileIconUrl || ''),
        webImageUrl: resolveApiAssetUrl(category.mainCategory?.webImageUrl || category.webImageUrl || category.web_image_url || category.imageUrl || category.image_url || ''),
        mobileIconUrl: resolveApiAssetUrl(category.mainCategory?.mobileIconUrl || category.mobileIconUrl || category.mobile_icon_url || category.imageUrl || category.image_url || ''),
      }));
      const subcategories: ServiceSubcategory[] = catalog.flatMap((category: any) =>
        (category.subcategories || []).map((item: any) => ({
          id: item.id,
          categoryId: canonicalCategory(item.categoryId || item.category_id || category.id, category.title)?.id || category.id,
          title: (item.subCategory || item).title,
          description: item.description || '',
          imageUrl: resolveApiAssetUrl(item.imageUrl || item.image_url || ''),
          webImageUrl: resolveApiAssetUrl(item.webImageUrl || item.web_image_url || item.imageUrl || item.image_url || ''),
          mobileIconUrl: resolveApiAssetUrl(item.mobileIconUrl || item.mobile_icon_url || item.imageUrl || item.image_url || ''),
        })),
      );
      const rawServices = catalog.flatMap((category: any) => [
        ...(category.directServices || category.services || []),
        ...(category.subcategories || []).flatMap((item: any) => item.services || []),
      ]);
      const services: ServiceItem[] = rawServices.map((s: any) => ({
        ...s,
        categoryId: canonicalCategory(s.categoryId || s.category_id)?.id || s.categoryId || s.category_id,
        subcategoryId: s.subcategoryId || s.subcategory_id || undefined,
        serviceType: s.unitDescription || s.serviceType || s.service_type,
        imageUrl: resolveApiAssetUrl(s.imageUrl || s.image_url || ''),
        detailDescription: s.detailDescription || s.detail_description || s.description,
        details: s.details || [],
        workPrices: (s.workPrices || s.work_prices || []).map((work: any) => ({...work, imageUrl: resolveApiAssetUrl(work.imageUrl || work.image_url || ''), price: Number(work.price || 0)})),
        originalPrice: Number(s.originalPrice ?? s.original_price ?? 0),
        price: Number(s.price || 0),
      }));
      // Deduplicate by id in case stale DB rows slip through
      const seenCats = new Set<string>();
      const uniqueCategories = categories.filter(c => { if (seenCats.has(c.id)) return false; seenCats.add(c.id); return true; });
      const seenSubs = new Set<string>();
      const uniqueSubcategories = subcategories.filter(s => { if (seenSubs.has(s.id)) return false; seenSubs.add(s.id); return true; });
      const seenSvcs = new Set<string>();
      const uniqueServices = services.filter(s => { if (seenSvcs.has(s.id)) return false; seenSvcs.add(s.id); return true; });
      set({categories: uniqueCategories, subcategories: uniqueSubcategories, services: uniqueServices});
    } catch (error) {
      console.error('Fetch services error:', error);
    }
  },
  fetchAppContent: async () => {
    try {
      const [slidesResponse, settingsResponse] = await Promise.all([
        apiClient.get('/home-slides'),
        apiClient.get('/settings'),
      ]);

      set({
        homeSlides: slidesResponse.data.map((slide: any) => ({
          ...slide,
          imageUrl: resolveApiAssetUrl(slide.imageUrl || slide.image_url || ''),
        })),
        appSettings: {
          inspectionFee: Number(settingsResponse.data.inspectionFee || 0),
          serviceTaxPercent: Number(
            settingsResponse.data.serviceTaxPercent || 0,
          ),
          minimumBookingLeadHours: Math.max(
            0,
            Math.min(168, Number(settingsResponse.data.minimumBookingLeadHours ?? settingsResponse.data.minimum_booking_lead_hours ?? 4) || 0),
          ),
          currency: settingsResponse.data.currency || 'PKR',
          supportPhone:
            settingsResponse.data.supportPhone ||
            settingsResponse.data.support_phone ||
            '+923001234567',
          shippingCost: Number(
            settingsResponse.data.shippingCost ??
              settingsResponse.data.shipping_cost ??
              0,
          ),
          rewardEnabled:
            settingsResponse.data.rewardEnabled ??
            settingsResponse.data.reward_enabled ??
            true,
          rewardPointValue: Number(
            settingsResponse.data.rewardPointValue ??
              settingsResponse.data.reward_point_value ??
              25,
          ),
          rewardMinimumRedeem: Number(
            settingsResponse.data.rewardMinimumRedeem ??
              settingsResponse.data.reward_minimum_redeem ??
              100,
          ),
          serviceRewardPointsOnCompletion: Number(
            settingsResponse.data.serviceRewardPointsOnCompletion ??
              settingsResponse.data.service_reward_points_on_completion ??
              settingsResponse.data.rewardPointsPerBooking ??
              settingsResponse.data.reward_points_per_booking ??
              1,
          ),
          serviceRewardMaxDiscountPercent: Number(
            settingsResponse.data.serviceRewardMaxDiscountPercent ??
              settingsResponse.data.service_reward_max_discount_percent ??
              10,
          ),
          shopRewardEarnPercent: Number(
            settingsResponse.data.shopRewardEarnPercent ??
              settingsResponse.data.shop_reward_earn_percent ??
              0.5,
          ),
          shopRewardMaxDiscountPercent: Number(
            settingsResponse.data.shopRewardMaxDiscountPercent ??
              settingsResponse.data.shop_reward_max_discount_percent ??
              5,
          ),
        },
      });
    } catch (error) {
      console.error('Fetch app content error:', error);
    }
  },

  fetchOrders: async () => {
    if (!get().user) {
      lastOrdersFingerprint = '';
      set({orders: []});
      return;
    }
    if (ordersRequest) {
      return ordersRequest;
    }

    const request = (async () => {
      try {
        const response = await apiClient.get('/orders');
        const orders = (Array.isArray(response.data) ? response.data : []).map(
          (order: any) => ({
            ...order,
            paymentReceipt: order.paymentReceipt
              ? {
                  ...order.paymentReceipt,
                  receiptUrl: String(
                    order.paymentReceipt.receiptUrl || order.paymentReceipt.receipt_url || '',
                  ).startsWith('data:image/')
                    ? resolveApiAssetUrl(
                        `/api/orders/${encodeURIComponent(order.id)}/receipts/${order.paymentReceipt.id}/image`,
                      )
                    : resolveApiAssetUrl(
                        order.paymentReceipt.receiptUrl || order.paymentReceipt.receipt_url || '',
                      ),
                }
              : null,
            paymentReceipts: (order.paymentReceipts || order.payment_receipts || []).map(
              (receipt: any) => ({
                ...receipt,
                receiptUrl: String(
                  receipt.receiptUrl || receipt.receipt_url || '',
                ).startsWith('data:image/')
                  ? resolveApiAssetUrl(
                      `/api/orders/${encodeURIComponent(order.id)}/receipts/${receipt.id}/image`,
                    )
                  : resolveApiAssetUrl(
                      receipt.receiptUrl || receipt.receipt_url || '',
                    ),
              }),
            ),
          }),
        );
        const userId = get().user?.email || get().user?.phone || 'anonymous';
        const fingerprint = `${userId}:${JSON.stringify(orders)}`;
        if (fingerprint !== lastOrdersFingerprint) {
          lastOrdersFingerprint = fingerprint;
          set({orders});
          void refreshProfileState(set);
        }
      } catch (error) {
        console.error('Fetch orders error:', error);
      }
    })();

    ordersRequest = request;
    try {
      await request;
    } finally {
      if (ordersRequest === request) ordersRequest = null;
    }
  },
  fetchShopProducts: async (options = {}) => {
    const pageSize = 15;
    const {reset = false, category = 'All', search = ''} = options;
    const state = get();

    if (!reset && (state.shopProductsLoadingMore || !state.shopProductsHasMore)) {
      return;
    }

    set(
      reset
        ? {shopProductsLoading: true, shopProductsHasMore: true}
        : {shopProductsLoadingMore: true},
    );

    try {
      const offset = reset ? 0 : get().shopProducts.length;
      const response = await apiClient.get('/shop/products', {
        params: {limit: pageSize, offset, category, ...(search ? {search} : {})},
      });
      const payload = response.data;
      const rawProducts = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.products)
          ? payload.products
          : [];
      const categories = Array.isArray(payload?.categories)
        ? payload.categories.map((item: any) => ({
            name: String(item.name || item.category || 'General'),
            total: Number(item.total || 0),
          }))
        : [];
      const products: ShopProduct[] = rawProducts.map((product: any) => ({
        ...product,
        imageUrl: resolveApiAssetUrl(product.imageUrl || ''),
        price: Number(product.price),
        originalPrice: Number(product.originalPrice || 0),
        stock: Number(product.stock || 0),
      }));

      set(current => {
        const existing = reset ? [] : current.shopProducts;
        const seen = new Set(existing.map(product => product.id));
        const merged = [
          ...existing,
          ...products.filter(product => !seen.has(product.id)),
        ];

        return {
          shopProducts: merged,
          shopCategories: categories.length ? categories : current.shopCategories,
          shopProductsHasMore: Array.isArray(payload)
            ? products.length === pageSize
            : Boolean(payload?.hasMore),
          shopProductsLoading: false,
          shopProductsLoadingMore: false,
        };
      });
    } catch (error) {
      set({shopProductsLoading: false, shopProductsLoadingMore: false});
      console.error('Fetch shop products error:', error);
    }
  },

  fetchShopOrders: async () => {
    if (!get().user) {
      set({shopOrders: []});
      return;
    }

    try {
      const response = await apiClient.get('/shop/orders');
      set({shopOrders: response.data});
      await refreshProfileState(set);
    } catch (error) {
      console.error('Fetch shop orders error:', error);
    }
  },

  fetchServiceReviews: async serviceId => {
    try {
      const response = await apiClient.get(`/services/${serviceId}/reviews`);
      return response.data;
    } catch (error) {
      console.error('Fetch service reviews error:', error);
      return [];
    }
  },

  submitServiceReview: async payload => {
    await apiClient.post('/reviews', payload);
    await Promise.all([get().fetchOrders(), get().fetchServices()]);
  },

  updateServiceOrder: async (orderId, payload) => {
    const response = await apiClient.put(`/orders/${orderId}`, payload);
    const updatedOrder = response.data.order;
    set(state => ({
      orders: state.orders.map(order =>
        order.id === orderId ? updatedOrder : order,
      ),
    }));
    return updatedOrder;
  },

  cancelServiceOrder: async (orderId, cancelReason) => {
    await apiClient.patch('/orders/' + orderId + '/cancel', {cancelReason});
    // The cancel endpoint returns an acknowledgement, not a complete Order.
    // Reload the populated order to keep Bookings rendering safely.
    await get().fetchOrders();
  },

  uploadPaymentReceipt: async payload => {
    await apiClient.post('/orders/' + payload.orderId + '/payment-receipt', {
      dataUrl: payload.dataUrl,
      filename: payload.filename,
      amount: payload.amount,
    });
  },

  cancelShopOrder: async (orderId, cancelReason) => {
    const response = await apiClient.patch(`/shop/orders/${orderId}/cancel`, {
      cancelReason,
    });
    set(state => ({
      shopOrders: state.shopOrders.map(order =>
        order.id === orderId
          ? {
              ...order,
              status: response.data.status || 'cancelled',
              cancelReason: response.data.cancelReason || cancelReason,
            }
          : order,
      ),
    }));
    await refreshProfileState(set);
  },

  fetchAddresses: async () => {
    if (!get().user) {
      set({addresses: []});
      return;
    }

    try {
      const response = await apiClient.get('/addresses');
      set({addresses: response.data});
    } catch (error) {
      console.error('Fetch addresses error:', error);
    }
  },

  addAddress: async payload => {
    const response = await apiClient.post('/addresses', payload);
    const address = response.data;
    set(state => ({addresses: [address, ...state.addresses]}));
    return address;
  },

  updateAddress: async (id, payload) => {
    const response = await apiClient.put(`/addresses/${id}`, payload);
    const address = response.data;
    set(state => ({
      addresses: state.addresses.map(item =>
        item.id === id ? {...item, ...address} : item,
      ),
    }));
    return address;
  },

  setSavedServiceLocation: async location => {
    if (location) {
      await AsyncStorage.setItem(SERVICE_LOCATION_KEY, JSON.stringify(location));
    } else {
      await AsyncStorage.removeItem(SERVICE_LOCATION_KEY);
    }
    set({savedServiceLocation: location});
  },

  setSavedShopLocation: async location => {
    if (location) {
      await AsyncStorage.setItem(SHOP_LOCATION_KEY, JSON.stringify(location));
    } else {
      await AsyncStorage.removeItem(SHOP_LOCATION_KEY);
    }
    set({savedShopLocation: location});
  },

  addToCart: service =>
    set(state => {
      const serviceWorkKey = service.selectedWorkPriceId || service.selectedWorkPrice?.id || null;
      const existing = state.cart.find(item => {
        const itemWorkKey = item.service.selectedWorkPriceId || item.service.selectedWorkPrice?.id || null;
        return item.service.id === service.id && itemWorkKey === serviceWorkKey;
      });
      if (existing) {
        return {
          cart: state.cart.map(item => {
            const itemWorkKey = item.service.selectedWorkPriceId || item.service.selectedWorkPrice?.id || null;
            return item.service.id === service.id && itemWorkKey === serviceWorkKey
              ? {...item, quantity: item.quantity + 1}
              : item;
          }),
        };
      }
      return {cart: [...state.cart, {service, quantity: 1}]};
    }),

  removeFromCart: (serviceId, serviceWorkPriceId) =>
    set(state => ({
      cart: state.cart.filter(item => {
        const itemWorkId = item.service.selectedWorkPriceId || item.service.selectedWorkPrice?.id;
        return item.service.id !== serviceId || itemWorkId !== serviceWorkPriceId;
      }),
    })),

  updateCartQuantity: (serviceId, quantity, serviceWorkPriceId) =>
    set(state => {
      const safeQuantity = Math.min(20, Math.max(0, Math.floor(Number(quantity) || 0)));
      const isTarget = (item: CartItem) => {
        const itemWorkId = item.service.selectedWorkPriceId || item.service.selectedWorkPrice?.id;
        return item.service.id === serviceId && itemWorkId === serviceWorkPriceId;
      };
      if (safeQuantity <= 0) return {cart: state.cart.filter(item => !isTarget(item))};
      return {cart: state.cart.map(item => isTarget(item) ? {...item, quantity: safeQuantity} : item)};
    }),
  clearCart: () => set({cart: []}),

  addShopProductToCart: product =>
    set(state => {
      if (product.stock <= 0) {
        return state;
      }

      const existing = state.shopCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          return state;
        }

        return {
          shopCart: state.shopCart.map(item =>
            item.product.id === product.id
              ? {...item, quantity: Math.min(item.quantity + 1, product.stock)}
              : item,
          ),
        };
      }
      return {shopCart: [...state.shopCart, {product, quantity: 1}]};
    }),

  removeShopProductFromCart: productId =>
    set(state => ({
      shopCart: state.shopCart.filter(item => item.product.id !== productId),
    })),

  updateShopCartQuantity: (productId, quantity) =>
    set(state => ({
      shopCart:
        quantity <= 0
          ? state.shopCart.filter(item => item.product.id !== productId)
          : state.shopCart.map(item =>
              item.product.id === productId
                ? {
                    ...item,
                    quantity: Math.min(
                      Math.max(1, Math.floor(quantity)),
                      Math.max(1, item.product.stock),
                    ),
                  }
                : item,
            ),
    })),

  clearShopCart: () => set({shopCart: []}),

  checkoutShopCart: async checkoutDetails => {
    const {shopCart, user} = get();
    if (!user) {
      throw new Error('Please login to place a shopping order.');
    }

    if (shopCart.length === 0) {
      throw new Error('Store cart is empty');
    }

    const response = await apiClient.post('/shop/checkout', {
      ...checkoutDetails,
      items: shopCart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    });
    const order = response.data.order;
    const updatedUser = response.data.user
      ? normalizeUser(response.data.user)
      : null;
    if (updatedUser) {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        await saveAuthSession(token, updatedUser);
      }
    }
    set(state => ({
      shopOrders: [order, ...state.shopOrders],
      shopCart: [],
      ...(updatedUser ? {user: updatedUser} : {}),
    }));
    return order;
  },

  checkout: async checkoutDetails => {
    try {
      const {cart, user} = get();
      if (!user) {
        throw new Error('Please login to place a service booking.');
      }

      if (cart.length === 0) {
        throw new Error('Cart is empty');
      }

      // Prepare payload exactly as backend orderController expects
      const payload = {
        cart,
        bookedFor: checkoutDetails.bookedFor || 'Today, 6:00 PM',
        paymentMethod: checkoutDetails.paymentMethod,
        address: checkoutDetails.address,
        specialInstructions: checkoutDetails.specialInstructions,
        inspectionFee: checkoutDetails.inspectionFee,
        tax: checkoutDetails.tax,
        recurringOccurrences: checkoutDetails.recurringOccurrences,
        useRewardPoints: Boolean(checkoutDetails.useRewardPoints),
        useWalletBalance: Boolean(checkoutDetails.useWalletBalance),
      };

      const response = await apiClient.post('/orders/checkout', payload);

      const newOrder = response.data.order;
      const updatedUser = response.data.user
        ? normalizeUser(response.data.user)
        : null;
      if (updatedUser) {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          await saveAuthSession(token, updatedUser);
        }
      }

      // Update store: clear cart and prepend the confirmed booking.
      set(state => ({
        orders: [newOrder, ...state.orders],
        cart: [],
        ...(updatedUser ? {user: updatedUser} : {}),
      }));

      return newOrder;
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    }
  },
}));






