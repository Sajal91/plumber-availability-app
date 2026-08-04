import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@plumber_auth_user';

/**
 * Cache the latest profile locally for fast UI restore.
 * Session tokens are persisted by the Supabase client.
 */
export const saveUser = async (user) => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = async () => {
  const userJson = await AsyncStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

export const clearAuth = async () => {
  await AsyncStorage.removeItem(USER_KEY);
};
