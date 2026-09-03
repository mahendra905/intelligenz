import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_SETTINGS,
  INITIAL_STATS,
  INITIAL_COMMUNITY_IMPACT_STATS,
  INITIAL_EVENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_TEAM,
  INITIAL_PROJECTS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_GALLERY,
  INITIAL_CERTIFICATES,
  INITIAL_SUBSCRIBERS,
  INITIAL_RESOURCES,
} from './src/data/initialData';
import {
  Event,
  Announcement,
  TeamMember,
  Project,
  Achievement,
  GalleryImage,
  JoinApplication,
  EventRegistration,
  ContactMessage,
  SiteStats,
  SiteSettings,
  CommunityImpactStat,
  Certificate,
  NewsletterSubscriber,
  NewsletterBroadcast,
  AttendanceRecord,
  LearningResource,
  AuditLog,
  ParticipationType,
  TeamMemberRegistration,
  EventWinner,
} from './src/types';

export interface AdminUserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  password_hash: string;
  salt: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  created_by?: string;
}

export interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
    status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
    mustChangePassword?: boolean;
  };
}

interface DatabaseSchema {
  settings: SiteSettings;
  stats: SiteStats;
  community_impact_stats?: CommunityImpactStat[];
  events: Event[];
  announcements: Announcement[];
  team: TeamMember[];
  projects: Project[];
  achievements: Achievement[];
  gallery: GalleryImage[];
  join_applications: JoinApplication[];
  registrations: EventRegistration[];
  messages: ContactMessage[];
  admin_users: AdminUserRecord[];
  certificates: Certificate[];
  newsletter_subscribers: NewsletterSubscriber[];
  newsletter_broadcasts: NewsletterBroadcast[];
  resources: LearningResource[];
  checkins: AttendanceRecord[];
  audit_logs: AuditLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure data, backup, and uploads directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function createBootstrapSuperAdmin(): AdminUserRecord {
  const salt = crypto.randomBytes(16).toString('hex');
  const defaultUsername = (process.env.ADMIN_BOOTSTRAP_USERNAME || 'superadmin').trim().toLowerCase().replace(/^["']|["']$/g, '');
  const defaultEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'mahibittu2006@gmail.com').trim().toLowerCase().replace(/^["']|["']$/g, '');
  const defaultPass = (process.env.ADMIN_BOOTSTRAP_PASSWORD || 'admin1@10043').trim().replace(/^["']|["']$/g, '');
  return {
    id: 'usr-admin-primary',
    name: 'Primary Super Administrator',
    username: defaultUsername,
    email: defaultEmail,
    password_hash: hashPassword(defaultPass, salt),
    salt,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    must_change_password: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'System Bootstrap',
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    const targetEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'mahibittu2006@gmail.com').trim().toLowerCase().replace(/^["']|["']$/g, '');
    const targetUsername = (process.env.ADMIN_BOOTSTRAP_USERNAME || 'superadmin').trim().toLowerCase().replace(/^["']|["']$/g, '');
    const targetPassword = (process.env.ADMIN_BOOTSTRAP_PASSWORD || 'admin1@10043').trim().replace(/^["']|["']$/g, '');

    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      let adminUsers: AdminUserRecord[] = [];
      let needsSave = false;

      if (Array.isArray(parsed.admin_users) && parsed.admin_users.length > 0) {
        adminUsers = parsed.admin_users.map((u: any, idx: number) => ({
          id: u.id || `usr-admin-${idx + 1}`,
          name: u.name || (u.role === 'SUPER_ADMIN' || u.role === 'admin' ? 'Primary Super Administrator' : (u.username || 'Admin User')),
          username: (u.username || '').toLowerCase().trim(),
          email: (u.email || '').toLowerCase().trim(),
          password_hash: u.password_hash || '',
          salt: u.salt || crypto.randomBytes(16).toString('hex'),
          role: (u.role === 'SUPER_ADMIN' || u.role === 'admin') ? 'SUPER_ADMIN' : (u.role === 'EDITOR' ? 'EDITOR' : 'ADMIN'),
          status: (u.status === 'INACTIVE' || u.status === 'REVOKED') ? u.status : 'ACTIVE',
          must_change_password: typeof u.must_change_password === 'boolean' ? u.must_change_password : false,
          created_at: u.created_at || new Date().toISOString(),
          updated_at: u.updated_at || new Date().toISOString(),
          last_login_at: u.last_login_at || undefined,
          created_by: u.created_by || 'System Bootstrap',
        }));
      }

      // Check if configured SUPER_ADMIN already exists in database
      const existingSuperAdmin = adminUsers.find(
        (u) => u.username === targetUsername || u.email === targetEmail
      );

      if (existingSuperAdmin) {
        if (existingSuperAdmin.role !== 'SUPER_ADMIN') {
          existingSuperAdmin.role = 'SUPER_ADMIN';
          needsSave = true;
        }
        if (existingSuperAdmin.status !== 'ACTIVE') {
          existingSuperAdmin.status = 'ACTIVE';
          needsSave = true;
        }
        if (!existingSuperAdmin.password_hash || !existingSuperAdmin.salt) {
          existingSuperAdmin.salt = crypto.randomBytes(16).toString('hex');
          existingSuperAdmin.password_hash = hashPassword(targetPassword, existingSuperAdmin.salt);
          needsSave = true;
        }
      } else {
        // Look for initial default admin placeholder (e.g. usr-admin-primary or admin/admin@drkvsrit.ac.in) to migrate
        const placeholderIdx = adminUsers.findIndex(
          (u) =>
            u.id === 'usr-admin-primary' ||
            u.username === 'admin' ||
            u.email === 'admin@drkvsrit.ac.in'
        );

        if (placeholderIdx !== -1) {
          const salt = crypto.randomBytes(16).toString('hex');
          adminUsers[placeholderIdx] = {
            ...adminUsers[placeholderIdx],
            id: 'usr-admin-primary',
            name: 'Primary Super Administrator',
            username: targetUsername,
            email: targetEmail,
            password_hash: hashPassword(targetPassword, salt),
            salt,
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            must_change_password: false,
            updated_at: new Date().toISOString(),
            created_by: 'System Bootstrap',
          };
          needsSave = true;
        } else {
          // Create new Super Admin record
          const bootstrap = createBootstrapSuperAdmin();
          adminUsers.unshift(bootstrap);
          needsSave = true;
        }
      }

      // Remove any leftover duplicate placeholder accounts that might conflict
      adminUsers = adminUsers.filter(
        (u, idx, arr) =>
          arr.findIndex(
            (other) =>
              other.username === u.username ||
              other.email === u.email ||
              (other.id === u.id && u.id === 'usr-admin-primary')
          ) === idx
      );

      let communityStats = Array.isArray(parsed.community_impact_stats) && parsed.community_impact_stats.length > 0
        ? parsed.community_impact_stats
        : null;

      if (!communityStats) {
        communityStats = INITIAL_COMMUNITY_IMPACT_STATS.map((stat) => {
          // If legacy stats had specific values, preserve them
          if (stat.id === 'stat-students-reached' && parsed.stats?.students_reached) {
            return { ...stat, value: String(parsed.stats.students_reached) };
          }
          if (stat.id === 'stat-events-sprints' && parsed.stats?.events_conducted) {
            return { ...stat, value: String(parsed.stats.events_conducted) };
          }
          if (stat.id === 'stat-live-projects' && parsed.stats?.projects_completed) {
            return { ...stat, value: String(parsed.stats.projects_completed) };
          }
          if (stat.id === 'stat-technical-labs' && parsed.stats?.workshops_held) {
            return { ...stat, value: String(parsed.stats.workshops_held) };
          }
          if (stat.id === 'stat-hackathon-wins' && parsed.stats?.hackathon_wins) {
            return { ...stat, value: String(parsed.stats.hackathon_wins) };
          }
          if (stat.id === 'stat-core-members' && parsed.stats?.active_members) {
            return { ...stat, value: String(parsed.stats.active_members) };
          }
          return stat;
        });
        needsSave = true;
      }

      const normalizedEvents: Event[] = (parsed.events || INITIAL_EVENTS).map((evt: Event) => {
        const pType = evt.participation_type || (evt.category === 'Hackathon' ? 'TEAM' : 'SOLO');
        return {
          ...evt,
          participation_type: pType,
          min_team_size: evt.min_team_size || (pType === 'SOLO' ? 1 : 2),
          max_team_size: evt.max_team_size || (pType === 'SOLO' ? 1 : pType === 'DUO' ? 2 : 4),
        };
      });

      const loaded: DatabaseSchema = {
        settings: parsed.settings || INITIAL_SETTINGS,
        stats: parsed.stats || INITIAL_STATS,
        community_impact_stats: communityStats,
        events: normalizedEvents,
        announcements: parsed.announcements || INITIAL_ANNOUNCEMENTS,
        team: parsed.team || INITIAL_TEAM,
        projects: parsed.projects || INITIAL_PROJECTS,
        achievements: parsed.achievements || INITIAL_ACHIEVEMENTS,
        gallery: parsed.gallery || INITIAL_GALLERY,
        join_applications: parsed.join_applications || [],
        registrations: parsed.registrations || [],
        messages: parsed.messages || [],
        admin_users: adminUsers,
        certificates: parsed.certificates || INITIAL_CERTIFICATES,
        newsletter_subscribers: parsed.newsletter_subscribers || INITIAL_SUBSCRIBERS,
        newsletter_broadcasts: parsed.newsletter_broadcasts || [],
        resources: parsed.resources || INITIAL_RESOURCES,
        checkins: parsed.checkins || [],
        audit_logs: Array.isArray(parsed.audit_logs) ? parsed.audit_logs : [],
      };

      if (needsSave || !parsed.admin_users || parsed.admin_users.length === 0) {
        saveDatabase(loaded);
      }

      return loaded;
    }
  } catch (err) {
    console.error('Error reading db.json, falling back to defaults:', err);
  }

  const initialDb: DatabaseSchema = {
    settings: INITIAL_SETTINGS,
    stats: INITIAL_STATS,
    community_impact_stats: INITIAL_COMMUNITY_IMPACT_STATS,
    events: INITIAL_EVENTS,
    announcements: INITIAL_ANNOUNCEMENTS,
    team: INITIAL_TEAM,
    projects: INITIAL_PROJECTS,
    achievements: INITIAL_ACHIEVEMENTS,
    gallery: INITIAL_GALLERY,
    join_applications: [],
    registrations: [],
    messages: [],
    admin_users: [createBootstrapSuperAdmin()],
    certificates: INITIAL_CERTIFICATES,
    newsletter_subscribers: INITIAL_SUBSCRIBERS,
    newsletter_broadcasts: [],
    resources: INITIAL_RESOURCES,
    checkins: [],
    audit_logs: [
      {
        id: 'log-init',
        action: 'System Initialized',
        entity_type: 'System',
        admin_email: 'admin@drkvsrit.ac.in',
        details: 'IntelliGenZ Platform and Database Initialized with Secure Whitelist Access Control',
        timestamp: new Date().toISOString(),
      },
    ],
  };
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(database: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to db.json:', err);
  }
}

let db = loadDatabase();

function logAdminAction(
  action: string,
  entity_type: string,
  entity_id: string,
  details: string,
  admin_email: string = 'admin@drkvsrit.ac.in',
  req?: Request
) {
  try {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      action,
      entity_type,
      entity_id,
      admin_email,
      details,
      timestamp: new Date().toISOString(),
      ip_address: (req?.ip || req?.socket.remoteAddress || '127.0.0.1') as string,
    };
    if (!db.audit_logs) db.audit_logs = [];
    db.audit_logs.unshift(newLog);
    if (db.audit_logs.length > 500) {
      db.audit_logs = db.audit_logs.slice(0, 500);
    }
    saveDatabase(db);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// In-memory rate limiting map
const ipRateLimits = new Map<string, { count: number; lastReset: number }>();
function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = ipRateLimits.get(ip) || { count: 0, lastReset: now };

    if (now - clientData.lastReset > windowMs) {
      clientData.count = 1;
      clientData.lastReset = now;
    } else {
      clientData.count += 1;
    }

    ipRateLimits.set(ip, clientData);

    if (clientData.count > limit) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    next();
  };
}

// Active session storage
interface ActiveSession {
  token: string;
  userId: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  expiresAt: number;
  mustChangePassword?: boolean;
}

const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function loadSessions(): Map<string, ActiveSession> {
  const map = new Map<string, ActiveSession>();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const arr = JSON.parse(data);
      if (Array.isArray(arr)) {
        const now = Date.now();
        for (const s of arr) {
          if (s && s.token && s.expiresAt > now) {
            map.set(s.token, s);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading sessions file:', err);
  }
  return map;
}

function saveSessions(sessionsMap: Map<string, ActiveSession>) {
  try {
    const list = Array.from(sessionsMap.values()).filter((s) => s.expiresAt > Date.now());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sessions file:', err);
  }
}

const activeSessions = loadSessions();

function invalidateUserSessions(userId: string) {
  for (const [token, session] of activeSessions.entries()) {
    if (session.userId === userId) {
      activeSessions.delete(token);
    }
  }
  saveSessions(activeSessions);
}

function adminAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication token required.' });
    return;
  }
  const token = authHeader.split(' ')[1];

  const session = activeSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) {
      activeSessions.delete(token);
      saveSessions(activeSessions);
    }
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  // Lookup user in current database to verify active status & current role
  const dbUser = db.admin_users.find((u) => u.id === session.userId);
  if (!dbUser || dbUser.status !== 'ACTIVE') {
    activeSessions.delete(token);
    saveSessions(activeSessions);
    res.status(403).json({ error: 'Access denied: Administrator account is not active or has been revoked.' });
    return;
  }

  req.adminUser = {
    id: dbUser.id,
    name: dbUser.name,
    username: dbUser.username,
    email: dbUser.email,
    role: dbUser.role,
    status: dbUser.status,
    mustChangePassword: !!dbUser.must_change_password,
  };

  next();
}

function requireRole(...allowedRoles: Array<'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.adminUser.role)) {
      res.status(403).json({
        error: `Forbidden: Insufficient privileges. Required role: ${allowedRoles.join(' or ')}. Current role: ${req.adminUser.role}.`,
      });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support up to 75MB request payload to allow 50MB binary uploads via base64 safely
  app.use(express.json({ limit: '75mb' }));
  app.use(express.urlencoded({ extended: true, limit: '75mb' }));

  // Serve persistent uploaded images statically BEFORE Vite and SPA fallback
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/api/uploads', express.static(UPLOADS_DIR));

  // Request logger for API calls
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // ==========================================
  // PUBLIC & SHARED API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      club: 'INTELLIGENZ',
      department: 'Department of CSE (AIML) & AI',
      college: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      timestamp: new Date().toISOString(),
    });
  });

  // Settings & Metadata
  app.get('/api/settings', (req, res) => {
    res.json(db.settings);
  });

  // Stats
  app.get('/api/stats', (req, res) => {
    const activeCommunityStats = (db.community_impact_stats || INITIAL_COMMUNITY_IMPACT_STATS)
      .filter((s) => s.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    res.json({
      ...db.stats,
      community_impact_stats: activeCommunityStats,
    });
  });

  // Public Community Impact Statistics
  app.get(['/api/public/community-impact', '/api/community-impact'], (req, res) => {
    const activeStats = (db.community_impact_stats || INITIAL_COMMUNITY_IMPACT_STATS)
      .filter((s) => s.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(activeStats);
  });

  // Global Search
  app.get('/api/search', (req, res) => {
    const query = (req.query.q as string || '').toLowerCase().trim();
    if (!query) {
      res.json({ events: [], announcements: [], projects: [] });
      return;
    }

    const matchedEvents = db.events.filter(
      (e) =>
        e.title.toLowerCase().includes(query) ||
        e.short_description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        (e.speaker && e.speaker.toLowerCase().includes(query))
    );

    const matchedAnnouncements = db.announcements.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query)
    );

    const matchedProjects = db.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.short_description.toLowerCase().includes(query) ||
        p.tech_stack.some((t) => t.toLowerCase().includes(query))
    );

    res.json({
      events: matchedEvents,
      announcements: matchedAnnouncements,
      projects: matchedProjects,
    });
  });

  // EVENTS
  app.get('/api/events', (req, res) => {
    const category = req.query.category as string;
    const status = req.query.status as string;
    const featured = req.query.featured === 'true';

    let result = [...db.events];
    if (category && category !== 'All') {
      result = result.filter((e) => e.category === category);
    }
    if (status && status !== 'All') {
      result = result.filter((e) => e.status === status);
    }
    if (featured) {
      result = result.filter((e) => e.featured);
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(result);
  });

  app.get('/api/events/:slug', (req, res) => {
    const event = db.events.find((e) => e.slug === req.params.slug || e.id === req.params.slug);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json(event);
  });

  // Helper to check if any student (email or roll number) is already registered for this event
  function checkEventParticipantDuplicate(
    eventId: string,
    email: string,
    rollNumber: string
  ): { isDuplicate: boolean; message?: string } {
    const normEmail = (email || '').trim().toLowerCase();
    const normRoll = (rollNumber || '').trim().toUpperCase();
    if (!normEmail && !normRoll) return { isDuplicate: false };

    const eventRegs = db.registrations.filter((r) => r.event_id === eventId && r.status !== 'Cancelled');
    for (const reg of eventRegs) {
      // Check leader / individual
      if (
        (normEmail && reg.email && reg.email.toLowerCase() === normEmail) ||
        (normRoll && reg.roll_number && reg.roll_number.toUpperCase() === normRoll)
      ) {
        return {
          isDuplicate: true,
          message: `Student with email '${email}' or roll number '${rollNumber}' is already registered for this event${reg.team_name ? ` (Team: ${reg.team_name})` : ''}.`,
        };
      }

      // Check team members
      if (reg.team_members && Array.isArray(reg.team_members)) {
        for (const m of reg.team_members) {
          if (
            (normEmail && m.email && m.email.toLowerCase() === normEmail) ||
            (normRoll && m.roll_number && m.roll_number.toUpperCase() === normRoll)
          ) {
            return {
              isDuplicate: true,
              message: `Student with email '${email}' or roll number '${rollNumber}' (${m.full_name}) is already registered as a team member in '${reg.team_name || reg.full_name}'.`,
            };
          }
        }
      }
    }
    return { isDuplicate: false };
  }

  // Event Registrations candidates for winners selection
  app.get('/api/events/:id/registrations', (req, res) => {
    const eventId = req.params.id;
    const event = db.events.find((e) => e.id === eventId || e.slug === eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const regs = db.registrations.filter((r) => r.event_id === event.id && r.status !== 'Cancelled');
    res.json(regs);
  });

  // Event Winners (Public)
  app.get('/api/events/:id/winners', (req, res) => {
    const eventId = req.params.id;
    const event = db.events.find((e) => e.id === eventId || e.slug === eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json({
      event_id: event.id,
      title: event.title,
      status: event.status,
      results: event.results || '',
      winners: event.winners || [],
    });
  });

  // Event Registration (Public)
  app.post('/api/events/:id/register', rateLimiter(45, 60000), (req, res) => {
    const eventId = req.params.id;
    const event = db.events.find((e) => e.id === eventId || e.slug === eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    if (event.status !== 'Registration Open') {
      res.status(400).json({ error: 'Registrations are currently not open for this event.' });
      return;
    }

    const participationType: ParticipationType = event.participation_type || 'SOLO';
    const minTeamSize = event.min_team_size || (participationType === 'SOLO' ? 1 : 2);
    const maxTeamSize = event.max_team_size || (participationType === 'SOLO' ? 1 : participationType === 'DUO' ? 2 : 4);

    const {
      full_name,
      participant_name,
      name,
      email,
      phone,
      department,
      year,
      roll_number,
      college,
      team_name,
      team_members,
    } = req.body;

    const leaderName = (full_name || participant_name || name || '').trim();
    const leaderEmail = (email || '').trim().toLowerCase();
    const leaderRoll = (roll_number || '').trim().toUpperCase();
    const leaderDept = (department || 'CSE (AIML)').trim();
    const leaderYear = (year || '3rd Year').trim();
    const leaderPhone = (phone || '').trim();
    const teamName = (team_name || '').trim();

    if (!leaderName || !leaderEmail || !leaderRoll) {
      res.status(400).json({
        error: 'Please provide all required fields for the participant/leader (Full Name, College Email, Roll Number).',
      });
      return;
    }

    let finalMembers: TeamMemberRegistration[] = [];
    let totalParticipants = 1;

    if (participationType === 'SOLO') {
      const dupCheck = checkEventParticipantDuplicate(event.id, leaderEmail, leaderRoll);
      if (dupCheck.isDuplicate) {
        res.status(400).json({ error: dupCheck.message || 'You have already registered for this event.' });
        return;
      }
      totalParticipants = 1;
    } else if (participationType === 'DUO') {
      if (!teamName) {
        res.status(400).json({ error: 'Please provide a Duo / Team Name for this 2-person event.' });
        return;
      }

      const member2 = Array.isArray(team_members) && team_members.length > 0 ? team_members[0] : req.body.member2;
      if (!member2 || !member2.full_name || !member2.email || !member2.roll_number) {
        res.status(400).json({
          error: 'DUO events require complete details for both Participant 1 (Leader) and Participant 2 (Full Name, College Email, Roll Number).',
        });
        return;
      }

      const m2Name = String(member2.full_name).trim();
      const m2Email = String(member2.email).trim().toLowerCase();
      const m2Roll = String(member2.roll_number).trim().toUpperCase();
      const m2Dept = String(member2.department || leaderDept).trim();
      const m2Year = String(member2.year || leaderYear).trim();
      const m2Phone = String(member2.phone || '').trim();

      if (!m2Name || !m2Email || !m2Roll) {
        res.status(400).json({ error: 'Please enter Participant 2 Full Name, College Email, and Roll Number.' });
        return;
      }

      if (leaderEmail === m2Email || leaderRoll === m2Roll) {
        res.status(400).json({ error: 'Participant 1 and Participant 2 must have distinct email addresses and roll numbers.' });
        return;
      }

      const leaderDup = checkEventParticipantDuplicate(event.id, leaderEmail, leaderRoll);
      if (leaderDup.isDuplicate) {
        res.status(400).json({ error: `Participant 1: ${leaderDup.message}` });
        return;
      }

      const m2Dup = checkEventParticipantDuplicate(event.id, m2Email, m2Roll);
      if (m2Dup.isDuplicate) {
        res.status(400).json({ error: `Participant 2: ${m2Dup.message}` });
        return;
      }

      finalMembers = [
        {
          full_name: m2Name,
          email: m2Email,
          roll_number: m2Roll,
          department: m2Dept,
          year: m2Year,
          phone: m2Phone,
        },
      ];
      totalParticipants = 2;
    } else if (participationType === 'TEAM') {
      if (!teamName) {
        res.status(400).json({ error: 'Please provide a registered Team Name.' });
        return;
      }

      const rawMembers: any[] = Array.isArray(team_members) ? team_members : [];
      const totalTeamSize = 1 + rawMembers.length;

      if (totalTeamSize < minTeamSize || totalTeamSize > maxTeamSize) {
        res.status(400).json({
          error: `This event requires teams of between ${minTeamSize} and ${maxTeamSize} members. Your submission contains ${totalTeamSize} members (1 Leader + ${rawMembers.length} Members).`,
        });
        return;
      }

      const seenEmails = new Set<string>([leaderEmail]);
      const seenRolls = new Set<string>([leaderRoll]);

      for (let i = 0; i < rawMembers.length; i++) {
        const m = rawMembers[i];
        const mName = (m.full_name || m.name || '').trim();
        const mEmail = (m.email || '').trim().toLowerCase();
        const mRoll = (m.roll_number || '').trim().toUpperCase();

        if (!mName || !mEmail || !mRoll) {
          res.status(400).json({
            error: `Team Member #${i + 2} is missing required information (Full Name, College Email, and Roll Number are required).`,
          });
          return;
        }

        if (seenEmails.has(mEmail)) {
          res.status(400).json({ error: `Duplicate email address '${mEmail}' found within your team submission.` });
          return;
        }
        if (seenRolls.has(mRoll)) {
          res.status(400).json({ error: `Duplicate roll number '${mRoll}' found within your team submission.` });
          return;
        }

        seenEmails.add(mEmail);
        seenRolls.add(mRoll);

        finalMembers.push({
          full_name: mName,
          email: mEmail,
          roll_number: mRoll,
          department: (m.department || leaderDept).trim(),
          year: (m.year || leaderYear).trim(),
          phone: (m.phone || '').trim(),
        });
      }

      const leaderDup = checkEventParticipantDuplicate(event.id, leaderEmail, leaderRoll);
      if (leaderDup.isDuplicate) {
        res.status(400).json({ error: `Team Leader (${leaderName}): ${leaderDup.message}` });
        return;
      }

      for (const m of finalMembers) {
        const mDup = checkEventParticipantDuplicate(event.id, m.email, m.roll_number);
        if (mDup.isDuplicate) {
          res.status(400).json({ error: `Team Member ${m.full_name}: ${mDup.message}` });
          return;
        }
      }

      totalParticipants = totalTeamSize;
    }

    const isFull = event.current_participants + totalParticipants > event.maximum_participants;
    const regStatus = isFull ? 'Waitlisted' : 'Confirmed';

    const newReg: EventRegistration = {
      id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      event_id: event.id,
      event_title: event.title,
      participation_type: participationType,
      team_name: participationType !== 'SOLO' ? teamName : undefined,
      full_name: leaderName,
      participant_name: leaderName,
      email: leaderEmail,
      phone: leaderPhone,
      college: college || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      department: leaderDept,
      year: leaderYear,
      roll_number: leaderRoll,
      team_members: finalMembers.length > 0 ? finalMembers : undefined,
      team_size: totalParticipants,
      status: regStatus,
      registered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    db.registrations.unshift(newReg);
    event.current_participants = (event.current_participants || 0) + totalParticipants;
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: `Registration successful! ${
        participationType !== 'SOLO' ? `Team '${teamName}' registered` : `Registered`
      } with status: ${regStatus}.`,
      registration: newReg,
    });
  });

  // ANNOUNCEMENTS
  app.get('/api/announcements', (req, res) => {
    const category = req.query.category as string;
    const featured = req.query.featured === 'true';

    let result = [...db.announcements];
    if (category && category !== 'All') {
      result = result.filter((a) => a.category === category);
    }
    if (featured) {
      result = result.filter((a) => a.featured);
    }

    result.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    res.json(result);
  });

  app.get('/api/announcements/:slug', (req, res) => {
    const ann = db.announcements.find((a) => a.slug === req.params.slug || a.id === req.params.slug);
    if (!ann) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    res.json(ann);
  });

  // TEAM
  app.get('/api/team', (req, res) => {
    const sorted = [...db.team].sort((a, b) => a.order - b.order);
    res.json(sorted);
  });

  // PROJECTS
  app.get('/api/projects', (req, res) => {
    const category = req.query.category as string;
    let result = [...db.projects];
    if (category && category !== 'All') {
      result = result.filter((p) => p.category === category);
    }
    res.json(result);
  });

  // ACHIEVEMENTS
  app.get('/api/achievements', (req, res) => {
    const sorted = [...db.achievements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    res.json(sorted);
  });

  // GALLERY
  app.get('/api/gallery', (req, res) => {
    const album = req.query.album as string;
    let result = [...db.gallery];
    if (album && album !== 'All') {
      result = result.filter((g) => g.album === album);
    }
    res.json(result);
  });

  // JOIN US SUBMISSION (Public)
  app.post('/api/join', rateLimiter(20, 60000), (req, res) => {
    const {
      full_name,
      name,
      college_email,
      email,
      phone,
      department,
      year,
      roll_number,
      technical_interests,
      interested_domains,
      skills,
      why_join,
      reason,
      github_url,
      linkedin_url,
      agreed_updates,
    } = req.body;

    const studentName = (full_name || name || '').trim();
    const studentEmail = (college_email || email || '').trim().toLowerCase();
    const studentRoll = (roll_number || '').trim().toUpperCase();
    const studentDept = (department || '').trim();
    const studentYear = (year || '').trim();
    const studentWhy = (why_join || reason || '').trim();
    const studentDomains = Array.isArray(interested_domains) && interested_domains.length > 0
      ? interested_domains
      : Array.isArray(technical_interests)
      ? technical_interests
      : [];

    if (!studentName || !studentEmail || !studentRoll || !studentDept || !studentYear) {
      res.status(400).json({ error: 'Please fill in all mandatory fields (Name, Email, Roll Number, Department, and Year).' });
      return;
    }

    // Check duplicate
    const existing = db.join_applications.find(
      (a) =>
        (a.college_email && a.college_email.toLowerCase() === studentEmail) ||
        (a.email && a.email.toLowerCase() === studentEmail) ||
        (a.roll_number && a.roll_number.toUpperCase() === studentRoll)
    );

    if (existing) {
      res.status(400).json({
        error: 'An application with this Roll Number or College Email has already been submitted.',
      });
      return;
    }

    const newApp: JoinApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      full_name: studentName,
      email: studentEmail,
      college_email: studentEmail,
      phone: (phone || '').trim(),
      department: studentDept,
      year: studentYear,
      roll_number: studentRoll,
      interested_domains: studentDomains,
      technical_interests: studentDomains,
      skills: (skills || '').trim(),
      reason: studentWhy,
      why_join: studentWhy,
      github_url: (github_url || '').trim(),
      linkedin_url: (linkedin_url || '').trim(),
      agreed_updates: !!agreed_updates,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };

    db.join_applications.unshift(newApp);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: 'Welcome to INTELLIGENZ! Your student membership application has been successfully saved to the club database.',
      application_id: newApp.id,
      application: newApp,
    });
  });

  // CONTACT MESSAGE (Public)
  app.post('/api/contact', rateLimiter(10, 60000), (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: 'All contact fields are required.' });
      return;
    }

    const newMsg: ContactMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      is_read: false,
      responded: false,
      created_at: new Date().toISOString(),
    };

    db.messages.unshift(newMsg);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: 'Thank you for reaching out! The IntelliGenZ team will get back to you shortly.',
    });
  });

  // ==========================================
  // NEWSLETTER SUBSCRIPTION (Public)
  // ==========================================
  app.post('/api/newsletter/subscribe', rateLimiter(15, 60000), (req, res) => {
    const { email, name, department } = req.body;
    const subscriberEmail = (email || '').trim().toLowerCase();

    if (!subscriberEmail || !subscriberEmail.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const existing = db.newsletter_subscribers.find(
      (s) => s.email.toLowerCase() === subscriberEmail
    );

    if (existing) {
      if (existing.status === 'Unsubscribed') {
        existing.status = 'Active';
        existing.subscribed_at = new Date().toISOString();
        saveDatabase(db);
        res.json({
          success: true,
          message: 'Welcome back! Your newsletter subscription has been reactivated.',
        });
        return;
      }
      res.json({
        success: true,
        message: 'You are already subscribed to the IntelliGenZ monthly circular and event alerts!',
      });
      return;
    }

    const newSubscriber: NewsletterSubscriber = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      email: subscriberEmail,
      name: (name || '').trim(),
      department: (department || '').trim(),
      subscribed_at: new Date().toISOString(),
      status: 'Active',
      source: req.body.source || 'Website',
    };

    db.newsletter_subscribers.unshift(newSubscriber);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to IntelliGenZ Club bulletins and event dispatches! 🚀',
      subscriber: newSubscriber,
    });
  });

  // ==========================================
  // CERTIFICATES VERIFICATION & LOOKUP (Public)
  // ==========================================
  app.get('/api/certificates', (req, res) => {
    const query = (req.query.q as string || '').toLowerCase().trim();
    
    // Sanitize output for public consumption to prevent personal information scraping
    const sanitizePublicCert = (c: Certificate) => ({
      id: c.id,
      certificate_code: c.certificate_code,
      student_name: c.student_name,
      student_roll_no: c.student_roll_no,
      department: c.department,
      college_name: c.college_name,
      event_id: c.event_id,
      event_title: c.event_title,
      certificate_type: c.certificate_type,
      issue_date: c.issue_date,
      issued_by: c.issued_by,
      designation: c.designation,
      is_valid: c.is_valid,
      notes: c.notes,
    });

    if (!query) {
      // Return list of publicly issued valid certificates
      res.json(db.certificates.filter((c) => c.is_valid).map(sanitizePublicCert));
      return;
    }

    const matches = db.certificates.filter(
      (c) =>
        c.certificate_code.toLowerCase().includes(query) ||
        c.student_name.toLowerCase().includes(query) ||
        c.student_roll_no.toLowerCase().includes(query) ||
        c.event_title.toLowerCase().includes(query)
    );

    res.json(matches.map(sanitizePublicCert));
  });

  app.get('/api/certificates/verify/:code', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const cert = db.certificates.find(
      (c) => c.certificate_code.toUpperCase() === code
    );

    if (!cert) {
      res.status(404).json({
        valid: false,
        status: 'NotFound',
        error: 'Certificate not found. Please verify the Certificate ID and try again.',
      });
      return;
    }

    // Public sanitized representation (excluding private email, phone, etc.)
    const publicCert = {
      id: cert.id,
      certificate_code: cert.certificate_code,
      student_name: cert.student_name,
      student_roll_no: cert.student_roll_no,
      department: cert.department,
      college_name: cert.college_name,
      event_id: cert.event_id,
      event_title: cert.event_title,
      certificate_type: cert.certificate_type,
      issue_date: cert.issue_date,
      issued_by: cert.issued_by,
      designation: cert.designation,
      is_valid: cert.is_valid,
      notes: cert.notes,
    };

    if (!cert.is_valid) {
      res.status(200).json({
        valid: false,
        status: 'Revoked',
        error: 'CERTIFICATE REVOKED by Department of CSE (AIML) & AI Authority.',
        certificate: publicCert,
        verification_time: new Date().toISOString(),
        verified_by: 'Department of CSE (AIML) & AI, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      });
      return;
    }

    res.json({
      valid: true,
      status: 'Valid',
      certificate: publicCert,
      verification_time: new Date().toISOString(),
      verified_by: 'Department of CSE (AIML) & AI, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    });
  });


  // ==========================================
  // LEARNING RESOURCES & AI ROADMAPS (Public)
  // ==========================================
  app.get('/api/resources', (req, res) => {
    const category = req.query.category as string;
    let list = [...db.resources];
    if (category && category !== 'All') {
      list = list.filter((r) => r.category === category);
    }
    res.json(list);
  });

  // ==========================================
  // AUTHENTICATION & ACCESS CONTROL
  // ==========================================
  app.post('/api/auth/login', rateLimiter(60, 60000), (req, res) => {
    const { username, email, identifier: rawIdentifier, password } = req.body;
    const identifier = (rawIdentifier || username || email || '').trim().toLowerCase();

    if (!identifier || !password) {
      res.status(400).json({ error: 'Please provide your administrator email or username, and password.' });
      return;
    }

    // Find admin user in database by username or email
    const adminUser = db.admin_users.find(
      (u) =>
        u.username.toLowerCase() === identifier ||
        u.email.toLowerCase() === identifier
    );

    if (!adminUser) {
      logAdminAction('Admin Login Failed', 'Auth', identifier, `Failed login attempt for unknown account '${identifier}'`, identifier, req);
      res.status(401).json({ error: 'Invalid administrator credentials.' });
      return;
    }

    if (adminUser.status === 'INACTIVE') {
      logAdminAction('Admin Login Blocked', 'Auth', adminUser.id, `Login blocked: Account '${adminUser.username}' is marked INACTIVE`, adminUser.email, req);
      res.status(403).json({ error: 'Your administrator account is currently inactive. Please contact the Super Administrator.' });
      return;
    }

    if (adminUser.status === 'REVOKED') {
      logAdminAction('Admin Login Blocked', 'Auth', adminUser.id, `Login blocked: Account '${adminUser.username}' access is REVOKED`, adminUser.email, req);
      res.status(403).json({ error: 'Your administrator access has been revoked. Contact the department administration.' });
      return;
    }

    if (adminUser.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Invalid administrator credentials.' });
      return;
    }

    // Verify PBKDF2 password hash
    const calculatedHash = hashPassword(password, adminUser.salt);
    if (calculatedHash !== adminUser.password_hash) {
      logAdminAction('Admin Login Failed', 'Auth', adminUser.id, `Failed login attempt: Incorrect password for '${adminUser.username}'`, adminUser.email, req);
      res.status(401).json({ error: 'Invalid administrator credentials.' });
      return;
    }

    // Update login timestamp
    adminUser.last_login_at = new Date().toISOString();
    adminUser.updated_at = new Date().toISOString();
    saveDatabase(db);

    // Issue cryptographically secure session token (24 hours expiry)
    const sessionToken = `session_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    activeSessions.set(sessionToken, {
      token: sessionToken,
      userId: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role,
      expiresAt,
      mustChangePassword: !!adminUser.must_change_password,
    });
    saveSessions(activeSessions);

    logAdminAction(
      'Admin Login Success',
      'Auth',
      adminUser.id,
      `Administrator ${adminUser.name} (${adminUser.role}) signed in successfully`,
      adminUser.email,
      req
    );

    res.json({
      success: true,
      token: sessionToken,
      mustChangePassword: !!adminUser.must_change_password,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        status: adminUser.status,
        mustChangePassword: !!adminUser.must_change_password,
      },
    });
  });

  app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ valid: false, error: 'No authorization token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const session = activeSessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      const user = db.admin_users.find((u) => u.id === session.userId);
      if (user && user.status === 'ACTIVE') {
        res.json({
          valid: true,
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            mustChangePassword: !!user.must_change_password,
          },
        });
        return;
      }
    }

    res.status(401).json({ valid: false, error: 'Unauthorized or expired session.' });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const session = activeSessions.get(token);
      if (session) {
        logAdminAction('Admin Logout', 'Auth', session.userId, `Administrator session signed out for ${session.email}`, session.email, req);
        activeSessions.delete(token);
        saveSessions(activeSessions);
      }
    }
    res.json({ success: true, message: 'Signed out successfully.' });
  });

  // ==========================================
  // ADMIN PROTECTED ROUTES & RBAC
  // ==========================================
  const adminRouter = express.Router();
  adminRouter.use(adminAuthMiddleware);

  // Admin Profile & Account Self-Management
  adminRouter.get('/profile', (req: AuthenticatedRequest, res) => {
    const user = db.admin_users.find((u) => u.id === req.adminUser?.id) || db.admin_users[0];
    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: !!user.must_change_password,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      created_by: user.created_by,
    });
  });

  adminRouter.put('/profile', (req: AuthenticatedRequest, res) => {
    const { name, email, username } = req.body;
    const user = db.admin_users.find((u) => u.id === req.adminUser?.id);
    if (!user) {
      res.status(404).json({ error: 'Administrator record not found.' });
      return;
    }

    if (email && email.includes('@')) {
      const conflict = db.admin_users.find((u) => u.id !== user.id && u.email.toLowerCase() === email.trim().toLowerCase());
      if (conflict) {
        res.status(400).json({ error: `Email address '${email.trim()}' is already in use by another administrator.` });
        return;
      }
      user.email = email.trim().toLowerCase();
    }

    if (username && username.trim().length > 0) {
      const conflict = db.admin_users.find((u) => u.id !== user.id && u.username.toLowerCase() === username.trim().toLowerCase());
      if (conflict) {
        res.status(400).json({ error: `Username '${username.trim()}' is already in use by another administrator.` });
        return;
      }
      user.username = username.trim().toLowerCase();
    }

    if (name && name.trim().length > 0) {
      user.name = name.trim();
    }

    user.updated_at = new Date().toISOString();
    saveDatabase(db);

    logAdminAction('Profile Updated', 'AdminUser', user.id, `Profile details updated for ${user.username}`, user.email, req);

    res.json({
      success: true,
      message: 'Admin profile updated successfully.',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: !!user.must_change_password,
      },
    });
  });

  adminRouter.post('/change-password', (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = db.admin_users.find((u) => u.id === req.adminUser?.id);
    if (!user) {
      res.status(404).json({ error: 'Administrator record not found.' });
      return;
    }

    // Require current password if not a first-time forced password change
    if (!user.must_change_password) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to set a new password.' });
        return;
      }
      const currentHash = hashPassword(currentPassword, user.salt);
      if (currentHash !== user.password_hash) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    user.salt = newSalt;
    user.password_hash = hashPassword(newPassword, newSalt);
    user.must_change_password = false;
    user.updated_at = new Date().toISOString();
    saveDatabase(db);

    // Update active session flag
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const session = activeSessions.get(token);
      if (session) {
        session.mustChangePassword = false;
      }
    }

    logAdminAction('Password Changed', 'AdminUser', user.id, `Password changed successfully for ${user.username}`, user.email, req);

    res.json({
      success: true,
      message: 'Password changed successfully! You can now use your updated password.',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        mustChangePassword: false,
      },
    });
  });

  // ==========================================
  // SUPER ADMIN ONLY: ADMINISTRATOR WHITELIST CRUD
  // ==========================================
  adminRouter.get('/admins', requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res) => {
    const sanitized = db.admin_users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      mustChangePassword: !!u.must_change_password,
      created_at: u.created_at,
      updated_at: u.updated_at,
      last_login_at: u.last_login_at,
      created_by: u.created_by,
    }));
    res.json(sanitized);
  });

  adminRouter.post('/admins', requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res) => {
    const { name, username, email, role, password, temporaryPassword, status } = req.body;
    const adminName = (name || '').trim();
    const adminUsername = (username || '').trim().toLowerCase();
    const adminEmail = (email || '').trim().toLowerCase();
    const adminRole: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' = ['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(role) ? role : 'ADMIN';
    const adminStatus: 'ACTIVE' | 'INACTIVE' | 'REVOKED' = ['ACTIVE', 'INACTIVE', 'REVOKED'].includes(status) ? status : 'ACTIVE';
    const rawPassword = (password || temporaryPassword || '').trim();

    if (!adminName || !adminUsername || !adminEmail) {
      res.status(400).json({ error: 'Full name, username, and official email are required to create an administrator account.' });
      return;
    }

    if (!adminEmail.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid institutional email address.' });
      return;
    }

    if (!rawPassword || rawPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters in length.' });
      return;
    }

    // Check duplicate username or email
    const existing = db.admin_users.find(
      (u) => u.username.toLowerCase() === adminUsername || u.email.toLowerCase() === adminEmail
    );
    if (existing) {
      res.status(400).json({ error: `An administrator with username '${adminUsername}' or email '${adminEmail}' already exists in the system.` });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const newAdmin: AdminUserRecord = {
      id: `usr-admin-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: adminName,
      username: adminUsername,
      email: adminEmail,
      password_hash: hashPassword(rawPassword, salt),
      salt,
      role: adminRole,
      status: adminStatus,
      must_change_password: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: req.adminUser?.email || 'Super Administrator',
    };

    db.admin_users.push(newAdmin);
    saveDatabase(db);

    logAdminAction(
      'Admin Created',
      'AdminUser',
      newAdmin.id,
      `Super Admin created ${newAdmin.role} account for ${newAdmin.name} (${newAdmin.email})`,
      req.adminUser?.email,
      req
    );

    res.status(201).json({
      success: true,
      message: `Administrator '${newAdmin.name}' successfully created.`,
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        status: newAdmin.status,
        mustChangePassword: false,
        created_at: newAdmin.created_at,
        updated_at: newAdmin.updated_at,
        created_by: newAdmin.created_by,
      },
    });
  });

  adminRouter.put('/admins/:id', requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    const userIndex = db.admin_users.findIndex((u) => u.id === targetId);
    if (userIndex === -1) {
      res.status(404).json({ error: 'Administrator not found.' });
      return;
    }

    const existingUser = db.admin_users[userIndex];
    const { name, username, email, role, status } = req.body;

    // Protect last active Super Admin
    if (existingUser.role === 'SUPER_ADMIN' && ((role && role !== 'SUPER_ADMIN') || (status && status !== 'ACTIVE'))) {
      const otherSuperAdmins = db.admin_users.filter((u) => u.id !== targetId && u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE');
      if (otherSuperAdmins.length === 0) {
        res.status(400).json({ error: 'Cannot deactivate, revoke, or demote the last remaining active Super Administrator.' });
        return;
      }
    }

    if (username && username.trim().toLowerCase() !== existingUser.username.toLowerCase()) {
      const conflict = db.admin_users.find((u) => u.id !== targetId && u.username.toLowerCase() === username.trim().toLowerCase());
      if (conflict) {
        res.status(400).json({ error: `Username '${username.trim()}' is already taken.` });
        return;
      }
      existingUser.username = username.trim().toLowerCase();
    }

    if (email && email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
      const conflict = db.admin_users.find((u) => u.id !== targetId && u.email.toLowerCase() === email.trim().toLowerCase());
      if (conflict) {
        res.status(400).json({ error: `Email '${email.trim()}' is already taken.` });
        return;
      }
      existingUser.email = email.trim().toLowerCase();
    }

    if (name && name.trim()) {
      existingUser.name = name.trim();
    }

    if (role && ['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(role)) {
      existingUser.role = role;
    }

    if (status && ['ACTIVE', 'INACTIVE', 'REVOKED'].includes(status)) {
      existingUser.status = status;
      if (status !== 'ACTIVE') {
        invalidateUserSessions(targetId);
      }
    }

    existingUser.updated_at = new Date().toISOString();
    saveDatabase(db);

    logAdminAction(
      'Admin Updated',
      'AdminUser',
      existingUser.id,
      `Super Admin updated admin ${existingUser.name} (Role: ${existingUser.role}, Status: ${existingUser.status})`,
      req.adminUser?.email,
      req
    );

    res.json({
      success: true,
      message: 'Administrator updated successfully.',
      admin: {
        id: existingUser.id,
        name: existingUser.name,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
        status: existingUser.status,
        mustChangePassword: false,
        created_at: existingUser.created_at,
        updated_at: existingUser.updated_at,
        last_login_at: existingUser.last_login_at,
        created_by: existingUser.created_by,
      },
    });
  });

  const handleAdminPasswordUpdate = (req: AuthenticatedRequest, res: any) => {
    const targetId = req.params.id;
    const user = db.admin_users.find((u) => u.id === targetId);
    if (!user) {
      res.status(404).json({ error: 'Administrator not found.' });
      return;
    }

    const { password, newPassword, temporaryPassword } = req.body;
    const chosenPass = (password || newPassword || temporaryPassword || '').trim();

    if (!chosenPass || chosenPass.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters in length.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.password_hash = hashPassword(chosenPass, salt);
    user.must_change_password = false;
    user.updated_at = new Date().toISOString();
    saveDatabase(db);

    // Invalidate any active session for this user so they must log in with new password
    invalidateUserSessions(targetId);

    logAdminAction(
      'Admin Password Updated',
      'AdminUser',
      user.id,
      `Super Admin set permanent password for ${user.username} (${user.email})`,
      req.adminUser?.email,
      req
    );

    res.json({
      success: true,
      message: `Permanent password updated successfully for administrator '${user.name}'.`,
    });
  };

  adminRouter.post('/admins/:id/password', requireRole('SUPER_ADMIN'), handleAdminPasswordUpdate);
  adminRouter.post('/admins/:id/reset-password', requireRole('SUPER_ADMIN'), handleAdminPasswordUpdate);

  adminRouter.post('/admins/:id/status', requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    const user = db.admin_users.find((u) => u.id === targetId);
    if (!user) {
      res.status(404).json({ error: 'Administrator not found.' });
      return;
    }

    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'REVOKED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Expected ACTIVE, INACTIVE, or REVOKED.' });
      return;
    }

    if (user.role === 'SUPER_ADMIN' && status !== 'ACTIVE') {
      const otherSuperAdmins = db.admin_users.filter((u) => u.id !== targetId && u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE');
      if (otherSuperAdmins.length === 0) {
        res.status(400).json({ error: 'Cannot change status of the only active Super Administrator.' });
        return;
      }
    }

    user.status = status;
    user.updated_at = new Date().toISOString();
    if (status !== 'ACTIVE') {
      invalidateUserSessions(targetId);
    }
    saveDatabase(db);

    logAdminAction(
      `Admin Status: ${status}`,
      'AdminUser',
      user.id,
      `Super Admin changed ${user.username} status to ${status}`,
      req.adminUser?.email,
      req
    );

    res.json({
      success: true,
      message: `Administrator status set to ${status}.`,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  });

  adminRouter.delete('/admins/:id', requireRole('SUPER_ADMIN'), (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    const user = db.admin_users.find((u) => u.id === targetId);
    if (!user) {
      res.status(404).json({ error: 'Administrator not found.' });
      return;
    }

    if (req.adminUser?.id === targetId) {
      res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
      return;
    }

    if (user.role === 'SUPER_ADMIN') {
      const otherSuperAdmins = db.admin_users.filter((u) => u.id !== targetId && u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE');
      if (otherSuperAdmins.length === 0) {
        res.status(400).json({ error: 'Cannot delete the only remaining active Super Administrator.' });
        return;
      }
    }

    db.admin_users = db.admin_users.filter((u) => u.id !== targetId);
    invalidateUserSessions(targetId);
    saveDatabase(db);

    logAdminAction(
      'Admin Deleted',
      'AdminUser',
      targetId,
      `Super Admin deleted administrator account ${user.name} (${user.email})`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: `Administrator ${user.name} removed from whitelist.` });
  });

  // Admin Overview (All authenticated roles)
  adminRouter.get('/overview', (req: AuthenticatedRequest, res) => {
    const upcomingEvents = db.events.filter((e) => e.status === 'Upcoming' || e.status === 'Registration Open').length;
    const completedEvents = db.events.filter((e) => e.status === 'Completed').length;
    res.json({
      total_events: db.events.length,
      upcoming_events: upcomingEvents,
      completed_events: completedEvents,
      total_announcements: db.announcements.length,
      total_applications: db.join_applications.length,
      new_applications: db.join_applications.filter((a) => a.status === 'New').length,
      total_registrations: db.registrations.length,
      total_projects: db.projects.length,
      total_team: db.team.length,
      total_achievements: db.achievements.length,
      total_gallery: db.gallery.length,
      total_admins: db.admin_users.length,
      unread_messages: db.messages.filter((m) => !m.is_read).length,
      recent_applications: db.join_applications.slice(0, 5),
      recent_registrations: db.registrations.slice(0, 5),
      recent_messages: db.messages.slice(0, 5),
    });
  });

  // Admin Events CRUD (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/events', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req: AuthenticatedRequest, res) => {
    const body = req.body;
    const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    let pType: ParticipationType = body.participation_type || 'SOLO';
    if (!['SOLO', 'DUO', 'TEAM'].includes(pType)) {
      pType = 'SOLO';
    }

    let minTeam = 1;
    let maxTeam = 1;
    if (pType === 'DUO') {
      minTeam = 2;
      maxTeam = 2;
    } else if (pType === 'TEAM') {
      minTeam = Math.max(2, Number(body.min_team_size) || 2);
      maxTeam = Math.max(minTeam, Number(body.max_team_size) || 4);
    }

    const newEvent: Event = {
      ...body,
      id: `evt-${Date.now()}`,
      slug,
      participation_type: pType,
      min_team_size: minTeam,
      max_team_size: maxTeam,
      current_participants: body.current_participants || 0,
      maximum_participants: Number(body.maximum_participants) || 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.events.unshift(newEvent);
    saveDatabase(db);

    logAdminAction(
      'Event Created',
      'Event',
      newEvent.id,
      `Created event "${newEvent.title}" (${pType} participation)`,
      req.adminUser?.email,
      req
    );

    res.status(201).json(newEvent);
  });

  adminRouter.put('/events/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req: AuthenticatedRequest, res) => {
    const index = db.events.findIndex((e) => e.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const body = req.body;
    let pType: ParticipationType = body.participation_type || db.events[index].participation_type || 'SOLO';
    if (!['SOLO', 'DUO', 'TEAM'].includes(pType)) {
      pType = 'SOLO';
    }

    let minTeam = 1;
    let maxTeam = 1;
    if (pType === 'DUO') {
      minTeam = 2;
      maxTeam = 2;
    } else if (pType === 'TEAM') {
      minTeam = Math.max(2, Number(body.min_team_size ?? db.events[index].min_team_size) || 2);
      maxTeam = Math.max(minTeam, Number(body.max_team_size ?? db.events[index].max_team_size) || 4);
    }

    db.events[index] = {
      ...db.events[index],
      ...body,
      participation_type: pType,
      min_team_size: minTeam,
      max_team_size: maxTeam,
      updated_at: new Date().toISOString(),
    };

    saveDatabase(db);

    logAdminAction(
      'Event Updated',
      'Event',
      db.events[index].id,
      `Updated event "${db.events[index].title}" (Status: ${db.events[index].status}, Type: ${pType})`,
      req.adminUser?.email,
      req
    );

    res.json(db.events[index]);
  });

  // Admin Get Event Registrations for Winner Selection
  adminRouter.get('/events/:id/registrations', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const event = db.events.find((e) => e.id === req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const regs = db.registrations.filter((r) => r.event_id === event.id && r.status !== 'Cancelled');
    res.json(regs);
  });

  // Admin Manage Event Winners (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.put('/events/:id/winners', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req: AuthenticatedRequest, res) => {
    const event = db.events.find((e) => e.id === req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const { winners, first_registration_id, second_registration_id, third_registration_id, results } = req.body;

    let finalWinners: EventWinner[] = [];

    if (Array.isArray(winners)) {
      // If direct array provided
      finalWinners = winners.filter((w) => w && w.name);
    } else {
      // If mapped by position registration IDs
      const positions = [
        { pos: '1st Place', id: first_registration_id },
        { pos: '2nd Place', id: second_registration_id },
        { pos: '3rd Place', id: third_registration_id },
      ];

      const selectedIds = positions.map((p) => p.id).filter(Boolean) as string[];
      // Validate uniqueness
      const uniqueIds = new Set(selectedIds);
      if (uniqueIds.size !== selectedIds.length) {
        res.status(400).json({ error: 'Cannot assign the same registration/team to multiple winner positions.' });
        return;
      }

      for (const p of positions) {
        if (!p.id) continue;
        const reg = db.registrations.find((r) => r.id === p.id && r.event_id === event.id);
        if (!reg) {
          res.status(400).json({ error: `Selected winner registration '${p.id}' does not belong to this event.` });
          return;
        }

        const memberNames = reg.team_members && reg.team_members.length > 0
          ? [reg.full_name, ...reg.team_members.map((m) => m.full_name)]
          : [reg.full_name];

        finalWinners.push({
          position: p.pos,
          registration_id: reg.id,
          name: reg.full_name,
          team_name: reg.team_name,
          members: memberNames,
          members_detail: reg.team_members,
        });
      }
    }

    event.winners = finalWinners;
    if (typeof results === 'string') {
      event.results = results;
    }
    event.updated_at = new Date().toISOString();
    saveDatabase(db);

    logAdminAction(
      'Winners Updated',
      'Event',
      event.id,
      `Published ${finalWinners.length} podium winners for event "${event.title}"`,
      req.adminUser?.email,
      req
    );

    res.json({
      success: true,
      message: `Winners successfully updated for "${event.title}".`,
      event,
    });
  });

  // Admin Remove a Specific Winner Position
  adminRouter.delete('/events/:id/winners/:position', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req: AuthenticatedRequest, res) => {
    const event = db.events.find((e) => e.id === req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const pos = decodeURIComponent(req.params.position).toLowerCase();
    if (pos === 'all') {
      event.winners = [];
    } else {
      event.winners = (event.winners || []).filter(
        (w) => !w.position.toLowerCase().includes(pos)
      );
    }
    event.updated_at = new Date().toISOString();
    saveDatabase(db);

    logAdminAction(
      'Winner Removed',
      'Event',
      event.id,
      `Removed winner position (${req.params.position}) for event "${event.title}"`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Winner position removed.', event });
  });

  adminRouter.delete('/events/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    db.events = db.events.filter((e) => e.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true, message: 'Event deleted' });
  });

  adminRouter.post('/events/:id/duplicate', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const original = db.events.find((e) => e.id === req.params.id);
    if (!original) {
      res.status(404).json({ error: 'Event to duplicate not found' });
      return;
    }
    const duplicated: Event = {
      ...original,
      id: `evt-${Date.now()}`,
      title: `${original.title} (Copy)`,
      slug: `${original.slug}-copy-${Date.now().toString().slice(-4)}`,
      current_participants: 0,
      winners: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.events.unshift(duplicated);
    saveDatabase(db);
    res.status(201).json(duplicated);
  });

  // Admin Announcements CRUD (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/announcements', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const body = req.body;
    const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newAnn: Announcement = {
      ...body,
      id: `ann-${Date.now()}`,
      slug,
      published_at: body.published_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.announcements.unshift(newAnn);
    saveDatabase(db);
    res.status(201).json(newAnn);
  });

  adminRouter.put('/announcements/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const index = db.announcements.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    db.announcements[index] = {
      ...db.announcements[index],
      ...req.body,
      updated_at: new Date().toISOString(),
    };
    saveDatabase(db);
    res.json(db.announcements[index]);
  });

  adminRouter.delete('/announcements/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    db.announcements = db.announcements.filter((a) => a.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true, message: 'Announcement deleted' });
  });

  // Admin Join Applications Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.get('/join-applications', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    res.json(Array.isArray(db.join_applications) ? db.join_applications : []);
  });

  adminRouter.patch('/join-applications/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const app = (db.join_applications || []).find((a) => a.id === req.params.id);
    if (!app) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    if (req.body.status) app.status = req.body.status;
    if (req.body.reviewer_notes) app.reviewer_notes = req.body.reviewer_notes;
    saveDatabase(db);
    res.json(app);
  });

  adminRouter.delete('/join-applications/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    db.join_applications = (db.join_applications || []).filter((a) => a.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin Registrations Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.get('/registrations', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const eventId = req.query.event_id as string;
    let list = Array.isArray(db.registrations) ? db.registrations : [];
    if (eventId) {
      list = list.filter((r) => r.event_id === eventId);
    }
    res.json(list);
  });

  adminRouter.patch('/registrations/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const reg = (db.registrations || []).find((r) => r.id === req.params.id);
    if (!reg) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }
    if (req.body.status) reg.status = req.body.status;
    saveDatabase(db);
    res.json(reg);
  });

  adminRouter.delete('/registrations/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    db.registrations = (db.registrations || []).filter((r) => r.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin Team Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/team', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const newMember: TeamMember = {
      ...req.body,
      id: `tm-${Date.now()}`,
      order: db.team.length + 1,
    };
    db.team.push(newMember);
    saveDatabase(db);
    res.status(201).json(newMember);
  });

  adminRouter.put('/team/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const index = db.team.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    db.team[index] = { ...db.team[index], ...req.body };
    saveDatabase(db);
    res.json(db.team[index]);
  });

  adminRouter.delete('/team/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    db.team = db.team.filter((t) => t.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin Projects Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/projects', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const slug = req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProj: Project = {
      ...req.body,
      id: `proj-${Date.now()}`,
      slug,
      date: req.body.date || new Date().toISOString().slice(0, 7),
    };
    db.projects.unshift(newProj);
    saveDatabase(db);
    res.status(201).json(newProj);
  });

  adminRouter.put('/projects/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const index = db.projects.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    db.projects[index] = { ...db.projects[index], ...req.body };
    saveDatabase(db);
    res.json(db.projects[index]);
  });

  adminRouter.delete('/projects/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    db.projects = db.projects.filter((p) => p.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin Achievements Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/achievements', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const newAch: Achievement = {
      ...req.body,
      id: `ach-${Date.now()}`,
    };
    db.achievements.unshift(newAch);
    saveDatabase(db);
    res.status(201).json(newAch);
  });

  adminRouter.put('/achievements/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const index = db.achievements.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Achievement not found' });
      return;
    }
    db.achievements[index] = { ...db.achievements[index], ...req.body };
    saveDatabase(db);
    res.json(db.achievements[index]);
  });

  adminRouter.delete('/achievements/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    db.achievements = db.achievements.filter((a) => a.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin Gallery Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/gallery', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const newGal: GalleryImage = {
      ...req.body,
      id: `gal-${Date.now()}`,
    };
    db.gallery.unshift(newGal);
    saveDatabase(db);
    res.status(201).json(newGal);
  });

  adminRouter.put('/gallery/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const index = db.gallery.findIndex((g) => g.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Gallery item not found' });
      return;
    }
    db.gallery[index] = { ...db.gallery[index], ...req.body };
    saveDatabase(db);
    res.json(db.gallery[index]);
  });

  adminRouter.delete('/gallery/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    db.gallery = db.gallery.filter((g) => g.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin Messages Management (SUPER_ADMIN, ADMIN)
  adminRouter.get('/messages', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    res.json(db.messages);
  });

  adminRouter.patch('/messages/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const msg = db.messages.find((m) => m.id === req.params.id);
    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    if (typeof req.body.is_read === 'boolean') msg.is_read = req.body.is_read;
    if (typeof req.body.responded === 'boolean') msg.responded = req.body.responded;
    saveDatabase(db);
    res.json(msg);
  });

  adminRouter.delete('/messages/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    db.messages = db.messages.filter((m) => m.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Admin Stats & Settings Update
  adminRouter.get('/community-impact', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const list = [...(db.community_impact_stats || INITIAL_COMMUNITY_IMPACT_STATS)].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
    res.json(list);
  });

  adminRouter.put('/community-impact/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res) => {
    const id = req.params.id;
    const { value, label, icon, active, order } = req.body;
    if (!db.community_impact_stats) {
      db.community_impact_stats = [...INITIAL_COMMUNITY_IMPACT_STATS];
    }
    const idx = db.community_impact_stats.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Community impact statistic not found' });
      return;
    }

    const cleanValue = typeof value === 'string' ? value.replace(/<[^>]*>?/gm, '').trim() : String(value || '').trim();
    const cleanLabel = typeof label === 'string' ? label.replace(/<[^>]*>?/gm, '').trim() : String(label || '').trim();
    const cleanIcon = typeof icon === 'string' ? icon.replace(/[^a-zA-Z0-9_-]/g, '').trim() : 'Users';

    if (!cleanValue) {
      res.status(400).json({ error: 'Statistic value is required.' });
      return;
    }
    if (!cleanLabel) {
      res.status(400).json({ error: 'Statistic label is required.' });
      return;
    }

    db.community_impact_stats[idx] = {
      ...db.community_impact_stats[idx],
      value: cleanValue,
      label: cleanLabel,
      icon: cleanIcon || 'Users',
      active: typeof active === 'boolean' ? active : true,
      order: typeof order === 'number' ? order : db.community_impact_stats[idx].order,
      updated_at: new Date().toISOString(),
      updated_by: req.adminUser?.name || req.adminUser?.email || 'Administrator',
    };

    saveDatabase(db);

    logAdminAction(
      'Update Community Impact Stat',
      'CommunityImpactStat',
      id,
      `Updated stat ${cleanLabel}: ${cleanValue} (active: ${active !== false})`,
      req.adminUser?.email,
      req
    );

    res.json(db.community_impact_stats[idx]);
  });

  adminRouter.put('/community-impact', requireRole('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res) => {
    const statsArray = req.body;
    if (!Array.isArray(statsArray)) {
      res.status(400).json({ error: 'Expected an array of community impact stats.' });
      return;
    }

    const sanitized = statsArray.map((item, idx) => {
      const cleanValue = typeof item.value === 'string' ? item.value.replace(/<[^>]*>?/gm, '').trim() : String(item.value || '').trim();
      const cleanLabel = typeof item.label === 'string' ? item.label.replace(/<[^>]*>?/gm, '').trim() : String(item.label || '').trim();
      const cleanIcon = typeof item.icon === 'string' ? item.icon.replace(/[^a-zA-Z0-9_-]/g, '').trim() : 'Users';
      return {
        id: item.id || `stat-${Date.now()}-${idx}`,
        value: cleanValue || '0',
        label: cleanLabel || 'STATISTIC',
        icon: cleanIcon || 'Users',
        active: typeof item.active === 'boolean' ? item.active : true,
        order: typeof item.order === 'number' ? item.order : idx + 1,
        updated_at: new Date().toISOString(),
        updated_by: req.adminUser?.name || req.adminUser?.email || 'Administrator',
      };
    });

    db.community_impact_stats = sanitized;
    saveDatabase(db);

    logAdminAction(
      'Update All Community Impact Stats',
      'CommunityImpactStat',
      'all',
      `Saved ${sanitized.length} community impact stats`,
      req.adminUser?.email,
      req
    );

    res.json(db.community_impact_stats);
  });

  adminRouter.post('/community-impact', requireRole('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res) => {
    const { value, label, icon, active, order } = req.body;
    if (!db.community_impact_stats) {
      db.community_impact_stats = [...INITIAL_COMMUNITY_IMPACT_STATS];
    }

    const cleanValue = typeof value === 'string' ? value.replace(/<[^>]*>?/gm, '').trim() : String(value || '').trim();
    const cleanLabel = typeof label === 'string' ? label.replace(/<[^>]*>?/gm, '').trim() : String(label || '').trim();
    const cleanIcon = typeof icon === 'string' ? icon.replace(/[^a-zA-Z0-9_-]/g, '').trim() : 'Users';

    if (!cleanValue || !cleanLabel) {
      res.status(400).json({ error: 'Value and Label are required.' });
      return;
    }

    const newStat: CommunityImpactStat = {
      id: `stat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      value: cleanValue,
      label: cleanLabel,
      icon: cleanIcon || 'Users',
      active: typeof active === 'boolean' ? active : true,
      order: typeof order === 'number' ? order : db.community_impact_stats.length + 1,
      updated_at: new Date().toISOString(),
      updated_by: req.adminUser?.name || req.adminUser?.email || 'Administrator',
    };

    db.community_impact_stats.push(newStat);
    saveDatabase(db);

    logAdminAction(
      'Create Community Impact Stat',
      'CommunityImpactStat',
      newStat.id,
      `Created stat ${newStat.label} (${newStat.value})`,
      req.adminUser?.email,
      req
    );

    res.status(201).json(newStat);
  });

  adminRouter.delete('/community-impact/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res) => {
    const id = req.params.id;
    if (!db.community_impact_stats) {
      db.community_impact_stats = [...INITIAL_COMMUNITY_IMPACT_STATS];
    }
    const idx = db.community_impact_stats.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Statistic not found.' });
      return;
    }
    const deleted = db.community_impact_stats.splice(idx, 1)[0];
    saveDatabase(db);

    logAdminAction(
      'Delete Community Impact Stat',
      'CommunityImpactStat',
      id,
      `Deleted stat ${deleted.label}`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Statistic removed.' });
  });

  // Admin Legacy Stats & Settings Update
  adminRouter.put('/stats', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    db.stats = { ...db.stats, ...req.body };
    saveDatabase(db);
    res.json(db.stats);
  });

  adminRouter.put('/settings', requireRole('SUPER_ADMIN'), (req, res) => {
    db.settings = { ...db.settings, ...req.body };
    saveDatabase(db);
    res.json(db.settings);
  });

  // ==========================================
  // ADMIN CERTIFICATES MANAGEMENT (SUPER_ADMIN, ADMIN)
  // ==========================================
  adminRouter.get('/certificates', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    res.json(db.certificates);
  });

  adminRouter.post('/certificates', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const body = req.body;
    const certCode = body.certificate_code || `IZ-2026-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCert: Certificate = {
      id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      certificate_code: certCode,
      student_name: (body.student_name || '').trim(),
      student_email: (body.student_email || '').trim().toLowerCase(),
      student_roll_no: (body.student_roll_no || '').trim().toUpperCase(),
      department: (body.department || 'CSE (AIML)').trim(),
      college_name: body.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      event_id: body.event_id,
      event_title: (body.event_title || '').trim(),
      certificate_type: body.certificate_type || 'Participation',
      issue_date: body.issue_date || new Date().toISOString().slice(0, 10),
      issued_by: body.issued_by || 'Department of CSE (AIML) & AI',
      designation: body.designation || 'Faculty Coordinator & President',
      is_valid: body.is_valid !== false,
      notes: body.notes || '',
      created_at: new Date().toISOString(),
    };

    db.certificates.unshift(newCert);
    saveDatabase(db);
    res.status(201).json(newCert);
  });

  adminRouter.post('/certificates/batch', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const { event_id, event_title, certificate_type, issue_date, issued_by, designation, students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: 'Students array is required for batch certificate generation.' });
      return;
    }

    const created: Certificate[] = [];
    for (const student of students) {
      const certCode = `IZ-2026-${(event_title || 'EVT').slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const cert: Certificate = {
        id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        certificate_code: certCode,
        student_name: (student.student_name || student.name || student.full_name || '').trim(),
        student_email: (student.student_email || student.email || '').trim().toLowerCase(),
        student_roll_no: (student.student_roll_no || student.roll_number || '').trim().toUpperCase(),
        department: (student.department || 'CSE (AIML)').trim(),
        college_name: student.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
        event_id,
        event_title: event_title || 'IntelliGenZ AI Workshop',
        certificate_type: certificate_type || 'Participation',
        issue_date: issue_date || new Date().toISOString().slice(0, 10),
        issued_by: issued_by || 'Department of CSE (AIML) & AI',
        designation: designation || 'Faculty Coordinator & President',
        is_valid: true,
        notes: student.notes || 'Awarded for active participation and project completion.',
        created_at: new Date().toISOString(),
      };
      db.certificates.unshift(cert);
      created.push(cert);
    }

    saveDatabase(db);
    res.status(201).json({
      success: true,
      message: `Successfully generated and issued ${created.length} certificates.`,
      certificates: created,
    });
  });

  adminRouter.put('/certificates/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const index = db.certificates.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Certificate not found' });
      return;
    }
    db.certificates[index] = { ...db.certificates[index], ...req.body };
    saveDatabase(db);
    res.json(db.certificates[index]);
  });

  adminRouter.delete('/certificates/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    db.certificates = db.certificates.filter((c) => c.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true, message: 'Certificate revoked and deleted' });
  });

  // ==========================================
  // ADMIN ATTENDANCE / EVENT CHECK-IN (SUPER_ADMIN, ADMIN)
  // ==========================================
  adminRouter.get('/checkins', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const eventId = req.query.event_id as string;
    let list = db.checkins;
    if (eventId) {
      list = list.filter((c) => c.event_id === eventId);
    }
    res.json(list);
  });

  adminRouter.post('/checkin', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const { code, event_id, registration_id, roll_number, email, method } = req.body;
    const queryTerm = (code || roll_number || email || registration_id || '').trim().toLowerCase();

    if (!queryTerm) {
      res.status(400).json({ error: 'Please provide ticket code, roll number, email, or registration ID to check-in.' });
      return;
    }

    // Find registration
    const reg = db.registrations.find(
      (r) =>
        (!event_id || r.event_id === event_id) &&
        (r.id.toLowerCase() === queryTerm ||
          r.roll_number.toLowerCase() === queryTerm ||
          r.email.toLowerCase() === queryTerm ||
          `TKT-${r.id.slice(-6)}`.toLowerCase() === queryTerm)
    );

    if (!reg) {
      res.status(404).json({
        error: 'No matching event registration found. Please check ticket credentials or register on the spot.',
      });
      return;
    }

    const event = db.events.find((e) => e.id === reg.event_id);

    // Check duplicate checkin
    const alreadyCheckedIn = db.checkins.find(
      (c) => c.registration_id === reg.id || (c.event_id === reg.event_id && c.roll_number.toUpperCase() === reg.roll_number.toUpperCase())
    );

    if (alreadyCheckedIn) {
      res.status(409).json({
        error: `Participant ${reg.full_name} (${reg.roll_number}) was already checked in at ${new Date(alreadyCheckedIn.checked_in_at).toLocaleTimeString()}.`,
        record: alreadyCheckedIn,
      });
      return;
    }

    const checkinRecord: AttendanceRecord = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      registration_id: reg.id,
      event_id: reg.event_id,
      event_title: event?.title || reg.event_title || 'IntelliGenZ Event',
      participant_name: reg.full_name,
      roll_number: reg.roll_number,
      email: reg.email,
      department: reg.department,
      checked_in_at: new Date().toISOString(),
      checkin_method: method || 'Code Entry',
    };

    db.checkins.unshift(checkinRecord);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: `Verified & Checked-in: ${reg.full_name} (${reg.roll_number})`,
      record: checkinRecord,
    });
  });

  adminRouter.delete('/checkins/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    db.checkins = db.checkins.filter((c) => c.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true, message: 'Check-in record removed' });
  });

  // ==========================================
  // ADMIN NEWSLETTER & BROADCASTS (SUPER_ADMIN, ADMIN)
  // ==========================================
  adminRouter.get('/newsletter/subscribers', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    res.json(db.newsletter_subscribers);
  });

  adminRouter.delete('/newsletter/subscribers/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    db.newsletter_subscribers = db.newsletter_subscribers.filter((s) => s.id !== req.params.id);
    saveDatabase(db);
    res.json({ success: true });
  });

  adminRouter.get('/newsletter/broadcasts', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    res.json(db.newsletter_broadcasts);
  });

  adminRouter.post('/newsletter/broadcast', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const { subject, message, target } = req.body;
    if (!subject || !message) {
      res.status(400).json({ error: 'Subject and message are required for newsletter broadcast.' });
      return;
    }

    const activeCount = db.newsletter_subscribers.filter((s) => s.status === 'Active').length;

    const broadcast: NewsletterBroadcast = {
      id: `bc-${Date.now()}`,
      subject: subject.trim(),
      message: message.trim(),
      target: target || 'All Subscribers',
      sent_at: new Date().toISOString(),
      recipient_count: activeCount,
    };

    db.newsletter_broadcasts.unshift(broadcast);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: `Broadcast successfully queued and dispatched to ${activeCount} active subscribers.`,
      broadcast,
    });
  });

  // ==========================================
  // ADMIN LEARNING RESOURCES (SUPER_ADMIN, ADMIN, EDITOR)
  // ==========================================
  adminRouter.post('/resources', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newRes: LearningResource = {
      ...req.body,
      id: `res-${Date.now()}`,
      slug,
      created_at: new Date().toISOString(),
    };
    db.resources.unshift(newRes);
    saveDatabase(db);
    res.status(201).json(newRes);
  });

  adminRouter.put('/resources/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const index = db.resources.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    db.resources[index] = { ...db.resources[index], ...req.body };
    saveDatabase(db);
    res.json(db.resources[index]);
  });

  adminRouter.delete('/resources/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const item = db.resources.find((r) => r.id === req.params.id);
    db.resources = db.resources.filter((r) => r.id !== req.params.id);
    saveDatabase(db);
    logAdminAction('Delete Resource', 'Resource', req.params.id, `Deleted learning resource: ${item?.title || req.params.id}`, undefined, req);
    res.json({ success: true });
  });

  // ==========================================
  // ADMIN AUDIT LOGS (SUPER_ADMIN, ADMIN)
  // ==========================================
  // IMAGE UPLOAD SYSTEM (50 MB Persistent Storage)
  // ==========================================
  adminRouter.post('/uploads/image', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { filename, data, contentType, category } = req.body;
      if (!data || typeof data !== 'string') {
        res.status(400).json({ error: 'Image data payload is required.' });
        return;
      }

      // Parse base64 data
      const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let mimeType = (contentType || '').toLowerCase();
      let base64Data = data;

      if (matches && matches.length === 3) {
        mimeType = matches[1].toLowerCase();
        base64Data = matches[2];
      }

      const buffer = Buffer.from(base64Data, 'base64');

      // Maximum 50 MB limit
      const MAX_SIZE_BYTES = 50 * 1024 * 1024;
      if (buffer.length > MAX_SIZE_BYTES) {
        res.status(400).json({ error: 'Image size must be 50 MB or less.' });
        return;
      }

      if (buffer.length === 0) {
        res.status(400).json({ error: 'Uploaded file is empty.' });
        return;
      }

      // Magic byte verification for secure content inspection (JPEG, PNG, WEBP)
      let extension = '';
      let verifiedMime = '';

      const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng =
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a;
      const isWebp =
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50;

      if (isJpeg) {
        extension = 'jpg';
        verifiedMime = 'image/jpeg';
      } else if (isPng) {
        extension = 'png';
        verifiedMime = 'image/png';
      } else if (isWebp) {
        extension = 'webp';
        verifiedMime = 'image/webp';
      } else {
        res.status(400).json({ error: 'Please upload a JPG, JPEG, PNG, or WEBP image.' });
        return;
      }

      // Safe randomized filename (prevents directory traversal and collisions)
      const safeId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      const prefix = category && /^[a-z0-9_-]+$/i.test(category) ? `${category}-` : 'img-';
      const safeFilename = `${prefix}${safeId}.${extension}`;
      const targetFilePath = path.join(UPLOADS_DIR, safeFilename);

      // Write binary file to persistent uploads directory
      fs.writeFileSync(targetFilePath, buffer);

      // Log in admin audit logs
      logAdminAction(
        'Image Upload',
        'Uploads',
        safeFilename,
        `Uploaded image '${path.basename(filename || safeFilename)}' (${(buffer.length / (1024 * 1024)).toFixed(2)} MB, ${verifiedMime})`,
        req.adminUser?.email || 'admin@drkvsrit.ac.in',
        req
      );

      const publicUrl = `/uploads/${safeFilename}`;
      res.status(201).json({
        success: true,
        url: publicUrl,
        filename: safeFilename,
        original_name: path.basename(filename || 'image'),
        size: buffer.length,
        mime_type: verifiedMime,
      });
    } catch (err: any) {
      console.error('Image upload failed:', err);
      res.status(500).json({ error: 'Image upload failed. Please try again.' });
    }
  });

  // ==========================================
  // AUDIT LOGS (SUPER_ADMIN, ADMIN)
  // ==========================================
  adminRouter.get('/audit-logs', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    res.json(db.audit_logs || []);
  });

  // ==========================================
  // ADMIN DATABASE BACKUP & RESTORE (SUPER_ADMIN ONLY)
  // ==========================================
  adminRouter.get('/backup/export', requireRole('SUPER_ADMIN'), (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.json`;
    const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

    // Sanitize internal password hashes and salts in the export for security
    const exportableDb = {
      ...db,
      admin_users: db.admin_users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        created_at: u.created_at,
        updated_at: u.updated_at,
        last_login_at: u.last_login_at,
        created_by: u.created_by,
      })),
      exported_at: new Date().toISOString(),
      institution: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      club: 'INTELLIGENZ Club - Dept of CSE (AIML) & AI',
    };

    // Save persistent backup snapshot in backups directory
    try {
      fs.writeFileSync(backupFilePath, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write backup snapshot file:', err);
    }

    logAdminAction('Database Backup Export', 'Database', 'all', `Database backup exported (${backupFileName})`, undefined, req);
    res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportableDb);
  });

  adminRouter.post('/backup/restore', requireRole('SUPER_ADMIN'), (req, res) => {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      res.status(400).json({ error: 'Invalid backup payload. Expected a valid JSON database schema.' });
      return;
    }

    // Preserve existing admin accounts to prevent admin lockouts
    const existingAdminUsers = db.admin_users;

    db = {
      settings: backupData.settings || db.settings,
      stats: backupData.stats || db.stats,
      events: Array.isArray(backupData.events) ? backupData.events : db.events,
      announcements: Array.isArray(backupData.announcements) ? backupData.announcements : db.announcements,
      team: Array.isArray(backupData.team) ? backupData.team : db.team,
      projects: Array.isArray(backupData.projects) ? backupData.projects : db.projects,
      achievements: Array.isArray(backupData.achievements) ? backupData.achievements : db.achievements,
      gallery: Array.isArray(backupData.gallery) ? backupData.gallery : db.gallery,
      join_applications: Array.isArray(backupData.join_applications) ? backupData.join_applications : db.join_applications,
      registrations: Array.isArray(backupData.registrations) ? backupData.registrations : db.registrations,
      messages: Array.isArray(backupData.messages) ? backupData.messages : db.messages,
      admin_users: existingAdminUsers,
      certificates: Array.isArray(backupData.certificates) ? backupData.certificates : db.certificates,
      newsletter_subscribers: Array.isArray(backupData.newsletter_subscribers) ? backupData.newsletter_subscribers : db.newsletter_subscribers,
      newsletter_broadcasts: Array.isArray(backupData.newsletter_broadcasts) ? backupData.newsletter_broadcasts : db.newsletter_broadcasts,
      resources: Array.isArray(backupData.resources) ? backupData.resources : db.resources,
      checkins: Array.isArray(backupData.checkins) ? backupData.checkins : db.checkins,
      audit_logs: Array.isArray(backupData.audit_logs) ? backupData.audit_logs : db.audit_logs,
    };

    saveDatabase(db);
    logAdminAction('Database Restored', 'Database', 'all', 'Database successfully restored from admin backup snapshot', undefined, req);

    res.json({
      success: true,
      message: 'Database successfully restored from backup snapshot.',
      stats: {
        events: db.events.length,
        registrations: db.registrations.length,
        certificates: db.certificates.length,
        applications: db.join_applications.length,
        announcements: db.announcements.length,
      },
    });
  });

  // Mount Admin Router
  app.use('/api/admin', adminRouter);


  // PostgreSQL / Supabase Schema Exporter
  app.get('/api/export-supabase-sql', (req, res) => {
    const sql = `
-- ====================================================================
-- INTELLIGENZ CLUB - PRODUCTION SUPABASE / POSTGRESQL SCHEMA
-- Official Technical Club of Department of CSE (AIML) & AI
-- DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
-- ====================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  registration_url TEXT,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  maximum_participants INTEGER DEFAULT 100,
  current_participants INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Upcoming',
  featured BOOLEAN DEFAULT false,
  highlights JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  results TEXT,
  winners JSONB DEFAULT '[]'::jsonb,
  certificates_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for performance (500+ concurrent visitors)
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_featured ON public.events(featured);

-- 3. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON public.announcements(published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_slug ON public.announcements(slug);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.announcements(category);

-- 4. Join Applications Table
CREATE TABLE IF NOT EXISTS public.join_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  agreed_updates BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'New',
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_join_email ON public.join_applications(LOWER(college_email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_join_roll ON public.join_applications(UPPER(roll_number));
CREATE INDEX IF NOT EXISTS idx_join_status ON public.join_applications(status);

-- 5. Event Registrations Table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT NOT NULL,
  year TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  status TEXT DEFAULT 'Confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_event_registration UNIQUE(event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_reg_event ON public.event_registrations(event_id);

-- 6. Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  category TEXT NOT NULL,
  bio TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  linkedin TEXT,
  github TEXT,
  email TEXT,
  featured BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- 7. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
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

-- 8. Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  award_rank TEXT,
  organization TEXT NOT NULL,
  members JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  featured BOOLEAN DEFAULT false,
  proof_link TEXT
);

-- 9. Gallery Images Table
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  album TEXT NOT NULL,
  event_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  date DATE NOT NULL,
  featured BOOLEAN DEFAULT false
);

-- 10. Contact Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  responded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Read policies for public tables
CREATE POLICY "Allow public read on events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public read on announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow public read on team" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Allow public read on projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public read on achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Allow public read on gallery" ON public.gallery_images FOR SELECT USING (true);

-- Insert policies for public submissions
CREATE POLICY "Allow public join application submit" ON public.join_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public event registration" ON public.event_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public contact message submit" ON public.contact_messages FOR INSERT WITH CHECK (true);
`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(sql);
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ INTELLIGENZ Club Server running on port ${PORT} [http://0.0.0.0:${PORT}]`);
    console.log(`🏛️ Institution: DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY`);
    console.log(`🤖 Department: Department of CSE (AIML) & AI`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
