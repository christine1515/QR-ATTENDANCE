
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'App configuration missing',
        'Supabase settings were not included in this APK. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the EAS Preview environment, then build a new APK.'
      );
      return;
    }

    if (!email.trim() || !password) {
      Alert.alert(
        'Missing information',
        'Please enter your email and password.'
      );
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const { error } = await signIn(
        email.trim(),
        password
      );

      if (error) {
        Alert.alert('Sign in failed', error.message);
        return;
      }

      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';

      Alert.alert('Login Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('@/assets/images/qratt-icon-final.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.headingContainer}>
          <Text style={styles.welcome}>Welcome back</Text>

          <Text style={styles.subtitle}>
            Sign in to record your attendance
          </Text>

          {!isSupabaseConfigured && (
            <Text style={styles.configWarning}>
              App setup is incomplete. Supabase settings are missing from this build.
            </Text>
          )}
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textSecondary}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textSecondary}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Pressable
                onPress={() => setShowPassword((value) => !value)}
                hitSlop={10}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={21}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.signInText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>

            {!loading && (
              <Ionicons
                name="arrow-forward"
                size={20}
                color={COLORS.textOnPrimary}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>
            Don't have an account?
          </Text>

          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },

logoCircle: {
  width: 82,
  height: 82,
  borderRadius: 24,
  backgroundColor: COLORS.primary,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 3,
  borderColor: COLORS.accent,
  overflow: 'hidden',
},

logoImage: {
  width: 76,
  height: 76,
  borderRadius: 20,
  resizeMode: 'contain',
},


  headingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  welcome: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 20,
  },

  configWarning: {
    marginTop: 12,
    paddingHorizontal: 12,
    color: '#9B1C1C',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  form: {
    width: '100%',
  },

  inputGroup: {
    marginBottom: 17,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 7,
  },

  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 15,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginLeft: 10,
    paddingVertical: 13,
  },

  signInButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  signInText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 5,
  },

  registerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
