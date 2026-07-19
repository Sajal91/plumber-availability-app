import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const NOTIFICATION_CHANNEL_ID = 'availability-updates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const setupNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Availability updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  return finalStatus === 'granted';
};

export const sendAvailabilityNotification = async ({ title, message, sentAt }) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Availability Update',
      body: message || 'Plumber availability has been updated.',
      data: { sentAt },
      sound: 'default',
    },
    trigger: {
      channelId: NOTIFICATION_CHANNEL_ID,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
};
