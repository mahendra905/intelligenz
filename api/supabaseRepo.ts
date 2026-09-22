import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';
import type {
  DatabaseSchema,
  Event,
  Announcement,
  TeamMember,
  Project,
  GalleryImage,
  JoinApplication,
  EventRegistration,
  ContactMessage,
  AdminUserRecord,
  Certificate,
  NewsletterSubscriber,
  NewsletterBroadcast,
  AttendanceRecord,
  CommunityImpactStat,
  AppSettings,
  Stats,
  AuditLogEntry,
  ParticipationType,
  EventWinner,
} from './types';

// ============================================================================
// STRICT POSTGRESQL SCHEMA COLUMN WHITELISTS
// ============================================================================

export const EVENT_ALLOWED_COLUMNS = new Set([
  'id',
  'title',
  'slug',
  'description',
  'short_description',
  'event_image',
  'date',
  'start_time',
  'end_time',
  'venue',
  'category',
  'speaker',
  'speaker_bio',
  'speaker_avatar',
  'speaker_role',
  'registration_url',
  'registration_deadline',
  'maximum_participants',
  'current_participants',
  'status',
  'featured',
  'participation_type',
  'min_team_size',
  'max_team_size',
  'highlights',
  'photos',
  'results',
  'winners',
  'certificates_available',
  'created_at',
  'updated_at',
]);

export const ANNOUNCEMENT_ALLOWED_COLUMNS = new Set([
  'id',
  'title',
  'slug',
  'content',
  'summary',
  'featured_image',
  'category',
  'author',
  'author_role',
  'published_at',
  'featured',
  'tags',
  'created_at',
  'updated_at',
]);

export const TEAM_ALLOWED_COLUMNS = new Set([
  'id',
  'name',
  'position',
  'role',
  'category',
  'department',
  'year',
  'bio',
  'photo_url',
  'image_url',
  'linkedin',
  'github',
  'email',
  'social_links',
  'featured',
  'order',
  'order_index',
]);

export const PROJECT_ALLOWED_COLUMNS = new Set([
  'id',
  'name',
  'title',
  'slug',
  'description',
  'short_description',
  'category',
  'tech_stack',
  'team_members',
  'github_url',
  'demo_url',
  'image_url',
  'featured',
  'status',
  'date',
]);

export const GALLERY_ALLOWED_COLUMNS = new Set([
  'id',
  'title',
  'album',
  'event_name',
  'image_url',
  'caption',
  'date',
  'featured',
]);

export const JOIN_APP_ALLOWED_COLUMNS = new Set([
  'id',
  'full_name',
  'college_email',
  'phone',
  'department',
  'year',
  'roll_number',
  'technical_interests',
  'skills',
  'why_join',
  'github_url',
  'linkedin_url',
  'portfolio_url',
  'agreed_updates',
  'status',
  'reviewer_notes',
  'created_at',
]);

export const REGISTRATION_ALLOWED_COLUMNS = new Set([
  'id',
  'event_id',
  'event_title',
  'full_name',
  'participant_name',
  'email',
  'phone',
  'department',
  'year',
  'roll_number',
  'participation_type',
  'team_name',
  'team_members',
  'ticket_code',
  'qr_token',
  'qr_payload',
  'status',
  'email_status',
  'email_sent_at',
  'email_error',
  'created_at',
]);

export const CHECKIN_ALLOWED_COLUMNS = new Set([
  'id',
  'registration_id',
  'event_id',
  'event_title',
  'participant_name',
  'roll_number',
  'email',
  'department',
  'checked_in_at',
  'checkin_method',
]);

export const CERTIFICATE_ALLOWED_COLUMNS = new Set([
  'id',
  'certificate_code',
  'student_name',
  'student_email',
  'student_roll_no',
  'department',
  'college_name',
  'event_id',
  'event_title',
  'certificate_type',
  'issue_date',
  'issued_by',
  'designation',
  'is_valid',
  'notes',
  'created_at',
]);

export const COMMUNITY_IMPACT_ALLOWED_COLUMNS = new Set([
  'id',
  'value',
  'label',
  'icon',
  'active',
  'order',
  'updated_at',
  'updated_by',
]);

export const SETTINGS_ALLOWED_COLUMNS = new Set([
  'id',
  'site_title',
  'site_tagline',
  'is_recruitment_open',
  'join_us_status',
  'recruitment_deadline',
  'contact_email',
  'contact_phone',
  'instagram_url',
  'linkedin_url',
  'github_url',
  'youtube_url',
  'whatsapp_community_url',
  'automated_email_enabled',
  'email_sender_name',
  'email_sender_address',
  'primary_color',
  'theme',
  'announcement_banner_enabled',
  'announcement_banner_text',
  'announcement_banner_link',
  'updated_at',
]);

export const STATS_ALLOWED_COLUMNS = new Set([
  'id',
  'active_members',
  'events_organized',
  'projects_completed',
  'workshops_conducted',
  'hackathons_hosted',
  'total_attendees',
  'updated_at',
]);

export function filterObjectByAllowedColumns(obj: Record<string, any>, allowedSet: Set<string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (allowedSet.has(key) && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ============================================================================
// GENERIC HELPERS
// ============================================================================

export async function fetchSupabaseTable<T>(tableName: string): Promise<T[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from(tableName).select('*');
    if (error) {
      console.warn(`[Supabase fetch ${tableName}] warning:`, error.message);
      return null;
    }
    return (data as T[]) || [];
  } catch (err: any) {
    console.warn(`[Supabase fetch ${tableName}] exception:`, err.message);
    return null;
  }
}

export async function upsertSupabaseRecord<T extends Record<string, any>>(
  tableName: string,
  record: T
): Promise<{ success: boolean; data?: any; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const { data, error } = await client.from(tableName).upsert(record).select().single();
    if (error) {
      console.error(`[Supabase upsert ${tableName}] error:`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error(`[Supabase upsert ${tableName}] exception:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function deleteSupabaseRecord(
  tableName: string,
  id: string,
  idColumn = 'id'
): Promise<{ success: boolean; deletedCount: number; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, deletedCount: 0, error: 'Supabase client not initialized' };

  try {
    const { data, error, count } = await client
      .from(tableName)
      .delete({ count: 'exact' })
      .eq(idColumn, id)
      .select();

    if (error) {
      console.error(`[Supabase delete ${tableName}] error:`, error.message);
      return { success: false, deletedCount: 0, error: error.message };
    }

    const affected = count ?? (data ? data.length : 0);
    if (affected === 0) {
      return { success: false, deletedCount: 0, notFound: true, error: 'Record not found in database or already deleted.' };
    }

    return { success: true, deletedCount: affected };
  } catch (err: any) {
    console.error(`[Supabase delete ${tableName}] exception:`, err.message);
    return { success: false, deletedCount: 0, error: err.message };
  }
}

export async function checkSupabaseTablesExist(force = false): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('events').select('id').limit(1);
    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation')
      ) {
        return false;
      }
      // If table exists but query failed for another reason (e.g. empty table, RLS, etc.), table still exists
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// EVENT NORMALIZATION & SANITIZATION (Strict PostgreSQL & Supabase Compliance)
// ============================================================================

export function normalizeEvent(evt: any): Event {
  const pType: ParticipationType = evt.participation_type || 'SOLO';
  return {
    ...evt,
    participation_type: pType,
    min_team_size: evt.min_team_size || (pType === 'SOLO' ? 1 : 2),
    max_team_size: evt.max_team_size || (pType === 'SOLO' ? 1 : pType === 'DUO' ? 2 : 4),
    highlights: Array.isArray(evt.highlights) ? evt.highlights : [],
    photos: Array.isArray(evt.photos) ? evt.photos : [],
    winners: Array.isArray(evt.winners) ? evt.winners : [],
  };
}

export function sanitizeEventPayload(body: any, isUpdate = false): Record<string, any> {
  const title = (body.title || (isUpdate ? undefined : 'Untitled Event'))?.trim();
  let slug: string | undefined = undefined;
  if (body.slug !== undefined) {
    slug = body.slug?.trim()?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-')?.replace(/(^-|-$)/g, '');
  } else if (!isUpdate && title) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `event-${Date.now()}`;
  }

  let pType = body.participation_type;
  if (pType && !['SOLO', 'DUO', 'TEAM'].includes(pType)) {
    pType = 'SOLO';
  } else if (!pType && !isUpdate) {
    pType = 'SOLO';
  }

  let minTeam = body.min_team_size !== undefined ? Number(body.min_team_size) : undefined;
  let maxTeam = body.max_team_size !== undefined ? Number(body.max_team_size) : undefined;
  if (pType === 'SOLO') {
    minTeam = 1;
    maxTeam = 1;
  } else if (pType === 'DUO') {
    minTeam = 2;
    maxTeam = 2;
  } else if (pType === 'TEAM') {
    minTeam = Math.max(2, minTeam || 2);
    maxTeam = Math.max(minTeam, maxTeam || 4);
  } else if (!isUpdate) {
    minTeam = 1;
    maxTeam = 1;
  }

  let dateVal: string | undefined = undefined;
  if (body.date !== undefined) {
    const rawDate = String(body.date).trim();
    if (rawDate && !isNaN(new Date(rawDate).getTime())) {
      dateVal = new Date(rawDate).toISOString().split('T')[0];
    } else if (!isUpdate) {
      dateVal = new Date().toISOString().split('T')[0];
    }
  } else if (!isUpdate) {
    dateVal = new Date().toISOString().split('T')[0];
  }

  // Handle timestamp with time zone correctly for Postgres (null instead of empty string)
  let deadlineVal: string | null | undefined = undefined;
  if (body.registration_deadline !== undefined) {
    const rawDeadline = String(body.registration_deadline || '').trim();
    if (rawDeadline && !isNaN(new Date(rawDeadline).getTime())) {
      deadlineVal = new Date(rawDeadline).toISOString();
    } else {
      deadlineVal = null;
    }
  } else if (!isUpdate) {
    deadlineVal = null;
  }

  const rawTime = (body.time || '').trim();
  let startTime = body.start_time?.trim();
  let endTime = body.end_time?.trim();
  if (!startTime && rawTime) {
    startTime = rawTime.includes('-') ? rawTime.split('-')[0].trim() : rawTime;
  }
  if (!endTime && rawTime && rawTime.includes('-')) {
    endTime = rawTime.split('-')[1].trim();
  }
  if (!isUpdate) {
    startTime = startTime || '09:00 AM';
    endTime = endTime || '05:00 PM';
  }

  const rawRecord: Record<string, any> = {};

  if (!isUpdate) {
    rawRecord.id = body.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    rawRecord.created_at = body.created_at || new Date().toISOString();
  }

  if (title !== undefined) rawRecord.title = title;
  if (slug !== undefined) rawRecord.slug = slug;
  if (body.description !== undefined || !isUpdate) {
    rawRecord.description = (body.description || title || 'No description provided').trim();
  }
  if (body.short_description !== undefined || !isUpdate) {
    rawRecord.short_description = (
      body.short_description ||
      (rawRecord.description ? rawRecord.description.slice(0, 150) : title || '')
    ).trim();
  }
  if (body.event_image !== undefined || body.banner_image !== undefined || !isUpdate) {
    rawRecord.event_image = (
      body.event_image ||
      body.banner_image ||
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
    ).trim();
  }
  if (dateVal !== undefined) rawRecord.date = dateVal;
  if (startTime !== undefined) rawRecord.start_time = startTime;
  if (endTime !== undefined) rawRecord.end_time = endTime;
  if (body.venue !== undefined || !isUpdate) {
    rawRecord.venue = (body.venue || 'Main Seminar Hall / AI Lab').trim();
  }
  if (body.category !== undefined || !isUpdate) {
    rawRecord.category = (body.category || 'Workshop').trim();
  }
  if (body.speaker !== undefined) rawRecord.speaker = body.speaker ? String(body.speaker).trim() : null;
  if (body.speaker_bio !== undefined) rawRecord.speaker_bio = body.speaker_bio ? String(body.speaker_bio).trim() : null;
  if (body.speaker_avatar !== undefined) rawRecord.speaker_avatar = body.speaker_avatar ? String(body.speaker_avatar).trim() : null;
  if (body.speaker_role !== undefined) rawRecord.speaker_role = body.speaker_role ? String(body.speaker_role).trim() : null;
  if (body.registration_url !== undefined) rawRecord.registration_url = body.registration_url ? String(body.registration_url).trim() : null;
  if (deadlineVal !== undefined) rawRecord.registration_deadline = deadlineVal;
  if (body.maximum_participants !== undefined || !isUpdate) {
    rawRecord.maximum_participants = Math.max(1, Number(body.maximum_participants) || 100);
  }
  if (body.current_participants !== undefined || !isUpdate) {
    rawRecord.current_participants = Math.max(0, Number(body.current_participants) || 0);
  }
  if (body.status !== undefined || !isUpdate) {
    rawRecord.status = body.status || 'Upcoming';
  }
  if (body.featured !== undefined || !isUpdate) {
    rawRecord.featured = Boolean(body.featured);
  }
  if (pType !== undefined) rawRecord.participation_type = pType;
  if (minTeam !== undefined) rawRecord.min_team_size = minTeam;
  if (maxTeam !== undefined) rawRecord.max_team_size = maxTeam;
  if (body.highlights !== undefined || !isUpdate) {
    rawRecord.highlights = Array.isArray(body.highlights) ? body.highlights : [];
  }
  if (body.photos !== undefined || !isUpdate) {
    rawRecord.photos = Array.isArray(body.photos) ? body.photos : [];
  }
  if (body.results !== undefined) {
    rawRecord.results = body.results ? String(body.results).trim() : null;
  }
  if (body.winners !== undefined || !isUpdate) {
    rawRecord.winners = Array.isArray(body.winners) ? body.winners : [];
  }
  if (body.certificates_available !== undefined || !isUpdate) {
    rawRecord.certificates_available = Boolean(body.certificates_available);
  }
  rawRecord.updated_at = new Date().toISOString();

  // Strictly filter only columns that exist in the Postgres schema
  return filterObjectByAllowedColumns(rawRecord, EVENT_ALLOWED_COLUMNS);
}

// ============================================================================
// REAL SUPABASE PERSISTENCE FOR EVENTS
// ============================================================================

export async function getEventsFromSupabase(filters?: {
  category?: string;
  status?: string;
  featured?: boolean;
}): Promise<{ success: boolean; events?: Event[]; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Database service is not configured or unavailable.' };
  }

  try {
    let query = client.from('events').select('*').order('date', { ascending: false });

    if (filters?.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
    }
    if (filters?.status && filters.status !== 'All') {
      query = query.eq('status', filters.status);
    }
    if (filters?.featured !== undefined) {
      query = query.eq('featured', filters.featured);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Supabase getEvents Error]:', error.message);
      return { success: false, error: error.message };
    }

    const events: Event[] = (data || []).map(normalizeEvent);
    return { success: true, events };
  } catch (err: any) {
    console.error('[Supabase getEvents Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database query error' };
  }
}

export async function getEventByIdOrSlugFromSupabase(
  idOrSlug: string
): Promise<{ success: boolean; notFound?: boolean; event?: Event; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Database service is not configured or unavailable.' };
  }

  const clean = String(idOrSlug || '').trim();
  if (!clean) {
    return { success: false, error: 'Event identifier is required.' };
  }

  try {
    const { data: byId } = await client.from('events').select('*').eq('id', clean).maybeSingle();
    if (byId) {
      return { success: true, event: normalizeEvent(byId) };
    }

    const { data: bySlug } = await client.from('events').select('*').eq('slug', clean).maybeSingle();
    if (bySlug) {
      return { success: true, event: normalizeEvent(bySlug) };
    }

    const { data: byIlike } = await client.from('events').select('*').ilike('slug', clean).maybeSingle();
    if (byIlike) {
      return { success: true, event: normalizeEvent(byIlike) };
    }

    return { success: false, notFound: true, error: `Event '${clean}' not found in database.` };
  } catch (err: any) {
    console.error('[Supabase getEventByIdOrSlug Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database error fetching event' };
  }
}

export async function createEventInSupabase(
  body: any
): Promise<{ success: boolean; event?: Event; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Database service is not configured or unavailable.' };
  }

  const cleanPayload = sanitizeEventPayload(body, false);
  if (!cleanPayload.title || cleanPayload.title.length === 0) {
    return { success: false, error: 'Event title is required.' };
  }

  try {
    // 1. Insert row into Supabase
    const { data: inserted, error: insertError } = await client
      .from('events')
      .insert(cleanPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[Supabase createEvent Error]:', insertError.message);
      return { success: false, error: insertError.message };
    }

    if (!inserted || !inserted.id) {
      return { success: false, error: 'Database did not return created event row.' };
    }

    // 2. Immediately verify: SELECT the created ID from public.events
    const { data: verified, error: verifyError } = await client
      .from('events')
      .select('*')
      .eq('id', inserted.id)
      .single();

    if (verifyError || !verified) {
      console.error('[Supabase createEvent Verification Failed]:', verifyError?.message);
      return { success: false, error: 'Event created but could not be verified in database.' };
    }

    return { success: true, event: normalizeEvent(verified) };
  } catch (err: any) {
    console.error('[Supabase createEvent Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database error creating event' };
  }
}

export async function updateEventInSupabase(
  id: string,
  body: any
): Promise<{ success: boolean; notFound?: boolean; event?: Event; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Database service is not configured or unavailable.' };
  }

  const cleanId = String(id || '').trim();
  if (!cleanId) {
    return { success: false, error: 'Invalid event identifier.' };
  }

  try {
    // 1. Locate existing canonical event row
    let existing: any = null;
    const { data: byId } = await client.from('events').select('*').eq('id', cleanId).maybeSingle();
    if (byId) {
      existing = byId;
    } else {
      const { data: bySlug } = await client.from('events').select('*').eq('slug', cleanId).maybeSingle();
      if (bySlug) {
        existing = bySlug;
      } else {
        const { data: byIlike } = await client.from('events').select('*').ilike('slug', cleanId).maybeSingle();
        if (byIlike) existing = byIlike;
      }
    }

    if (!existing) {
      return { success: false, notFound: true, error: `Event with ID "${cleanId}" not found in database.` };
    }

    // 2. Prepare sanitized update payload
    const updatePayload = sanitizeEventPayload(body, true);
    delete updatePayload.id; // Primary key must never mutate

    const { data: updated, error: updateError } = await client
      .from('events')
      .update(updatePayload)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Supabase updateEvent Update Error]:', updateError.message);
      return { success: false, error: updateError.message };
    }

    if (!updated) {
      return { success: false, error: 'Zero rows affected during event update in database.' };
    }

    // 3. SELECT updated row to verify
    const { data: verified, error: verifyError } = await client
      .from('events')
      .select('*')
      .eq('id', existing.id)
      .single();

    if (verifyError || !verified) {
      return { success: false, error: 'Event updated but could not be verified in database.' };
    }

    return { success: true, event: normalizeEvent(verified) };
  } catch (err: any) {
    console.error('[Supabase updateEvent Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database error updating event' };
  }
}

export async function deleteEventFromSupabase(
  id: string
): Promise<{ success: boolean; notFound?: boolean; event?: Event; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Database service is not configured or unavailable.' };
  }

  const cleanId = String(id || '').trim();
  if (!cleanId) {
    return { success: false, error: 'Invalid event identifier.' };
  }

  try {
    // 1. Locate canonical event row
    let existing: any = null;
    const { data: byId } = await client.from('events').select('*').eq('id', cleanId).maybeSingle();
    if (byId) {
      existing = byId;
    } else {
      const { data: bySlug } = await client.from('events').select('*').eq('slug', cleanId).maybeSingle();
      if (bySlug) {
        existing = bySlug;
      } else {
        const { data: byIlike } = await client.from('events').select('*').ilike('slug', cleanId).maybeSingle();
        if (byIlike) existing = byIlike;
      }
    }

    if (!existing) {
      return { success: false, notFound: true, error: 'Event not found in database or already deleted.' };
    }

    const canonicalId = existing.id;

    // 2. Cascade delete/unlink related records in Supabase to avoid foreign key violations
    try {
      await client.from('checkins').delete().eq('event_id', canonicalId);
    } catch (e) {
      console.warn('[Supabase Cascade Checkins Warning]:', e);
    }

    try {
      await client.from('registrations').delete().eq('event_id', canonicalId);
    } catch (e) {
      console.warn('[Supabase Cascade Registrations Warning]:', e);
    }

    try {
      await client.from('certificates').update({ event_id: null }).eq('event_id', canonicalId);
    } catch (e) {
      console.warn('[Supabase Cascade Certificates Unlink Warning]:', e);
    }

    // 3. Delete event row
    const { error: deleteError } = await client
      .from('events')
      .delete()
      .eq('id', canonicalId);

    if (deleteError) {
      // If foreign key constraint still blocks, try deleting from certificates
      if (deleteError.code === '23503' || deleteError.message?.includes('foreign key')) {
        try {
          await client.from('certificates').delete().eq('event_id', canonicalId);
          const retry = await client.from('events').delete().eq('id', canonicalId);
          if (retry.error) {
            return { success: false, error: retry.error.message };
          }
        } catch (retryErr: any) {
          return { success: false, error: deleteError.message };
        }
      } else {
        console.error('[Supabase deleteEvent Error]:', deleteError.message);
        return { success: false, error: deleteError.message };
      }
    }

    // 4. Verify 0 rows remain
    const { data: checkRemaining } = await client
      .from('events')
      .select('id')
      .eq('id', canonicalId)
      .maybeSingle();

    if (checkRemaining) {
      return { success: false, error: 'Failed to verify deletion: event still exists in database.' };
    }

    return { success: true, event: normalizeEvent(existing) };
  } catch (err: any) {
    console.error('[Supabase deleteEvent Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database error deleting event' };
  }
}

export async function updateEventWinnersInSupabase(
  id: string,
  winners: any[],
  results?: string
): Promise<{ success: boolean; notFound?: boolean; event?: Event; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const { success, notFound, event, error } = await getEventByIdOrSlugFromSupabase(id);
  if (!success || !event) {
    return { success: false, notFound, error: error || 'Event not found.' };
  }

  const updateData: Record<string, any> = {
    winners: Array.isArray(winners) ? winners : [],
    updated_at: new Date().toISOString(),
  };
  if (results !== undefined) {
    updateData.results = results ? String(results).trim() : null;
  }

  const { data: updated, error: updErr } = await client
    .from('events')
    .update(updateData)
    .eq('id', event.id)
    .select()
    .single();

  if (updErr || !updated) {
    return { success: false, error: updErr?.message || 'Failed to update winners in database.' };
  }

  return { success: true, event: normalizeEvent(updated) };
}

export async function registerForEventInSupabase(
  eventId: string,
  regData: any
): Promise<{ success: boolean; notFound?: boolean; capacityFull?: boolean; registration?: any; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const cleanId = String(eventId || '').trim();
  const { success, notFound, event, error: eventErr } = await getEventByIdOrSlugFromSupabase(cleanId);
  if (!success || !event) {
    return { success: false, notFound: true, error: eventErr || 'Event not found in database.' };
  }

  // Check capacity
  const max = event.maximum_participants || 100;
  const current = event.current_participants || 0;
  if (current >= max) {
    return { success: false, capacityFull: true, error: 'Event registration is closed: capacity reached.' };
  }

  const regId = regData.id || `reg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const ticketCode =
    regData.ticket_code ||
    `IGZ-${event.slug.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const qrToken =
    regData.qr_token || `QR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const qrPayload = JSON.stringify({
    reg_id: regId,
    ticket_code: ticketCode,
    event_id: event.id,
    event_title: event.title,
    student_name: regData.full_name,
    roll_number: regData.roll_number,
    token: qrToken,
  });

  const rawRecord = {
    id: regId,
    event_id: event.id,
    event_title: event.title,
    full_name: (regData.full_name || regData.participant_name || '').trim(),
    participant_name: (regData.participant_name || regData.full_name || '').trim(),
    email: (regData.email || '').trim().toLowerCase(),
    phone: (regData.phone || '').trim(),
    department: (regData.department || 'CSE').trim(),
    year: (regData.year || 'III').trim(),
    roll_number: (regData.roll_number || '').trim().toUpperCase(),
    participation_type: event.participation_type || 'SOLO',
    team_name: regData.team_name ? String(regData.team_name).trim() : null,
    team_members: Array.isArray(regData.team_members) ? regData.team_members : [],
    ticket_code: ticketCode,
    qr_token: qrToken,
    qr_payload: qrPayload,
    status: regData.status || 'Confirmed',
    email_status: regData.email_status || 'pending',
    created_at: new Date().toISOString(),
  };

  const cleanRecord = filterObjectByAllowedColumns(rawRecord, REGISTRATION_ALLOWED_COLUMNS);

  const { data: inserted, error: insertErr } = await client
    .from('registrations')
    .insert(cleanRecord)
    .select()
    .single();

  if (insertErr || !inserted) {
    return { success: false, error: insertErr?.message || 'Failed to save registration in database.' };
  }

  // Increment event participant count in Supabase
  try {
    await client
      .from('events')
      .update({
        current_participants: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event.id);
  } catch (countErr) {
    console.warn('[Supabase Event Participant Count Increment Warning]:', countErr);
  }

  return { success: true, registration: inserted };
}

// ============================================================================
// TEAM REPOSITORY
// ============================================================================

export function sanitizeTeamPayload(body: any): Record<string, any> {
  const pos = (body.position || body.role || 'Member').trim();
  const photo = (body.photo_url || body.image_url || '').trim();
  const linkedin = (body.linkedin || body.social_links?.linkedin || '').trim();
  const github = (body.github || body.social_links?.github || '').trim();
  const email = (body.email || body.social_links?.email || '').trim();

  const raw: Record<string, any> = {
    id: body.id || `tm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: (body.name || '').trim(),
    position: pos,
    role: pos,
    category: body.category || 'Technical Team',
    department: (body.department || 'CSE (AIML) & AI').trim(),
    year: (body.year || '').trim(),
    bio: (body.bio || '').trim(),
    photo_url: photo,
    image_url: photo,
    linkedin,
    github,
    email,
    social_links: {
      linkedin,
      github,
      email,
      ...(body.social_links || {}),
    },
    featured: body.featured !== undefined ? Boolean(body.featured) : false,
    order: body.order !== undefined ? Number(body.order) : 0,
    order_index: body.order_index !== undefined ? Number(body.order_index) : (body.order !== undefined ? Number(body.order) : 0),
  };

  return filterObjectByAllowedColumns(raw, TEAM_ALLOWED_COLUMNS);
}

export async function getTeamFromSupabase(): Promise<TeamMember[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('team').select('*').order('order', { ascending: true });
    if (error) {
      console.warn('[Supabase getTeam Error]:', error.message);
      return null;
    }
    return (data as TeamMember[]) || [];
  } catch (err: any) {
    console.warn('[Supabase getTeam Exception]:', err?.message);
    return null;
  }
}

export async function upsertTeamMemberInSupabase(
  member: any
): Promise<{ success: boolean; member?: TeamMember; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const cleanPayload = sanitizeTeamPayload(member);
  if (!cleanPayload.name) {
    return { success: false, error: 'Team member name is required.' };
  }

  try {
    const { data, error } = await client
      .from('team')
      .upsert(cleanPayload)
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase upsertTeamMember Error]:', error?.message);
      return { success: false, error: error?.message || 'Failed to save team member in database.' };
    }

    return { success: true, member: data as TeamMember };
  } catch (err: any) {
    console.error('[Supabase upsertTeamMember Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database error saving team member' };
  }
}

export async function deleteTeamMemberFromSupabase(
  id: string
): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const cleanId = String(id || '').trim();
  if (!cleanId) return { success: false, error: 'Team member identifier is required.' };

  try {
    const { data: existing, error: findError } = await client
      .from('team')
      .select('id')
      .eq('id', cleanId)
      .maybeSingle();

    if (findError) {
      return { success: false, error: findError.message };
    }
    if (!existing) {
      return { success: false, notFound: true, error: 'Team member not found in database.' };
    }

    const { error: delError } = await client.from('team').delete().eq('id', existing.id);
    if (delError) {
      console.error('[Supabase deleteTeamMember Error]:', delError.message);
      return { success: false, error: delError.message };
    }

    // Verify deletion (with short retry if needed)
    let checkRemaining = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await client
        .from('team')
        .select('id')
        .eq('id', existing.id)
        .maybeSingle();
      if (!data) {
        checkRemaining = null;
        break;
      }
      checkRemaining = data;
      await client.from('team').delete().eq('id', existing.id);
      await new Promise((r) => setTimeout(r, 40));
    }

    if (checkRemaining) {
      console.error('[Supabase deleteTeamMember Failed Verification]: record still exists with id', existing.id);
      return { success: false, error: 'Failed to verify team member deletion: record still exists in database.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase deleteTeamMember Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database error deleting team member' };
  }
}

// ============================================================================
// PROJECTS REPOSITORY
// ============================================================================

export function sanitizeProjectPayload(body: any, isUpdate = false): Record<string, any> {
  const projTitle = body.title !== undefined || body.name !== undefined
    ? (body.title || body.name || '').toString().trim()
    : (isUpdate ? undefined : 'Untitled Project');
  let slug: string | undefined = undefined;
  if (body.slug !== undefined) {
    slug = body.slug?.trim()?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-')?.replace(/(^-|-$)/g, '');
  } else if (!isUpdate && projTitle) {
    slug = projTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `proj-${Date.now()}`;
  }

  const raw: Record<string, any> = {};
  if (!isUpdate) {
    raw.id = body.id || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (projTitle !== undefined) {
    raw.name = projTitle;
    raw.title = projTitle;
  }
  if (slug !== undefined) raw.slug = slug;
  if (body.description !== undefined || !isUpdate) raw.description = (body.description || projTitle || '').trim();
  if (body.short_description !== undefined || !isUpdate) raw.short_description = (body.short_description || body.description || projTitle || '').trim();
  if (body.category !== undefined || !isUpdate) raw.category = body.category || 'AI/ML';
  if (body.tech_stack !== undefined || !isUpdate) raw.tech_stack = Array.isArray(body.tech_stack) ? body.tech_stack : [];
  if (body.team_members !== undefined || !isUpdate) raw.team_members = Array.isArray(body.team_members) ? body.team_members : [];
  if (body.github_url !== undefined) raw.github_url = body.github_url ? String(body.github_url).trim() : null;
  if (body.demo_url !== undefined) raw.demo_url = body.demo_url ? String(body.demo_url).trim() : null;
  if (body.image_url !== undefined || !isUpdate) raw.image_url = (body.image_url || 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=800&q=80').trim();
  if (body.featured !== undefined || !isUpdate) raw.featured = body.featured !== undefined ? Boolean(body.featured) : false;
  if (body.status !== undefined || !isUpdate) raw.status = body.status || 'Completed';
  if (body.date !== undefined || !isUpdate) raw.date = body.date || new Date().toISOString().slice(0, 7);

  return filterObjectByAllowedColumns(raw, PROJECT_ALLOWED_COLUMNS);
}

export async function getProjectsFromSupabase(): Promise<Project[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('projects').select('*');
    if (error) {
      console.warn('[Supabase getProjects Error]:', error.message);
      return null;
    }
    return (data as Project[]) || [];
  } catch (err: any) {
    console.warn('[Supabase getProjects Exception]:', err?.message);
    return null;
  }
}

export async function upsertProjectInSupabase(
  project: any
): Promise<{ success: boolean; project?: Project; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const cleanPayload = sanitizeProjectPayload(project);

  try {
    const { data, error } = await client
      .from('projects')
      .upsert(cleanPayload)
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase upsertProject Error]:', error?.message);
      return { success: false, error: error?.message || 'Failed to save project in database.' };
    }

    return { success: true, project: data as Project };
  } catch (err: any) {
    console.error('[Supabase upsertProject Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database error saving project' };
  }
}

export async function deleteProjectFromSupabase(
  idOrSlug: string
): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const clean = String(idOrSlug || '').trim();
  if (!clean) return { success: false, error: 'Project identifier is required.' };

  try {
    let existing: any = null;
    const { data: byId } = await client.from('projects').select('id').eq('id', clean).maybeSingle();
    if (byId) {
      existing = byId;
    } else {
      const { data: bySlug } = await client.from('projects').select('id').eq('slug', clean).maybeSingle();
      if (bySlug) {
        existing = bySlug;
      } else {
        const { data: byIlike } = await client.from('projects').select('id').ilike('slug', clean).maybeSingle();
        if (byIlike) existing = byIlike;
      }
    }

    if (!existing) return { success: false, notFound: true, error: 'Project not found in database.' };

    const { error: delError } = await client.from('projects').delete().eq('id', existing.id);
    if (delError) return { success: false, error: delError.message };

    // Verify deletion (with short retry if needed)
    let checkRemaining = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await client
        .from('projects')
        .select('id')
        .eq('id', existing.id)
        .maybeSingle();
      if (!data) {
        checkRemaining = null;
        break;
      }
      checkRemaining = data;
      await client.from('projects').delete().eq('id', existing.id);
      await new Promise((r) => setTimeout(r, 40));
    }

    if (checkRemaining) {
      return { success: false, error: 'Failed to verify project deletion: record still exists in database.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error deleting project' };
  }
}

// ============================================================================
// GALLERY REPOSITORY
// ============================================================================

export function sanitizeGalleryPayload(body: any): Record<string, any> {
  const raw: Record<string, any> = {
    id: body.id || `gal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: (body.title || 'Club Photo').trim(),
    album: (body.album || 'Events').trim(),
    event_name: (body.event_name || body.album || 'IntelliGenZ Event').trim(),
    image_url: (body.image_url || '').trim(),
    caption: body.caption ? String(body.caption).trim() : null,
    date: body.date || new Date().toISOString().split('T')[0],
    featured: body.featured !== undefined ? Boolean(body.featured) : false,
  };
  return filterObjectByAllowedColumns(raw, GALLERY_ALLOWED_COLUMNS);
}

export async function getGalleryFromSupabase(): Promise<GalleryImage[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('gallery').select('*').order('date', { ascending: false });
    if (error) {
      console.warn('[Supabase getGallery Error]:', error.message);
      return null;
    }
    return (data as GalleryImage[]) || [];
  } catch (err: any) {
    console.warn('[Supabase getGallery Exception]:', err?.message);
    return null;
  }
}

export async function upsertGalleryItemInSupabase(
  item: any
): Promise<{ success: boolean; gallery?: GalleryImage; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const cleanPayload = sanitizeGalleryPayload(item);

  try {
    const { data, error } = await client
      .from('gallery')
      .upsert(cleanPayload)
      .select()
      .single();

    if (error || !data) {
      console.error('[Supabase upsertGalleryItem Error]:', error?.message);
      return { success: false, error: error?.message || 'Failed to save gallery item in database.' };
    }

    return { success: true, gallery: data as GalleryImage };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error saving gallery item' };
  }
}

export async function deleteGalleryItemFromSupabase(
  id: string
): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  try {
    const { data: existing, error: findError } = await client
      .from('gallery')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findError) return { success: false, error: findError.message };
    if (!existing) return { success: false, notFound: true, error: 'Gallery photo not found in database.' };

    const { error: delError } = await client.from('gallery').delete().eq('id', id);
    if (delError) return { success: false, error: delError.message };

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error deleting gallery photo' };
  }
}

// ============================================================================
// ANNOUNCEMENTS REPOSITORY
// ============================================================================

export function sanitizeAnnouncementPayload(body: any, isUpdate = false): Record<string, any> {
  const title = (body.title || (isUpdate ? undefined : 'Untitled Announcement'))?.trim();
  let slug: string | undefined = undefined;
  if (body.slug !== undefined) {
    slug = body.slug?.trim()?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-')?.replace(/(^-|-$)/g, '');
  } else if (!isUpdate && title) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `ann-${Date.now()}`;
  }

  const raw: Record<string, any> = {};
  if (!isUpdate) {
    raw.id = body.id || `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    raw.created_at = body.created_at || new Date().toISOString();
  }

  if (title !== undefined) raw.title = title;
  if (slug !== undefined) raw.slug = slug;
  if (body.content !== undefined || !isUpdate) raw.content = (body.content || title || '').trim();
  if (body.summary !== undefined || !isUpdate) raw.summary = (body.summary || (raw.content ? raw.content.slice(0, 140) : title) || '').trim();
  if (body.featured_image !== undefined) raw.featured_image = body.featured_image ? String(body.featured_image).trim() : null;
  if (body.category !== undefined || !isUpdate) raw.category = (body.category || 'General').trim();
  if (body.author !== undefined || !isUpdate) raw.author = (body.author || 'IntelliGenZ Team').trim();
  if (body.author_role !== undefined || !isUpdate) raw.author_role = (body.author_role || 'Club Admin').trim();
  if (body.published_at !== undefined || !isUpdate) raw.published_at = body.published_at || new Date().toISOString();
  if (body.featured !== undefined || !isUpdate) raw.featured = Boolean(body.featured);
  if (body.tags !== undefined || !isUpdate) raw.tags = Array.isArray(body.tags) ? body.tags : [];
  raw.updated_at = new Date().toISOString();

  return filterObjectByAllowedColumns(raw, ANNOUNCEMENT_ALLOWED_COLUMNS);
}

export async function getAnnouncementsFromSupabase(): Promise<Announcement[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false });
    if (error) {
      console.warn('[Supabase getAnnouncements Error]:', error.message);
      return null;
    }
    return (data as Announcement[]) || [];
  } catch (err: any) {
    console.warn('[Supabase getAnnouncements Exception]:', err?.message);
    return null;
  }
}

export async function createAnnouncementInSupabase(
  body: any
): Promise<{ success: boolean; announcement?: Announcement; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const clean = sanitizeAnnouncementPayload(body, false);
  if (!clean.title) return { success: false, error: 'Announcement title is required.' };

  try {
    const { data, error } = await client
      .from('announcements')
      .insert(clean)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create announcement in database.' };
    }
    return { success: true, announcement: data as Announcement };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error creating announcement' };
  }
}

export async function updateAnnouncementInSupabase(
  id: string,
  body: any
): Promise<{ success: boolean; notFound?: boolean; announcement?: Announcement; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const cleanId = String(id || '').trim();
  if (!cleanId) return { success: false, error: 'Announcement identifier is required.' };

  try {
    let existing: any = null;
    const { data: byId } = await client.from('announcements').select('*').eq('id', cleanId).maybeSingle();
    if (byId) {
      existing = byId;
    } else {
      const { data: bySlug } = await client.from('announcements').select('*').eq('slug', cleanId).maybeSingle();
      if (bySlug) existing = bySlug;
    }

    if (!existing) return { success: false, notFound: true, error: 'Announcement not found.' };

    const clean = sanitizeAnnouncementPayload(body, true);
    delete clean.id;

    const { data, error } = await client
      .from('announcements')
      .update(clean)
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update announcement in database.' };
    }
    return { success: true, announcement: data as Announcement };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error updating announcement' };
  }
}

export async function deleteAnnouncementFromSupabase(
  id: string
): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const cleanId = String(id || '').trim();
  if (!cleanId) return { success: false, error: 'Announcement identifier is required.' };

  try {
    let existing: any = null;
    const { data: byId } = await client.from('announcements').select('id').eq('id', cleanId).maybeSingle();
    if (byId) {
      existing = byId;
    } else {
      const { data: bySlug } = await client.from('announcements').select('id').eq('slug', cleanId).maybeSingle();
      if (bySlug) {
        existing = bySlug;
      } else {
        const { data: byIlike } = await client.from('announcements').select('id').ilike('slug', cleanId).maybeSingle();
        if (byIlike) existing = byIlike;
      }
    }

    if (!existing) return { success: false, notFound: true, error: 'Announcement not found.' };

    const canonicalId = existing.id;
    const { error: delErr } = await client.from('announcements').delete().eq('id', canonicalId);
    if (delErr) {
      console.error('[Supabase deleteAnnouncement Error]:', delErr);
      return { success: false, error: delErr.message };
    }

    // Verify deletion (with short retry if needed)
    let checkRemaining = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await client
        .from('announcements')
        .select('id')
        .eq('id', canonicalId)
        .maybeSingle();
      if (!data) {
        checkRemaining = null;
        break;
      }
      checkRemaining = data;
      await client.from('announcements').delete().eq('id', canonicalId);
      await new Promise((r) => setTimeout(r, 40));
    }

    if (checkRemaining) {
      console.error('[Supabase deleteAnnouncement Failed Verification]: row still exists with id', canonicalId);
      return { success: false, error: 'Failed to verify announcement deletion: record still exists in database.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase deleteAnnouncement Exception]:', err?.message);
    return { success: false, error: err?.message || 'Database error deleting announcement' };
  }
}

// ============================================================================
// COMMUNITY IMPACT STATS REPOSITORY
// ============================================================================

export async function getCommunityImpactStatsFromSupabase(): Promise<CommunityImpactStat[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('community_impact_stats')
      .select('*')
      .order('order', { ascending: true });
    if (error) {
      console.warn('[Supabase getCommunityImpactStats Error]:', error.message);
      return null;
    }
    return (data as CommunityImpactStat[]) || [];
  } catch (err: any) {
    console.warn('[Supabase getCommunityImpactStats Exception]:', err?.message);
    return null;
  }
}

export async function upsertCommunityImpactStatInSupabase(
  stat: any
): Promise<{ success: boolean; stat?: CommunityImpactStat; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const raw = {
    id: stat.id || `cis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    value: String(stat.value || '').trim(),
    label: String(stat.label || '').trim(),
    icon: stat.icon || 'Users',
    active: stat.active !== undefined ? Boolean(stat.active) : true,
    order: stat.order !== undefined ? Number(stat.order) : 1,
    updated_at: new Date().toISOString(),
    updated_by: stat.updated_by || 'Administrator',
  };
  const clean = filterObjectByAllowedColumns(raw, COMMUNITY_IMPACT_ALLOWED_COLUMNS);

  try {
    const { data, error } = await client
      .from('community_impact_stats')
      .upsert(clean)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to save statistic in database.' };
    }

    return { success: true, stat: data as CommunityImpactStat };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error saving statistic' };
  }
}

export async function saveAllCommunityImpactStatsInSupabase(
  stats: CommunityImpactStat[]
): Promise<{ success: boolean; stats?: CommunityImpactStat[]; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  try {
    const cleanList = (stats || []).map((s) =>
      filterObjectByAllowedColumns(
        {
          ...s,
          updated_at: new Date().toISOString(),
        },
        COMMUNITY_IMPACT_ALLOWED_COLUMNS
      )
    );

    const { data, error } = await client
      .from('community_impact_stats')
      .upsert(cleanList)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, stats: (data as CommunityImpactStat[]) || stats };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error saving statistics' };
  }
}

export async function deleteCommunityImpactStatFromSupabase(
  id: string
): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  try {
    const { error } = await client.from('community_impact_stats').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error deleting statistic' };
  }
}

// ============================================================================
// SETTINGS & STATS REPOSITORY
// ============================================================================

export async function getSettingsFromSupabase(): Promise<AppSettings | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('settings').select('*').limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as AppSettings;
  } catch (err) {
    return null;
  }
}

export async function saveSettingsInSupabase(
  settings: Partial<AppSettings>
): Promise<{ success: boolean; settings?: AppSettings; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  try {
    const rawPayload = { id: 'global_settings', ...settings, updated_at: new Date().toISOString() };
    const cleanPayload = filterObjectByAllowedColumns(rawPayload, SETTINGS_ALLOWED_COLUMNS);

    const { data, error } = await client
      .from('settings')
      .upsert(cleanPayload)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to persist settings in database.' };
    }
    return { success: true, settings: data as AppSettings };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error saving settings' };
  }
}

export async function getStatsFromSupabase(): Promise<Stats | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('stats').select('*').limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as Stats;
  } catch (err) {
    return null;
  }
}

export async function saveStatsInSupabase(
  stats: Partial<Stats>
): Promise<{ success: boolean; stats?: Stats; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  try {
    const rawPayload = { id: 'global_stats', ...stats, updated_at: new Date().toISOString() };
    const cleanPayload = filterObjectByAllowedColumns(rawPayload, STATS_ALLOWED_COLUMNS);

    const { data, error } = await client
      .from('stats')
      .upsert(cleanPayload)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to persist stats in database.' };
    }
    return { success: true, stats: data as Stats };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error saving stats' };
  }
}

// ============================================================================
// CERTIFICATES REPOSITORY
// ============================================================================

export async function getCertificatesFromSupabase(): Promise<Certificate[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data as Certificate[]) || [];
  } catch {
    return null;
  }
}

export async function createCertificateInSupabase(
  cert: any
): Promise<{ success: boolean; certificate?: Certificate; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const raw: Record<string, any> = {
    id: cert.id || `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    certificate_code: (cert.certificate_code || `IGZ-${Date.now().toString(36).toUpperCase()}`).trim(),
    student_name: (cert.student_name || '').trim(),
    student_email: (cert.student_email || '').trim().toLowerCase(),
    student_roll_no: (cert.student_roll_no || '').trim().toUpperCase(),
    department: (cert.department || 'CSE (AIML) & AI').trim(),
    college_name: cert.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    event_id: cert.event_id ? String(cert.event_id).trim() : null,
    event_title: (cert.event_title || 'IntelliGenZ Technical Event').trim(),
    certificate_type: cert.certificate_type || 'Participation',
    issue_date: cert.issue_date || new Date().toISOString().split('T')[0],
    issued_by: cert.issued_by || 'Department of CSE (AIML) & AI',
    designation: cert.designation || 'Faculty Coordinator & President',
    is_valid: cert.is_valid !== undefined ? Boolean(cert.is_valid) : true,
    notes: cert.notes ? String(cert.notes).trim() : null,
    created_at: new Date().toISOString(),
  };

  const clean = filterObjectByAllowedColumns(raw, CERTIFICATE_ALLOWED_COLUMNS);

  try {
    const { data, error } = await client
      .from('certificates')
      .insert(clean)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to create certificate in database.' };
    }
    return { success: true, certificate: data as Certificate };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error creating certificate' };
  }
}

export async function deleteCertificateFromSupabase(
  id: string
): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  try {
    const { error } = await client.from('certificates').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error deleting certificate' };
  }
}

// ============================================================================
// JOIN APPLICATIONS REPOSITORY
// ============================================================================

export async function getJoinApplicationsFromSupabase(): Promise<JoinApplication[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('join_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return null;
    return (data as JoinApplication[]) || [];
  } catch {
    return null;
  }
}

export async function updateJoinApplicationInSupabase(
  id: string,
  update: Partial<JoinApplication>
): Promise<{ success: boolean; application?: JoinApplication; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const clean = filterObjectByAllowedColumns(update as any, JOIN_APP_ALLOWED_COLUMNS);

  try {
    const { data, error } = await client
      .from('join_applications')
      .update(clean)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update application in database.' };
    }
    return { success: true, application: data as JoinApplication };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error updating application' };
  }
}

export async function deleteJoinApplicationFromSupabase(
  id: string
): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  try {
    const { error } = await client.from('join_applications').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error deleting application' };
  }
}

// ============================================================================
// REGISTRATIONS REPOSITORY
// ============================================================================

export async function getRegistrationsFromSupabase(eventId?: string): Promise<EventRegistration[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let q = client.from('registrations').select('*').order('created_at', { ascending: false });
    if (eventId) {
      q = q.eq('event_id', eventId);
    }
    const { data, error } = await q;
    if (error) return null;
    return (data as EventRegistration[]) || [];
  } catch {
    return null;
  }
}

export async function updateRegistrationInSupabase(
  id: string,
  update: Partial<EventRegistration>
): Promise<{ success: boolean; registration?: EventRegistration; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  const clean = filterObjectByAllowedColumns(update as any, REGISTRATION_ALLOWED_COLUMNS);

  try {
    const { data, error } = await client
      .from('registrations')
      .update(clean)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to update registration in database.' };
    }
    return { success: true, registration: data as EventRegistration };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error updating registration' };
  }
}

export async function deleteRegistrationFromSupabase(
  id: string
): Promise<{ success: boolean; notFound?: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database service not available.' };

  try {
    // Delete associated checkin records first
    try {
      await client.from('checkins').delete().eq('registration_id', id);
    } catch {}

    const { error } = await client.from('registrations').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error deleting registration' };
  }
}

// ============================================================================
// FULL STATE LOADER (For Startup & Unified Hydration)
// ============================================================================

export async function loadStateFromSupabase(): Promise<DatabaseSchema | null> {
  if (!isSupabaseConfigured()) return null;

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [
      eventsRes,
      announcementsRes,
      teamRes,
      projectsRes,
      galleryRes,
      applicationsRes,
      registrationsRes,
      messagesRes,
      adminUsersRes,
      certificatesRes,
      subscribersRes,
      broadcastsRes,
      checkinsRes,
      impactStatsRes,
      settingsRes,
      statsRes,
      auditLogsRes,
    ] = await Promise.all([
      client.from('events').select('*').order('date', { ascending: false }),
      client.from('announcements').select('*').order('published_at', { ascending: false }),
      client.from('team').select('*').order('order', { ascending: true }),
      client.from('projects').select('*'),
      client.from('gallery').select('*').order('date', { ascending: false }),
      client.from('join_applications').select('*').order('created_at', { ascending: false }),
      client.from('registrations').select('*').order('created_at', { ascending: false }),
      client.from('messages').select('*').order('created_at', { ascending: false }),
      client.from('admin_users').select('*'),
      client.from('certificates').select('*').order('created_at', { ascending: false }),
      client.from('newsletter_subscribers').select('*'),
      client.from('newsletter_broadcasts').select('*').order('sent_at', { ascending: false }),
      client.from('checkins').select('*').order('checked_in_at', { ascending: false }),
      client.from('community_impact_stats').select('*').order('order', { ascending: true }),
      client.from('settings').select('*').limit(1),
      client.from('stats').select('*').limit(1),
      client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
    ]);

    if (eventsRes.error) {
      if (
        eventsRes.error.code === 'PGRST205' ||
        eventsRes.error.message?.includes('schema cache') ||
        eventsRes.error.message?.includes('does not exist') ||
        eventsRes.error.message?.includes('relation')
      ) {
        return null;
      }
      console.warn('[Supabase] Failed to query events table from Supabase:', eventsRes.error.message);
      return null;
    }

    const settings =
      settingsRes.data && settingsRes.data.length > 0 ? (settingsRes.data[0] as AppSettings) : undefined;
    const stats = statsRes.data && statsRes.data.length > 0 ? (statsRes.data[0] as Stats) : undefined;

    const loadedEvents = ((eventsRes.data as Event[]) || []).map(normalizeEvent);

    return {
      settings: settings || ({} as any),
      stats: stats || ({} as any),
      community_impact_stats: (impactStatsRes.data as CommunityImpactStat[]) || [],
      events: loadedEvents,
      announcements: (announcementsRes.data as Announcement[]) || [],
      team: (teamRes.data as TeamMember[]) || [],
      projects: (projectsRes.data as Project[]) || [],
      gallery: (galleryRes.data as GalleryImage[]) || [],
      join_applications: (applicationsRes.data as JoinApplication[]) || [],
      registrations: (registrationsRes.data as EventRegistration[]) || [],
      messages: (messagesRes.data as ContactMessage[]) || [],
      admin_users: (adminUsersRes.data as AdminUserRecord[]) || [],
      certificates: (certificatesRes.data as Certificate[]) || [],
      newsletter_subscribers: (subscribersRes.data as NewsletterSubscriber[]) || [],
      newsletter_broadcasts: (broadcastsRes.data as NewsletterBroadcast[]) || [],
      checkins: (checkinsRes.data as AttendanceRecord[]) || [],
      audit_logs: (auditLogsRes.data as AuditLogEntry[]) || [],
    };
  } catch (err: any) {
    console.error('[Supabase loadStateFromSupabase] Exception:', err);
    return null;
  }
}

/**
 * Push all local data into Supabase (Migration/Seed tool)
 */
export async function syncDatabaseToSupabase(
  db: DatabaseSchema
): Promise<{ success: boolean; inserted: Record<string, number>; errors: string[] }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      inserted: {},
      errors: ['Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'],
    };
  }

  const inserted: Record<string, number> = {};
  const errors: string[] = [];

  const upsertBatch = async (tableName: string, items: any[], allowedColumns?: Set<string>) => {
    if (!items || items.length === 0) {
      inserted[tableName] = 0;
      return;
    }
    try {
      const sanitizedItems = allowedColumns
        ? items.map((it) => filterObjectByAllowedColumns(it, allowedColumns))
        : items;

      const { error, count } = await client.from(tableName).upsert(sanitizedItems, { count: 'exact' });
      if (error) {
        errors.push(`Table '${tableName}': ${error.message}`);
      } else {
        inserted[tableName] = count ?? items.length;
      }
    } catch (e: any) {
      errors.push(`Table '${tableName}': ${e.message}`);
    }
  };

  try {
    if (db.settings) {
      const cleanSettings = filterObjectByAllowedColumns(
        { id: 'global_settings', ...db.settings },
        SETTINGS_ALLOWED_COLUMNS
      );
      const { error } = await client.from('settings').upsert(cleanSettings);
      if (error) errors.push(`Table 'settings': ${error.message}`);
      else inserted['settings'] = 1;
    }

    if (db.stats) {
      const cleanStats = filterObjectByAllowedColumns(
        { id: 'global_stats', ...db.stats },
        STATS_ALLOWED_COLUMNS
      );
      const { error } = await client.from('stats').upsert(cleanStats);
      if (error) errors.push(`Table 'stats': ${error.message}`);
      else inserted['stats'] = 1;
    }

    await upsertBatch('community_impact_stats', db.community_impact_stats || [], COMMUNITY_IMPACT_ALLOWED_COLUMNS);
    await upsertBatch('events', (db.events || []).map((e) => sanitizeEventPayload(e, false)), EVENT_ALLOWED_COLUMNS);
    await upsertBatch('announcements', (db.announcements || []).map((a) => sanitizeAnnouncementPayload(a, false)), ANNOUNCEMENT_ALLOWED_COLUMNS);
    await upsertBatch('team', (db.team || []).map(sanitizeTeamPayload), TEAM_ALLOWED_COLUMNS);
    await upsertBatch('projects', (db.projects || []).map((p) => sanitizeProjectPayload(p, false)), PROJECT_ALLOWED_COLUMNS);
    await upsertBatch('gallery', (db.gallery || []).map(sanitizeGalleryPayload), GALLERY_ALLOWED_COLUMNS);
    await upsertBatch('join_applications', db.join_applications || [], JOIN_APP_ALLOWED_COLUMNS);
    await upsertBatch('registrations', db.registrations || [], REGISTRATION_ALLOWED_COLUMNS);
    await upsertBatch('checkins', db.checkins || [], CHECKIN_ALLOWED_COLUMNS);
    await upsertBatch('certificates', db.certificates || [], CERTIFICATE_ALLOWED_COLUMNS);
    await upsertBatch('newsletter_subscribers', db.newsletter_subscribers || []);
    await upsertBatch('newsletter_broadcasts', db.newsletter_broadcasts || []);
    await upsertBatch('messages', db.messages || []);
    await upsertBatch('admin_users', db.admin_users || []);
    await upsertBatch('audit_logs', (db.audit_logs || []).slice(0, 200));

    return {
      success: errors.length === 0,
      inserted,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      inserted,
      errors: [...errors, err.message || 'Unknown sync error'],
    };
  }
}
