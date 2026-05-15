import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../components/AppButton';
import AppCard from '../components/AppCard';
import AppInput from '../components/AppInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useAppTheme } from '../theme/theme';

export default function LoginScreen({ navigation }) {
  const { colors } = useAppTheme();
  const { signIn } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing information', 'Please enter both email and password.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      Alert.alert('Invalid email', 'Please use a valid email address.');
      return;
    }

    try {
      setLoading(true);
      await signIn({ email, password });
      toast.show('Signed in successfully. SAFEWALK is ready.', 'success');
    } catch (error) {
      Alert.alert('Login failed', 'Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.text }]}>SAFEWALK</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Your safer route, alerts, and emergency response hub.</Text>
          </View>

          <AppCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sign In</Text>
            <Text style={[styles.sectionCopy, { color: colors.muted }]}>Access your safety dashboard in seconds.</Text>

            <AppInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              leftIcon={<Ionicons name="mail-outline" size={18} color={colors.primary} />}
            />

            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={secure}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.primary} />}
              rightIcon={<Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.muted} />}
              onRightPress={() => setSecure((value) => !value)}
            />

            <AppButton title="Sign In" onPress={handleLogin} loading={loading} style={styles.button} />

            <TouchableOpacity onPress={() => Alert.alert('Reset Password', 'Password reset is not connected in this demo.')}>
              <Text style={[styles.forgot, { color: colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.muted }]}>New to SAFEWALK?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Create Account</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 44,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  forgot: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
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
});
