import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import UserListItem from '../components/UserListItem';
import { COLORS, STATUS_COLORS } from '../constants/colors';
import {
  createPlumber,
  deletePlumber,
  getPlumbers,
  getErrorMessage,
} from '../services/api';
import { subscribeToPlumberUpdates } from '../services/realtime';
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
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const fetchPlumbers = useCallback(async () => {
    try {
      const { plumbers: list } = await getPlumbers();
      setPlumbers(list);
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

    const unsubscribe = subscribeToPlumberUpdates((updatedUser) => {
      setPlumbers((prev) => {
        const index = prev.findIndex((p) => p.id === updatedUser.id);
        if (index === -1) {
          return [...prev, updatedUser].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
        }
        const next = [...prev];
        next[index] = updatedUser;
        return next;
      });
    });

    return unsubscribe;
  }, [fetchPlumbers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPlumbers();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    onLogout();
  };

  const openAddModal = () => {
    setNewName('');
    setNewPhone('');
    setAddError('');
    setAddVisible(true);
  };

  const closeAddModal = () => {
    if (adding) return;
    setAddVisible(false);
    setAddError('');
  };

  const handleAddPlumber = async () => {
    setAddError('');

    if (!newName.trim()) {
      setAddError('Please enter a name');
      return;
    }
    if (!newPhone.trim()) {
      setAddError('Please enter a mobile number');
      return;
    }

    setAdding(true);
    try {
      const { plumber } = await createPlumber(newName.trim(), newPhone.trim());
      if (plumber) {
        setPlumbers((prev) =>
          [...prev.filter((p) => p.id !== plumber.id), plumber].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      } else {
        await fetchPlumbers();
      }
      setAddVisible(false);
      setNewName('');
      setNewPhone('');
    } catch (err) {
      setAddError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const handleRemovePlumber = (user) => {
    Alert.alert(
      'Remove plumber',
      `Remove ${user.name}? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(user.id);
            setError('');
            try {
              await deletePlumber(user.id);
              setPlumbers((prev) => prev.filter((p) => p.id !== user.id));
            } catch (err) {
              setError(getErrorMessage(err));
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const availableCount = plumbers.filter((p) => p.status === 'available').length;
  const workingCount = plumbers.filter((p) => p.status === 'working').length;
  const offlineCount = plumbers.filter((p) => p.status === 'offline').length;

  const filteredPlumbers =
    statusFilter === 'all'
      ? plumbers
      : plumbers.filter((p) => p.status === statusFilter);

  const renderPlumber = ({ item }) => (
    <UserListItem
      user={item}
      onRemove={handleRemovePlumber}
      removing={removingId === item.id}
    />
  );

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
        <View style={styles.listHeaderActions}>
          <Pressable style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
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
                ? 'No plumbers registered yet. Tap Add to invite one.'
                : `No ${statusFilter} plumbers right now.`}
            </Text>
          }
        />
      )}

      <Modal
        visible={addVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeAddModal} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add plumber</Text>
            <Text style={styles.modalSubtitle}>
              Only added users can request OTP and log in.
            </Text>

            {addError ? <Text style={styles.error}>{addError}</Text> : null}

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Plumber name"
              autoCapitalize="words"
              editable={!adding}
            />

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="10-digit or +91…"
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!adding}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalSecondary, adding && styles.buttonDisabled]}
                onPress={closeAddModal}
                disabled={adding}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimary, adding && styles.buttonDisabled]}
                onPress={handleAddPlumber}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Add plumber</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  listHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  modalSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalSecondaryText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalPrimary: {
    minWidth: 120,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  modalPrimaryText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
