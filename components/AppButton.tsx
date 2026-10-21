import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  onPress: () => void;
  disabled?: boolean;
};

export default function AppButton({
  title,
  icon,
  theme,
  onPress,
  disabled = false,
}: Props) {
  if (theme === 'primary') {
    return (
      <View style={styles.buttonOuter}>
        <Pressable
          style={({ pressed }) => [
            styles.buttonInner,
            styles.primaryButton,
            pressed && styles.pressedButton,
            disabled && styles.disabledButton,
          ]}
          onPress={onPress}
          disabled={disabled}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={20}
              color={COLORS.primary}
            />
          </View>

          <Text style={[styles.label, styles.primaryLabel]}>
            {title}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.buttonOuter}>
      <Pressable
        style={({ pressed }) => [
          styles.buttonInner,
          pressed && styles.pressedButton,
          disabled && styles.disabledButton,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <View style={styles.iconContainerSecondary}>
          <Ionicons
            name={icon}
            size={20}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.label}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    width: '100%',
    marginBottom: 14,
  },

  buttonInner: {
    minHeight: 60,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.card,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },

  pressedButton: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  disabledButton: {
    opacity: 0.45,
  },

  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginRight: 10,
  },

  iconContainerSecondary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginRight: 10,
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
  },

  primaryLabel: {
    color: COLORS.textOnPrimary,
  },
});
