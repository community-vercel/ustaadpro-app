import messaging from '@react-native-firebase/messaging';
import {PermissionsAndroid, Platform} from 'react-native';
import { apiClient } from '@/api/client';
import {playConfirmationCue} from '@/utils/confirmationCue';
import {useAppStore} from '@/store/useAppStore';

async function storeIncomingNotification(remoteMessage: any) {
  const title = remoteMessage?.notification?.title || 'Notification';
  const body = remoteMessage?.notification?.body || '';
  const orderId = remoteMessage?.data?.orderId;
  const status = remoteMessage?.data?.status;
  const type = remoteMessage?.data?.type;
  const accountNumber = remoteMessage?.data?.accountNumber;
  const accountTitle = remoteMessage?.data?.accountTitle;

  if (type === 'payment_request' && orderId) {
    useAppStore.getState().setPendingPaymentOrderId(orderId);
    void useAppStore.getState().fetchOrders();
  }

  if (type === 'shop_order') {
    void useAppStore.getState().fetchShopOrders();
  }

  await useAppStore.getState().addNotification({
    title,
    body,
    orderId,
    status,
    createdAt: new Date().toISOString(),
    id:
      remoteMessage?.messageId ||
      remoteMessage?.data?.notificationId ||
      `notif-${Date.now()}`,
  });
}

class PushNotificationService {
  async requestAndroidNotificationPermission() {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
      return true;
    }

    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const currentStatus = await PermissionsAndroid.check(permission);

    if (currentStatus) {
      return true;
    }

    const result = await PermissionsAndroid.request(permission, {
      title: 'Enable notifications',
      message:
        'Ustaad Pro uses notifications for booking updates, shopping order status, and important service alerts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async requestUserPermission() {
    const androidPermissionGranted =
      await this.requestAndroidNotificationPermission();

    if (!androidPermissionGranted) {
      console.log('Android notification permission was not granted.');
      return;
    }

    await messaging().registerDeviceForRemoteMessages();
    const authStatus = await messaging().requestPermission();
    const enabled =
      Platform.OS === 'android' ||
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      await this.getFcmToken();
    }
  }

  async getFcmToken() {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        // Send the token to the backend
        await apiClient.post('/auth/fcm-token', { token: fcmToken });
      }
    } catch (error) {
      console.error('Error fetching FCM token:', error);
    }
  }

  listenForTokenRefresh() {
    return messaging().onTokenRefresh(async token => {
      try {
        await apiClient.post('/auth/fcm-token', { token });
      } catch (error) {
        console.error('Error saving refreshed FCM token:', error);
      }
    });
  }

  listenForMessages(
    onForegroundMessage?: (message: {title: string; body: string}) => void,
  ) {
    // Handle foreground messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
      if (remoteMessage.notification) {
        playConfirmationCue();
        await storeIncomingNotification(remoteMessage);
        onForegroundMessage?.({
          title: remoteMessage.notification.title || 'Notification',
          body: remoteMessage.notification.body || '',
        });
      }
    });

    messaging().onNotificationOpenedApp(async remoteMessage => {
      if (remoteMessage?.notification) {
        await storeIncomingNotification(remoteMessage);
      }
    });

    messaging()
      .getInitialNotification()
      .then(async remoteMessage => {
        if (remoteMessage?.notification) {
          await storeIncomingNotification(remoteMessage);
        }
      });

    return unsubscribe;
  }
}

export const pushNotificationService = new PushNotificationService();

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  if (remoteMessage?.notification) {
    await storeIncomingNotification(remoteMessage);
  }
});


