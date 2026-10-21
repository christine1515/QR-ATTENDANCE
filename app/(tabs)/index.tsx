import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { CloudEvent, getAvailableEvents } from '@/lib/events';

export default function Index() {
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const availableEvents = await getAvailableEvents();
      setEvents(availableEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEvents();
    } finally {
      setRefreshing(false);
    }
  };

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return 'No schedule set';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const handleEventPress = (event: CloudEvent) => {
    router.push({
      pathname: '/event-details',
      params: {
        eventId: event.id,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <View style={styles.topHeaderRow}>
            <View style={styles.headerTitle}>
              <Header title="QR Attendance" />
            </View>
          </View>

          <Text style={styles.byline}>
            By: Christine Jean P. Gomez
          </Text>
        </View>

        <View style={styles.bodyContainer}>
          <View style={styles.introSection}>
            <View style={styles.heroOrb} />
            <View style={styles.heroOrbSmall} />

            <View style={styles.heroEyebrow}>
              <Ionicons
                name="sparkles"
                size={13}
                color={COLORS.accent}
              />
              <Text style={styles.heroEyebrowText}>
                {' '}YOUR CAMPUS COMPANION
              </Text>
            </View>

            <Text style={styles.mainTitle}>
              Show up. Scan in.{'\n'}Stand out.
            </Text>

            <Text style={styles.subtitle}>
              Your school events, one beautiful place. Discover what's
              happening and check in with a quick scan.
            </Text>

            <Pressable
              onPress={() => router.push('/scan')}
              style={({ pressed }) => [
                styles.heroAction,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name="qr-code-outline"
                size={21}
                color={COLORS.primary}
              />
              <Text style={styles.heroActionText}>
                Scan event QR
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={COLORS.primary}
              />
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Available Events
            </Text>
            <View style={styles.sectionAccent} />
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
              />
              <Text style={styles.statusText}>
                Loading events...
              </Text>
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                No events available
              </Text>
              <Text style={styles.emptyText}>
                There are currently no school events available.
              </Text>
            </View>
          ) : (
            events.map((event) => (
              <Pressable
                key={event.id}
                onPress={() => handleEventPress(event)}
                style={({ pressed }) => [
                  styles.eventCard,
                  pressed && styles.eventCardPressed,
                ]}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventAccent} />
                  <Text style={styles.eventTitle}>
                    {event.title}
                  </Text>
                </View>

                <View style={styles.scheduleContainer}>
                  <View style={styles.scheduleItem}>
                    <Text style={styles.eventLabel}>START</Text>
                    <Text style={styles.eventInfo}>
                      {formatDateTime(event.start_time)}
                    </Text>
                  </View>

                  <View style={styles.scheduleDivider} />

                  <View style={styles.scheduleItem}>
                    <Text style={styles.eventLabel}>END</Text>
                    <Text style={styles.eventInfo}>
                      {formatDateTime(event.end_time)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.tapHint}>
                    Tap to view event details
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.footerContainer}>
          <AppButton
            theme="primary"
            title="Scan QR Code"
            icon="qr-code-outline"
            onPress={() => router.push('/scan')}
          />

          <AppButton
            title="Attendance History"
            icon="time-outline"
            onPress={() => router.push('/history')}
          />

          <AppButton
            title="Profile"
            icon="person-outline"
            onPress={() => router.push('/profile')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },

  headerContainer: {
    marginBottom: 30,
  },

  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    flex: 1,
  },

  byline: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  bodyContainer: {
    flex: 1,
  },

  introSection: {
    alignItems: 'flex-start',
    marginBottom: 32,
    padding: 25,
    paddingVertical: 30,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.20,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  heroOrb: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#98365F',
    right: -72,
    top: -70,
  },

  heroOrbSmall: {
    position: 'absolute',
    width: 115,
    height: 115,
    borderRadius: 60,
    backgroundColor: '#86244E',
    right: 18,
    bottom: -68,
  },

  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  heroEyebrowText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '800',
    color: COLORS.accent,
  },

  heroAction: {
    marginTop: 23,
    backgroundColor: '#FFF3F7',
    borderRadius: 16,
    paddingHorizontal: 17,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  heroActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    flex: 1,
  },

  mainTitle: {
    fontSize: 31,
    fontWeight: '900',
    color: COLORS.textOnPrimary,
    marginBottom: 8,
    letterSpacing: -1.1,
    textAlign: 'left',
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#F9DCE7',
    textAlign: 'left',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  sectionAccent: {
    width: 28,
    height: 4,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginLeft: 10,
  },

  eventCard: {
    backgroundColor: '#86244E',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#A83D6B',
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },

  eventCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  eventAccent: {
    width: 5,
    height: 38,
    borderRadius: 5,
    backgroundColor: '#F3D4E1',
    marginRight: 12,
  },

  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
  },

 scheduleContainer: {
  flexDirection: 'row',
  backgroundColor: '#F3D4E1',
  borderRadius: 12,
  padding: 13,
  marginBottom: 16,
},

  scheduleItem: {
    flex: 1,
  },

  scheduleDivider: {
    width: 1,
    backgroundColor: 'rgba(243, 212, 225, 0.35)',
    marginHorizontal: 10,
  },
eventLabel: {
  fontSize: 10,
  fontWeight: '800',
  color: '#86244E',
  letterSpacing: 1,
  marginBottom: 5,
},

eventInfo: {
  fontSize: 13,
  lineHeight: 18,
  color: '#701C40',
},

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  tapHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F3D4E1',
  },

  centerContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  emptyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  footerContainer: {
    alignItems: 'center',
    paddingTop: 20,
    width: '100%',
    gap: 10,
  },
});