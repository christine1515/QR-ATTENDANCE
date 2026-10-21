import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Missing EAS variables must not crash the app while importing this module.
// Let the app render and show a clear setup warning on the login screen instead.
export const isSupabaseConfigured = Boolean(
  supabaseUrl?.trim() && supabaseAnonKey?.trim()
);

const clientUrl = supabaseUrl?.trim() || 'https://missing-config.supabase.co';
const clientAnonKey = supabaseAnonKey?.trim() || 'missing-supabase-anon-key';

// Persist the login securely on native devices; on web, Supabase uses browser storage.
const nativeStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(clientUrl, clientAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: nativeStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
