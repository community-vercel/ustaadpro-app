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
  Category: {categoryId: ServiceCategoryId | 'all'; title: string};
  Detail: {serviceId: string; selectedWorkId?: number};
  Booking: {
    serviceId: string;
    specificWorkPriceId?: number;
    specificWorkTitle?: string;
    specificWorkPrice?: number;
  };
  Cart: undefined;
  ShoppingOrders: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  Complaints: undefined;
};
