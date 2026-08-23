import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, STATUS_COLORS } from '../constants/colors';

const STATUS_LABELS = {
  available: 'Available',
  working: 'Working',
  offline: 'Offline',
};

export default function UserListItem({
  user,
  isCurrentUser = false,
  onRemove,
  removing = false,
}) {
  const statusColor = STATUS_COLORS[user.status] || STATUS_COLORS.offline;

  const handleCall = () => {
    Linking.openURL(`tel:${user.phoneNumber}`);
  };

  return (
    <View style={[styles.container, isCurrentUser && styles.currentUser]}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={styles.info}>
        <Text style={styles.name}>
          {user.name}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {STATUS_LABELS[user.status] || 'Offline'}
        </Text>
        {user.phoneNumber ? (
          <Text style={styles.phone}>{user.phoneNumber}</Text>
        ) : null}
      </View>
      {!isCurrentUser && (
        <View style={styles.actions}>
          <Pressable style={styles.callButton} onPress={handleCall}>
            <Text style={styles.callButtonText}>Call</Text>
          </Pressable>
          {onRemove ? (
            <Pressable
              style={[styles.removeButton, removing && styles.buttonDisabled]}
              onPress={() => onRemove(user)}
              disabled={removing}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentUser: {
    borderColor: COLORS.primary,
    backgroundColor: '#EFF6FF',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '500',
  },
  phone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  removeButtonText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
