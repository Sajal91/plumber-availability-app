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
import { getPlumbers, getErrorMessage } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { clearAuth } from '../services/authStorage';
import { Dropdown } from 'react-native-element-dropdown';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Available', value: 'available' },
  { label: 'Working', value: 'working' },
  { label: 'Offline', value: 'offline' },
];

export default function AdminDashboardScreen({ currentUser, onLogout }) {
  const [plumbers, setPlumbers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPlumbers = useCallback(async () => {
    try {
      const response = await getPlumbers();
      setPlumbers(response.data.plumbers);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchPlumbers();
      setLoading(false);
    };

    init();

    const socket = connectSocket();

    socket.on('plumbersList', (list) => {
      setPlumbers(list);
    });

    socket.on('statusUpdated', ({ plumbers: updatedList }) => {
      if (updatedList) {
        setPlumbers(updatedList);
      }
    });

    return () => {
      const activeSocket = getSocket();
      if (activeSocket) {
        activeSocket.off('plumbersList');
        activeSocket.off('statusUpdated');
      }
      disconnectSocket();
    };
  }, [fetchPlumbers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPlumbers();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    disconnectSocket();
    await clearAuth();
    onLogout();
  };

  const availableCount = plumbers.filter((p) => p.status === 'available').length;
  const workingCount = plumbers.filter((p) => p.status === 'working').length;
  const offlineCount = plumbers.filter((p) => p.status === 'offline').length;

  const filteredPlumbers =
    statusFilter === 'all'
      ? plumbers
      : plumbers.filter((p) => p.status === statusFilter);

  const renderPlumber = ({ item }) => <UserListItem user={item} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel</Text>
          <Text style={styles.subGreeting}>Hello, {currentUser.name}</Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: STATUS_COLORS.available }]}>
            {availableCount}
          </Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: STATUS_COLORS.working }]}>
            {workingCount}
          </Text>
          <Text style={styles.statLabel}>Working</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: STATUS_COLORS.offline }]}>
            {offlineCount}
          </Text>
          <Text style={styles.statLabel}>Offline</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>All Plumbers</Text>
        <Dropdown
          style={styles.dropdown}
          containerStyle={styles.dropdownContainer}
          placeholderStyle={styles.dropdownPlaceholder}
          selectedTextStyle={styles.dropdownSelectedText}
          data={STATUS_FILTERS}
          labelField="label"
          valueField="value"
          placeholder="Filter"
          value={statusFilter}
          onChange={(item) => setStatusFilter(item.value)}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPlumbers}
          keyExtractor={(item) => item.id}
          renderItem={renderPlumber}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {statusFilter === 'all'
                ? 'No plumbers registered yet.'
                : `No ${statusFilter} plumbers right now.`}
            </Text>
          }
        />
      )}    </View>
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
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  dropdown: {
    width: 130,
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
  },
  dropdownContainer: {
    borderRadius: 8,
    borderColor: COLORS.border,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  dropdownSelectedText: {
    fontSize: 14,
    color: COLORS.text,
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
