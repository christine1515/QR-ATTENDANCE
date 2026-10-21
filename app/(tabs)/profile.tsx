import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const router = useRouter();

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const p = await getProfile(user.id);
      setProfile(p);
      setDraftName(p?.full_name ?? '');
    } catch (error: any) {
      Alert.alert(
        'Profile Error',
        error?.message || 'Could not load your profile.'
      );
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user || !profile || saving) return;

    const name = draftName.trim();

    if (!name) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: name,
      });

      if (error) {
        Alert.alert('Update Failed', error);
        return;
      }

      setProfile({ ...profile, full_name: name });
      setDraftName(name);
      setEditing(false);

      Alert.alert('Success', 'Your name has been updated.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Could not update your name.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    if (!user || uploading) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo Permission Needed',
          'Allow gallery access to choose your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const mimeType = asset.mimeType || 'image/jpeg';
      const extension =
        mimeType === 'image/png'
          ? 'png'
          : mimeType === 'image/webp'
            ? 'webp'
            : 'jpg';

      setUploading(true);

      const path = `${user.id}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        Alert.alert('Upload Failed', uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const { error: updateError } = await updateProfile(user.id, {
        avatar_url: data.publicUrl,
      });

      if (updateError) {
        Alert.alert(
          'Profile Update Failed',
          'The picture uploaded, but its URL could not be saved: ' +
            updateError
        );
        return;
      }

      setProfile((previous) =>
        previous
          ? { ...previous, avatar_url: data.publicUrl }
          : previous
      );

      Alert.alert(
        'Success',
        'Your profile picture has been updated.'
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Could not update your profile picture.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    if (uploading || saving) return;

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              const result = await signOut();

              if (result.error) {
                Alert.alert(
                  'Sign Out Failed',
                  typeof result.error === 'string'
                    ? result.error
                    : result.error.message || 'Please try again.'
                );
                return;
              }

              router.replace('/login');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.message || 'Failed to sign out.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (role: Profile['role']) => {
    switch (role) {
      case 'teacher':
        return 'Teacher';
      case 'admin':
        return 'Administrator';
      default:
        return 'Student';
    }
  };

  const initial = (
    profile?.full_name || profile?.email || 'U'
  ).charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headingContainer}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>
          Manage your personal information
        </Text>
      </View>

      {profile ? (
        <>
          <View style={styles.profileHeader}>
            <Pressable
              onPress={handleChangePhoto}
              disabled={uploading || loading}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              style={({ pressed }) => [
                styles.avatarOuter,
                pressed && styles.pressed,
              ]}
            >
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              )}

              <View style={styles.cameraBadge}>
                <Text style={styles.cameraText}>✎</Text>
              </View>

              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            <Text style={styles.profileName}>
              {profile.full_name || 'Your Profile'}
            </Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {getRoleLabel(profile.role)}
              </Text>
            </View>

            <Pressable
              onPress={handleChangePhoto}
              disabled={uploading || loading}
              style={({ pressed }) => [
                styles.changePhotoButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.changePhotoText}>
                {uploading
                  ? 'Uploading photo...'
                  : 'Change Profile Picture'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            <Text
              style={[
                styles.sectionTitle,
                { color: '#FFFFFF' },
              ]}
            >
              Personal Information
            </Text>

            <View style={styles.divider} />

            <View style={styles.field}>
              <Text style={styles.label}>FULL NAME</Text>

              {editing ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    editable={!saving}
                    placeholder="Your full name"
                    placeholderTextColor="#86244E"
                    returnKeyType="done"
                    maxLength={100}
                  />

                  <Pressable
                    onPress={handleSaveName}
                    disabled={saving}
                    style={[
                      styles.saveButton,
                      saving && styles.disabledButton,
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                        size="small"
                      />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        Save
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setDraftName(profile.full_name ?? '');
                      setEditing(false);
                    }}
                    disabled={saving}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  style={styles.nameRow}
                >
                  <Text style={styles.value}>
                    {profile.full_name || 'Tap to add your name'}
                  </Text>
                  <Text style={styles.editHint}>Edit</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <Text style={styles.value}>{profile.email}</Text>
            </View>

            {profile.role === 'student' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>SCHOOL ID</Text>
                  <Text style={styles.value}>
                    {profile.student_id || 'Not provided'}
                  </Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>COURSE</Text>
                  <Text style={styles.value}>
                    {profile.course || 'Not provided'}
                  </Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>YEAR LEVEL</Text>
                  <Text style={styles.value}>
                    {profile.year_level || 'Not provided'}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.fieldLast}>
              <Text style={styles.label}>USER ID</Text>
              <Text style={styles.valueSmall}>{profile.id}</Text>
            </View>
          </View>

          <View style={styles.accountSection}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.accountDescription}>
              Sign out securely from your QR-ATT account.
            </Text>

            <AppButton
              title={loading ? 'Signing Out...' : 'Sign Out'}
              icon="log-out-outline"
              onPress={handleSignOut}
              disabled={loading || uploading || saving}
            />
          </View>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.subtitle}>Loading profile...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatarOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 14,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 54,
    backgroundColor: COLORS.card,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 54,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 43,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraText: {
    color: COLORS.textOnPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 54,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  changePhotoButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F3D4E1',
  },
  changePhotoText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#86244E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#86244E',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 20,
  },
  field: {
    marginBottom: 18,
  },
  fieldLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 7,
  },
  value: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  valueSmall: {
    fontSize: 11,
    color: '#FFFFFF',
    lineHeight: 17,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    gap: 12,
  },
  editHint: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    minWidth: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#86244E',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
  accountSection: {
    marginTop: 2,
  },
  accountDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.75,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
});