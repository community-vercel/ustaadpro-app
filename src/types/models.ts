export type ServiceCategoryId = string;

export interface ServiceCategory {
  id: ServiceCategoryId;
  title: string;
  subtitle: string;
  icon: string;
  tint: string;
}

export interface ServiceWorkPrice {
  id: number;
  serviceId?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  sortOrder?: number;
}

export interface ServiceItem {
  id: string;
  categoryId: ServiceCategoryId;
  subcategoryId?: string;
  serviceType?: string;
  title: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  rating: number;
  reviews: number;
  imageUrl?: string;
  detailDescription?: string;
  details?: string[];
  includes: string[];
  excludes: string[];
  badge?: string;
  workPrices?: ServiceWorkPrice[];
  selectedWorkPrice?: ServiceWorkPrice;
  selectedWorkPriceId?: number;
  selectedWorkTitle?: string;
}

export interface HomeSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  categoryId: ServiceCategoryId;
  categoryTitle: string;
  visual: string;
  imageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AppSettings {
  inspectionFee: number;
  serviceTaxPercent: number;
  currency: 'PKR' | string;
  supportPhone: string;
  shippingCost: number;
  rewardEnabled: boolean;
  rewardPointValue: number;
  rewardMinimumRedeem: number;
  serviceRewardPointsOnCompletion: number;
  serviceRewardMaxDiscountPercent: number;
  shopRewardEarnPercent: number;
  shopRewardMaxDiscountPercent: number;
}

export interface SubscriptionPackage {
  id: string;
  title: string;
  duration: '1 month' | '3 months' | '6 months' | '1 year';
  price: number;
  originalPrice: number;
  perks: string[];
}

export interface User {
  name: string;
  phone: string;
  email: string;
  walletBalance: number;
  coins: number;
  rewardPoints: number;
}

export interface UserAddress {
  id: number;
  label: string;
  detail: string;
  isDefault?: boolean;
}

export interface SavedLocation {
  address: string;
  latitude?: number;
  longitude?: number;
  isCoordinateFallback?: boolean;
  updatedAt: string;
}

export interface ServiceReview {
  id: number;
  serviceId: string;
  orderId: string;
  userId: number;
  rating: number;
  comment: string;
  customerName: string;
  createdAt: string;
}

export interface CartItem {
  service: ServiceItem;
  quantity: number;
  review?: {
    id: number;
    rating: number;
    comment: string;
  } | null;
}

export interface ShopProduct {
  id: string;
  title: string;
  category: string;
  description: string;
  price: number;
  originalPrice: number;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
}

export interface ShopCartItem {
  product: ShopProduct;
  quantity: number;
}

export type ShopOrderStatus =
  | 'placed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface ShopOrder {
  id: string;
  total: number;
  shippingCost?: number;
  status: ShopOrderStatus;
  paymentMethod?: string;
  address: string;
  cancelReason?: string | null;
  rewardPointsEarned?: number;
  rewardPointsRedeemed?: number;
  rewardDiscount?: number;
  createdAt: string;
  items: Array<{
    quantity: number;
    price: number;
    product: Pick<ShopProduct, 'id' | 'title' | 'category' | 'description' | 'imageUrl'>;
  }>;
}

export type OrderStatus =
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  bookedFor: string;
  paymentMethod?: string;
  address?: string;
  specialInstructions?: string | null;
  cancelReason?: string | null;
  inspectionFee?: number;
  tax?: number;
  rewardPointsEarned?: number;
  rewardPointsRedeemed?: number;
  rewardDiscount?: number;
  paymentReceipt?: {
    id: number;
    receiptUrl: string;
    amount: number;
    accountNumber: string;
    accountTitle: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
  } | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  orderId?: string;
  status?: string;
}



