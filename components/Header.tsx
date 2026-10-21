import { Image, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = { title: string };

export default function Header({ title }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.logoOuter}>
        <Image
          source={require('@/assets/images/qratt-icon-final.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.titleAccent}>
        <View style={styles.accentDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 22,
    paddingBottom: 22,
    width: '100%',
  },

  logoOuter: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    marginBottom: 14,
    overflow: 'hidden',
  },

  logoImage: {
    width: 86,
    height: 86,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.8,
  },

  titleAccent: {
    width: 62,
    height: 5,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    marginTop: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accentDot: {
    width: 7,
    height: 7,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
});
