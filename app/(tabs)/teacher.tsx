import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getTeacherEventAttendance,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import {
  closeEvent,
  createEvent,
  getEventsByTeacher,
  updateEvent,
  type CloudEvent,
} from '@/lib/events';
import { getUserRole, type Role } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  );
}

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });

  return `${month} ${pad(date.getDate())}, ${date.getFullYear()} at ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatCloudDateTime(value: string | null) {
  if (!value) return 'Not set';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const QUICK_END_OPTIONS = [
  { label: '+30 min', ms: 30 * 60 * 1000 },
  { label: '+1 hour', ms: 60 * 60 * 1000 },
  { label: '+2 hours', ms: 2 * 60 * 60 * 1000 },
];

type EditTarget = 'start' | 'end';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');

  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');

  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [attendance, setAttendance] = useState<TeacherEventAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editEndDate, setEditEndDate] = useState<Date | null>(null);
  const [editPickerTarget, setEditPickerTarget] = useState<
    'start' | 'end' | null
  >(null);
  const [editPickerPart, setEditPickerPart] = useState<'date' | 'time'>('date');
  const [savingEvent, setSavingEvent] = useState(false);

  const isAndroid = Platform.OS === 'android';

  const loadEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    setEventsLoading(true);

    try {
      const data = await getEventsByTeacher(user.id);
      setEvents(data);
    } finally {
      setEventsLoading(false);
    }
  }, [user]);

  const loadAttendance = useCallback(async () => {
    if (!user) {
      setAttendance([]);
      setAttendanceLoading(false);
      return;
    }

    setAttendanceLoading(true);
    setAttendanceError(null);

    try {
      const data = await getTeacherEventAttendance(user.id);
      setAttendance(data);
    } catch {
      setAttendanceError('Could not load attendance records.');
    } finally {
      setAttendanceLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRoleLoading(false);
        setEvents([]);
        setAttendance([]);
        setEventsLoading(false);
        setAttendanceLoading(false);

        return () => {
          active = false;
        };
      }

      setRoleLoading(true);

      getUserRole(user.id).then((currentRole) => {
        if (!active) return;

        setRole(currentRole);
        setRoleLoading(false);

        if (currentRole === 'teacher') {
          loadEvents();
          loadAttendance();
        } else {
          setEvents([]);
          setAttendance([]);
          setEventsLoading(false);
          setAttendanceLoading(false);
        }
      });

      return () => {
        active = false;
      };
    }, [user, loadEvents, loadAttendance])
  );

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current.getTime());

    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate()
    );

    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleQuickEnd = (ms: number) => {
    setMessage(null);
    setEndDate(new Date(startDate.getTime() + ms));
  };

  const handleCreateEvent = async () => {
    const event = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
      venue: venue.trim(),
      description: description.trim(),
      status: 'open' as const,
    };

    if (!event.eventId || !event.title) {
      setMessage('Event title and code are required.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('End time must be after start time.');
      return;
    }

    const { error } = await createEvent(event);

    if (error) {
      setMessage(error);
      return;
    }

    setMessage('Event saved! Scan the QR with the Scan tab to test it.');
    setPayload(buildQRPayload(event));

    await loadEvents();
    await loadAttendance();
  };

  const startEditingEvent = (event: CloudEvent) => {
    setEditingEventId(event.id);
    setEditTitle(event.title);
    setEditVenue(event.venue ?? '');
    setEditDescription(event.description ?? '');
    setEditStartDate(
      event.start_time ? new Date(event.start_time) : new Date()
    );
    setEditEndDate(
      event.end_time
        ? new Date(event.end_time)
        : new Date(Date.now() + 60 * 60 * 1000)
    );
  };

  const cancelEditingEvent = () => {
    setEditingEventId(null);
    setEditTitle('');
    setEditVenue('');
    setEditDescription('');
    setEditStartDate(null);
    setEditEndDate(null);
    setEditPickerTarget(null);
  };

  const handleEditPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editPickerTarget) return;

    // Android dismisses each native picker after one selection. Dismissing the
    // picker must not cancel/close the event editor.
    if (event.type === 'dismissed' || !selected) {
      setEditPickerTarget(null);
      setEditPickerPart('date');
      return;
    }

    const current = editPickerTarget === 'start'
      ? (editStartDate ?? new Date())
      : (editEndDate ?? new Date());
    const next = new Date(current.getTime());

    if (isAndroid && editPickerPart === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      if (editPickerTarget === 'start') setEditStartDate(next);
      else setEditEndDate(next);
      setEditPickerPart('time');
      return;
    }

    if (isAndroid && editPickerPart === 'time') {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    } else {
      next.setTime(selected.getTime());
    }

    if (editPickerTarget === 'start') setEditStartDate(next);
    else setEditEndDate(next);
    setEditPickerTarget(null);
    setEditPickerPart('date');
  };

  const handleSaveEvent = async () => {
    if (!editingEventId) return;

    if (!editTitle.trim()) {
      Alert.alert('Error', 'Event title cannot be empty.');
      return;
    }

    if (
      editStartDate &&
      editEndDate &&
      editEndDate.getTime() <= editStartDate.getTime()
    ) {
      Alert.alert('Error', 'End time must be after start time.');
      return;
    }

    setSavingEvent(true);

    const { error } = await updateEvent(editingEventId, {
      title: editTitle,
      venue: editVenue,
      description: editDescription,
      start: editStartDate ? toLocalISO(editStartDate) : '',
      end: editEndDate ? toLocalISO(editEndDate) : '',
    });

    setSavingEvent(false);

    if (error) {
      Alert.alert('Error', `Could not update event.\n\n${error}`);
      return;
    }

    Alert.alert('Success', 'Event has been updated.');

    cancelEditingEvent();
    await loadEvents();
    await loadAttendance();
  };

  const handleCloseEvent = (event: CloudEvent) => {
    if (event.status === 'closed') {
      return;
    }

    Alert.alert(
      'Close Event',
      `Are you sure you want to close "${event.title}"? Students will no longer see it as an available event.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close Event',
          style: 'destructive',
          onPress: async () => {
            const { error } = await closeEvent(event.id);

            if (error) {
              Alert.alert(
                'Error',
                `Could not close event.\n\n${error}`
              );
              return;
            }

            Alert.alert('Success', 'Event has been closed.');

            setPayload(null);

            await loadEvents();
          },
        },
      ]
    );
  };

  const handleEventPress = (event: CloudEvent) => {
    router.push({
      pathname: '/event-details',
      params: {
        eventId: event.id,
      },
    });
  };

  const handleAttendancePress = (event: TeacherEventAttendance) => {
    router.push({
      pathname: '/attendance-details',
      params: {
        eventId: event.eventId,
      },
    });
  };

  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={30}
            color={COLORS.accent}
          />
        </View>

        <Text style={styles.lockTitle}>Checking your account...</Text>

        <Text style={styles.lockMessage}>
          Verifying teacher access.
        </Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.centered}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={30}
            color={COLORS.accent}
          />
        </View>

        <Text style={styles.lockTitle}>Teachers Only</Text>

        <Text style={styles.lockMessage}>
          Only teacher accounts can create events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderIcon}>
          <Ionicons
            name="school-outline"
            size={28}
            color={COLORS.textOnPrimary}
          />
        </View>

        <View style={styles.pageHeaderText}>
          <Text style={styles.title}>Teacher Dashboard</Text>

          <Text style={styles.subtitle}>
            Create and manage event attendance.
          </Text>
        </View>
      </View>

      <View style={styles.sectionIntro}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name="add-circle-outline"
            size={22}
            color={COLORS.accent}
          />
        </View>

        <View style={styles.sectionIntroText}>
          <Text style={styles.sectionTitle}>Create Event</Text>

          <Text style={styles.sectionSubtitle}>
            Set the event details and generate a QR code for students.
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>EVENT NAME</Text>

        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Founders Day Assembly"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>EVENT CODE</Text>

        <TextInput
          style={styles.input}
          value={eventId}
          onChangeText={setEventId}
          placeholder="e.g. EVT-2026-0002"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>VENUE</Text>

        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder="e.g. University Gymnasium"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>DESCRIPTION</Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter a short description of the event."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>STARTS</Text>

        <PickerField
          value={formatDateTime(startDate)}
          icon="sunny-outline"
          onPress={() => openPicker('start')}
        />

        <Text style={styles.label}>ENDS</Text>

        <PickerField
          value={formatDateTime(endDate)}
          icon="moon-outline"
          onPress={() => openPicker('end')}
        />

        <View style={styles.quickLabelRow}>
          <Ionicons
            name="flash-outline"
            size={15}
            color={COLORS.accent}
          />

          <Text style={styles.quickLabel}>QUICK END TIME</Text>
        </View>

        <View style={styles.chipRow}>
          {QUICK_END_OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              style={({ pressed }) => [
                styles.chip,
                pressed && styles.chipPressed,
              ]}
              onPress={() => handleQuickEnd(option.ms)}
            >
              <Text style={styles.chipText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.openHint}>
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={COLORS.secondary}
          />

          <Text style={styles.hint}>
            New events are created with status: Open.
          </Text>
        </View>

        {message && (
          <View style={styles.messageBox}>
            <Ionicons
              name="checkmark-circle-outline"
              size={19}
              color={COLORS.secondary}
            />

            <Text style={styles.message}>{message}</Text>
          </View>
        )}

        <View style={styles.createButton}>
          <AppButton
            theme="primary"
            title="Create Event"
            icon="add-circle-outline"
            onPress={handleCreateEvent}
          />
        </View>
      </View>

      {editTarget && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={editTarget === 'start' ? startDate : endDate}
            mode={isAndroid ? editingPart : 'datetime'}
            display={isAndroid ? 'default' : 'spinner'}
            onChange={onPickerChange}
          />
        </View>
      )}

      {payload && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultIcon}>
              <Ionicons
                name="qr-code-outline"
                size={24}
                color={COLORS.textOnPrimary}
              />
            </View>

            <View style={styles.resultHeaderText}>
              <Text style={styles.resultTitle}>Event QR Generated</Text>

              <Text style={styles.resultSubtitle}>
                Students can scan this code to record attendance.
              </Text>
            </View>
          </View>

          <View style={styles.qrBox}>
            <QRCode value={payload} size={200} />
          </View>

          <View style={styles.payloadBox}>
            <Text style={styles.payloadLabel}>QR PAYLOAD</Text>

            <Text style={styles.payloadText}>{payload}</Text>
          </View>
        </View>
      )}

      <View style={styles.eventsSection}>
        <View style={styles.sectionIntro}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={COLORS.accent}
            />
          </View>

          <View style={styles.sectionIntroText}>
            <Text style={styles.sectionTitle}>My Events</Text>

            <Text style={styles.sectionSubtitle}>
              View, edit, and close the events you created.
            </Text>
          </View>
        </View>

        {eventsLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
            />

            <Text style={styles.statusText}>
              Loading events...
            </Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={28}
                color={COLORS.accent}
              />
            </View>

            <Text style={styles.emptyTitle}>No events yet</Text>

            <Text style={styles.emptyText}>
              Create an event above and it will appear here.
            </Text>
          </View>
        ) : (
          events.map((event) => {
            const isEditing = editingEventId === event.id;

            return (
              <Pressable
                key={event.id}
                disabled={isEditing}
                onPress={() => handleEventPress(event)}
                style={({ pressed }) => [
                  styles.eventCard,
                  pressed && !isEditing && styles.eventCardPressed,
                ]}
              >
                {isEditing ? (
                  <>
                    <View style={styles.editingHeader}>
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color={COLORS.accent}
                      />

                      <Text style={styles.editingTitle}>
                        Edit Event
                      </Text>
                    </View>

                    <Text style={styles.inputLabel}>EVENT NAME</Text>

                    <TextInput
                      style={styles.input}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      editable={!savingEvent}
                    />

                    <Text style={styles.inputLabel}>VENUE</Text>

                    <TextInput
                      style={styles.input}
                      value={editVenue}
                      onChangeText={setEditVenue}
                      editable={!savingEvent}
                    />

                    <Text style={styles.inputLabel}>
                      DESCRIPTION
                    </Text>

                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      editable={!savingEvent}
                      multiline
                      textAlignVertical="top"
                    />

                    <Text style={styles.inputLabel}>START</Text>

                    {editStartDate && (
                      <PickerField
                        value={formatDateTime(editStartDate)}
                        icon="sunny-outline"
                        onPress={() => {
                          setEditPickerTarget('start');
                          setEditPickerPart('date');
                        }}
                      />
                    )}

                    <Text style={styles.inputLabel}>END</Text>

                    {editEndDate && (
                      <PickerField
                        value={formatDateTime(editEndDate)}
                        icon="moon-outline"
                        onPress={() => {
                          setEditPickerTarget('end');
                          setEditPickerPart('date');
                        }}
                      />
                    )}

                    {editPickerTarget && (
                      <View style={styles.pickerContainer}>
                        <DateTimePicker
                          value={
                            editPickerTarget === 'start'
                              ? editStartDate ?? new Date()
                              : editEndDate ?? new Date()
                          }
                          mode={isAndroid ? editPickerPart : 'datetime'}
                          display={isAndroid ? 'default' : 'spinner'}
                          onChange={handleEditPickerChange}
                        />
                      </View>
                    )}

                    <View style={styles.eventActions}>
                      <Pressable
                        style={styles.saveButton}
                        onPress={handleSaveEvent}
                        disabled={savingEvent}
                      >
                        <Ionicons
                          name="save-outline"
                          size={17}
                          color={COLORS.textOnPrimary}
                        />

                        <Text style={styles.saveButtonText}>
                          {savingEvent ? 'Saving...' : 'Save Changes'}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.cancelButton}
                        onPress={cancelEditingEvent}
                        disabled={savingEvent}
                      >
                        <Text style={styles.cancelButtonText}>
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventHeaderIcon}>
                        <Ionicons
                          name="calendar-outline"
                          size={21}
                          color={COLORS.textOnPrimary}
                        />
                      </View>

                      <View style={styles.eventHeaderText}>
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
  {event.title}
</Text>

                        <Text style={styles.eventCode}>
                          {event.event_code}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          event.status === 'closed' &&
                            styles.closedBadge,
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
                            styles.statusBadgeText,
                            event.status === 'closed' &&
                              styles.closedBadgeText,
                          ]}
                        >
                          {event.status === 'closed'
                            ? 'Closed'
                            : 'Open'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.eventDivider} />

                    <View style={styles.eventDetail}>
                      <Ionicons
                        name="calendar-outline"
                        size={17}
                        color={COLORS.accent}
                      />

                      <Text style={styles.eventDetailText}>
                        {formatCloudDateTime(event.start_time)}
                      </Text>
                    </View>

                    <View style={styles.eventDetail}>
                      <Ionicons
                        name="time-outline"
                        size={17}
                        color={COLORS.accent}
                      />

                      <Text style={styles.eventDetailText}>
                        Ends: {formatCloudDateTime(event.end_time)}
                      </Text>
                    </View>

                    <View style={styles.eventDetail}>
                      <Ionicons
                        name="location-outline"
                        size={17}
                        color={COLORS.accent}
                      />

                      <Text style={styles.eventDetailText}>
                        {event.venue || 'No venue provided'}
                      </Text>
                    </View>

                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionLabel}>
                        DESCRIPTION
                      </Text>

                      <Text style={styles.descriptionText}>
                        {event.description ||
                          'No description provided.'}
                      </Text>
                    </View>

                    <View style={styles.eventActions}>
                      <Pressable
                        style={styles.editButton}
                        onPress={() => setPayload(buildQRPayload({
                          eventId: event.event_code,
                          title: event.title,
                          start: event.start_time ?? undefined,
                          end: event.end_time ?? undefined,
                        }))}
                      >
                        <Ionicons name="qr-code-outline" size={17} color={COLORS.primary} />
                        <Text style={styles.editButtonText}>View QR</Text>
                      </Pressable>

                      <Pressable
                        style={styles.editButton}
                        onPress={() => startEditingEvent(event)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={COLORS.primary}
                        />

                        <Text style={styles.editButtonText}>
                          Edit
                        </Text>
                      </Pressable>

                      {event.status === 'open' && (
                        <Pressable
                          style={styles.closeButton}
                          onPress={() => handleCloseEvent(event)}
                        >
                          <Ionicons
                            name="lock-closed-outline"
                            size={17}
                            color={COLORS.danger}
                          />

                          <Text style={styles.closeButtonText}>
                            Close Event
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </>
                )}
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.attendanceSection}>
        <View style={styles.attendanceHeader}>
          <View style={styles.attendanceHeaderIcon}>
            <Ionicons
              name="people-outline"
              size={23}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.attendanceHeaderText}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
  Attendance
</Text>

            <Text style={styles.sectionSubtitle}>
              Tap an event to view the students who scanned its QR code.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.refreshPressed,
            ]}
            onPress={loadAttendance}
            disabled={attendanceLoading}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={COLORS.textOnPrimary}
            />
          </Pressable>
        </View>

        {attendanceLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
            />

            <Text style={styles.statusText}>
              Loading attendance records...
            </Text>
          </View>
        ) : attendanceError ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={COLORS.accent}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Unable to load attendance
            </Text>

            <Text style={styles.emptyText}>
              {attendanceError}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={loadAttendance}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : attendance.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="people-outline"
                size={28}
                color={COLORS.accent}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No attendance yet
            </Text>

            <Text style={styles.emptyText}>
              Create an event and have students scan its QR code.
              Attendance records will appear here.
            </Text>
          </View>
        ) : (
          attendance.map((event) => (
            <Pressable
              key={event.eventId}
              onPress={() => handleAttendancePress(event)}
              style={({ pressed }) => [
                styles.attendanceCard,
                pressed && styles.attendanceCardPressed,
              ]}
            >
              <View style={styles.attendanceEventHeader}>
                <View style={styles.attendanceEventIcon}>
                  <Ionicons
                    name="people-outline"
                    size={21}
                    color={COLORS.textOnPrimary}
                  />
                </View>

                <View style={styles.eventHeaderText}>
                  <Text style={styles.eventTitle}>
                    {event.title}
                  </Text>

                  <Text style={[styles.eventCode, { color: '#800020' }]}>
  {event.eventCode}
</Text>
</View>

                <Ionicons
                  name="chevron-forward-outline"
                  size={22}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.summaryBox}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name="people-outline"
                    size={23}
                    color={COLORS.accent}
                  />
                </View>

                <View style={styles.summaryTextContainer}>
                  <Text style={styles.summaryLabel}>
                    ATTENDANCE SUMMARY
                  </Text>

                  <Text style={styles.summaryCount}>
                    {event.attendeeCount}{' '}
                    {event.attendeeCount === 1
                      ? 'student'
                      : 'students'}
                  </Text>
                </View>
              </View>

              <View style={styles.tapHintContainer}>
                <Ionicons
                  name="eye-outline"
                  size={16}
                  color={COLORS.secondary}
                />

                <Text style={styles.tapHint}>
                  Tap to view students who scanned
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

type PickerFieldProps = {
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function PickerField({
  value,
  icon,
  onPress,
}: PickerFieldProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerField,
        pressed && styles.pickerFieldPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.pickerIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.accent}
        />
      </View>

      <Text style={styles.pickerValue}>{value}</Text>

      <Ionicons
        name="calendar-outline"
        size={18}
        color={COLORS.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 44,
  },

  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  lockIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 14,
    textAlign: 'center',
  },

  lockMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 7,
    textAlign: 'center',
    lineHeight: 21,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 17,
    marginBottom: 25,
  },

  pageHeaderIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  pageHeaderText: {
    flex: 1,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.accent,
    lineHeight: 19,
  },

  sectionIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  sectionIntroText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  label: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 7,
    marginTop: 12,
  },

  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  textArea: {
    minHeight: 90,
    paddingTop: 12,
  },

  pickerField: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pickerFieldPressed: {
    opacity: 0.75,
  },

  pickerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pickerValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginHorizontal: 10,
  },

  quickLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 7,
  },

  quickLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginLeft: 5,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  chip: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 7,
    marginBottom: 5,
  },

  chipPressed: {
    opacity: 0.75,
  },

  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },

  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(157, 73, 63, 0.10)',
    borderRadius: 10,
    padding: 9,
    marginTop: 13,
  },

  hint: {
    flex: 1,
    fontSize: 11,
    color: COLORS.secondary,
    marginLeft: 6,
  },

  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(157, 73, 63, 0.12)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },

  message: {
    flex: 1,
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '700',
    marginLeft: 7,
  },

  createButton: {
    marginTop: 16,
  },

  pickerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },

  resultCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 5,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 17,
  },

  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  resultHeaderText: {
    flex: 1,
  },

  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },

  resultSubtitle: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.accent,
    marginTop: 3,
  },

  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 15,
    marginBottom: 13,
  },

  payloadBox: {
    width: '100%',
    backgroundColor: 'rgba(248, 241, 231, 0.08)',
    borderRadius: 11,
    padding: 10,
  },

  payloadLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },

  payloadText: {
    fontSize: 9,
    color: COLORS.textOnPrimary,
    lineHeight: 14,
  },

  eventsSection: {
    marginTop: 32,
  },

  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 23,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  eventCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 17,
    marginBottom: 13,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 7,
    elevation: 4,
  },

  eventCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  editingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 151, 112, 0.4)',
  },

  editingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    marginLeft: 8,
  },

  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  eventHeaderIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  eventHeaderText: {
    flex: 1,
    marginRight: 8,
  },

  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#800020',
    lineHeight: 22,
    marginBottom: 3,
  },

  eventCode: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(157, 73, 63, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  closedBadge: {
    backgroundColor: 'rgba(145, 47, 54, 0.3)',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  openDot: {
    backgroundColor: COLORS.accent,
  },

  closedDot: {
    backgroundColor: '#E8A39B',
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accent,
    textTransform: 'uppercase',
  },

  closedBadgeText: {
    color: '#E8A39B',
  },

  eventDivider: {
    height: 1,
    backgroundColor: 'rgba(196, 151, 112, 0.4)',
    marginVertical: 14,
  },

  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  eventDetailText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textOnPrimary,
    marginLeft: 8,
  },

  descriptionBox: {
    backgroundColor: 'rgba(248, 241, 231, 0.08)',
    borderRadius: 11,
    padding: 11,
    marginTop: 13,
  },

  descriptionLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },

  descriptionText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textOnPrimary,
  },

  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  editButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 5,
  },

  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 241, 231, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196, 151, 112, 0.45)',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  closeButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8A39B',
    marginLeft: 5,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  saveButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    marginLeft: 5,
  },

  cancelButton: {
    backgroundColor: COLORS.card,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  cancelButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  attendanceSection: {
    marginTop: 32,
  },

  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 17,
    padding: 13,
    marginBottom: 13,
  },

  attendanceHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  attendanceHeaderText: {
    flex: 1,
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  refreshPressed: {
    opacity: 0.7,
  },

  attendanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },

  attendanceCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },

  attendanceEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  attendanceEventIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    padding: 12,
    marginTop: 14,
    marginBottom: 13,
  },

  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 151, 112, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryTextContainer: {
    marginLeft: 10,
  },

  summaryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.8,
  },

  summaryCount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    marginTop: 2,
  },

  tapHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tapHint: {
    fontSize: 11,
    color: COLORS.secondary,
    marginLeft: 5,
    textAlign: 'center',
    fontWeight: '700',
  },

  retryButton: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },

  retryText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
});

