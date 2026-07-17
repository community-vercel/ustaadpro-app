import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const API_URL = 'https://api.ustaadpro.pk/api';
const ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:5000/api';

let activeApiUrl = API_URL;

function getApiOrigin(url: string) {
  return url.replace(/\/api\/?$/, '');
}

export const API_ORIGIN = getApiOrigin(API_URL);

export function resolveApiAssetUrl(url?: string) {
  if (!url) return '';
  const activeApiOrigin = getApiOrigin(activeApiUrl);
  const localUploadPath = url.match(
    /^https?:\/\/(?:127\.0\.0\.1|localhost):\d+(\/uploads\/.+)$/i,
  )?.[1];
  if (localUploadPath) {
    return `${activeApiOrigin}${localUploadPath}`;
  }
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${activeApiOrigin}${url}`;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to all requests if present
apiClient.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore async storage errors
    }
    return config;
  },
  error => Promise.reject(error),
);

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalConfig = error.config as
      | (typeof error.config & { _retryWithAndroidEmulatorUrl?: boolean })
      | undefined;
    const isNetworkError = error?.message === 'Network Error' && !error.response;

    if (
      __DEV__ &&
      Platform.OS === 'android' &&
      isNetworkError &&
      originalConfig &&
      !originalConfig._retryWithAndroidEmulatorUrl &&
      activeApiUrl !== ANDROID_EMULATOR_API_URL
    ) {
      originalConfig._retryWithAndroidEmulatorUrl = true;
      activeApiUrl = ANDROID_EMULATOR_API_URL;
      apiClient.defaults.baseURL = ANDROID_EMULATOR_API_URL;
      originalConfig.baseURL = ANDROID_EMULATOR_API_URL;
      return apiClient(originalConfig);
    }

    return Promise.reject(error);
  },
);
