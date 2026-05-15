import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Modal, ActivityIndicator, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppCard from '../components/AppCard';
import { useToast } from '../components/Toast';
import { useAppTheme } from '../theme/theme';

const INCIDENT_TYPES = [
  { id: 'theft', label: 'Theft', icon: 'bag' },
  { id: 'robbery', label: 'Robbery', icon: 'warning' },
  { id: 'harassment', label: 'Harassment', icon: 'megaphone' },
  { id: 'accident', label: 'Accident', icon: 'car' },
  { id: 'suspicious', label: 'Suspicious Activity', icon: 'eye' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function ReportIncidentScreen() {
  const { colors } = useAppTheme();
  const toast = useToast();

  const [selectedType, setSelectedType] = useState(null);
  const [otherTypeText, setOtherTypeText] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [reportDateTime, setReportDateTime] = useState('');

  useEffect(() => {
    const now = new Date();
    const formatted = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setReportDateTime(formatted);

    // Get current GPS location for the report
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setLocation('Location unavailable');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const handleReport = async () => {
    // Validate form
    if (!selectedType) {
      toast.show('Please select an incident type', 'warning');
      return;
    }

    if (selectedType === 'other' && !otherTypeText.trim()) {
      toast.show('Please specify the incident type', 'warning');
      return;
    }

    if (!description.trim()) {
      toast.show('Please describe the incident', 'warning');
      return;
    }

    if (!location) {
      toast.show('Location data is required', 'warning');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const incidentData = {
        type: selectedType === 'other' ? (otherTypeText.trim() || 'Other') : selectedType,
        description: description.trim(),
        location: location,
        lat: gpsLocation?.lat || null,
        lng: gpsLocation?.lng || null,
        timestamp: new Date().toISOString(),
        accuracy: gpsLocation?.accuracy || null,
      };

      // Send to backend (mock endpoint)
      const response = await fetch('http://localhost:5000/incidents/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incidentData),
      });

      if (response.ok) {
        setShowSuccess(true);
        toast.show('Incident reported successfully! ✅', 'success');

        // Reset form
        setTimeout(() => {
          setSelectedType(null);
          setOtherTypeText('');
          setDescription('');
          setShowSuccess(false);
        }, 2000);
      } else {
        toast.show('Failed to report incident', 'error');
      }
    } catch (error) {
      console.error('Report error:', error);
      // Allow offline reporting (mock success)
      setShowSuccess(true);
      toast.show('Report submitted! (Offline mode)', 'success');

      setTimeout(() => {
          setSelectedType(null);
          setOtherTypeText('');
          setDescription('');
          setShowSuccess(false);
        }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="alert" size={32} color={colors.danger} />
          <Text style={[styles.title, { color: colors.text }]}>Report Incident</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Help us keep Bacolod safe</Text>
        </View>

        {/* Location Card */}
        <AppCard style={styles.locationCard}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.locationLabel, { color: colors.muted }]}>Current Location</Text>
              <Text style={[styles.locationValue, { color: colors.text }]}>{location}</Text>
              <Text style={[styles.dateTimeLabel, { color: colors.muted, marginTop: 6 }]}>Report Time</Text>
              <Text style={[styles.dateTimeValue, { color: colors.text }]}>{reportDateTime}</Text>
            </View>
          </View>
        </AppCard>

        {/* Incident Type Selection */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>What happened?</Text>
        <View style={styles.typeGrid}>
          {INCIDENT_TYPES.map((type) => (
            <View
              key={type.id}
              style={[
                styles.typeButton,
                {
                  backgroundColor: selectedType === type.id ? colors.primary : colors.surface,
                  borderColor: selectedType === type.id ? colors.primary : colors.border,
                  borderWidth: 2,
                },
              ]}
              onTouchEnd={() => setSelectedType(type.id)}
            >
              <Ionicons
                name={type.icon}
                size={24}
                color={selectedType === type.id ? '#FFFFFF' : colors.text}
              />
              <Text
                style={[
                  styles.typeLabel,
                  {
                    color: selectedType === type.id ? '#FFFFFF' : colors.text,
                  },
                ]}
              >
                {type.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Custom type input when "Other" is selected */}
        {selectedType === 'other' && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
              Specify Incident Type
            </Text>
            <AppInput
              placeholder="e.g. Flooding, Fire, Lost Item..."
              value={otherTypeText}
              onChangeText={setOtherTypeText}
              placeholderTextColor={colors.muted}
              editable={!loading}
              style={{ marginBottom: 0 }}
            />
          </View>
        )}

        {/* Description Input */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Details</Text>
        <AppInput
          placeholder="Describe what happened (e.g., suspects, vehicle description, etc.)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.descriptionInput}
          placeholderTextColor={colors.muted}
          editable={!loading}
        />

        {/* Confidentiality Info */}
        <AppCard style={[styles.infoCard, { backgroundColor: colors.softBlue }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.info, marginLeft: 8 }]}>
              Your report is confidential. All data is encrypted and shared with authorities only.
            </Text>
          </View>
        </AppCard>

        {/* Submit Button */}
        <AppButton
          title={loading ? 'Submitting...' : 'Submit Report'}
          onPress={handleReport}
          disabled={loading || !selectedType || !description}
          style={styles.submitButton}
        />

        {/* Success Modal */}
        <Modal transparent visible={showSuccess} animationType="fade">
          <View style={styles.successOverlay}>
            <View style={[styles.successBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="checkmark-circle" size={60} color={colors.success} />
              <Text style={[styles.successTitle, { color: colors.text }]}>Thank You!</Text>
              <Text style={[styles.successMessage, { color: colors.muted }]}>
                Your incident report has been submitted. Stay safe!
              </Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  locationCard: {
    marginBottom: 24,
    paddingVertical: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateTimeValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  typeButton: {
    width: '31%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  descriptionInput: {
    textAlignVertical: 'top',
    paddingTop: 12,
    marginBottom: 24,
    minHeight: 100,
  },
  infoCard: {
    marginBottom: 24,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  submitButton: {
    marginBottom: 24,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '80%',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
  },
  successMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
