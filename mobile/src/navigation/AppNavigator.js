import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

export default function AppNavigator({
  isAuthenticated,
  currentUser,
  onLoginSuccess,
  onUserUpdate,
  onLogout,
}) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen name="Dashboard">
            {(props) => (
              <DashboardScreen
                {...props}
                currentUser={currentUser}
                onUserUpdate={onUserUpdate}
                onLogout={onLogout}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />
              )}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {(props) => (
                <RegisterScreen {...props} onLoginSuccess={onLoginSuccess} />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
