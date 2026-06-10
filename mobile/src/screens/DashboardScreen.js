import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import UserListItem from '../components/UserListItem';
import { COLORS, STATUS_COLORS } from '../constants/colors';
import { getAllUsers, updateStatus, getErrorMessage } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { clearAuth, getToken, saveAuth } from '../services/authStorage';

export default function DashboardScreen({ currentUser, onUserUpdate, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await getAllUsers();
      setUsers(response.data.users);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchUsers();
      setLoading(false);
    };

    init();

    const socket = connectSocket();

    socket.on('usersList', (usersList) => {
      setUsers(usersList);
    });

    socket.on('statusUpdated', ({ user: updatedUser, users: updatedUsers }) => {
      if (updatedUsers) {
        setUsers(updatedUsers);
      }
      if (updatedUser && updatedUser.id === currentUser.id) {
        onUserUpdate(updatedUser);
      }
    });

    return () => {
      const activeSocket = getSocket();
      if (activeSocket) {
        activeSocket.off('usersList');
        activeSocket.off('statusUpdated');
      }
      disconnectSocket();
    };
  }, [fetchUsers, currentUser.id, onUserUpdate]);

  const handleStatusChange = async (status) => {
    if (pendingStatus || currentUser.status === status) return;

    setPendingStatus(status);
    setError('');
    try {
      const response = await updateStatus(status);
      setUsers(response.data.users);
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
    await fetchUsers();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    disconnectSocket();
    await clearAuth();
    onLogout();
  };

  const currentStatusColor = STATUS_COLORS[currentUser.status] || STATUS_COLORS.offline;

  const renderUser = ({ item }) => (
    <UserListItem user={item} isCurrentUser={item.id === currentUser.id} />
  );

  return (
    <View style={styles.container}>
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
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>All Plumbers</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No plumbers registered yet.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    paddingTop: 56,
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
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
  listContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 32,
    fontSize: 15,
  },
  error: {
    color: COLORS.error,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
});
