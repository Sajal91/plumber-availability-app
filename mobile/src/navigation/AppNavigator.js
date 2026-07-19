import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

export default function AppNavigator({
  isAuthenticated,
  currentUser,
  onLoginSuccess,
  onUserUpdate,
  onLogout,
}) {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {isAuthenticated ? (
          isAdmin ? (
            <Stack.Screen name="AdminDashboard">
              {(props) => (
                <AdminDashboardScreen
                  {...props}
                  currentUser={currentUser}
                  onLogout={onLogout}
                />
              )}
            </Stack.Screen>
          ) : (
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
          )
        ) : (
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
