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
              styles.availableButton,
              currentUser.status === 'available' && styles.statusButtonActive,
            ]}
            onPress={() => handleStatusChange('available')}
            disabled={!!pendingStatus}
          >
            {pendingStatus === 'available' ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.statusButtonText}>Available</Text>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.statusButton,
              styles.workingButton,
              currentUser.status === 'working' && styles.statusButtonActive,
            ]}
            onPress={() => handleStatusChange('working')}
            disabled={!!pendingStatus}
          >
            {pendingStatus === 'working' ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.statusButtonText}>Working</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.offlineButton,
            currentUser.status === 'offline' && styles.offlineButtonActive,
          ]}
          onPress={() => handleStatusChange('offline')}
          disabled={!!pendingStatus}
        >
          {pendingStatus === 'offline' ? (
            <ActivityIndicator color={COLORS.textSecondary} size="small" />
          ) : (
            <Text style={styles.offlineButtonText}>Go Offline</Text>
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
    opacity: 0.7,
  },
  statusButtonActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  availableButton: {
    backgroundColor: STATUS_COLORS.available,
  },
  workingButton: {
    backgroundColor: STATUS_COLORS.working,
  },
  statusButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  offlineButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  offlineButtonActive: {
    borderColor: STATUS_COLORS.offline,
    backgroundColor: '#F1F5F9',
  },
  offlineButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 15,
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
