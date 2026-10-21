
import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  student_id?: string | null;
  full_name: string | null;
  course?: string | null;
  year_level?: string | null;
  role: Role;
  avatar_url?: string | null;
};

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, student_id, full_name, course, year_level, role, avatar_url'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    console.error('Could not load profile:', error?.message);
    return null;
  }

  return data as Profile;
}

export async function getUserRole(userId: string): Promise<Role> {
  const profile = await getProfile(userId);
  return profile?.role ?? 'student';
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    role?: Role;
    avatar_url?: string | null;
    course?: string | null;
    year_level?: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error?.message ?? null };
}
