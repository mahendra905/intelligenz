import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cache client instance
let supabaseClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.trim().length > 0 && key.trim().length > 0);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )!.trim();

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

/**
 * Test connectivity to Supabase
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; error?: string; message?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      message: 'Supabase is not configured. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY are missing.',
    };
  }

  try {
    // Try to query any table or settings
    const { data, error } = await client.from('settings').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      // Check if table just doesn't exist yet vs connection error
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return {
          connected: true,
          message: 'Connected to Supabase PostgreSQL, but schema tables need to be created.',
        };
      }
      return {
        connected: false,
        error: `${error.message} (Code: ${error.code})`,
      };
    }

    return {
      connected: true,
      message: 'Successfully connected to Supabase Managed PostgreSQL database.',
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Unknown network error connecting to Supabase',
    };
  }
}

/**
 * Upload a file/image buffer to Supabase Storage bucket
 */
export async function uploadToSupabaseStorage(
  filePath: string,
  buffer: Buffer,
  contentType: string,
  bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'intelligenz-media'
): Promise<{ url: string | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { url: null, error: 'Supabase client is not configured' };
  }

  try {
    // Ensure bucket exists or attempt upload
    const { data: uploadData, error: uploadError } = await client.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      // If bucket not found, try creating the bucket if we have service_role key
      if (uploadError.message?.toLowerCase().includes('bucket not found') || (uploadError as any).statusCode === '404') {
        try {
          await client.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          });
          // Retry upload
          const retry = await client.storage.from(bucketName).upload(filePath, buffer, {
            contentType,
            upsert: true,
          });
          if (retry.error) {
            return { url: null, error: retry.error.message };
          }
        } catch (createErr: any) {
          return { url: null, error: `Bucket '${bucketName}' could not be accessed: ${uploadError.message}` };
        }
      } else {
        return { url: null, error: uploadError.message };
      }
    }

    const { data: publicUrlData } = client.storage.from(bucketName).getPublicUrl(filePath);
    return { url: publicUrlData.publicUrl };
  } catch (err: any) {
    return { url: null, error: err.message || 'Error uploading to Supabase Storage' };
  }
}

/**
 * Generates the full PostgreSQL DDL script for initializing Supabase tables
 */
export function generateSupabaseSQLSchema(): string {
  return `-- ====================================================================
-- INTELLIGENZ CLUB - OFFICIAL PRODUCTION SUPABASE / POSTGRESQL SCHEMA
-- Department of CSE (AIML) & AI | DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
-- Supports 1000+ Concurrent Registrations, Certificates, Attendance & Media
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'global_settings',
  site_title TEXT NOT NULL DEFAULT 'IntelliGenZ Club',
  site_tagline TEXT NOT NULL DEFAULT 'Official AI & Technical Club',
  is_recruitment_open BOOLEAN DEFAULT true,
  join_us_status BOOLEAN DEFAULT true,
  recruitment_deadline TEXT,
  contact_email TEXT DEFAULT 'intelligenz@drkvsrit.ac.in',
  contact_phone TEXT DEFAULT '+91 9876543210',
  instagram_url TEXT DEFAULT 'https://instagram.com/intelligenz_drkvsrit',
  linkedin_url TEXT DEFAULT 'https://linkedin.com/company/intelligenz-drkvsrit',
  github_url TEXT DEFAULT 'https://github.com/intelligenz-drkvsrit',
  youtube_url TEXT DEFAULT 'https://youtube.com/@intelligenz_drkvsrit',
  whatsapp_community_url TEXT DEFAULT 'https://chat.whatsapp.com/invite/intelligenz',
  automated_email_enabled BOOLEAN DEFAULT true,
  email_sender_name TEXT DEFAULT 'IntelliGenZ Club',
  email_sender_address TEXT DEFAULT 'intelligenz@drkvsrit.ac.in',
  primary_color TEXT DEFAULT '#00E5FF',
  theme TEXT DEFAULT 'dark',
  announcement_banner_enabled BOOLEAN DEFAULT false,
  announcement_banner_text TEXT DEFAULT '',
  announcement_banner_link TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Legacy Stats Table
CREATE TABLE IF NOT EXISTS public.stats (
  id TEXT PRIMARY KEY DEFAULT 'global_stats',
  active_members INTEGER DEFAULT 85,
  events_organized INTEGER DEFAULT 24,
  projects_completed INTEGER DEFAULT 18,
  workshops_conducted INTEGER DEFAULT 14,
  hackathons_hosted INTEGER DEFAULT 6,
  total_attendees INTEGER DEFAULT 1200,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Community Impact Stats
CREATE TABLE IF NOT EXISTS public.community_impact_stats (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'Users',
  active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT DEFAULT 'Administrator'
);

-- 5. Admin Users (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN', -- SUPER_ADMIN, ADMIN, EDITOR
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, REVOKED
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT DEFAULT 'System'
);

-- 6. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT NOT NULL,
  event_image TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  venue TEXT NOT NULL,
  category TEXT NOT NULL,
  speaker TEXT,
  speaker_bio TEXT,
  speaker_avatar TEXT,
  speaker_role TEXT,
  registration_url TEXT,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  maximum_participants INTEGER DEFAULT 100,
  current_participants INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Upcoming',
  featured BOOLEAN DEFAULT false,
  participation_type TEXT DEFAULT 'SOLO', -- SOLO, DUO, TEAM
  min_team_size INTEGER DEFAULT 1,
  max_team_size INTEGER DEFAULT 1,
  highlights JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  results TEXT,
  winners JSONB DEFAULT '[]'::jsonb,
  certificates_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_featured ON public.events(featured);

-- 7. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  featured_image TEXT,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  author_role TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  featured BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_slug ON public.announcements(slug);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.announcements(category);

-- 8. Team Members Table
CREATE TABLE IF NOT EXISTS public.team (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  role TEXT,
  category TEXT NOT NULL,
  department TEXT DEFAULT 'CSE (AIML) & AI',
  year TEXT,
  bio TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  image_url TEXT,
  linkedin TEXT,
  github TEXT,
  email TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  featured BOOLEAN DEFAULT false,
  "order" INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_team_order ON public.team("order" ASC);

-- 9. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  title TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT NOT NULL,
  category TEXT NOT NULL,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  team_members JSONB DEFAULT '[]'::jsonb,
  github_url TEXT,
  demo_url TEXT,
  image_url TEXT NOT NULL,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Completed',
  date TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON public.projects(featured);

-- 10. Gallery Images Table
CREATE TABLE IF NOT EXISTS public.gallery (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  album TEXT NOT NULL,
  event_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  date DATE NOT NULL,
  featured BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_gallery_date ON public.gallery(date DESC);

-- 11. Join Applications Table
CREATE TABLE IF NOT EXISTS public.join_applications (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  college_email TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  technical_interests JSONB DEFAULT '[]'::jsonb,
  skills TEXT NOT NULL,
  why_join TEXT NOT NULL,
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  agreed_updates BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'New',
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_email ON public.join_applications(LOWER(college_email));
CREATE INDEX IF NOT EXISTS idx_join_roll ON public.join_applications(UPPER(roll_number));
CREATE INDEX IF NOT EXISTS idx_join_status ON public.join_applications(status);

-- 12. Event Registrations Table
CREATE TABLE IF NOT EXISTS public.registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  full_name TEXT NOT NULL,
  participant_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  participation_type TEXT DEFAULT 'SOLO',
  team_name TEXT,
  team_members JSONB DEFAULT '[]'::jsonb,
  ticket_code TEXT UNIQUE,
  qr_token TEXT,
  qr_payload TEXT,
  status TEXT DEFAULT 'Confirmed',
  email_status TEXT DEFAULT 'pending',
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_registrations_roll ON public.registrations(UPPER(roll_number));
CREATE INDEX IF NOT EXISTS idx_registrations_ticket ON public.registrations(ticket_code);

-- 13. Attendance / Check-in Records Table
CREATE TABLE IF NOT EXISTS public.checkins (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checkin_method TEXT DEFAULT 'Rapid Scanner'
);

CREATE INDEX IF NOT EXISTS idx_checkins_event ON public.checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_reg ON public.checkins(registration_id);
CREATE INDEX IF NOT EXISTS idx_checkins_roll ON public.checkins(UPPER(roll_number));

-- 14. Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
  id TEXT PRIMARY KEY,
  certificate_code TEXT UNIQUE NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_roll_no TEXT NOT NULL,
  department TEXT NOT NULL,
  college_name TEXT DEFAULT 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
  event_id TEXT,
  event_title TEXT NOT NULL,
  certificate_type TEXT DEFAULT 'Participation',
  issue_date DATE NOT NULL,
  issued_by TEXT DEFAULT 'Department of CSE (AIML) & AI',
  designation TEXT DEFAULT 'Faculty Coordinator & President',
  is_valid BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cert_code ON public.certificates(UPPER(certificate_code));
CREATE INDEX IF NOT EXISTS idx_cert_roll ON public.certificates(UPPER(student_roll_no));
CREATE INDEX IF NOT EXISTS idx_cert_email ON public.certificates(LOWER(student_email));

-- 15. Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'Active'
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(LOWER(email));

-- 16. Newsletter Broadcasts Table
CREATE TABLE IF NOT EXISTS public.newsletter_broadcasts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  target TEXT DEFAULT 'All Subscribers',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recipient_count INTEGER DEFAULT 0
);

-- 17. Contact Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  responded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- 18. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs(timestamp DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_impact_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow Public Reads for Front-end Catalogues
DROP POLICY IF EXISTS "Public Read Settings" ON public.settings;
CREATE POLICY "Public Read Settings" ON public.settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Stats" ON public.stats;
CREATE POLICY "Public Read Stats" ON public.stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Impact Stats" ON public.community_impact_stats;
CREATE POLICY "Public Read Impact Stats" ON public.community_impact_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Events" ON public.events;
CREATE POLICY "Public Read Events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Announcements" ON public.announcements;
CREATE POLICY "Public Read Announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Team" ON public.team;
CREATE POLICY "Public Read Team" ON public.team FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Projects" ON public.projects;
CREATE POLICY "Public Read Projects" ON public.projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Gallery" ON public.gallery;
CREATE POLICY "Public Read Gallery" ON public.gallery FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Certificates" ON public.certificates;
CREATE POLICY "Public Read Certificates" ON public.certificates FOR SELECT USING (true);

-- Allow Public Submissions for Forms
DROP POLICY IF EXISTS "Public Insert Join Applications" ON public.join_applications;
CREATE POLICY "Public Insert Join Applications" ON public.join_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Insert Registrations" ON public.registrations;
CREATE POLICY "Public Insert Registrations" ON public.registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Insert Newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Public Insert Newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Insert Contact Messages" ON public.messages;
CREATE POLICY "Public Insert Contact Messages" ON public.messages FOR INSERT WITH CHECK (true);

-- Allow Full Access to Service Role / Admin Backend
DROP POLICY IF EXISTS "Service Role Full Access Settings" ON public.settings;
CREATE POLICY "Service Role Full Access Settings" ON public.settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Events" ON public.events;
CREATE POLICY "Service Role Full Access Events" ON public.events FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Announcements" ON public.announcements;
CREATE POLICY "Service Role Full Access Announcements" ON public.announcements FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Team" ON public.team;
CREATE POLICY "Service Role Full Access Team" ON public.team FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Projects" ON public.projects;
CREATE POLICY "Service Role Full Access Projects" ON public.projects FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Gallery" ON public.gallery;
CREATE POLICY "Service Role Full Access Gallery" ON public.gallery FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Registrations" ON public.registrations;
CREATE POLICY "Service Role Full Access Registrations" ON public.registrations FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Checkins" ON public.checkins;
CREATE POLICY "Service Role Full Access Checkins" ON public.checkins FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Certificates" ON public.certificates;
CREATE POLICY "Service Role Full Access Certificates" ON public.certificates FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Admin Users" ON public.admin_users;
CREATE POLICY "Service Role Full Access Admin Users" ON public.admin_users FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Audit Logs" ON public.audit_logs;
CREATE POLICY "Service Role Full Access Audit Logs" ON public.audit_logs FOR ALL USING (true);
`;
}
