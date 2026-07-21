import {
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDOcXPs9sFUONro_BliFWWjxE3pmndqW00';

type NativeLocation = {
  latitude: number;
  longitude: number;
};

type LocatedAddress = NativeLocation & {
  address: string;
  isCoordinateFallback: boolean;
};

type CurrentLocationModule = {
  getCurrentLocation: () => Promise<NativeLocation>;
};

const CurrentLocation = NativeModules.CurrentLocation as
  | CurrentLocationModule
  | undefined;

export async function requestLocationPermission() {
  if (Platform.OS !== 'android') {
    // iOS permission prompting is handled natively by CLLocationManager
    // inside the CurrentLocation module.
    return true;
  }

  const finePermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarsePermission = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  const hasFinePermission = await PermissionsAndroid.check(finePermission);
  const hasCoarsePermission = await PermissionsAndroid.check(coarsePermission);

  if (hasFinePermission || hasCoarsePermission) {
    return true;
  }

  const result = await PermissionsAndroid.request(finePermission, {
    title: 'Allow location access',
    message:
      'Ustaad Pro uses your location to fill your service address faster.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function formatCoordinateAddress({latitude, longitude}: NativeLocation) {
  return `Pinned location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
}

function joinAddressParts(parts: Array<string | undefined | null>) {
  return [...new Set(parts.map(part => part?.trim()).filter(Boolean))].join(
    ', ',
  );
}

function formatGoogleAddress(result: any) {
  const components = Array.isArray(result?.address_components)
    ? result.address_components
    : [];
  const findComponent = (types: string[]) =>
    components.find((component: any) =>
      types.every(type => component.types?.includes(type)),
    )?.long_name;

  const area = findComponent(['sublocality_level_1']) ||
    findComponent(['sublocality']) ||
    findComponent(['neighborhood']) ||
    findComponent(['route']);
  const city =
    findComponent(['locality']) ||
    findComponent(['administrative_area_level_2']) ||
    findComponent(['administrative_area_level_1']);
  const country = findComponent(['country']);
  const readable = joinAddressParts([area, city, country]);

  return readable || result?.formatted_address || '';
}

function formatOpenStreetMapAddress(data: any) {
  const address = data?.address || {};
  const area =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.residential ||
    address.road;
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.county ||
    address.state;
  const country = address.country;
  const readable = joinAddressParts([area, city, country]);

  return readable || data?.display_name || '';
}

export function getStaticMapPreviewUrl({
  latitude,
  longitude,
  width = 640,
  height = 320,
  zoom = 15,
}: NativeLocation & {
  width?: number;
  height?: number;
  zoom?: number;
}) {
  const marker = `${latitude},${longitude}`;
  return (
    'https://maps.googleapis.com/maps/api/staticmap' +
    `?center=${marker}` +
    `&zoom=${zoom}` +
    `&size=${width}x${height}` +
    '&scale=2' +
    '&maptype=roadmap' +
    `&markers=color:green%7C${marker}` +
    `&key=${GOOGLE_MAPS_API_KEY}`
  );
}
export async function locatePinnedAddress(
  location: NativeLocation,
): Promise<LocatedAddress> {
  try {
    const address = await reverseGeocode(location);
    return {
      ...location,
      address,
      isCoordinateFallback: false,
    };
  } catch {
    try {
      const address = await reverseGeocodeWithOpenStreetMap(location);
      return {
        ...location,
        address,
        isCoordinateFallback: false,
      };
    } catch {
      return {
        ...location,
        address: formatCoordinateAddress(location),
        isCoordinateFallback: true,
      };
    }
  }
}
async function reverseGeocode({latitude, longitude}: NativeLocation) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`,
  );

  if (!response.ok) {
    throw new Error('Could not connect to Google Maps.');
  }

  const data = await response.json();
  const address = formatGoogleAddress(data?.results?.[0]);

  if (!address) {
    throw new Error('Could not find an address for your location.');
  }

  return address as string;
}

async function reverseGeocodeWithOpenStreetMap({
  latitude,
  longitude,
}: NativeLocation) {
  const params = [
    'format=jsonv2',
    'addressdetails=1',
    'zoom=18',
    `lat=${latitude}`,
    `lon=${longitude}`,
  ].join('&');
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UstaadPro/1.0',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Could not connect to address lookup.');
  }

  const data = await response.json();
  const address = formatOpenStreetMapAddress(data);

  if (!address) {
    throw new Error('Could not find an address for your location.');
  }

  return address as string;
}

export async function locateCurrentAddress(): Promise<LocatedAddress> {
  const permissionGranted = await requestLocationPermission();

  if (!permissionGranted) {
    throw new Error('Location permission is required.');
  }

  if (!CurrentLocation) {
    throw new Error('Location service is not available in this app build.');
  }

  const location = await CurrentLocation.getCurrentLocation();

  return locatePinnedAddress(location);
}
