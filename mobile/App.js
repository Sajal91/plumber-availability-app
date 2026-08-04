import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/lib/supabase';
import { getMe, signOut } from './src/services/api';
import { clearAuth, getUser, saveUser } from './src/services/authStorage';
import { COLORS } from './src/constants/colors';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const cached = await getUser();
          if (cached) {
            await clearAuth();
          }
          return;
        }

        const { user } = await getMe();
        if (!mounted) return;

        if (user && (user.role === 'plumber' || user.role === 'admin')) {
          await saveUser(user);
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          await signOut();
          await clearAuth();
        }
      } catch {
        try {
          await signOut();
        } catch {
          // ignore
        }
        await clearAuth();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        await clearAuth();
        if (mounted) {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = async (user) => {
    await saveUser(user);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleUserUpdate = async (user) => {
    setCurrentUser(user);
    await saveUser(user);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    await clearAuth();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <AppNavigator
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onUserUpdate={handleUserUpdate}
        onLogout={handleLogout}
      />
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
