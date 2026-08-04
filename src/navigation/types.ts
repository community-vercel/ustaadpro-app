import {NavigatorScreenParams} from '@react-navigation/native';
import {ServiceCategoryId} from '@/types/models';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Bookings: undefined;
  ShopCart: undefined;
  Store: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Category: {categoryId: ServiceCategoryId | 'all'; title: string; showServices?: boolean};
  Detail: {serviceId: string; selectedWorkId?: number};
  Booking: {
    serviceId: string;
    specificWorkPriceId?: number;
    specificWorkTitle?: string;
    specificWorkPrice?: number;
    specificWorkPriceIds?: number[];
      fromCart?: boolean;
    };
  Cart: undefined;
  ShoppingOrders: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  Complaints: undefined;
};
