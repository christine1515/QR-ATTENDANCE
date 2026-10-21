import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { CloudEvent } from '@/lib/events';
import { supabase } from '@/lib/supabase';

export default function EventDetails() {
  const params = useLocalSearchParams<{
    eventId?: string | string[];
  }>();

  const eventId = Array.isArray(params.eventId)
    ? params.eventId[0]
    : params.eventId;

  const [event, setEvent] = useState<CloudEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadEvent = async () => {
      setLoading(true);
      setLoadError('');
      setEvent(null);

      if (!eventId || typeof eventId !== 'string') {
        if (isMounted) {
          setLoadError('Missing event ID. Please return and select the event again.');
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

        console.log('Event Details - eventId:', eventId);
        console.log('Event Details - query error:', error?.message ?? null);
        console.log('Event Details - found:', Boolean(data));

        if (error) {
          console.error('Error loading event:', error.message);

          if (isMounted) {
            setLoadError(
              'Unable to load this event. Please check your connection and try again.',
            );
          }
          return;
        }

        if (isMounted) {
          setEvent(data ? (data as CloudEvent) : null);
        }
      } catch (error) {
        console.error('Unexpected error loading event:', error);

        if (isMounted) {
          setLoadError('Something went wrong while loading the event.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

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

  const goBack = () => {
    router.replace('/(tabs)');
  };

  const handleScanQR = () => {
    router.push('/scan');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="calendar-outline"
              size={30}
              color={COLORS.accent}
            />
          </View>

          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Header title="Event Details" />

          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={30}
                color={COLORS.accent}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {loadError ? 'Unable to Load Event' : 'Event Not Found'}
            </Text>

            <Text style={styles.emptyText}>
              {loadError ||
                'This event may have been removed or is no longer available.'}
            </Text>
          </View>

          <AppButton
            title="Go Back"
            icon="arrow-back-outline"
            onPress={goBack}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header title="Event Details" />

        <View style={styles.eventCard}>
          <View style={styles.eventTop}>
            <View style={styles.eventIcon}>
              <Ionicons
                name="calendar-outline"
                size={27}
                color={COLORS.textOnPrimary}
              />
            </View>

            <View style={styles.eventHeading}>
              <Text style={styles.eventTitle}>{event.title}</Text>

              <View
                style={[
                  styles.statusBadge,
                  event.status === 'closed'
                    ? styles.closedBadge
                    : styles.openBadge,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    event.status === 'closed'
                      ? styles.closedDot
                      : styles.openDot,
                  ]}
                />

                <Text
                  style={[
                    styles.statusValue,
                    event.status === 'closed'
                      ? styles.closedStatus
                      : styles.openStatus,
                  ]}
                >
                  {event.status === 'closed' ? 'Closed' : 'Open'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.detailSection}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="play-outline"
                size={19}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>START</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(event.start_time)}
              </Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="stop-outline"
                size={19}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>END</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(event.end_time)}
              </Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="location-outline"
                size={19}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>VENUE</Text>
              <Text style={styles.detailValue}>
                {event.venue || 'No venue specified'}
              </Text>
            </View>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.detailLabel}>DESCRIPTION</Text>

            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>
                {event.description || 'No description provided.'}
              </Text>
            </View>
          </View>

          <View style={styles.codeSection}>
            <View style={styles.codeHeader}>
              <Ionicons
                name="qr-code-outline"
                size={18}
                color={COLORS.accent}
              />
              <Text style={styles.detailLabel}>EVENT QR CODE</Text>
            </View>

            {event.event_code ? (
              <View style={styles.qrContainer}>
                <QRCode
                  value={event.event_code}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>
            ) : (
              <Text style={styles.descriptionText}>
                No event code available.
              </Text>
            )}

            <Text style={styles.eventCode}>
              {event.event_code || 'No event code'}
            </Text>

            <Text style={styles.qrHint}>
              Scan this QR code to identify the event.
            </Text>
          </View>
        </View>

        {event.status === 'open' && (
          <View style={styles.scanButtonContainer}>
            <AppButton
              theme="primary"
              title="Scan QR Code"
              icon="qr-code-outline"
              onPress={handleScanQR}
            />
          </View>
        )}

        <AppButton
          title="Go Back"
          icon="arrow-back-outline"
          onPress={goBack}
        />
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 32,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 9,
  },

  eventCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 5,
  },

  eventTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  eventIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  eventHeading: {
    flex: 1,
  },

  eventTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    lineHeight: 28,
    marginBottom: 9,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  openBadge: {
    backgroundColor: 'rgba(157, 73, 63, 0.35)',
  },

  closedBadge: {
    backgroundColor: 'rgba(145, 47, 54, 0.3)',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  openDot: {
    backgroundColor: COLORS.accent,
  },

  closedDot: {
    backgroundColor: '#B33F4C',
  },

  statusValue: {
    fontSize: 11,
    fontWeight: '800',
  },

  openStatus: {
    color: COLORS.accent,
  },

  closedStatus: {
    color: '#E8A39B',
  },

  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(196, 151, 112, 0.45)',
    marginVertical: 20,
  },

  detailSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 17,
  },

  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 151, 112, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  detailContent: {
    flex: 1,
    paddingTop: 2,
  },

  detailLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 5,
  },

  detailValue: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },

  descriptionSection: {
    marginTop: 2,
    marginBottom: 18,
  },

  descriptionBox: {
    backgroundColor: 'rgba(248, 241, 231, 0.08)',
    borderRadius: 12,
    padding: 13,
    marginTop: 4,
  },

  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textOnPrimary,
  },

  codeSection: {
    backgroundColor: 'rgba(248, 241, 231, 0.08)',
    borderRadius: 12,
    padding: 13,
  },

  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },

  qrContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },

  eventCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 8,
  },

  qrHint: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textOnPrimary,
    textAlign: 'center',
    marginTop: 8,
  },

  scanButtonContainer: {
    marginBottom: 10,
  },

  emptyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 26,
    marginVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 7,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});