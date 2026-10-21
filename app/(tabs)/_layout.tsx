import { useCallback, useState } from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getUserRole, type Role } from '@/lib/profiles';

export default function TabLayout() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRole(null);

        return () => {
          active = false;
        };
      }

      getUserRole(user.id).then((currentRole) => {
        if (active) {
          setRole(currentRole);
        }
      });

      return () => {
        active = false;
      };
    }, [user])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textOnPrimary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: COLORS.primary,
          borderTopWidth: 1,
          borderTopColor: COLORS.accent,
          height: 70,
          paddingTop: 7,
          paddingBottom: 7,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 2,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home-sharp' : 'home-outline'}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Teacher',
          href: role === 'teacher' ? '/teacher' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'clipboard' : 'clipboard-outline'}
              color={color}
              size={23}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: role === 'admin' ? '/admin' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield' : 'shield-outline'}
              color={color}
              size={23}
            />
          ),
        }}
      />
    </Tabs>
  );
}
