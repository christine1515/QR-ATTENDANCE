import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getUserRole,
  updateProfile,
  type Role,
} from '@/lib/profiles';
import { deleteAttendanceRecord } from '@/lib/attendance';
import { supabase } from '@/lib/supabase';
import {
  closeEvent,
  createEvent,
  updateEvent,
} from '@/lib/events';
import QRCode from 'react-native-qrcode-svg';

type UserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

type EventRecord = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  description: string | null;
  status: 'open' | 'closed';
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string;
  event_title: string;
};

export default function AdminScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
const [editingUserId, setEditingUserId] = useState<string | null>(null);
const [editUserName, setEditUserName] = useState('');
const [savingUser, setSavingUser] = useState(false);
const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (!user) {
      setUsers([]);
      setEvents([]);
      setAttendance([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        { data: userData, error: userError },
        { data: eventData, error: eventError },
        { data: attendanceData, error: attendanceError },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .order('email', { ascending: true }),

        supabase
          .from('events')
          .select(
            'id, event_code, title, start_time, end_time, venue, description, status'
          )
          .order('created_at', { ascending: false }),

        supabase
  .from('attendance')
  .select('id, student_id, event_id, scanned_at, status')
  .order('scanned_at', { ascending: false }),
      ]);

      if (userError) {
        throw new Error(userError.message);
      }

      if (eventError) {
        throw new Error(eventError.message);
      }

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      setUsers((userData ?? []) as []);
      setEvents((eventData ?? []) as EventRecord[]);
const eventMap = new Map(
  (eventData ?? []).map((event: any) => [
    event.id,
    event.title,
  ])
);

console.log('ADMIN USER:', user.id);
console.log('ATTENDANCE COUNT:', attendanceData?.length);
console.log('ATTENDANCE ERROR:', attendanceError);

setAttendance(
  (attendanceData ?? []).map((row: any) => ({
    id: row.id,
    student_id: row.student_id,
    event_id: row.event_id,
    scanned_at: row.scanned_at,
    event_title:
      eventMap.get(row.event_id) ?? 'Unknown event',
  }))
);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load administrator data.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!user) {
        setRoleLoading(false);

        return () => {
          active = false;
        };
      }

      setRoleLoading(true);

      getUserRole(user.id).then((currentRole) => {
        if (!active) return;

        setRole(currentRole);
        setRoleLoading(false);

        if (currentRole === 'admin') {
          loadAdminData();
        } else {
          setLoading(false);
        }
      });

      return () => {
        active = false;
      };
    }, [user, loadAdminData])
  );

  const handleChangeRole = async (
    currentUser: UserRecord,
    newRole: Role
  ) => {
    if (currentUser.role === newRole) {
      return;
    }

    Alert.alert(
      'Change User Role',
      `Change ${currentUser.email}'s role to ${newRole}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Change',
          onPress: async () => {
            const { error } = await updateProfile(
              currentUser.id,
              {
                role: newRole,
              }
            );

            if (error) {
              Alert.alert(
                'Error',
                `Could not change user role.\n\n${error}`
              );
              return;
            }

            Alert.alert(
              'Success',
              `${currentUser.email} is now ${newRole}.`
            );

            await loadAdminData();
          },
        },
      ]
    );
  };
  const handleSaveUser = async (item: UserRecord) => {
  if (!editUserName.trim()) {
    Alert.alert('Error', 'Name cannot be empty.');
    return;
  }

  setSavingUser(true);

  try {
    const { error } = await updateProfile(item.id, {
      full_name: editUserName.trim(),
    });

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setEditingUserId(null);
    setEditUserName('');

    Alert.alert('Success', 'User information updated.');
    await loadAdminData();
  } finally {
    setSavingUser(false);
  }
};

const handleDeleteUser = (item: UserRecord) => {
  if (item.id === user?.id) {
    Alert.alert('Not Allowed', 'You cannot delete your own account.');
    return;
  }

  Alert.alert(
    'Delete User',
    `Are you sure you want to delete ${item.email}? This action cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingUserId(item.id);
            const { data, error } = await supabase.functions.invoke(
              'delete-user',
              { body: { userId: item.id } }
            );

            if (error || data?.error) {
              Alert.alert(
                'Error',
                data?.error ?? error?.message ?? 'Could not delete user.'
              );
              return;
            }

            Alert.alert('Success', 'User account deleted.');
            await loadAdminData();
          } catch {
            Alert.alert('Error', 'Could not delete user. Check the delete-user Edge Function and admin permissions.');
          } finally {
            setDeletingUserId(null);
          }
        },
      },
    ]
  );
};

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim()) {
      Alert.alert('Error', 'Event name cannot be empty.');
      return;
    }

    if (
      !newEventStartTime.trim() ||
      !newEventEndTime.trim()
    ) {
      Alert.alert(
        'Error',
        'Please enter both the start time and end time.'
      );
      return;
    }

    setCreatingEvent(true);

    try {
      const eventCode = `EVENT-${Date.now()}`;

      const { error } = await createEvent({
        eventId: eventCode,
        title: newEventTitle,
        start: newEventStartTime,
        end: newEventEndTime,
        venue: newEventVenue,
        description: newEventDescription,
        status: 'open',
      });

      if (error) {
        Alert.alert(
          'Error',
          `Could not create event.\n\n${error}`
        );
        return;
      }

      Alert.alert(
        'Success',
        'Event has been created successfully.'
      );

      setNewEventTitle('');
      setNewEventStartTime('');
      setNewEventEndTime('');
      setNewEventVenue('');
      setNewEventDescription('');

      await loadAdminData();
    } finally {
      setCreatingEvent(false);
    }
  };

  const startEditingEvent = (event: EventRecord) => {
    setEditingEventId(event.id);
    setEditTitle(event.title);
    setEditStartTime(event.start_time ?? '');
    setEditEndTime(event.end_time ?? '');
    setEditVenue(event.venue ?? '');
    setEditDescription(event.description ?? '');
  };

  const cancelEditingEvent = () => {
    setEditingEventId(null);
    setEditTitle('');
    setEditStartTime('');
    setEditEndTime('');
    setEditVenue('');
    setEditDescription('');
  };

  const handleSaveEvent = async (eventId: string) => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Event title cannot be empty.');
      return;
    }

    setSavingEvent(true);

    try {
      const { error } = await updateEvent(eventId, {
        title: editTitle,
        start: editStartTime,
        end: editEndTime,
        venue: editVenue,
        description: editDescription,
      });

      if (error) {
        Alert.alert(
          'Error',
          `Could not update event.\n\n${error}`
        );
        return;
      }

      Alert.alert('Success', 'Event has been updated.');

      cancelEditingEvent();
      await loadAdminData();
    } finally {
      setSavingEvent(false);
    }
  };

  const handleCloseEvent = (event: EventRecord) => {
    if (event.status === 'closed') {
      return;
    }

    Alert.alert(
      'Close Event',
      `Are you sure you want to close "${event.title}"? Students will no longer be able to record attendance for this event.`,
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

            Alert.alert(
              'Success',
              'Event has been closed.'
            );

            await loadAdminData();
          },
        },
      ]
    );
  };

  const handleDeleteEvent = (event: EventRecord) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', event.id);

            if (error) {
              Alert.alert(
                'Error',
                `Could not delete event.\n\n${error.message}`
              );
              return;
            }

            Alert.alert(
              'Success',
              'Event has been deleted.'
            );

            if (editingEventId === event.id) {
              cancelEditingEvent();
            }

            await loadAdminData();
          },
        },
      ]
    );
  };

  const handleDeleteAttendance = (record: AttendanceRecord) => {
    Alert.alert(
      'Remove Attendance',
      `Are you sure you want to remove the attendance record for ${record.student_id}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAttendanceRecord(record.id);

            if (error) {
              Alert.alert(
                'Error',
                `Could not remove attendance record.\n\n${error}`
              );
              return;
            }

            Alert.alert(
              'Success',
              'Attendance record has been removed.'
            );

            await loadAdminData();
          },
        },
      ]
    );
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return 'No schedule set';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };
  const filteredUsers = users.filter((item) => {
  const search = userSearch.trim().toLowerCase();

  return (
    item.full_name?.toLowerCase().includes(search) ||
    item.email.toLowerCase().includes(search)
  );
});

  const studentCount = users.filter(
    (currentUser) => currentUser.role === 'student'
  ).length;

  const teacherCount = users.filter(
    (currentUser) => currentUser.role === 'teacher'
  ).length;

  const adminCount = users.filter(
    (currentUser) => currentUser.role === 'admin'
  ).length;

  if (roleLoading) {
    return (
      <View style={styles.centered}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={32}
            color={COLORS.accent}
          />
        </View>

        <Text style={styles.lockTitle}>
          Checking administrator access...
        </Text>
      </View>
    );
  }

  if (role !== 'admin') {
    return (
      <View style={styles.centered}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={34}
            color={COLORS.accent}
          />
        </View>

        <Text style={styles.lockTitle}>
          Administrators Only
        </Text>

        <Text style={styles.lockMessage}>
          Only administrator accounts can access this page.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={26}
            color={COLORS.accent}
          />
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Administrator</Text>

          <Text style={styles.subtitle}>
            Manage users, events, attendance, and system records.
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={loadAdminData}
          disabled={loading}
        >
          <Ionicons
            name="refresh-outline"
            size={19}
            color={COLORS.textOnPrimary}
          />

          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
          />

          <Text style={styles.statusText}>
            Loading system records...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={COLORS.accent}
            />
          </View>

          <Text style={styles.errorTitle}>
            Could not load administrator data
          </Text>

          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadAdminData}
          >
            <Ionicons
              name="refresh-outline"
              size={16}
              color={COLORS.textOnPrimary}
            />

            <Text style={styles.retryText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
       
<Text style={styles.sectionTitle}>
  System Overview
</Text>

<View style={styles.sectionAccent} />

<View style={styles.statsGrid}>

            <StatCard
              icon="people-outline"
              label="Total Users"
              value={users.length}
            />

            <StatCard
              icon="school-outline"
              label="Students"
              value={studentCount}
            />

            <StatCard
              icon="briefcase-outline"
              label="Teachers"
              value={teacherCount}
            />

            <StatCard
              icon="shield-checkmark-outline"
              label="Admins"
              value={adminCount}
            />

            <StatCard
              icon="calendar-outline"
              label="Events"
              value={events.length}
            />

            <StatCard
              icon="checkmark-done-outline"
              label="Attendance"
              value={attendance.length}
            />
          </View>

          <Text style={styles.sectionTitle}>
            Manage Users
          </Text>

          <View style={styles.sectionAccent} />

          <TextInput
  style={styles.eventInput}
  value={userSearch}
  onChangeText={setUserSearch}
  placeholder="Search name or email..."
  placeholderTextColor={COLORS.textSecondary}
  autoCapitalize="none"
  autoCorrect={false}
  editable={true}
/>

       
{users.length === 0 ? (
  <EmptyCard text="No registered users found." />
) : filteredUsers.length === 0 ? (
  <EmptyCard text="No users match your search." />
) : (
  filteredUsers.map((currentUser) => (
    <View key={currentUser.id} style={styles.recordCard}>
      <View style={styles.recordIcon}>
        <Ionicons
          name="person-outline"
          size={21}
          color={COLORS.accent}
        />
      </View>

      <View style={styles.recordContent}>
        <Text style={styles.recordTitle}>
          {currentUser.full_name || 'No name set'}
        </Text>

        <Text style={styles.recordSecondary}>
          {currentUser.email}
        </Text>

        <View style={styles.currentRoleBadge}>
          <Text style={styles.currentRoleText}>
            Current role: {currentUser.role}
          </Text>
        </View>

        <Text style={styles.changeRoleLabel}>Change role</Text>

        <View style={styles.roleButtons}>
          {(['student', 'teacher', 'admin'] as const).map((role) => (
            <Pressable
              key={role}
              style={[
                styles.roleButton,
                currentUser.role === role && styles.roleButtonActive,
              ]}
              onPress={() => handleChangeRole(currentUser, role)}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  currentUser.role === role &&
                    styles.roleButtonTextActive,
                ]}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {editingUserId === currentUser.id ? (
          <View>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.eventInput}
              value={editUserName}
              onChangeText={setEditUserName}
              placeholder="Enter full name"
              placeholderTextColor={COLORS.textSecondary}
              editable={!savingUser}
            />

            <View style={styles.eventActions}>
              <Pressable
                style={styles.editButton}
                onPress={() => handleSaveUser(currentUser)}
                disabled={savingUser}
              >
                <Ionicons
                  name="save-outline"
                  size={16}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.editButtonText}>
                  {savingUser ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.eventCancelButton}
                onPress={() => {
                  setEditingUserId(null);
                  setEditUserName('');
                }}
                disabled={savingUser}
              >
                <Text style={styles.eventCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={[styles.editButton, styles.userActionButton]}
            onPress={() => {
              setEditingUserId(currentUser.id);
              setEditUserName(currentUser.full_name ?? '');
            }}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={COLORS.textOnPrimary}
            />
            <Text style={styles.editButtonText}>Edit User</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.deleteButton, styles.userActionButton]}
          onPress={() => handleDeleteUser(currentUser)}
          disabled={deletingUserId !== null}
        >
          <Ionicons
            name="trash-outline"
            size={16}
            color={COLORS.textOnPrimary}
          />
          <Text style={styles.deleteButtonText}>{deletingUserId === currentUser.id ? 'Deleting...' : 'Delete User'}</Text>
        </Pressable>
      </View>
    </View>
  ))
)}


          <Text style={styles.sectionTitle}>
            Manage Events
          </Text>

          <View style={styles.sectionAccent} />

          <View style={styles.createEventCard}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingIcon}>
                <Ionicons
                  name="add-circle-outline"
                  size={22}
                  color={COLORS.accent}
                />
              </View>

              <View style={styles.cardHeadingText}>
                <Text style={styles.createEventTitle}>
                  Create New Event
                </Text>

                <Text style={styles.cardHeadingSubtitle}>
                  Add an event to the system.
                </Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>
              Event Name
            </Text>

            <TextInput
              style={styles.eventInput}
              value={newEventTitle}
              onChangeText={setNewEventTitle}
              editable={!creatingEvent}
              placeholder="Event name"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>
              Start Time
            </Text>

            <TextInput
              style={styles.eventInput}
              value={newEventStartTime}
              onChangeText={setNewEventStartTime}
              editable={!creatingEvent}
              placeholder="2026-10-15T18:00:00"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>
              End Time
            </Text>
<TextInput
  style={styles.eventInput}
  value={newEventEndTime}
  onChangeText={setNewEventEndTime}
  editable={!creatingEvent}
  placeholder="2026-10-15T18:00:00"
  placeholderTextColor={COLORS.textSecondary}
/>

            <Text style={styles.inputLabel}>
              Venue
            </Text>

            <TextInput
              style={styles.eventInput}
              value={newEventVenue}
              onChangeText={setNewEventVenue}
              editable={!creatingEvent}
              placeholder="Event venue"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>
              Description
            </Text>

            <TextInput
              style={[
                styles.eventInput,
                styles.descriptionInput,
              ]}
              value={newEventDescription}
              onChangeText={setNewEventDescription}
              editable={!creatingEvent}
              placeholder="Event description"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              style={styles.createEventButton}
              onPress={handleCreateEvent}
              disabled={creatingEvent}
            >
              <Ionicons
                name="add-circle-outline"
                size={19}
                color={COLORS.textOnPrimary}
              />

              <Text style={styles.createEventButtonText}>
                {creatingEvent
                  ? 'Creating...'
                  : 'Create Event'}
              </Text>
            </Pressable>
          </View>

          {events.length === 0 ? (
            <EmptyCard text="No events found." />
          ) : (
            events.map((event) => {
              const isEditing = editingEventId === event.id;

              return (
                <View key={event.id} style={styles.eventCard}>
                  {isEditing ? (
                    <View style={styles.recordContent}>
                      <View style={styles.editHeader}>
                        <View style={styles.cardHeadingIcon}>
                          <Ionicons
                            name="create-outline"
                            size={21}
                            color={COLORS.accent}
                          />
                        </View>

                        <Text style={styles.editHeaderTitle}>
                          Edit Event
                        </Text>
                      </View>

                      <Text style={styles.inputLabel}>
                        Event Name
                      </Text>

                      <TextInput
                        style={styles.eventInput}
                        value={editTitle}
                        onChangeText={setEditTitle}
                        editable={!savingEvent}
                        placeholder="Event name"
                        placeholderTextColor={
                          COLORS.textSecondary
                        }
                      />

                      <Text style={styles.inputLabel}>
                        Start Time
                      </Text>
<Text style={styles.inputLabel}>
  Start Time (Philippine Time)
</Text>
<TextInput
  style={styles.eventInput}
  value={editStartTime}
  onChangeText={setEditStartTime}
  editable={!savingEvent}
  placeholder="2026-10-15T17:00:00"
  placeholderTextColor={COLORS.textSecondary}
/>

                      <Text style={styles.inputLabel}>
                        End Time
                      </Text>

                     <TextInput
  style={styles.eventInput}
  value={editEndTime}
  onChangeText={setEditEndTime}
  editable={!savingEvent}
  placeholder="2026-10-15T18:00:00"
  placeholderTextColor={COLORS.textSecondary}
/>

                      <Text style={styles.inputLabel}>
                        Venue
                      </Text>

                      <TextInput
                        style={styles.eventInput}
                        value={editVenue}
                        onChangeText={setEditVenue}
                        editable={!savingEvent}
                        placeholder="Event venue"
                        placeholderTextColor={
                          COLORS.textSecondary
                        }
                      />

                      <Text style={styles.inputLabel}>
                        Description
                      </Text>

                      <TextInput
                        style={[
                          styles.eventInput,
                          styles.descriptionInput,
                        ]}
                        value={editDescription}
                        onChangeText={setEditDescription}
                        editable={!savingEvent}
                        placeholder="Event description"
                        placeholderTextColor={
                          COLORS.textSecondary
                        }
                        multiline
                        textAlignVertical="top"
                      />

                      <View style={styles.eventActions}>
                        <Pressable
                          style={styles.eventSaveButton}
                          onPress={() =>
                            handleSaveEvent(event.id)
                          }
                          disabled={savingEvent}
                        >
                          <Ionicons
                            name="save-outline"
                            size={16}
                            color={COLORS.textOnPrimary}
                          />

                          <Text style={styles.eventSaveText}>
                            {savingEvent
                              ? 'Saving...'
                              : 'Save'}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={styles.eventCancelButton}
                          onPress={cancelEditingEvent}
                          disabled={savingEvent}
                        >
                          <Text style={styles.eventCancelText}>
                            Cancel
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.recordContent}>
                      <View style={styles.eventHeader}>
                        <View style={styles.eventHeaderIcon}>
                          <Ionicons
                            name="calendar-outline"
                            size={21}
                            color={COLORS.accent}
                          />
                        </View>

                        <View style={styles.eventHeaderText}>
                          <Text style={styles.eventTitle}>
                            {event.title}
                          </Text>

                          <Text style={styles.eventCode}>
                            Event Code: {event.event_code}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            event.status === 'closed' &&
                              styles.closedBadge,
                          ]}
                        >
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

                      <View style={styles.eventInfo}>
                        <InfoRow
                          icon="time-outline"
                          label="Start"
                          value={formatDateTime(
                            event.start_time
                          )}
                        />

                        <InfoRow
                          icon="time-outline"
                          label="End"
                          value={formatDateTime(
                            event.end_time
                          )}
                        />

                        <InfoRow
                          icon="location-outline"
                          label="Venue"
                          value={
                            event.venue ||
                            'No venue provided'
                          }
                        />
                      </View>

                      <View style={styles.descriptionBox}>
                        <Text style={styles.descriptionLabel}>
                          Description
                        </Text>

                        <Text style={styles.descriptionText}>
                          {event.description ||
                            'No description provided.'}
                        </Text>
                      </View>

                      <View style={styles.eventActions}>
                        <Pressable
                          style={styles.editButton}
                          onPress={() =>
                            startEditingEvent(event)
                          }
                        >
                          <Ionicons
                            name="create-outline"
                            size={16}
                            color={COLORS.textOnPrimary}
                          />

                          <Text style={styles.editButtonText}>
                            Edit
                          </Text>
                        </Pressable>

                        {event.status === 'open' && (
                          <Pressable
                            style={styles.closeButton}
                            onPress={() =>
                              handleCloseEvent(event)
                            }
                          >
                            <Ionicons
                              name="lock-closed-outline"
                              size={16}
                              color={COLORS.textOnPrimary}
                            />

                            <Text
                              style={styles.closeButtonText}
                            >
                              Close Event
                            </Text>
                          </Pressable>
                        )}

                        <Pressable
                          style={styles.deleteButton}
                          onPress={() =>
                            handleDeleteEvent(event)
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={COLORS.textOnPrimary}
                          />

                          <Text
                            style={styles.deleteButtonText}
                          >
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          <Text style={styles.sectionTitle}>
            Overall Attendance
          </Text>

          <View style={styles.sectionAccent} />

          {attendance.length === 0 ? (
            <EmptyCard text="No attendance records found." />
          ) : (
            attendance.map((record) => (
              <View key={record.id} style={styles.attendanceCard}>
                <View style={styles.attendanceIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color={COLORS.accent}
                  />
                </View>

                <View style={styles.recordContent}>
                  <Text style={styles.eventTitle}>
                    {record.event_title}
                  </Text>

                  <Text style={styles.eventCode}>
                    Student ID: {record.student_id}
                  </Text>

                  <Text style={styles.eventCode}>
                    Recorded:{' '}
                    {formatDateTime(record.scanned_at)}
                  </Text>

                  <Pressable
                    style={styles.removeButton}
                    onPress={() =>
                      handleDeleteAttendance(record)
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={COLORS.textOnPrimary}
                    />

                    <Text style={styles.removeButtonText}>
                      Remove Attendance
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>
            System Reports
          </Text>

          <View style={styles.sectionAccent} />

          <View style={styles.reportCard}>
            <ReportRow
              label="Total registered users"
              value={users.length}
            />

            <ReportRow
              label="Total students"
              value={studentCount}
            />

            <ReportRow
              label="Total teachers"
              value={teacherCount}
            />

            <ReportRow
              label="Total administrators"
              value={adminCount}
            />

            <ReportRow
              label="Total events"
              value={events.length}
            />

            <ReportRow
              label="Total attendance records"
              value={attendance.length}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
};

function StatCard({
  icon,
  label,
  value,
}: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={COLORS.accent}
        />
      </View>

      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReportRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.reportRow}>
      <Text style={styles.reportLabel}>{label}</Text>

      <View style={styles.reportValueBox}>
        <Text style={styles.reportValue}>{value}</Text>
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={15}
        color={COLORS.accent}
      />

      <Text style={styles.infoLabel}>
        {label}:
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="document-outline"
          size={27}
          color={COLORS.accent}
        />
      </View>

      <Text style={styles.emptyText}>{text}</Text>
    </View>
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
    paddingBottom: 55,
  },

  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  lockIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },

  lockTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },

  lockMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 7,
  },

  header: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.slate,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  headerTextContainer: {
    marginBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.card,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textOnPrimary,
    opacity: 0.82,
  },

  refreshButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  refreshText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginLeft: 6,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 18,
    marginBottom: 5,
  },

  sectionAccent: {
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginBottom: 13,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },

  statCard: {
    width: '50%',
    padding: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.slate,
    marginBottom: 10,
    alignItems: 'center',
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  statValue: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.card,
    marginTop: 7,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
    opacity: 0.8,
    marginTop: 2,
    textAlign: 'center',
  },

  recordCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.slate,
    padding: 15,
    marginBottom: 11,
  },

  recordIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  recordContent: {
    flex: 1,
  },

  recordTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.card,
    marginBottom: 3,
  },

  recordSecondary: {
    fontSize: 12,
    color: COLORS.textOnPrimary,
    opacity: 0.75,
    marginTop: 2,
  },

  currentRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondary,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  currentRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.card,
    textTransform: 'capitalize',
  },

  changeRoleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'uppercase',
    marginTop: 11,
    marginBottom: 5,
  },

  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  roleButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  roleButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.card,
    marginLeft: 4,
  },

  roleButtonTextActive: {
    color: COLORS.primary,
  },

  createEventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 17,
    marginBottom: 11,
  },

  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  cardHeadingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginRight: 10,
  },

  cardHeadingText: {
    flex: 1,
  },

  createEventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  cardHeadingSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 9,
    marginBottom: 5,
  },

  eventInput: {
    backgroundColor: COLORS.background,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
  },

  descriptionInput: {
    minHeight: 90,
    paddingTop: 11,
  },

  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.slate,
  },

  createEventButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    marginLeft: 6,
  },

  eventCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.slate,
    padding: 16,
    marginBottom: 11,
  },

  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  editHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.card,
  },

  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  eventHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginRight: 10,
  },

  eventHeaderText: {
    flex: 1,
    marginRight: 8,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.card,
    marginBottom: 4,
  },

  eventCode: {
    fontSize: 11,
    color: COLORS.textOnPrimary,
    opacity: 0.72,
    marginTop: 2,
  },

  statusBadge: {
    backgroundColor: COLORS.secondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  closedBadge: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surface,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.card,
    textTransform: 'uppercase',
  },

  closedBadgeText: {
    color: COLORS.primary,
  },

  eventInfo: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    marginLeft: 6,
    width: 43,
  },

  infoValue: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textOnPrimary,
    opacity: 0.82,
  },

  descriptionBox: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 11,
    marginTop: 9,
    borderWidth: 1,
    borderColor: COLORS.slate,
  },

  descriptionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  descriptionText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.card,
  },

  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 13,
  },

  userActionButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 9,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  editButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginLeft: 5,
  },

  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  closeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginLeft: 5,
  },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    borderRadius: 10,
     paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },

  deleteButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.card,
    marginLeft: 5,
  },

  eventSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  eventSaveText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginLeft: 5,
  },

  eventCancelButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  eventCancelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },

  attendanceCard: {
  flexDirection: 'row',
  backgroundColor: '#6D213C',
  borderRadius: 17,
  borderWidth: 1,
  borderColor: '#8A3A55',
  padding: 15,
  marginBottom: 10,
},

  attendanceIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  removeButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 11,
  },

  removeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.card,
    marginLeft: 5,
  },

  reportCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.slate,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },

  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate,
  },

  reportLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textOnPrimary,
    opacity: 0.8,
    paddingRight: 10,
  },

  reportValueBox: {
    minWidth: 38,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  reportValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.accent,
  },

  loadingContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 17,
    paddingVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate,
  },

  statusText: {
    fontSize: 13,
    color: COLORS.textOnPrimary,
    opacity: 0.8,
    marginTop: 8,
  },

  errorCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 20,
    alignItems: 'center',
  },

  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.card,
    marginTop: 11,
    marginBottom: 6,
    textAlign: 'center',
  },

  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textOnPrimary,
    opacity: 0.78,
    textAlign: 'center',
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: COLORS.secondary,
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginLeft: 5,
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: 21,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 9,
  },
});

