import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import axios from 'axios';
import { API_BASE_URL } from '../context/auth-context';

// Configure notification behavior for when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(userToken: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Retrieve native FCM token
    let token: string | null = null;
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = deviceToken.data;
    } catch (e) {
      console.warn('Could not get native device token, trying Expo push token as fallback:', e);
      try {
        const expoToken = await Notifications.getExpoPushTokenAsync();
        token = expoToken.data;
      } catch (err) {
        console.error('Failed to get any push token:', err);
      }
    }

    if (token) {
      console.log('FCM Device Token:', token);
      
      // Save FCM Token to backend
      await axios.post(`${API_BASE_URL}/api/v1/users/fcm-token`, {
        fcmToken: token
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      return token;
    }
  } catch (error) {
    console.error('Error during push notification registration:', error);
  }

  return null;
}
