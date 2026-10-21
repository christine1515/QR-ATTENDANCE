import { MaterialIcons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops! Not Found' }} />

      <View style={styles.container}>
        <View style={styles.iconOuter}>
          <View style={styles.iconCircle}>
            <MaterialIcons
              name="search-off"
              size={42}
              color={COLORS.card}
            />
          </View>
        </View>

        <Text style={styles.code}>404</Text>

        <Text style={styles.title}>Page Not Found</Text>

        <Text style={styles.message}>
          The page you're looking for doesn't exist or may have been moved.
        </Text>

        <Link href="/" style={styles.button}>
          <View style={styles.buttonContent}>
            <MaterialIcons
              name="home"
              size={20}
              color={COLORS.card}
            />
            <Text style={styles.buttonText}>Go Back Home</Text>
          </View>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  iconOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },

  code: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
  },

  title: {
    marginTop: 4,
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  message: {
    marginTop: 10,
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  button: {
    marginTop: 26,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },

  buttonContent: {
    minHeight: 52,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    marginLeft: 9,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.card,
  },
});
