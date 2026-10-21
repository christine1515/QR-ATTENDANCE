import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAdminEventAttendance,
  getTeacherEventAttendance,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile } from '@/lib/profiles';

export default function AttendanceDetails() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<TeacherEventAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setEvent(null);
    setErrorMessage('');
    setUnauthorized(false);

    if (!user || !eventId || Array.isArray(eventId)) {
      setErrorMessage('Missing user or event information.');
      setLoading(false);
      return;
    }

    try {
      const profile = await getProfile(user.id);

      if (!profile || !['admin', 'teacher'].includes(profile.role)) {
        setUnauthorized(true);
        return;
      }

      if (profile.role === 'admin') {
        const selectedEvent = await getAdminEventAttendance(eventId);
        setEvent(selectedEvent);
      } else {
        const events = await getTeacherEventAttendance(user.id);
        const selectedEvent = events.find(
          (item) => item.eventId === eventId
        );

        setEvent(selectedEvent ?? null);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load attendance records. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [user, eventId]);

  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [loadAttendance])
  );

  const formatDate = (value: string | null | undefined) => {
    if (!value) return 'Not set';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.muted}>Loading attendance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (unauthorized || errorMessage || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header title="Attendance Details" />

          <View style={styles.panel}>
            <Text style={styles.heading}>
              {unauthorized
                ? 'Access restricted'
                : errorMessage
                  ? 'Unable to load attendance'
                  : 'Attendance not found'}
            </Text>

            <Text style={styles.muted}>
              {unauthorized
                ? 'Only authorized Admin and Teacher accounts can view these records.'
                : errorMessage ||
                  'The event may have been removed or you may not have access to it.'}
            </Text>

            {errorMessage ? (
              <View style={styles.buttonSpace}>
                <AppButton
                  title="Try Again"
                  icon="refresh-outline"
                  onPress={loadAttendance}
                />
              </View>
            ) : null}

            <View style={styles.buttonSpace}>
              <AppButton
                title="Go Back"
                icon="arrow-back-outline"
                onPress={() => router.back()}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Header title="Attendance Details" />

        <View style={styles.eventCard}>
          <Text style={styles.eventLabel}>SCHOOL EVENT</Text>
          <Text style={styles.eventTitle}>{event.title}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>EVENT CODE</Text>
            <Text style={styles.value}>{event.eventCode}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>START</Text>
            <Text style={styles.value}>{formatDate(event.startTime)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>END</Text>
            <Text style={styles.value}>{formatDate(event.endTime)}</Text>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL ATTENDANCE</Text>
            <Text style={styles.totalNumber}>{event.attendeeCount}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Students Attended</Text>
          <Text style={styles.muted}>
            {event.attendees.length} record(s)
          </Text>
        </View>

        {event.attendees.length === 0 ? (
          <View style={styles.panel}>
            <Text style={styles.heading}>No attendance yet</Text>
            <Text style={styles.muted}>
              Student attendance records will appear here after scanning.
            </Text>
          </View>
        ) : (
          event.attendees.map((attendee, index) => (
            <View
              key={`${attendee.studentId}-${attendee.scannedAt}`}
              style={styles.studentCard}
            >
              <View style={styles.studentTop}>
                <View style={styles.numberCircle}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>

                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>
                    {attendee.studentName?.trim() || 'Name unavailable'}
                  </Text>

                  <Text style={styles.schoolId}>
                    School ID: {attendee.studentSchoolId?.toString().trim() || 'Not provided'}
                  </Text>
                </View>

                <View style={styles.presentBadge}>
                  <Text style={styles.presentText}>
                    {(attendee.status || 'present').toLowerCase() === 'present'
                      ? 'PRESENT'
                      : attendee.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.separator} />
            </View>
          ))
        )}

        <View style={styles.buttonSpace}>
          <AppButton
            title="Go Back"
            icon="arrow-back-outline"
            onPress={() => router.back()}
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  eventCard: {
    backgroundColor: '#86244E',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
  },
  eventLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  value: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  totalBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  totalNumber: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 4,
  },
  studentCard: {
    backgroundColor: '#86244E',
    borderColor: '#86244E',
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
  },
  studentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  numberCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  schoolId: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
  },
 presentBadge: {
  backgroundColor: '#16A34A',
  borderRadius: 10,
  paddingHorizontal: 8,
  paddingVertical: 6,
},
presentText: {
  color: '#FFFFFF',
  fontSize: 9,
  fontWeight: '800',
},
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 14,
  },
  panel: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginTop: 20,
  },
  heading: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  muted: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  buttonSpace: {
    marginTop: 18,
  },
});
