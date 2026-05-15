import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppCard from '../components/AppCard';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme/theme';

const SAFETY_TIPS = [
  { icon: 'eye-outline', tip: 'Stay aware of your surroundings at all times.' },
  { icon: 'walk-outline', tip: 'Stick to well-lit and populated paths, especially at night.' },
  { icon: 'phone-portrait-outline', tip: 'Keep your phone charged and emergency contacts ready.' },
  { icon: 'people-outline', tip: 'Walk with a companion when possible in unfamiliar areas.' },
  { icon: 'alert-circle-outline', tip: 'Report suspicious activity immediately using the Report tab.' },
];

const RISK_LEVELS = [
  { label: 'Low Risk', color: '#10B981', icon: 'checkmark-circle-outline', desc: 'Area is generally safe. Stay alert.' },
  { label: 'Moderate Risk', color: '#F59E0B', icon: 'warning-outline', desc: 'Some incidents reported nearby. Be cautious.' },
  { label: 'High Risk', color: '#EF4444', icon: 'alert-circle', desc: 'Frequent incidents. Avoid if possible.' },
];

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();

  const welcomeName = useMemo(() => user?.name || 'SAFEWALK User', [user]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: colors.primary }]}>Good Day</Text>
          <Text style={[styles.title, { color: colors.text }]}>Welcome, {welcomeName}.</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Your live safety dashboard is active and updating nearby risk zones.
          </Text>
        </View>

        {/* Safety Overview Card */}
        <AppCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Overview</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Current incident risk levels in your area based on live reports.
          </Text>

          {RISK_LEVELS.map((level) => (
            <View
              key={level.label}
              style={[
                styles.riskRow,
                { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
            >
              <View style={[styles.riskDot, { backgroundColor: level.color + '22', borderColor: level.color }]}>
                <Ionicons name={level.icon} size={18} color={level.color} />
              </View>
              <View style={styles.riskText}>
                <Text style={[styles.riskLabel, { color: level.color }]}>{level.label}</Text>
                <Text style={[styles.riskDesc, { color: colors.muted }]}>{level.desc}</Text>
              </View>
            </View>
          ))}
        </AppCard>

        {/* Safety Info Card */}
        <AppCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Safety Info</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Follow these tips to stay safe while using SafeWalk.
          </Text>

          {SAFETY_TIPS.map((item, index) => (
            <View
              key={index}
              style={[
                styles.tipRow,
                { borderColor: colors.border }
              ]}
            >
              <View style={[styles.tipIcon, { backgroundColor: colors.softBlue || colors.surface }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.tipText, { color: colors.text }]}>{item.tip}</Text>
            </View>
          ))}
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
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
    paddingVertical: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 12,
  },
  riskDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskText: {
    flex: 1,
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  riskDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 12,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    paddingTop: 7,
  },
});
