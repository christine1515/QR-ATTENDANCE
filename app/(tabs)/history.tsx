import { useFocusEffect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getAllAttendanceHistory,
  getTeacherEventAttendance,
  getTeacherEventSummary,
  type AttendanceRecord,
  type TeacherEventAttendance,
  type TeacherEventSummary,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [teacherSummaries, setTeacherSummaries] = useState<TeacherEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  const adminEvents = useMemo(() => {
    const groups = new Map<
      string,
      { eventId: string; eventTitle: string; records: AttendanceRecord[] }
    >();

    studentRecords.forEach((record) => {
      const eventId = record.eventId;
      const existing = groups.get(eventId);

      if (existing) {
        existing.records.push(record);
      } else {
        groups.set(eventId, {
          eventId,
          eventTitle: record.eventTitle || 'Untitled Event',
          records: [record],
        });
      }
    });

    return Array.from(groups.values());
  }, [studentRecords]);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setHistoryError(null);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';
      setRole(currentRole);

      if (currentRole === 'teacher') {
        const [events, summaries] = await Promise.all([
          getTeacherEventAttendance(user.id),
          getTeacherEventSummary(user.id),
        ]);

        setTeacherEvents(events);
        setTeacherSummaries(summaries);
        setStudentRecords([]);
      } else {
        const records =
          currentRole === 'admin'
            ? await getAllAttendanceHistory()
            : await getAttendanceHistory(user.id);

        setStudentRecords(records);
        setTeacherEvents([]);
        setTeacherSummaries([]);
      }
    } catch (error) {
      setStudentRecords([]);
      setTeacherEvents([]);
      setTeacherSummaries([]);
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Could not load attendance history. Check your connection and permissions.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openEvent = (eventId: string) => {
    router.push({
      pathname: '/attendance-details',
      params: { eventId },
    });
  };

  const hasRecords = isTeacher
    ? teacherEvents.length > 0
    : isAdmin
      ? adminEvents.length > 0
      : studentRecords.length > 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading attendance history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isTeacher
          ? 'Attendance Records'
          : isAdmin
            ? 'All Attendance History'
            : 'My Attendance'}
      </Text>

      <Text style={styles.subtitle}>
        {isTeacher
          ? 'View attendance for your events.'
          : isAdmin
            ? 'Attendance records organized by event.'
            : 'Your recorded event attendance.'}
      </Text>

      {historyError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{historyError}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : null}

      {!historyError && !hasRecords ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>✓</Text>
          </View>
          <Text style={styles.emptyTitle}>No attendance records yet</Text>
          <Text style={styles.emptyText}>
            {isTeacher
              ? 'Attendance for your events will appear here.'
              : isAdmin
                ? 'Recorded attendance will appear here.'
                : 'Your attended events will appear here after you check in.'}
          </Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Refresh</Text>
          </Pressable>
        </View>
      ) : null}

      {isTeacher && !historyError && hasRecords ? (
        <FlatList
          data={teacherEvents}
          keyExtractor={(item) => item.eventId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
          renderItem={({ item }) => {
            const summary = teacherSummaries.find(
              (entry) => entry.eventId === item.eventId
            );

            return (
              <Pressable
                style={({ pressed }) => [
                  styles.teacherCard,
                  pressed && styles.pressed,
                ]}
                onPress={() => openEvent(item.eventId)}
              >
                <View style={styles.cardAccent} />

                <View style={styles.cardContent}>
                  <Text style={styles.eventTitle}>
                    {item.title || 'Untitled Event'}
                  </Text>
                  <Text style={styles.eventCode}>
                    Event Code: {item.eventCode || 'N/A'}
                  </Text>

                  <View style={styles.countBadge}>
                    <Text style={styles.countNumber}>
                      {summary?.attendeeCount ?? item.attendeeCount ?? 0}
                    </Text>
                    <Text style={styles.countLabel}>Students attended</Text>
                  </View>

                  <View style={styles.cardDivider} />

                  <Text style={styles.sectionTitle}>Recent Students</Text>

                  {item.attendees?.length ? (
                    item.attendees.slice(0, 3).map((attendee, index) => (
                      <View
                        key={`${attendee.studentId}-${index}`}
                        style={styles.attendeeRow}
                      >
                        <View style={styles.studentDot} />
                        <Text style={styles.studentId}>
                          {shortId(attendee.studentId)}
                        </Text>
                        <Text style={styles.studentTime}>
                          {formatDate(attendee.scannedAt)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noStudents}>
                      No student attendance recorded yet.
                    </Text>
                  )}

                  <View style={styles.cardFooter}>
                    <Text style={styles.tapHint}>View attendance details</Text>
                    <Text style={styles.arrow}>›</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      ) : null}

      {isAdmin && !historyError && hasRecords ? (
        <FlatList
          data={adminEvents}
          keyExtractor={(item) => item.eventId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.teacherCard,
                pressed && styles.pressed,
              ]}
              onPress={() => openEvent(item.eventId)}
            >
              <View style={styles.cardAccent} />
              <View style={styles.cardContent}>
                <Text style={styles.eventTitle}>{item.eventTitle}</Text>

                <View style={styles.countBadge}>
                  <Text style={styles.countNumber}>{item.records.length}</Text>
                  <Text style={styles.countLabel}>Attendance records</Text>
                </View>

                <Text style={styles.metaText}>
                  Latest scan: {formatDate(item.records[0]?.scannedAt)}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.tapHint}>View attendance details</Text>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      ) : null}

      {!isTeacher && !isAdmin && !historyError && hasRecords ? (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <View style={styles.studentCard}>
              <View style={styles.studentCardTop}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
                <View style={styles.studentEventContainer}>
                  <Text style={styles.studentEventTitle}>
                    {item.eventTitle || 'Untitled Event'}
                  </Text>
                  <Text style={styles.scannedText}>Attendance recorded</Text>
                </View>
              </View>

              <View style={styles.cardDividerStudent} />
              <Text style={styles.metaLabel}>EVENT ID</Text>
              <Text style={styles.studentMetaValue}>{item.eventId}</Text>
              <Text style={styles.metaLabel}>RECORDED</Text>
              <Text style={styles.studentMetaValue}>
                {formatDate(item.scannedAt)}
              </Text>
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleString();
}

function shortId(value?: string | null) {
  if (!value) return 'Unknown student';
  return `…${value.slice(-8)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  list: {
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  teacherCard: {
    marginBottom: 12,
    flexDirection: 'row',
    backgroundColor: '#86244E',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#86244E',
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardAccent: {
    width: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  cardContent: {
    flex: 1,
    padding: 17,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  eventCode: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  countBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  backgroundColor: '#F3D4E1',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 8,
  marginTop: 14,
  gap: 8,
},
countNumber: {
  color: '#86244E',
  fontSize: 19,
  fontWeight: '800',
},
countLabel: {
  color: '#86244E',
  fontSize: 12,
  fontWeight: '600',
},
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 15,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  studentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  studentId: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
  },
  studentTime: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
  },
  noStudents: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    paddingVertical: 4,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
    marginTop: 15,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapHint: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
  studentCard: {
    backgroundColor: '#86244E',
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#86244E',
    padding: 18,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
  },
  studentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#16A34A',
    fontSize: 22,
    fontWeight: '800',
  },
  studentEventContainer: {
    flex: 1,
  },
  studentEventTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  scannedText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  cardDividerStudent: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 16,
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
  },
  studentMetaValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginTop: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIconText: {
    color: COLORS.primary,
    fontSize: 27,
    fontWeight: '800',
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 16,
  },
  retryText: {
    color: COLORS.textOnPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  errorCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginTop: 20,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 20,
  },
});