import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { MainNavigator } from '@/navigation/MainNavigator';
import { RootStackParamList } from '@/navigation/types';
import { CategoryScreen } from '@/screens/main/CategoryScreen';
import { DetailScreen } from '@/screens/main/DetailScreen';
import { BookingScreen } from '@/screens/main/BookingScreen';
import { CartScreen } from '@/screens/main/CartScreen';
import { ShoppingOrdersScreen } from '@/screens/main/ShoppingOrdersScreen';
import { AboutScreen } from '@/screens/main/AboutScreen';
import { PrivacyPolicyScreen } from '@/screens/main/PrivacyPolicyScreen';
import { ComplaintsScreen } from '@/screens/main/ComplaintsScreen';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { pushNotificationService } from '@/services/PushNotificationService';
import { InAppNotificationBanner } from '@/components/InAppNotificationBanner';
import {
  locateCurrentAddress,
  locatePinnedAddress,
  requestLocationPermission,
} from '@/services/locationService';
import { SavedLocation } from '@/types/models';

type NotificationState = {
  title: string;
  body: string;
} | null;

type Coordinate = {
  latitude: number;
  longitude: number;
};

type MapSize = {
  width: number;
  height: number;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const LOCATION_PROMPT_SEEN_KEY = 'startup_location_prompt_seen';
const LOCATION_PERMISSION_REQUESTED_KEY = 'startup_location_permission_requested';
const STARTUP_LOCATION_TIMEOUT_MS = 15000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}
const MAP_TILE_SIZE = 256;
const MAP_ZOOM = 16;
const MAX_TILE_INDEX = 2 ** MAP_ZOOM;

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
  },
};

function lonToTileX(longitude: number) {
  return ((longitude + 180) / 360) * MAX_TILE_INDEX;
}

function latToTileY(latitude: number) {
  const latRad = (latitude * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    MAX_TILE_INDEX
  );
}

function tileXToLon(tileX: number) {
  return (tileX / MAX_TILE_INDEX) * 360 - 180;
}

function tileYToLat(tileY: number) {
  const n = Math.PI - (2 * Math.PI * tileY) / MAX_TILE_INDEX;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}


function normalizeTileX(tileX: number) {
  return ((tileX % MAX_TILE_INDEX) + MAX_TILE_INDEX) % MAX_TILE_INDEX;
}

function getMapCoordinateFromPoint(
  pointX: number,
  pointY: number,
  center: Coordinate,
  mapSize: MapSize,
) {
  const centerTileX = lonToTileX(center.longitude);
  const centerTileY = latToTileY(center.latitude);
  const pressedTileX =
    centerTileX + (pointX - mapSize.width / 2) / MAP_TILE_SIZE;
  const pressedTileY =
    centerTileY + (pointY - mapSize.height / 2) / MAP_TILE_SIZE;

  return {
    latitude: Math.max(-85, Math.min(85, tileYToLat(pressedTileY))),
    longitude: tileXToLon(pressedTileX),
  };
}

function LocationTileMap({
  location,
  onSelectLocation,
}: {
  location: Coordinate;
  onSelectLocation: (coordinate: Coordinate) => void;
}) {
  const [mapSize, setMapSize] = useState<MapSize>({ width: 0, height: 0 });
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [centerLocation, setCenterLocation] = useState(location);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!lastTouch) {
      setCenterLocation(location);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.latitude, location.longitude]); 

  const centerTileX = lonToTileX(centerLocation.longitude);
  const centerTileY = latToTileY(centerLocation.latitude);
  const baseTileX = Math.floor(centerTileX);
  const baseTileY = Math.floor(centerTileY);
  const tileOffsets = [-1, 0, 1];

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  };

  const handleGrant = (event: GestureResponderEvent) => {
    setLastTouch({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  };

  const handleMove = (event: GestureResponderEvent) => {
    if (!lastTouch || !mapSize.width) {
      return;
    }
    const { pageX, pageY } = event.nativeEvent;
    const dx = pageX - lastTouch.x;
    const dy = pageY - lastTouch.y;

    const tileDx = dx / MAP_TILE_SIZE;
    const tileDy = dy / MAP_TILE_SIZE;

    const newCenterTileX = lonToTileX(centerLocation.longitude) - tileDx;
    const newCenterTileY = latToTileY(centerLocation.latitude) - tileDy;

    setCenterLocation({
      latitude: Math.max(-85, Math.min(85, tileYToLat(newCenterTileY))),
      longitude: tileXToLon(newCenterTileX),
    });

    setLastTouch({ x: pageX, y: pageY });
  };

  const handleRelease = () => {
    setLastTouch(null);
    onSelectLocation(centerLocation);
  };

  const pinPosition = mapSize.width > 0 ? { x: mapSize.width / 2, y: mapSize.height / 2 } : null;

  return (
    <View
      style={styles.locationMap}
      onLayout={handleLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={handleRelease}
    >
      {mapSize.width > 0 &&
        !mapLoadFailed &&
        tileOffsets.map(yOffset =>
          tileOffsets.map(xOffset => {
            const tileX = baseTileX + xOffset;
            const tileY = baseTileY + yOffset;
            const left =
              mapSize.width / 2 + (tileX - centerTileX) * MAP_TILE_SIZE;
            const top =
              mapSize.height / 2 + (tileY - centerTileY) * MAP_TILE_SIZE;
            const urlX = normalizeTileX(tileX);
            const urlY = Math.max(0, Math.min(MAX_TILE_INDEX - 1, tileY));

            return (
              <Image
                key={`${tileX}-${tileY}`}
                source={{
                  uri: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${MAP_ZOOM}/${urlY}/${urlX}`,
                }}
                style={[
                  styles.locationMapTile,
                  {
                    left,
                    top,
                  },
                ]}
                onError={() => setMapLoadFailed(true)}
              />
            );
          }),
        )}
      {mapLoadFailed ? (
        <View style={styles.locationMapFallback}>
          <Text style={styles.locationMapFallbackTitle}>Map unavailable</Text>
          <Text style={styles.locationMapFallbackText}>
            Check your internet connection and try again.
          </Text>
        </View>
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.locationPinShadow,
          pinPosition ? { left: pinPosition.x, top: pinPosition.y } : null,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.locationPin,
          pinPosition ? { left: pinPosition.x, top: pinPosition.y } : null,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.locationPinDot,
          pinPosition ? { left: pinPosition.x, top: pinPosition.y } : null,
        ]}
      />
    </View>
  );
}
export default function App(): React.JSX.Element {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const isGuest = useAppStore(state => state.isGuest);
  const user = useAppStore(state => state.user);
  const isOnboarded = useAppStore(state => state.isOnboarded);
  const hydrateAppState = useAppStore(state => state.hydrateAppState);
  const hydrateNotifications = useAppStore(
    state => state.hydrateNotifications,
  );
  const setSavedServiceLocation = useAppStore(
    state => state.setSavedServiceLocation,
  );
  const setSavedShopLocation = useAppStore(state => state.setSavedShopLocation);
  const savedServiceLocation = useAppStore(state => state.savedServiceLocation);
  const savedShopLocation = useAppStore(state => state.savedShopLocation);
  const [notification, setNotification] = useState<NotificationState>(null);
  const [booting, setBooting] = useState(true);
  const locationPromptVisible = useAppStore(state => state.locationPromptVisible);
  const setLocationPromptVisible = useAppStore(state => state.setLocationPromptVisible);
  const [locating, setLocating] = useState(false);
  const [pinningLocation, setPinningLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [detectedLocation, setDetectedLocation] =
    useState<SavedLocation | null>(null);
  const [locationPromptStarted, setLocationPromptStarted] = useState(false);

  useEffect(() => {
    const boot = async () => {
      await Promise.all([
        hydrateAppState(),
        hydrateNotifications(),
        new Promise<void>(resolve => setTimeout(resolve, 500)),
      ]);
      setBooting(false);
    };

    void boot();
  }, [hydrateAppState, hydrateNotifications]);

  useEffect(() => {
    let unsubscribeTokenRefresh: (() => void) | undefined;

    if (booting) {
      return undefined;
    }

    if (isAuthenticated) {
      pushNotificationService.requestUserPermission();
      unsubscribeTokenRefresh = pushNotificationService.listenForTokenRefresh();
    }
    const unsubscribeMessages = pushNotificationService.listenForMessages(message =>
      setNotification(message),
    );

    return () => {
      unsubscribeMessages();
      unsubscribeTokenRefresh?.();
    };
  }, [booting, isAuthenticated]);

  const appIsOpen = isAuthenticated || isGuest;
  const locationPromptSeenKey = `${LOCATION_PROMPT_SEEN_KEY}:${user?.email || user?.phone || 'guest'
    }`;
  const locationPermissionRequestedKey = LOCATION_PERMISSION_REQUESTED_KEY;

  useEffect(() => {
    if (booting || !isOnboarded) {
      return;
    }

    AsyncStorage.getItem(locationPermissionRequestedKey)
      .then(async requested => {
        if (requested) {
          return;
        }

        await AsyncStorage.setItem(locationPermissionRequestedKey, 'true');
        await requestLocationPermission();
      })
      .catch(() => undefined);
  }, [booting, isOnboarded, locationPermissionRequestedKey]);
  useEffect(() => {
    if (booting || !isAuthenticated || !user) {
      return;
    }

    AsyncStorage.getItem(locationPromptSeenKey)
      .then(seen => {
        if (!seen && !savedServiceLocation && !savedShopLocation) {
          setDetectedLocation(null);
          setLocationError('');
          setLocationPromptStarted(false);
          setLocationPromptVisible(true);
        }
      })
      .catch(() => undefined);
  }, [
    booting,
    isAuthenticated,
    user,
    locationPromptSeenKey,
    savedServiceLocation,
    savedShopLocation,
  ]);

  useEffect(() => {
    if (
      locationPromptVisible &&
      !locationPromptStarted &&
      !detectedLocation &&
      !locationError
    ) {
      setLocationPromptStarted(true);
      void detectStartupLocation();
    }
  }, [
    detectedLocation,
    locationError,
    locationPromptStarted,
    locationPromptVisible,
  ]);

  const closeLocationPrompt = async () => {
    await AsyncStorage.setItem(locationPromptSeenKey, 'true');
    setLocationPromptVisible(false);
  };

  const detectStartupLocation = async () => {
    setLocating(true);
    setLocationError('');
    try {
      const location = await withTimeout(
        locateCurrentAddress(),
        STARTUP_LOCATION_TIMEOUT_MS,
        'Location is taking too long. Please check GPS and try again, or skip for now.',
      );
      const savedLocation: SavedLocation = {
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        isCoordinateFallback: location.isCoordinateFallback,
        updatedAt: new Date().toISOString(),
      };
      setDetectedLocation(savedLocation);
    } catch (error: any) {
      setLocationError(
        error?.message || 'Could not detect your current location.',
      );
      setLocationPromptStarted(false);
    } finally {
      setLocating(false);
    }
  };

  const selectPinnedLocation = async (coordinate: Coordinate) => {
    if (pinningLocation) {
      return;
    }

    const pendingLocation: SavedLocation = {
      address: `Pinned location (${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)})`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      isCoordinateFallback: true,
      updatedAt: new Date().toISOString(),
    };
    setDetectedLocation(pendingLocation);
    setLocationError('');
    setPinningLocation(true);

    try {
      const location = await locatePinnedAddress(coordinate);
      setDetectedLocation({
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        isCoordinateFallback: location.isCoordinateFallback,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setPinningLocation(false);
    }
  };

  const saveStartupLocation = async () => {
    if (!detectedLocation) {
      return;
    }

    await Promise.all([
      setSavedServiceLocation(detectedLocation),
      setSavedShopLocation(detectedLocation),
      AsyncStorage.setItem(locationPromptSeenKey, 'true'),
    ]);
    setLocationPromptVisible(false);
  };

  if (booting) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.splash}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={appIsOpen ? 'dark-content' : 'light-content'} />
      <InAppNotificationBanner
        visible={Boolean(notification)}
        title={notification?.title || ''}
        body={notification?.body || ''}
        onClose={() => setNotification(null)}
      />
      <Modal
        visible={locationPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => void closeLocationPrompt()}
      >
        <View style={styles.locationOverlay}>
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>Set your location</Text>
            <Text style={styles.locationBody}>
              Allow location permission to detect your current area.
            </Text>

            {detectedLocation ? (
              <View style={styles.locationPreview}>
                {typeof detectedLocation.latitude === 'number' &&
                  typeof detectedLocation.longitude === 'number' ? (
                  <LocationTileMap
                    location={{
                      latitude: detectedLocation.latitude,
                      longitude: detectedLocation.longitude,
                    }}
                    onSelectLocation={coordinate =>
                      void selectPinnedLocation(coordinate)
                    }
                  />
                ) : null}
                <View style={styles.locationAddressRow}>
                  <Text style={styles.locationAddress}>
                    {detectedLocation.address}
                  </Text>
                  {pinningLocation ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : null}
                </View>
              </View>
            ) : null}

            {locationError ? (
              <Text style={styles.locationError}>{locationError}</Text>
            ) : null}

            <View style={styles.locationActions}>
              <Pressable
                style={styles.locationSecondaryButton}
                onPress={() => void closeLocationPrompt()}
              >
                <Text style={styles.locationSecondaryText}>Not now</Text>
              </Pressable>
              <Pressable
                style={styles.locationPrimaryButton}
                onPress={() =>
                  detectedLocation
                    ? void saveStartupLocation()
                    : void detectStartupLocation()
                }
                disabled={locating || pinningLocation}
              >
                {locating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.locationPrimaryText}>
                    {detectedLocation ? 'Save location' : 'Detect location'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <NavigationContainer theme={navigationTheme}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {appIsOpen ? (
            <>
              <RootStack.Screen name="Main" component={MainNavigator} />
              <RootStack.Screen name="Category" component={CategoryScreen} />
              <RootStack.Screen name="Detail" component={DetailScreen} />
              <RootStack.Screen name="Booking" component={BookingScreen} />
              <RootStack.Screen name="Cart" component={CartScreen} />
              <RootStack.Screen
                name="ShoppingOrders"
                component={ShoppingOrdersScreen}
              />
              <RootStack.Screen name="About" component={AboutScreen} />
              <RootStack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
              />
              <RootStack.Screen
                name="Complaints"
                component={ComplaintsScreen}
              />
              {isGuest && (
                <RootStack.Screen name="Auth" component={AuthNavigator} />
              )}
            </>
          ) : (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  splashLogo: {
    width: 156,
    height: 156,
  },
  locationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  locationCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  locationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.authDark,
  },
  locationBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  locationPreview: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationMap: {
    width: '100%',
    height: 170,
    backgroundColor: '#eef3f8',
    overflow: 'hidden',
  },
  locationMapTile: {
    position: 'absolute',
    width: MAP_TILE_SIZE,
    height: MAP_TILE_SIZE,
  },
  locationMapFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#eef3f8',
  },
  locationMapFallbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  locationMapFallbackText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    color: colors.text,
  },
  locationPinShadow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 18,
    height: 8,
    marginLeft: -9,
    marginTop: 13,
    borderRadius: 9,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  locationPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -28,
    borderRadius: 14,
    borderBottomRightRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
  locationPinDot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -18,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  locationAddressRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationAddress: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    fontWeight: '700',
  },
  locationError: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error,
    fontWeight: '700',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  locationSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationSecondaryText: {
    color: colors.ink,
    fontWeight: '800',
  },
  locationPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.authDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPrimaryText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
