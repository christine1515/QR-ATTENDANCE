import { supabase } from './supabase';
import { parseQRPayload } from './qr';
import { getEventByCode } from './events';
import { getProfile } from './profiles';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    studentSchoolId: string;
    studentName: string;
    scannedAt: string;
    status: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return { success: false, message: parsed.message };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || user.id !== studentId) {
    return {
      success: false,
      message: 'Please sign in with your student account.',
    };
  }

  const profile = await getProfile(user.id);

  if (!profile || profile.role !== 'student') {
    return {
      success: false,
      message: 'Only student accounts can record attendance.',
    };
  }

  const foundEvent = await getEventByCode(parsed.payload.event);

  if (!foundEvent) {
    return {
      success: false,
      message: 'Invalid QR code. This event does not exist.',
    };
  }

  if (foundEvent.status !== 'open') {
    return {
      success: false,
      message: 'This event is closed. Attendance is no longer available.',
      eventTitle: foundEvent.title,
    };
  }

  const { data: existingAttendance, error: existingError } =
    await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', user.id)
      .eq('event_id', foundEvent.id)
      .maybeSingle();

  if (existingError) {
    return {
      success: false,
      message: 'Could not verify attendance. Please try again.',
    };
  }

  if (existingAttendance) {
    return {
      success: false,
      message: 'You have already recorded attendance for this event.',
      eventTitle: foundEvent.title,
    };
  }

  const { error: attError } = await supabase
    .from('attendance')
    .insert({
      student_id: user.id,
      event_id: foundEvent.id,
      status: 'present',
    });

  if (attError) {
    if (attError.code === '23505') {
      return {
        success: false,
        message: 'You have already recorded attendance for this event.',
        eventTitle: foundEvent.title,
      };
    }

    return {
      success: false,
      message: attError.message,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded successfully!',
    eventTitle: foundEvent.title,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, event_id, scanned_at, events(event_code, title)')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load attendance history: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id ?? row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? 'Unknown event',
    scannedAt: row.scanned_at,
  }));
}

export async function getAllAttendanceHistory(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, event_id, scanned_at, events(event_code, title)')
    .order('scanned_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load all attendance history: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id ?? row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? 'Unknown event',
    scannedAt: row.scanned_at,
  }));
}

/**
 * Load attendance for events created by a teacher.
 */
export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError) {
    throw new Error(`Could not load teacher events: ${eventError.message}`);
  }

  if (!events?.length) return [];

  return loadEventsWithAttendance(events);
}

/**
 * Load attendance for one event. Used by Admin event details.
 */
export async function getAdminEventAttendance(
  eventId: string
): Promise<TeacherEventAttendance | null> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error(`Could not load event: ${eventError.message}`);
  }

  if (!event) return null;

  const results = await loadEventsWithAttendance([event]);
  return results[0] ?? null;
}


async function loadEventsWithAttendance(
  events: any[]
): Promise<TeacherEventAttendance[]> {
  if (!events.length) return [];

  const eventIds = events.map((event) => event.id);

  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select('id, student_id, event_id, scanned_at, status')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attError) {
    throw new Error(
      `Could not load event attendance: ${attError.message}`
    );
  }

  const rows = attendance ?? [];
  const studentIds = [
    ...new Set(
      rows
        .map((row: any) => String(row.student_id ?? '').trim())
        .filter(Boolean)
    ),
  ];

  const profileById = new Map<
    string,
    { name: string; schoolId: string }
  >();

  if (studentIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, student_id')
      .in('id', studentIds);

    if (profileError) {
      throw new Error(
        `Could not load student profiles: ${profileError.message}`
      );
    }

    (profiles ?? []).forEach((profile: any) => {
      profileById.set(String(profile.id).trim(), {
        name: profile.full_name?.trim() || 'Name unavailable',
        schoolId: profile.student_id?.toString().trim() || 'Not provided',
      });
    });
  }

  return events.map((event: any) => {
    const eventRows = rows.filter(
      (row: any) => row.event_id === event.id
    );

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: eventRows.length,
      attendees: eventRows.map((row: any) => {
        const profile = profileById.get(
          String(row.student_id ?? '').trim()
        );

        return {
          studentId: row.student_id,
          studentSchoolId: profile?.schoolId ?? 'Not provided',
          studentName: profile?.name ?? 'Name unavailable',
          scannedAt: row.scanned_at ?? null,
          status: row.status ?? 'present',
        };
      }),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError) {
    throw new Error(`Could not load event summaries: ${eventError.message}`);
  }

  if (!events?.length) return [];

  const eventIds = events.map((event: any) => event.id);

  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attError) {
    throw new Error(`Could not load attendance counts: ${attError.message}`);
  }

  const counts: Record<string, number> = {};

  (attendance ?? []).forEach((row: any) => {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event: any) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}


export async function deleteAttendanceRecord(
  attendanceId: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('attendance')
    .delete()
    .eq('id', attendanceId)
    .select('id');

  if (error) {
    console.error('Delete attendance failed:', error.message);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    console.error(
      'No attendance record was deleted. Check the admin role, is_admin() function, RLS policy, and attendance ID:',
      attendanceId
    );

    return {
      error:
        'No record was deleted. Your account may not be recognized as an admin by Supabase, or the attendance record ID was not found.',
    };
  }

  return { error: null };
}
