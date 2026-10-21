
import { useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function updateAuthState(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

let initialized = false;

async function initializeAuth() {
  if (initialized) return;
  initialized = true;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    // Do not leave the root layout waiting when EAS omitted Supabase settings.
    if (!isSupabaseConfigured) {
      updateAuthState(null);
      return;
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Session initialization timed out'));
      }, 10000);
    });

    const result = await Promise.race([
      supabase.auth.getSession(),
      timeoutPromise,
    ]);

    if (result.error) {
      console.error('Could not restore session:', result.error.message);
      updateAuthState(null);
      return;
    }

    updateAuthState(result.data.session);
  } catch (error) {
    console.error('Auth initialization failed:', error);
    updateAuthState(null);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);

    // Make sure the loading screen can close.
    if (globalLoading) {
      globalLoading = false;
      notify();
    }
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  updateAuthState(session);
});

void initializeAuth();

export function setAuth(session: Session | null) {
  updateAuthState(session);
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => {
      forceRender((n) => n + 1);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}
export type SignUpProfile = {
  full_name: string;
  student_id: string;
  role: 'student' | 'teacher' | 'admin';
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: profile?.full_name?.trim() ?? '',
        student_id: profile?.student_id?.trim() ?? '',
        role: 'student',
        requested_role: profile?.role ?? 'student',
      },
    },
  });

  if (!error && data.session) {
    updateAuthState(data.session);
  }

  return { data, error };
}

export async function signIn(
  email: string,
  password: string
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (!error && data.session) {
    updateAuthState(data.session);
  }

  return { data, error };
}



type SignOutResult = {
  error: { message: string } | null;
};

export async function signOut(): Promise<SignOutResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: { message: error.message } };
    }

    updateAuthState(null);
    return { error: null };
  } catch (error: unknown) {
    console.error('Sign out failed:', error);

    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to sign out. Please try again.',
      },
    };
  }
}
