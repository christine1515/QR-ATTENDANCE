import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedRole, setSelectedRole] = useState<
    'student' | 'teacher' | 'admin'
  >('student');

  const handleRegister = async () => {
    if (loading) return;

    setError(null);

    if (
      !fullName.trim() ||
      (selectedRole === 'student' && !schoolId.trim()) ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError(
        selectedRole === 'student' && !schoolId.trim()
          ? 'School ID is required for students.'
          : 'All required fields must be completed.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
          student_id: schoolId.trim(),
          role: selectedRole,
        }
      );

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Registration error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Header title="QR Attendance" />
            </View>

            <View style={styles.welcomeSection}>
              <View style={styles.welcomeBadge}>
                <Text style={styles.welcomeBadgeText}>
                  GET STARTED
                </Text>
              </View>

              <Text style={styles.title}>Create Account</Text>

              <Text style={styles.subtitle}>
                Register to start recording attendance
              </Text>
            </View>

            {success ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Text style={styles.successIconText}>✓</Text>
                </View>

                <View style={styles.successBadge}>
                  <Text style={styles.successBadgeText}>
                    VERIFICATION REQUIRED
                  </Text>
                </View>

                <Text style={styles.successTitle}>
                  Check your email!
                </Text>

                <Text style={styles.successText}>
                  We sent a confirmation link to {email}. Click the link to
                  verify your account, then come back and sign in.
                </Text>

                <Link href="/login" style={styles.successLink}>
                  Back to Sign In
                </Link>
              </View>
            ) : (
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    Account Details
                  </Text>

                  <Text style={styles.formSubtitle}>
                    Fill in your information below
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    SCHOOL ID {selectedRole === 'student' ? '' : '(OPTIONAL)'}
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={schoolId}
                    onChangeText={setSchoolId}
                    placeholder={
                      selectedRole === 'student'
                        ? 'Enter your School ID'
                        : 'Enter School ID if applicable'
                    }
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="characters"
                    editable={!loading}
                  />
                </View>

                <View style={styles.studentNotice}>
                  <Text style={styles.studentNoticeTitle}>
                    {selectedRole === 'student'
                      ? 'Student account'
                      : `${selectedRole === 'teacher' ? 'Teacher' : 'Admin'} account request`}
                  </Text>

                  <Text style={styles.studentNoticeText}>
                    {selectedRole === 'student'
                      ? 'A School ID is required for students.'
                      : 'Teacher and administrator access must be authorized by an administrator. Selecting this role does not automatically grant privileged access.'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME</Text>

                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="words"
                    editable={!loading}
                    maxLength={100}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>

                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@school.edu"
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PASSWORD</Text>

                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CONFIRM PASSWORD</Text>

                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter your password"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>SELECT ACCOUNT ROLE</Text>

                  <View style={styles.roleOptions}>
                    {([
                      { label: 'Student', value: 'student' },
                      { label: 'Teacher', value: 'teacher' },
                      { label: 'Admin', value: 'admin' },
                    ] as const).map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        activeOpacity={0.8}
                        disabled={loading}
                        onPress={() => setSelectedRole(item.value)}
                        style={[
                          styles.roleOption,
                          selectedRole === item.value &&
                            styles.roleOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            selectedRole === item.value &&
                              styles.roleOptionTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.roleHint}>
                    {selectedRole === 'student'
                      ? 'School ID is required for student accounts.'
                      : `${selectedRole === 'teacher' ? 'Teacher' : 'Admin'} access requires authorization.`}
                  </Text>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>
                      Registration failed
                    </Text>

                    <Text style={styles.error}>
                      {error}
                    </Text>
                  </View>
                )}

                {loading ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator
                      size="large"
                      color={COLORS.primary}
                    />

                    <Text style={styles.loaderText}>
                      Creating your account...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonContainer}>
                    <AppButton
                      theme="primary"
                      title="Sign Up"
                      icon="person-add-outline"
                      onPress={handleRegister}
                    />
                  </View>
                )}
              </View>
            )}

            {!success && (
              <View style={styles.signinContainer}>
                <Text style={styles.signinText}>
                  Already have an account?
                </Text>

                <Link href="/login" style={styles.link}>
                  Sign In
                </Link>
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  headerContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },

  welcomeSection: {
    alignItems: 'center',
    marginBottom: 20,
  },

  welcomeBadge: {
    alignSelf: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },

  welcomeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.card,
  },

  title: {
    fontSize: 29,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  formHeader: {
    marginBottom: 20,
  },

  formTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  formSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  studentNotice: {
    backgroundColor: '#F3E6DA',
    borderColor: COLORS.secondary,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  studentNoticeTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },

  studentNoticeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  inputGroup: {
    marginBottom: 15,
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.textPrimary,
    marginBottom: 7,
  },

  input: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  roleOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },

  roleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  roleOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  roleOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  roleOptionTextSelected: {
    color: COLORS.card,
  },

  roleHint: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },

  errorContainer: {
    backgroundColor: '#F6E1DB',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 13,
    padding: 12,
    marginBottom: 8,
  },

  errorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.danger,
    marginBottom: 3,
  },

  error: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.danger,
  },

  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  loaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  buttonContainer: {
    marginTop: 4,
  },

  signinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  signinText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 5,
  },

  link: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '800',
  },

  successContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  successIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    marginBottom: 16,
  },

  successIconText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.card,
  },

  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },

  successBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.primary,
  },

  successTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 18,
  },

  successLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '800',
  },
});
