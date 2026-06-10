import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@plumber_auth_token';
const USER_KEY = '@plumber_auth_user';

export const saveAuth = async (token, user) => {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
};

export const getToken = async () => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const getUser = async () => {
  const userJson = await AsyncStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

export const clearAuth = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};
