import { supabase } from './supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
  venue?: string;
  description?: string;
  status?: 'open' | 'closed';
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  description: string | null;
  status: 'open' | 'closed';
  created_by: string | null;
  created_at: string;
};

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return { error: userError.message };
    }

    if (!user) {
      return { error: 'Please sign in to create an event.' };
    }

    if (!event.eventId.trim() || !event.title.trim()) {
      return {
        error: 'Event code and title are required.',
      };
    }

    if (event.start && event.end) {
      const startTime = new Date(event.start).getTime();
      const endTime = new Date(event.end).getTime();

      if (
        !Number.isFinite(startTime) ||
        !Number.isFinite(endTime)
      ) {
        return { error: 'Invalid event date or time.' };
      }

      if (endTime <= startTime) {
        return {
          error: 'Event end time must be after its start time.',
        };
      }
    }

    const { error } = await supabase.from('events').insert({
      event_code: event.eventId.trim(),
      title: event.title.trim(),
      start_time: event.start
        ? new Date(event.start).toISOString()
        : null,
      end_time: event.end
        ? new Date(event.end).toISOString()
        : null,
      venue: event.venue?.trim() || null,
      description: event.description?.trim() || null,
      status: event.status ?? 'open',
      created_by: user.id,
    });

    if (error) {
      console.error('Create event error:', error);

      if (error.code === '23505') {
        return {
          error: 'This event code already exists. Choose another code.',
        };
      }

      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Create event exception:', error);

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create event. Please try again.',
    };
  }
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('created_by', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get teacher events error:', error);
      return [];
    }

    return (data ?? []) as CloudEvent[];
  } catch (error) {
    console.error('Get teacher events exception:', error);
    return [];
  }
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('event_code', code.trim())
      .maybeSingle();

    if (error) {
      console.error('Get event by code error:', error);
      return null;
    }

    return data as CloudEvent | null;
  } catch (error) {
    console.error('Get event by code exception:', error);
    return null;
  }
}

export async function getAvailableEvents(): Promise<CloudEvent[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'open')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Get available events error:', error);
      return [];
    }

    return (data ?? []) as CloudEvent[];
  } catch (error) {
    console.error('Get available events exception:', error);
    return [];
  }
}

export async function updateEvent(
  eventId: string,
  updates: {
    title?: string;
    start?: string;
    end?: string;
    venue?: string;
    description?: string;
    status?: 'open' | 'closed';
  }
): Promise<{ error: string | null }> {
  try {
    const updateData: {
      title?: string;
      start_time?: string | null;
      end_time?: string | null;
      venue?: string | null;
      description?: string | null;
      status?: 'open' | 'closed';
    } = {};

    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        return { error: 'Event title is required.' };
      }

      updateData.title = updates.title.trim();
    }

    if (updates.start !== undefined) {
      updateData.start_time = updates.start
        ? new Date(updates.start).toISOString()
        : null;
    }

    if (updates.end !== undefined) {
      updateData.end_time = updates.end
        ? new Date(updates.end).toISOString()
        : null;
    }

    const resultingStart =
      updates.start !== undefined ? updates.start : undefined;
    const resultingEnd =
      updates.end !== undefined ? updates.end : undefined;

    if (resultingStart && resultingEnd) {
      if (
        new Date(resultingEnd).getTime() <=
        new Date(resultingStart).getTime()
      ) {
        return {
          error: 'Event end time must be after its start time.',
        };
      }
    }

    if (updates.venue !== undefined) {
      updateData.venue = updates.venue.trim() || null;
    }

    if (updates.description !== undefined) {
      updateData.description =
        updates.description.trim() || null;
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      console.error('Update event error:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Update event exception:', error);

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update event.',
    };
  }
}

export async function closeEvent(
  eventId: string
): Promise<{ error: string | null }> {
  return updateEvent(eventId, {
    status: 'closed',
  });
}