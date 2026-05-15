import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppInput from '../components/AppInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useAppTheme } from '../theme/theme';

export default function SignupScreen({ navigation }) {
  const { colors } = useAppTheme();
  const { signUp } = useAuth();
  const toast = useToast();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [confirmSecure, setConfirmSecure] = useState(true);
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authStep, setAuthStep] = useState(1); // 1: Send code, 2: Verify code
  const [sentTo, setSentTo] = useState(''); // Track where code was sent

  const validatePhilippineMobile = (number) => {
    // Accept formats: 09123456789 (11 digits), +639123456789, 639123456789
    const cleaned = number.replace(/\D/g, '');
    return (cleaned.length === 11 && cleaned.startsWith('09')) || 
           (cleaned.length === 12 && cleaned.startsWith('63'));
  };

  const formatPhilippineMobile = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('09')) {
      return '+63' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('63')) {
      return '+63' + cleaned;
    }
    return '+' + cleaned;
  };

  const handleSendAuthCode = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !mobileNumber.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing information', 'Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirm password must match.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      Alert.alert('Invalid email', 'Please use a valid email address.');
      return;
    }

    if (!validatePhilippineMobile(mobileNumber)) {
      Alert.alert('Invalid mobile number', 'Please enter a valid Philippine mobile number (e.g., 09123456789).');
      return;
    }

    try {
      setLoading(true);
      // Simulate sending auth code
      const formattedMobile = formatPhilippineMobile(mobileNumber);
      // In production, this would call an API to send the code
      toast.show('Authentication code sent to email and SMS', 'success');
      setSentTo(email);
      setAuthStep(2);
      setAuthCode('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send authentication code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAuthCode = async () => {
    if (!authCode.trim()) {
      Alert.alert('Missing code', 'Please enter the authentication code.');
      return;
    }

    try {
      setVerifying(true);
      // Simulate code verification
      // In production, this would call an API to verify the code
      await new Promise(resolve => setTimeout(resolve, 1000));
      const full = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');
      await signUp({ fullName: full, firstName, middleName, lastName, email, mobileNumber, password });
      toast.show('Account created successfully! Signing you in...', 'success');
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Verification failed', 'Invalid authentication code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleBackToForm = () => {
    setAuthStep(1);
    setAuthCode('');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <AppCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Create Account</Text>
            
            {authStep === 1 ? (
              <>
                <Text style={[styles.sectionCopy, { color: colors.muted }]}>Set up your SAFEWALK profile in under a minute.</Text>

                <AppInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  leftIcon={<Ionicons name="person-outline" size={18} color={colors.primary} />}
                  editable={!loading}
                />

                <AppInput
                  label="Middle Name (Optional)"
                  value={middleName}
                  onChangeText={setMiddleName}
                  placeholder="Enter your middle name"
                  leftIcon={<Ionicons name="person-outline" size={18} color={colors.primary} />}
                  editable={!loading}
                />

                <AppInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  leftIcon={<Ionicons name="person-outline" size={18} color={colors.primary} />}
                  editable={!loading}
                />

                <AppInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  leftIcon={<Ionicons name="mail-outline" size={18} color={colors.primary} />}
                  editable={!loading}
                />

                <AppInput
                  label="Philippines Mobile Number"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="09123456789"
                  keyboardType="phone-pad"
                  leftIcon={<Ionicons name="call-outline" size={18} color={colors.primary} />}
                  editable={!loading}
                />

                <AppInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  secureTextEntry={secure}
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.primary} />}
                  rightIcon={<Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.muted} />}
                  onRightPress={() => setSecure((value) => !value)}
                  editable={!loading}
                />

                <AppInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  secureTextEntry={confirmSecure}
                  leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />}
                  rightIcon={<Ionicons name={confirmSecure ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.muted} />}
                  onRightPress={() => setConfirmSecure((value) => !value)}
                  editable={!loading}
                />

                <AppButton title="Send Authentication Code" onPress={handleSendAuthCode} loading={loading} style={styles.button} />

                <View style={styles.footerRow}>
                  <Text style={[styles.footerText, { color: colors.muted }]}>Already have an account?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={[styles.footerLink, { color: colors.primary }]}>Back to Login</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.sectionCopy, { color: colors.muted }]}>Verification code sent to {sentTo}</Text>
                
                <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={styles.infoIcon} />
                  <Text style={[styles.infoText, { color: colors.text }]}>Check your email and SMS for a 6-digit code.</Text>
                </View>

                <AppInput
                  label="Authentication Code"
                  value={authCode}
                  onChangeText={setAuthCode}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />}
                  editable={!verifying}
                />

                <AppButton title="Verify & Create Account" onPress={handleVerifyAuthCode} loading={verifying} style={styles.button} />

                <TouchableOpacity onPress={handleBackToForm} disabled={verifying} style={styles.backButton}>
                  <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back to Form</Text>
                </TouchableOpacity>

                <View style={styles.footerRow}>
                  <Text style={[styles.footerText, { color: colors.muted }]}>Didn't receive a code?</Text>
                  <TouchableOpacity disabled={loading} onPress={handleSendAuthCode}>
                    <Text style={[styles.footerLink, { color: colors.primary }]}>Resend</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  card: {
    paddingTop: 22,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionCopy: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    marginTop: 10,
  },
  footerRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
  },
  backButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
