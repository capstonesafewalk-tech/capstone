import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import { emergencyContacts } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useAppTheme } from '../theme/theme';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ProfileScreen() {
  const { colors, themeOverride, setThemeOverride } = useAppTheme();
  const { user, signOut } = useAuth();
  const toast = useToast();

  const fullName = user?.name || 'SAFEWALK Member';
  const email = user?.email || 'user@safewalk.app';
  const contacts = user?.emergencyContacts || emergencyContacts;

  const handleSettings = () => {
    Alert.alert('Settings', 'Profile settings can be expanded here.');
  };

  const handleLogout = () => {
    signOut();
    toast.show('You have been signed out.', 'info');
  };

  const handleThemeToggle = () => {
    if (themeOverride === 'light') {
      setThemeOverride('dark');
      toast.show('Switched to Dark Mode', 'success');
    } else if (themeOverride === 'dark') {
      setThemeOverride(null);
      toast.show('Switched to System Theme', 'success');
    } else {
      setThemeOverride('light');
      toast.show('Switched to Light Mode', 'success');
    }
  };

  const getThemeIcon = () => {
    if (themeOverride === 'light') return 'sunny-outline';
    if (themeOverride === 'dark') return 'moon-outline';
    return 'contrast-outline'; // System mode icon
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.headerCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{getInitials(fullName) || 'S'}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{fullName}</Text>
          <Text style={[styles.email, { color: colors.muted }]}>{email}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleSettings} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="settings-outline" size={18} color={colors.primary} />
              <Text style={[styles.iconButtonText, { color: colors.primary }]}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleThemeToggle} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name={getThemeIcon()} size={18} color={colors.primary} />
              <Text style={[styles.iconButtonText, { color: colors.primary }]}>
                {themeOverride ? (themeOverride === 'light' ? 'Light' : 'Dark') : 'System'}
              </Text>
            </TouchableOpacity>
          </View>
        </AppCard>

        <AppCard style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Contacts</Text>
          {contacts.map((contact) => (
            <View key={`${contact.name}-${contact.phone}`} style={styles.contactRow}>
              <View style={[styles.contactIcon, { backgroundColor: colors.softBlue }]}>
                <Ionicons name="call-outline" size={16} color={colors.primary} />
              </View>
              <View style={styles.contactTextWrap}>
                <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                <Text style={[styles.contactMeta, { color: colors.muted }]}>{contact.phone} • {contact.relation}</Text>
              </View>
            </View>
          ))}
        </AppCard>

        <AppButton title="Logout" variant="danger" onPress={handleLogout} style={styles.logoutButton} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  email: {
    marginTop: 8,
    fontSize: 14,
  },
  actionRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  iconButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextWrap: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  contactMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  logoutButton: {
    marginTop: 4,
  },
});
