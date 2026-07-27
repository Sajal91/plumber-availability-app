import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, STATUS_COLORS } from '../constants/colors';
import { getMe, updateStatus, getErrorMessage } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { clearAuth, getToken, saveAuth } from '../services/authStorage';

export default function DashboardScreen({ currentUser, onUserUpdate, onLogout }) {
  const [pendingStatus, setPendingStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refreshProfile = useCallback(async () => {
    try {
      const response = await getMe();
      onUserUpdate(response.data.user);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [onUserUpdate]);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('statusUpdated', ({ user: updatedUser }) => {
      if (updatedUser && updatedUser.id === currentUser.id) {
        onUserUpdate(updatedUser);
      }
    });

    return () => {
      const activeSocket = getSocket();
      if (activeSocket) {
        activeSocket.off('statusUpdated');
      }
      disconnectSocket();
    };
  }, [currentUser.id, onUserUpdate]);

  const handleStatusChange = async (status) => {
    if (pendingStatus || currentUser.status === status) return;

    setPendingStatus(status);
    setError('');
    try {
      const response = await updateStatus(status);
      const updatedUser = response.data.user;
      onUserUpdate(updatedUser);
      const token = await getToken();
      if (token) {
        await saveAuth(token, updatedUser);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPendingStatus(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    disconnectSocket();
    await clearAuth();
    onLogout();
  };

  const currentStatusColor = STATUS_COLORS[currentUser.status] || STATUS_COLORS.offline;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {currentUser.name}</Text>
          <Text style={[styles.currentStatus, { color: currentStatusColor }]}>
            Status: {currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1)}
          </Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Update Your Status</Text>
        <Text style={styles.sectionHint}>
          Set your availability so the admin team can assign jobs.
        </Text>

        <View style={styles.statusButtons}>
          <Pressable
            style={[
              styles.statusButton,
              currentUser.status === 'available'
                ? styles.availableButtonActive
                : styles.availableButtonOutlined,
            ]}
            onPress={() => handleStatusChange('available')}
            disabled={!!pendingStatus}
          >
            {pendingStatus === 'available' ? (
              <ActivityIndicator
                color={
                  currentUser.status === 'available'
                    ? COLORS.white
                    : STATUS_COLORS.available
                }
                size="small"
              />
            ) : (
              <Text
                style={[
                  styles.statusButtonText,
                  currentUser.status !== 'available' && {
                    color: STATUS_COLORS.available,
                  },
                ]}
              >
                Available
              </Text>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.statusButton,
              currentUser.status === 'working'
                ? styles.workingButtonActive
                : styles.workingButtonOutlined,
            ]}
            onPress={() => handleStatusChange('working')}
            disabled={!!pendingStatus}
          >
            {pendingStatus === 'working' ? (
              <ActivityIndicator
                color={
                  currentUser.status === 'working'
                    ? COLORS.white
                    : STATUS_COLORS.working
                }
                size="small"
              />
            ) : (
              <Text
                style={[
                  styles.statusButtonText,
                  currentUser.status !== 'working' && {
                    color: STATUS_COLORS.working,
                  },
                ]}
              >
                Working
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.statusButton,
            styles.offlineButton,
            currentUser.status === 'offline'
              ? styles.offlineButtonActive
              : styles.offlineButtonOutlined,
          ]}
          onPress={() => handleStatusChange('offline')}
          disabled={!!pendingStatus}
        >
          {pendingStatus === 'offline' ? (
            <ActivityIndicator
              color={
                currentUser.status === 'offline'
                  ? COLORS.white
                  : STATUS_COLORS.offline
              }
              size="small"
            />
          ) : (
            <Text
              style={[
                styles.offlineButtonText,
                currentUser.status === 'offline' && styles.offlineButtonTextActive,
              ]}
            >
              Offline
            </Text>
          )}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  currentStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  logoutText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  statusSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statusButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  availableButtonActive: {
    backgroundColor: STATUS_COLORS.available,
    borderColor: STATUS_COLORS.available,
  },
  availableButtonOutlined: {
    backgroundColor: 'transparent',
    borderColor: STATUS_COLORS.available,
  },
  workingButtonActive: {
    backgroundColor: STATUS_COLORS.working,
    borderColor: STATUS_COLORS.working,
  },
  workingButtonOutlined: {
    backgroundColor: 'transparent',
    borderColor: STATUS_COLORS.working,
  },
  statusButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  offlineButton: {
    flex: undefined,
  },
  offlineButtonActive: {
    backgroundColor: STATUS_COLORS.offline,
    borderColor: STATUS_COLORS.offline,
  },
  offlineButtonOutlined: {
    backgroundColor: 'transparent',
    borderColor: STATUS_COLORS.offline,
  },
  offlineButtonText: {
    color: STATUS_COLORS.offline,
    fontWeight: '700',
    fontSize: 15,
  },
  offlineButtonTextActive: {
    color: COLORS.white,
  },
  error: {
    color: COLORS.error,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    fontSize: 14,
  },
});
