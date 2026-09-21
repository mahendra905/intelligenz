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
} from './types';

/**
 * Fetch all records from a Supabase table with error handling
 */
export async function fetchSupabaseTable<T>(tableName: string): Promise<T[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from(tableName).select('*');
    if (error) {
      console.warn(`[Supabase fetch ${tableName}] warning:`, error.message);
      return null;
    }
    return data as T[];
  } catch (err: any) {
    console.warn(`[Supabase fetch ${tableName}] exception:`, err.message);
    return null;
  }
}

/**
 * Upsert a record in Supabase
 */
export async function upsertSupabaseRecord<T extends Record<string, any>>(
  tableName: string,
  record: T
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const { error } = await client.from(tableName).upsert(record);
    if (error) {
      console.error(`[Supabase upsert ${tableName}] error:`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error(`[Supabase upsert ${tableName}] exception:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a record in Supabase with verified affected count
 */
export async function deleteSupabaseRecord(
  tableName: string,
  id: string,
  idColumn = 'id'
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
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
    return { success: true, deletedCount: affected };
  } catch (err: any) {
    console.error(`[Supabase delete ${tableName}] exception:`, err.message);
    return { success: false, deletedCount: 0, error: err.message };
  }
}

let supabaseTablesExistCache: boolean | null = null;
let lastTableCheckTime = 0;
const TABLE_CHECK_TTL_MS = 60000; // Check at most once every 60 seconds

/**
 * Check if the core tables exist in the Supabase schema
 */
export async function checkSupabaseTablesExist(force = false): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const client = getSupabaseClient();
  if (!client) return false;

  const now = Date.now();
  if (!force && supabaseTablesExistCache !== null && now - lastTableCheckTime < TABLE_CHECK_TTL_MS) {
    return supabaseTablesExistCache;
  }

  try {
    const { error } = await client.from('events').select('id').limit(1);
    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation')
      ) {
        supabaseTablesExistCache = false;
        lastTableCheckTime = now;
        return false;
      }
      supabaseTablesExistCache = false;
      lastTableCheckTime = now;
      return false;
    }
    supabaseTablesExistCache = true;
    lastTableCheckTime = now;
    return true;
  } catch {
    supabaseTablesExistCache = false;
    lastTableCheckTime = now;
    return false;
  }
}

/**
 * Load full state from Supabase if connected and tables are ready
 */
export async function loadStateFromSupabase(): Promise<DatabaseSchema | null> {
  if (!isSupabaseConfigured()) return null;

  const tablesExist = await checkSupabaseTablesExist();
  if (!tablesExist) {
    // Supabase is configured but tables have not been created yet
    return null;
  }

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // Query collections in parallel for maximum speed
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

    // Check if critical tables query failed
    if (eventsRes.error) {
      if (
        eventsRes.error.code === 'PGRST205' ||
        eventsRes.error.message?.includes('schema cache') ||
        eventsRes.error.message?.includes('does not exist') ||
        eventsRes.error.message?.includes('relation')
      ) {
        supabaseTablesExistCache = false;
        return null;
      }
      console.warn('[Supabase] Failed to query events table from Supabase:', eventsRes.error.message);
      return null;
    }

    const settings = settingsRes.data && settingsRes.data.length > 0 ? (settingsRes.data[0] as AppSettings) : undefined;
    const stats = statsRes.data && statsRes.data.length > 0 ? (statsRes.data[0] as Stats) : undefined;

    const loadedEvents = ((eventsRes.data as Event[]) || []).map((evt: any) => {
      const pType = evt.participation_type || 'SOLO';
      return {
        ...evt,
        participation_type: pType,
        min_team_size: evt.min_team_size || (pType === 'SOLO' ? 1 : 2),
        max_team_size: evt.max_team_size || (pType === 'SOLO' ? 1 : pType === 'DUO' ? 2 : 4),
      };
    });

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

  const upsertBatch = async (tableName: string, items: any[]) => {
    if (!items || items.length === 0) {
      inserted[tableName] = 0;
      return;
    }
    try {
      const { error, count } = await client.from(tableName).upsert(items, { count: 'exact' });
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
    // Settings
    if (db.settings) {
      const settingsPayload = { id: 'global_settings', ...db.settings };
      const { error } = await client.from('settings').upsert(settingsPayload);
      if (error) errors.push(`Table 'settings': ${error.message}`);
      else inserted['settings'] = 1;
    }

    // Stats
    if (db.stats) {
      const statsPayload = { id: 'global_stats', ...db.stats };
      const { error } = await client.from('stats').upsert(statsPayload);
      if (error) errors.push(`Table 'stats': ${error.message}`);
      else inserted['stats'] = 1;
    }

    // Other collections
    await upsertBatch('community_impact_stats', db.community_impact_stats || []);
    await upsertBatch('events', db.events || []);
    await upsertBatch('announcements', db.announcements || []);
    await upsertBatch('team', db.team || []);
    await upsertBatch('projects', db.projects || []);
    await upsertBatch('gallery', db.gallery || []);
    await upsertBatch('join_applications', db.join_applications || []);
    await upsertBatch('registrations', db.registrations || []);
    await upsertBatch('checkins', db.checkins || []);
    await upsertBatch('certificates', db.certificates || []);
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
