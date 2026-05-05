import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useAppTheme } from '../theme/theme';

// Mock data
const MOCK_USERS = [
  { id: '1', name: 'Juan Dela Cruz' },
  { id: '2', name: 'Maria Santos' },
  { id: '3', name: 'Pedro Reyes' }
];

const MOCK_FRIENDS = [
  { id: '4', name: 'Ana Lopez' },
  { id: '5', name: 'Mark Diaz' }
];

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const welcomeName = useMemo(() => user?.name || 'SAFEWALK User', [user]);

  // Filter users based on search input
  const filteredUsers = useMemo(() => {
    if (!searchInput.trim()) return MOCK_USERS;
    return MOCK_USERS.filter(u =>
      u.name.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [searchInput]);

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle create group
  const handleCreateGroup = () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No Users Selected', 'Select at least one user to create a group.');
      return;
    }
    toast.show('Group created successfully!', 'success');
    setSelectedUsers([]);
    setSearchInput('');
  };

  // Render user item for Find Users
  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.includes(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggleUserSelection(item.id)}
        style={[
          styles.userItem,
          {
            backgroundColor: isSelected ? colors.softBlue : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border
          }
        ]}
      >
        <View style={styles.userContent}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  // Render friend item
  const renderFriendItem = ({ item }) => {
    return (
      <AppCard style={[styles.friendItem, { backgroundColor: colors.surface }]}>
        <Text style={[styles.friendName, { color: colors.text }]}>{item.name}</Text>
      </AppCard>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header - KEPT UNCHANGED */}
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: colors.primary }]}>Good Day</Text>
          <Text style={[styles.title, { color: colors.text }]}>Welcome, {welcomeName}.</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Your live safety dashboard is active and updating nearby risk zones.</Text>
        </View>

        {/* Find Users Section */}
        <AppCard style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Find Users</Text>

          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border
              }
            ]}
            placeholder="Search users..."
            placeholderTextColor={colors.muted}
            value={searchInput}
            onChangeText={setSearchInput}
          />
        </AppCard>

        {/* Selected users count */}
        {selectedUsers.length > 0 && (
          <Text style={[styles.selectedCount, { color: colors.primary }]}>
            {selectedUsers.length} {selectedUsers.length === 1 ? 'user' : 'users'} selected
          </Text>
        )}

        {/* Your Friends Section */}
        <AppCard style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Friends</Text>

          <FlatList
            data={MOCK_FRIENDS}
            keyExtractor={item => item.id}
            renderItem={renderFriendItem}
            scrollEnabled={false}
            style={styles.friendsList}
          />
        </AppCard>

        {/* Create Group Button */}
        <AppButton
          title="Create Group"
          onPress={handleCreateGroup}
          style={styles.createButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  usersList: {
    gap: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  userContent: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  friendsList: {
    gap: 8,
  },
  friendItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    marginTop: 8,
  },
});
