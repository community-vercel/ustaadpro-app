import React, {useMemo, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {
  BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {RouteProp} from '@react-navigation/native';
import {Home, LucideIcon, CalendarCheck, ShoppingCart, Store, User} from 'lucide-react-native';
import {MainTabParamList} from '@/navigation/types';
import {useAppStore} from '@/store/useAppStore';
import {HomeTab} from '@/screens/main/HomeTab';
import {BookingsTab} from '@/screens/main/BookingsTab';
import {StoreTab} from '@/screens/main/StoreTab';
import {ProfileTab} from '@/screens/main/ProfileTab';
import {colors} from '@/theme/colors';
import {fontFamily} from '@/theme/typography';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, LucideIcon> = {
  Home,
  Bookings: CalendarCheck,
  ShopCart: ShoppingCart,
  Store: Store,
  Profile: User,
};

function ShopCartPlaceholder(): React.JSX.Element {
  return <View />;
}
function TabIcon({name, focused}: {name: keyof MainTabParamList; focused: boolean}) {
  const Icon = tabIcons[name];

  return (
    <View style={[styles.iconBubble, focused && styles.iconBubbleActive]}>
      <Icon
        color={focused ? colors.primary : colors.muted}
        size={19}
        strokeWidth={focused ? 2.8 : 2.2}
      />
    </View>
  );
}

function getScreenOptions({
  route,
}: {
  route: RouteProp<MainTabParamList, keyof MainTabParamList>;
}): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: styles.label,
    tabBarStyle: styles.tabBar,
    tabBarIcon: ({focused}) => (
      <TabIcon name={route.name as keyof MainTabParamList} focused={focused} />
    ),
  };
}

export function MainNavigator(): React.JSX.Element {
  const user = useAppStore(state => state.user);
  const shopCart = useAppStore(state => state.shopCart);
  const requestOpenShopCart = useAppStore(state => state.requestOpenShopCart);
  const [isStoreFocused, setIsStoreFocused] = useState(false);
  const cartCount = useMemo(
    () => shopCart.reduce((sum, item) => sum + item.quantity, 0),
    [shopCart],
  );
  const cartTotal = useMemo(
    () =>
      shopCart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      ),
    [shopCart],
  );
  const showShopCartTab = isStoreFocused && cartCount > 0;

  const requireLogin = (navigateToLogin: () => void) => {
    Alert.alert(
      'Login required',
      'Please login or create an account to use this section.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Login', onPress: navigateToLogin},
      ],
    );
  };

  return (
    <Tab.Navigator screenOptions={getScreenOptions}>
      <Tab.Screen name="Home" component={HomeTab} />
      <Tab.Screen
        name="Bookings"
        component={BookingsTab}
        options={{tabBarLabel: 'Booking'}}
        listeners={({navigation}) => ({
          tabPress: event => {
            if (user) {
              return;
            }

            event.preventDefault();
            requireLogin(() =>
              navigation.getParent()?.navigate('Auth', {screen: 'Login'}),
            );
          },
        })}
      />
      {showShopCartTab ? (
        <Tab.Screen
          name="ShopCart"
          component={ShopCartPlaceholder}
          options={{
            tabBarLabel: () => (
              <View style={styles.cartLabelWrap}>
                <Text style={styles.cartLabel}>Cart</Text>
                <Text style={styles.cartAmount} numberOfLines={1}>
                  Rs {cartTotal.toLocaleString('en-US')}
                </Text>
              </View>
            ),
            tabBarIcon: () => (
              <View style={[styles.iconBubble, styles.iconBubbleActive]}>
                <ShoppingCart color={colors.primary} size={19} strokeWidth={2.8} />
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              </View>
            ),
          }}
          listeners={({navigation}) => ({
            tabPress: event => {
              event.preventDefault();
              requestOpenShopCart();
              navigation.navigate('Store');
            },
          })}
        />
      ) : null}
      <Tab.Screen
        name="Store"
        component={StoreTab}
        listeners={{
          focus: () => setIsStoreFocused(true),
          blur: () => setIsStoreFocused(false),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        listeners={({navigation}) => ({
          tabPress: event => {
            if (user) {
              return;
            }

            event.preventDefault();
            requireLogin(() =>
              navigation.getParent()?.navigate('Auth', {screen: 'Login'}),
            );
          },
        })}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 0,
    backgroundColor: colors.surface,
    elevation: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: -8},
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    letterSpacing: 0,
  },
  iconBubble: {
    minWidth: 42,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconBubbleActive: {
    backgroundColor: '#EEF2FF',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  cartBadgeText: {
    fontFamily: fontFamily.bold,
    color: '#ffffff',
    fontSize: 10,
  },
  cartLabelWrap: {
    alignItems: 'center',
  },
  cartLabel: {
    fontFamily: fontFamily.medium,
    color: colors.primary,
    fontSize: 12,
  },
  cartAmount: {
    maxWidth: 70,
    fontFamily: fontFamily.bold,
    color: colors.ink,
    fontSize: 9,
    marginTop: 1,
  },
});
