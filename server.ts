import path from 'path';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (fs.existsSync(path.resolve(process.cwd(), '.env.example'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.example') });
}

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import {
  INITIAL_SETTINGS,
  INITIAL_STATS,
  INITIAL_COMMUNITY_IMPACT_STATS,
  INITIAL_EVENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_TEAM,
  INITIAL_PROJECTS,
  INITIAL_GALLERY,
  INITIAL_CERTIFICATES,
  INITIAL_SUBSCRIBERS,
} from './src/data/initialData';
import {
  Event,
  Announcement,
  TeamMember,
  Project,
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
  gallery: GalleryImage[];
  join_applications: JoinApplication[];
  registrations: EventRegistration[];
  messages: ContactMessage[];
  admin_users: AdminUserRecord[];
  certificates: Certificate[];
  newsletter_subscribers: NewsletterSubscriber[];
  newsletter_broadcasts: NewsletterBroadcast[];
  checkins: AttendanceRecord[];
  audit_logs: AuditLog[];
}

const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const SEED_DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Ensure data, backup, and uploads directories exist safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn('[Filesystem Notice] Notice on directory initialization:', err?.message);
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

    let dbFilePathToRead = '';
    if (fs.existsSync(DB_FILE)) {
      dbFilePathToRead = DB_FILE;
    } else if (fs.existsSync(SEED_DB_FILE)) {
      dbFilePathToRead = SEED_DB_FILE;
    }

    if (dbFilePathToRead) {
      const data = fs.readFileSync(dbFilePathToRead, 'utf-8');
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
        gallery: parsed.gallery || INITIAL_GALLERY,
        join_applications: parsed.join_applications || [],
        registrations: (parsed.registrations || []).map((r: any) => {
          const ticketCode = r.ticket_code || `TKT-${r.id.slice(-6).toUpperCase()}`;
          const qrToken = r.qr_token || `qrat_${r.id.replace(/^reg-/, '').replace(/[^a-zA-Z0-9]/g, '')}_${ticketCode.replace(/^TKT-/, '')}`.toLowerCase();
          const qrPayload = r.qr_payload || `ATTENDANCE:${qrToken}`;
          return {
            ...r,
            roll_number: (r.roll_number || '').trim().toUpperCase(),
            team_members: Array.isArray(r.team_members)
              ? r.team_members.map((m: any) => ({
                  ...m,
                  roll_number: (m.roll_number || '').trim().toUpperCase(),
                }))
              : r.team_members,
            ticket_code: ticketCode,
            qr_token: qrToken,
            qr_payload: qrPayload,
          };
        }),
        messages: parsed.messages || [],
        admin_users: adminUsers,
        certificates: parsed.certificates || INITIAL_CERTIFICATES,
        newsletter_subscribers: parsed.newsletter_subscribers || INITIAL_SUBSCRIBERS,
        newsletter_broadcasts: parsed.newsletter_broadcasts || [],
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
    gallery: INITIAL_GALLERY,
    join_applications: [],
    registrations: [],
    messages: [],
    admin_users: [createBootstrapSuperAdmin()],
    certificates: INITIAL_CERTIFICATES,
    newsletter_subscribers: INITIAL_SUBSCRIBERS,
    newsletter_broadcasts: [],
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
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Database Notice] Warning writing to database file (in-memory state maintained):', err?.message);
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

// ============================================================================
// AUTOMATED EVENT-PASS EMAIL SYSTEM (BACKEND & SECURE SMTP TRANSPORT)
// ============================================================================
const sentPassEmailRegistrations = new Set<string>();

function sanitizeSmtpError(err: any): string {
  if (!err) return 'Unknown SMTP error';
  let msg = typeof err === 'string' ? err : err.message || 'SMTP connection failed';
  const rawPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
  if (rawPass && rawPass.length > 2) {
    msg = msg.split(rawPass).join('********');
    const stripped = rawPass.replace(/\s+/g, '');
    if (stripped.length > 2) {
      msg = msg.split(stripped).join('********');
    }
  }
  return msg;
}

function getEmailTransporter() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = (process.env.SMTP_USER || 'intelligenz@drkvsrit.ac.in').trim();
  const rawPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
  // Strip whitespace from Google App Passwords (e.g., "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  const pass = rawPass.replace(/\s+/g, '');

  // Support explicit SMTP_SECURE flag or infer true for port 465 SSL
  const isSecureEnv = process.env.SMTP_SECURE !== undefined && process.env.SMTP_SECURE !== '';
  const secure = isSecureEnv ? process.env.SMTP_SECURE === 'true' : port === 465;

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: true,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    return {
      transporter,
      isLiveSmtp: true,
      hasCredentials: true,
      providerInfo: `Live SMTP (${host}:${port}${secure ? ' SSL' : ' STARTTLS'})`,
      host,
      port,
      secure,
      user,
    };
  }

  // If host and user exist but no password or pass is empty
  if (host && user) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: pass || '',
      },
      tls: {
        rejectUnauthorized: true,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    return {
      transporter,
      isLiveSmtp: true,
      hasCredentials: false,
      providerInfo: `Live SMTP (${host}:${port}${secure ? ' SSL' : ' STARTTLS'})`,
      host,
      port,
      secure,
      user,
    };
  }

  // Resilient fallback transporter for dev/preview environments without active SMTP credentials
  return {
    transporter: nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
    }),
    isLiveSmtp: false,
    hasCredentials: false,
    providerInfo: 'Dev Stream Transport (configure SMTP_PASS in environment variables for live SMTP)',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: 'intelligenz@drkvsrit.ac.in',
  };
}

async function generateEventPassPdf(
  event: Event,
  reg: EventRegistration,
  settings: SiteSettings
): Promise<Buffer> {
  const qrPayload =
    reg.qr_payload || (reg.qr_token ? `ATTENDANCE:${reg.qr_token}` : `ATTENDANCE:${reg.id}`);
  const qrBuffer = await QRCode.toBuffer(qrPayload, {
    width: 260,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const ticketCode = reg.ticket_code || `TKT-${reg.id.slice(-6).toUpperCase()}`;
    const displayRoll = (reg.roll_number || '').trim().toUpperCase();
    const clubName = settings.club_name || 'INTELLIGENZ CLUB';
    const collegeName =
      settings.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY';
    const deptName = settings.department_name || 'Department of CSE (AIML) & AI';

    const cardX = 55;
    const cardY = 45;
    const cardW = 485;
    const cardH = 690;

    // Outer card container
    doc.roundedRect(cardX, cardY, cardW, cardH, 12).lineWidth(1.5).strokeColor('#1A1C23').stroke();
    doc.roundedRect(cardX, cardY, cardW, 100, 12).fillColor('#0D1017').fill();
    doc.rect(cardX, cardY + 80, cardW, 20).fillColor('#0D1017').fill();

    // Club branding
    doc
      .fillColor('#00E5FF')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(clubName, cardX, cardY + 18, { align: 'center', width: cardW });
    doc
      .fillColor('#9CA3AF')
      .font('Helvetica')
      .fontSize(9)
      .text(collegeName, cardX, cardY + 42, { align: 'center', width: cardW });
    doc
      .fillColor('#00E5FF')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(deptName, cardX, cardY + 56, { align: 'center', width: cardW });

    // Ticket Code Badge
    const badgeW = 160;
    const badgeH = 22;
    const badgeX = cardX + (cardW - badgeW) / 2;
    const badgeY = cardY + 74;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4).fillColor('#000000').fill();
    doc
      .fillColor('#00E5FF')
      .font('Courier-Bold')
      .fontSize(11)
      .text(ticketCode, badgeX, badgeY + 6, { align: 'center', width: badgeW });

    // Event Title
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(event.title, cardX + 24, cardY + 116, { align: 'center', width: cardW - 48 });

    // Event Date, Time, Venue
    const metaText = `${event.date} • ${event.start_time || 'TBA'}${
      event.end_time ? ` - ${event.end_time}` : ''
    }\nVenue: ${event.venue || 'Campus Auditorium & AI Lab'}`;
    doc
      .fillColor('#4B5563')
      .font('Helvetica')
      .fontSize(10)
      .text(metaText, cardX + 24, cardY + 152, { align: 'center', width: cardW - 48, lineGap: 3 });

    // Divider line
    doc
      .moveTo(cardX + 24, cardY + 195)
      .lineTo(cardX + cardW - 24, cardY + 195)
      .lineWidth(1)
      .dash(4, { space: 4 })
      .strokeColor('#D1D5DB')
      .stroke()
      .undash();

    // QR Code Frame
    const qrSize = 160;
    const qrX = cardX + (cardW - qrSize) / 2;
    const qrY = cardY + 208;
    doc
      .roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 8)
      .lineWidth(1)
      .strokeColor('#E5E7EB')
      .fillColor('#FFFFFF')
      .fillAndStroke();
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    // Details Box
    const boxY = cardY + 400;
    const boxX = cardX + 24;
    const boxW = cardW - 48;
    doc
      .roundedRect(boxX, boxY, boxW, 160, 6)
      .lineWidth(1)
      .strokeColor('#E5E7EB')
      .fillColor('#F9FAFB')
      .fillAndStroke();

    const participantStr =
      reg.participation_type !== 'SOLO' && reg.team_name
        ? `${reg.full_name} (Team: ${reg.team_name})`
        : reg.full_name;

    const rows = [
      ['Participant:', participantStr],
      ['Roll Number:', displayRoll],
      ['Department:', `${reg.department} (${reg.year})`],
      ['Pass Status:', `${reg.status} (Eligible for Check-In)`],
      ['Registration ID:', reg.id],
    ];

    let rowY = boxY + 12;
    for (const [label, val] of rows) {
      doc.fillColor('#6B7280').font('Helvetica-Bold').fontSize(9.5).text(label, boxX + 16, rowY, { width: 120 });
      const valColor =
        label === 'Pass Status:' ? '#059669' : label === 'Roll Number:' ? '#0284C7' : '#111827';
      const valFont =
        label === 'Roll Number:' || label === 'Registration ID:' ? 'Courier-Bold' : 'Helvetica-Bold';
      doc
        .fillColor(valColor)
        .font(valFont)
        .fontSize(label === 'Roll Number:' ? 10.5 : 9.5)
        .text(val, boxX + 140, rowY, { width: boxW - 156 });
      rowY += 28;
    }

    // Check-in instructions
    doc
      .fillColor('#059669')
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text('✓ Scan at event entrance for instant automated check-in', cardX, cardY + 586, {
        align: 'center',
        width: cardW,
      });
    doc
      .fillColor('#9CA3AF')
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        'Please carry this pass digitally or printed. Roll number must match your college ID card.',
        cardX,
        cardY + 606,
        { align: 'center', width: cardW }
      );

    // Bottom branding
    doc
      .fillColor('#6B7280')
      .font('Helvetica')
      .fontSize(8)
      .text(`Issued by ${clubName} • ${deptName}`, cardX, cardY + 645, {
        align: 'center',
        width: cardW,
      });

    doc.end();
  });
}

async function sendEventPassEmail(
  event: Event,
  reg: EventRegistration,
  settings: SiteSettings,
  targetEmailOverride?: string
): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const recipient = (targetEmailOverride || reg.email || '').trim();
  if (!recipient || !recipient.includes('@')) {
    return { success: false, error: 'Valid recipient email address is required.' };
  }

  // Duplicate email prevention for the registration
  const regKey = `${reg.id}_pass_email`;
  if (!targetEmailOverride && (sentPassEmailRegistrations.has(regKey) || reg.email_status === 'sent')) {
    console.log(`[Email] Pass email already dispatched for registration ${reg.id}. Skipping duplicate send.`);
    return { success: true, messageId: 'already_sent' };
  }

  const { transporter, isLiveSmtp, providerInfo } = getEmailTransporter();
  const ticketCode = reg.ticket_code || `TKT-${reg.id.slice(-6).toUpperCase()}`;
  const qrPayload =
    reg.qr_payload || (reg.qr_token ? `ATTENDANCE:${reg.qr_token}` : `ATTENDANCE:${reg.id}`);
  const displayRoll = (reg.roll_number || '').trim().toUpperCase();

  const qrPngBuffer = await QRCode.toBuffer(qrPayload, {
    width: 280,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });

  const pdfBuffer = await generateEventPassPdf(event, reg, settings);

  const clubName = settings.club_name || 'IntelliGenZ Club';
  const deptName = settings.department_name || 'Department of CSE (AIML) & AI';
  const collegeName =
    settings.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY';
  const senderName =
    process.env.SMTP_FROM_NAME || settings.email_sender_name || 'IntelliGenZ Club';
  const senderEmail =
    process.env.SMTP_FROM_EMAIL ||
    settings.email_sender_address ||
    process.env.SMTP_FROM ||
    'intelligenz@drkvsrit.ac.in';
  const fromAddress = `"${senderName}" <${senderEmail}>`;

  const subject = `Your Event Pass — ${event.title} | IntelliGenZ Club`;

  const participantName = reg.full_name || reg.participant_name || 'Participant';
  const eventDate = event.date || 'TBA';
  const eventTime = `${event.start_time || ''}${
    event.end_time ? ` - ${event.end_time}` : ''
  }`.trim() || 'Refer to schedule';
  const eventVenue = event.venue || 'Campus Auditorium & AI Lab';

  // Plain-text body exactly adhering to the required structure
  const textBody = `Hello ${participantName},

Your registration for ${event.title} has been successfully completed.

Your Event Pass is attached to this email.

Event: ${event.title}
Date: ${eventDate}
Time: ${eventTime}
Venue: ${eventVenue}
Registration ID: ${reg.id}
Ticket Code: ${ticketCode}
Roll Number: ${displayRoll}

Please keep this Event Pass safely and present it when required at the event.

Regards,
IntelliGenZ Club
${deptName}
${collegeName}`;

  // Rich HTML body
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Event Pass — ${event.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A0B0E; color: #E5E7EB; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background-color: #0D1017; border: 1px solid #1A1C23; border-radius: 16px; overflow: hidden; }
    .header { background-color: #05070A; border-bottom: 2px solid #00E5FF; padding: 24px; text-align: center; }
    .club-title { color: #00E5FF; font-size: 22px; font-weight: 800; letter-spacing: 1px; margin: 0; }
    .club-subtitle { color: #9CA3AF; font-size: 11px; text-transform: uppercase; margin-top: 4px; }
    .body-content { padding: 26px 22px; }
    .greeting { font-size: 17px; font-weight: 700; color: #FFFFFF; margin-bottom: 12px; }
    .lead { font-size: 14px; color: #D1D5DB; line-height: 1.6; margin-bottom: 20px; }
    .pass-card { background: #11141D; border: 1px solid #1F2430; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    .ticket-badge { display: inline-block; background: #000000; color: #00E5FF; font-family: monospace; font-size: 13px; font-weight: bold; padding: 5px 16px; border-radius: 6px; border: 1px solid #00E5FF; letter-spacing: 1px; }
    .event-title { font-size: 17px; font-weight: 800; color: #FFFFFF; margin: 14px 0 6px; }
    .event-meta { font-size: 12px; color: #9CA3AF; margin-bottom: 16px; line-height: 1.5; }
    .qr-box { background: #FFFFFF; padding: 12px; border-radius: 8px; display: inline-block; margin: 10px auto; }
    .qr-img { width: 170px; height: 170px; display: block; }
    .info-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-top: 16px; }
    .info-table td { padding: 7px 10px; border-bottom: 1px solid #1A1C23; }
    .info-table td.lbl { color: #9CA3AF; width: 38%; font-weight: 600; }
    .info-table td.val { color: #FFFFFF; font-weight: 700; }
    .info-table td.val.roll { color: #00E5FF; font-family: monospace; letter-spacing: 0.5px; }
    .info-table td.val.status { color: #10B981; }
    .pass-footer { font-size: 11px; color: #10B981; font-weight: 700; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #2A2E39; }
    .notice-box { background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #9CA3AF; line-height: 1.5; margin: 20px 0; }
    .footer { border-top: 1px solid #1A1C23; padding: 20px 24px; text-align: center; font-size: 11px; color: #6B7280; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="club-title">${clubName}</h1>
      <div class="club-subtitle">${deptName} • ${collegeName}</div>
    </div>
    <div class="body-content">
      <div class="greeting">Hello ${participantName},</div>
      <p class="lead">
        Your registration for <strong>${event.title}</strong> has been successfully completed.<br/><br/>
        <strong>Your official Event Pass is attached to this email as a PDF document (event-pass-${ticketCode}.pdf).</strong>
      </p>

      <div class="pass-card">
        <div class="ticket-badge">${ticketCode}</div>
        <div class="event-title">${event.title}</div>
        <div class="event-meta">
          📅 ${eventDate} &nbsp;•&nbsp; ⏰ ${eventTime}<br/>
          📍 ${eventVenue}
        </div>
        <div class="qr-box">
          <img class="qr-img" src="cid:event-pass-qr-image" alt="Verification QR Code" />
        </div>
        <table class="info-table">
          <tr>
            <td class="lbl">Participant</td>
            <td class="val">${participantName} ${
              reg.participation_type !== 'SOLO' && reg.team_name ? `(Team: ${reg.team_name})` : ''
            }</td>
          </tr>
          <tr>
            <td class="lbl">Roll Number</td>
            <td class="val roll">${displayRoll}</td>
          </tr>
          <tr>
            <td class="lbl">Department</td>
            <td class="val">${reg.department} (${reg.year})</td>
          </tr>
          <tr>
            <td class="lbl">Registration ID</td>
            <td class="val" style="font-family: monospace; font-size: 11px;">${reg.id}</td>
          </tr>
          <tr>
            <td class="lbl">Attendance Status</td>
            <td class="val status">Confirmed (Eligible for Check-In)</td>
          </tr>
        </table>
        <div class="pass-footer">
          ✓ Scan at event entrance for instant automated check-in
        </div>
      </div>

      <div class="notice-box">
        <strong>Important Instructions:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          <li>Please carry this Event Pass either digitally on your phone or printed.</li>
          <li>Ensure your Roll Number (<span style="color:#00E5FF;font-family:monospace;font-weight:bold;">${displayRoll}</span>) matches your college ID card.</li>
          <li>Your QR pass is unique to your registration and valid for entrance verification.</li>
        </ul>
      </div>

      <p style="font-size: 13px; color: #9CA3AF; margin-top: 24px; line-height: 1.5;">
        Please keep this Event Pass safely and present it when required at the event.<br/><br/>
        Regards,<br/>
        <strong style="color: #FFFFFF;">IntelliGenZ Club</strong><br/>
        ${deptName}<br/>
        ${collegeName}
      </p>
    </div>
    <div class="footer">
      This is an automated transactional confirmation message for your event registration.<br/>
      IntelliGenZ Club • DR. K. V. Subba Reddy Institute of Technology, Kurnool.
    </div>
  </div>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: fromAddress,
    to: recipient,
    subject: subject,
    text: textBody,
    html: htmlBody,
    attachments: [
      {
        filename: `event-pass-${ticketCode}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
      {
        filename: `event-pass-qr-${ticketCode}.png`,
        content: qrPngBuffer,
        cid: 'event-pass-qr-image',
        contentType: 'image/png',
      },
    ],
  });

  if (!targetEmailOverride) {
    sentPassEmailRegistrations.add(regKey);
  }

  console.log(
    `[Email Service] Automated Event Pass successfully dispatched to: ${recipient} (id: ${info.messageId || 'ok'}) [${providerInfo}]`
  );
  return { success: true, messageId: info.messageId, simulated: !isLiveSmtp };
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

// ==========================================================
// Configurable Session Timeout Settings
// ==========================================================
function parseSessionDuration(val: string | undefined, fallbackMs: number): number {
  if (!val) return fallbackMs;
  const trimmed = val.trim();
  if (!trimmed) return fallbackMs;
  if (/^\d+d$/i.test(trimmed)) {
    return parseInt(trimmed, 10) * 24 * 60 * 60 * 1000;
  }
  if (/^\d+h$/i.test(trimmed)) {
    return parseInt(trimmed, 10) * 60 * 60 * 1000;
  }
  if (/^\d+m$/i.test(trimmed)) {
    return parseInt(trimmed, 10) * 60 * 1000;
  }
  if (/^\d+s$/i.test(trimmed)) {
    return parseInt(trimmed, 10) * 1000;
  }
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) || parsed <= 0 ? fallbackMs : parsed;
}

const ADMIN_SECRET = (
  process.env.ADMIN_SECRET ||
  process.env.SESSION_SECRET ||
  'intelligenz_admin_secret_key_drkvsrit_cse_aiml_2026'
).trim();

// Inactivity timeout (default: 15 minutes / 900,000 ms)
const ADMIN_IDLE_TIMEOUT = parseSessionDuration(process.env.ADMIN_IDLE_TIMEOUT, 15 * 60 * 1000);
// 24 hours absolute maximum lifetime (86,400,000 ms)
const ADMIN_MAX_SESSION_LIFETIME = parseSessionDuration(process.env.ADMIN_MAX_SESSION_LIFETIME, 24 * 60 * 60 * 1000);
// 2 minutes session warning threshold (120,000 ms)
const ADMIN_SESSION_WARNING = parseSessionDuration(process.env.ADMIN_SESSION_WARNING, 2 * 60 * 1000);

// Active session storage
interface ActiveSession {
  token: string;
  userId: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  mustChangePassword?: boolean;
}

const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function generateSignedSessionToken(userId: string, createdAt: number, expiresAt: number): string {
  const payload = `${userId}:${createdAt}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
  return `session_${payload}_${hmac}`;
}

function verifySignedSessionToken(token: string): { userId: string; createdAt: number; expiresAt: number } | null {
  if (!token || !token.startsWith('session_')) return null;
  const parts = token.slice('session_'.length).split('_');
  if (parts.length < 2) return null;
  const hmac = parts[parts.length - 1];
  const payload = parts.slice(0, parts.length - 1).join('_');
  const expectedHmac = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
  if (hmac !== expectedHmac) return null;

  const [userId, createdAtStr, expiresAtStr] = payload.split(':');
  const createdAt = parseInt(createdAtStr, 10);
  const expiresAt = parseInt(expiresAtStr, 10);
  if (!userId || isNaN(createdAt) || isNaN(expiresAt)) return null;
  return { userId, createdAt, expiresAt };
}

function loadSessions(): Map<string, ActiveSession> {
  const map = new Map<string, ActiveSession>();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const arr = JSON.parse(data);
      if (Array.isArray(arr)) {
        const now = Date.now();
        for (const s of arr) {
          if (s && s.token) {
            const createdAt = typeof s.createdAt === 'number' ? s.createdAt : now;
            const lastActivityAt = typeof s.lastActivityAt === 'number' ? s.lastActivityAt : now;
            const absoluteExpiresAt = typeof s.expiresAt === 'number' ? s.expiresAt : (createdAt + ADMIN_MAX_SESSION_LIFETIME);

            const isIdleExpired = (now - lastActivityAt) > ADMIN_IDLE_TIMEOUT;
            const isAbsoluteExpired = (now - createdAt) > ADMIN_MAX_SESSION_LIFETIME || absoluteExpiresAt <= now;

            if (!isIdleExpired && !isAbsoluteExpired) {
              map.set(s.token, {
                ...s,
                createdAt,
                lastActivityAt,
                expiresAt: absoluteExpiresAt,
              });
            }
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
    const now = Date.now();
    const list = Array.from(sessionsMap.values()).filter((s) => {
      const isIdleExpired = (now - s.lastActivityAt) > ADMIN_IDLE_TIMEOUT;
      const isAbsoluteExpired = (now - s.createdAt) > ADMIN_MAX_SESSION_LIFETIME || s.expiresAt <= now;
      return !isIdleExpired && !isAbsoluteExpired;
    });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Sessions Notice] Could not persist sessions file to disk (in-memory state maintained):', err?.message);
  }
}

let saveSessionsTimeout: NodeJS.Timeout | null = null;
function throttledSaveSessions() {
  if (saveSessionsTimeout) return;
  saveSessionsTimeout = setTimeout(() => {
    saveSessionsTimeout = null;
    saveSessions(activeSessions);
  }, 10000);
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

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)intelligenz_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

function adminAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication token required.', code: 'UNAUTHORIZED' });
    return;
  }

  let session = activeSessions.get(token);
  const now = Date.now();

  // If not in in-memory map (e.g. across serverless lambda instances), verify signed token
  if (!session) {
    const verified = verifySignedSessionToken(token);
    if (verified) {
      const dbUser = db.admin_users.find((u) => u.id === verified.userId);
      if (
        dbUser &&
        dbUser.status === 'ACTIVE' &&
        (now - verified.createdAt) <= ADMIN_MAX_SESSION_LIFETIME &&
        verified.expiresAt > now
      ) {
        session = {
          token,
          userId: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          role: dbUser.role,
          createdAt: verified.createdAt,
          lastActivityAt: now,
          expiresAt: verified.expiresAt,
          mustChangePassword: !!dbUser.must_change_password,
        };
        activeSessions.set(token, session);
      }
    }
  }

  if (!session) {
    res.clearCookie('intelligenz_session', { path: '/' });
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.', code: 'SESSION_INVALID' });
    return;
  }

  // 1. Check absolute session lifetime (24 hours default)
  const sessionCreatedAt = session.createdAt || session.lastActivityAt || now;
  if ((now - sessionCreatedAt) > ADMIN_MAX_SESSION_LIFETIME || (session.expiresAt && session.expiresAt <= now)) {
    activeSessions.delete(token);
    saveSessions(activeSessions);
    res.clearCookie('intelligenz_session', { path: '/' });
    logAdminAction('Session Expired', 'Auth', session.userId, 'Session reached maximum lifetime limit (24 hours)', session.email, req);
    res.status(401).json({
      error: 'Session expired: Maximum session lifetime reached (24 hours). Please sign in again.',
      code: 'SESSION_MAX_LIFETIME',
    });
    return;
  }

  // 2. Check inactivity timeout (15 minutes default)
  const sessionLastActivity = session.lastActivityAt || now;
  if ((now - sessionLastActivity) > ADMIN_IDLE_TIMEOUT) {
    activeSessions.delete(token);
    saveSessions(activeSessions);
    res.clearCookie('intelligenz_session', { path: '/' });
    logAdminAction('Session Expired', 'Auth', session.userId, 'Session expired due to 15 minutes of inactivity', session.email, req);
    res.status(401).json({
      error: 'Session expired due to 15 minutes of inactivity. Please sign in again.',
      code: 'SESSION_IDLE_TIMEOUT',
    });
    return;
  }

  // 3. Lookup user in current database to verify active status & current role
  const dbUser = db.admin_users.find((u) => u.id === session.userId);
  if (!dbUser || dbUser.status !== 'ACTIVE') {
    activeSessions.delete(token);
    saveSessions(activeSessions);
    res.clearCookie('intelligenz_session', { path: '/' });
    res.status(403).json({ error: 'Access denied: Administrator account is not active or has been revoked.', code: 'ACCOUNT_INACTIVE' });
    return;
  }

  // Session is fully valid: update lastActivityAt
  session.lastActivityAt = now;
  throttledSaveSessions();

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

export const app = express();

// Support up to 75MB request payload to allow 50MB binary uploads via base64 safely
app.use(express.json({ limit: '75mb' }));
app.use(express.urlencoded({ extended: true, limit: '75mb' }));

// Serve persistent uploaded images statically BEFORE Vite and SPA fallback
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(process.cwd(), 'public')));

// Direct route for club logo asset supporting standard file names
app.get(['/club-logo.jpeg', '/club%20logo.jpeg', '/club logo.jpeg'], (req, res, next) => {
  const publicPath1 = path.join(process.cwd(), 'public', 'club-logo.jpeg');
  const publicPath2 = path.join(process.cwd(), 'public', 'club logo.jpeg');
  const uploadPath1 = path.join(UPLOADS_DIR, 'club-logo.jpeg');
  const uploadPath2 = path.join(UPLOADS_DIR, 'club logo.jpeg');

  if (fs.existsSync(publicPath1)) return res.sendFile(publicPath1);
  if (fs.existsSync(publicPath2)) return res.sendFile(publicPath2);
  if (fs.existsSync(uploadPath1)) return res.sendFile(uploadPath1);
  if (fs.existsSync(uploadPath2)) return res.sendFile(uploadPath2);
  next();
});

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
  app.post('/api/events/:id/register', rateLimiter(45, 60000), async (req, res) => {
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

    const regId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const ticketCode = `TKT-${regId.slice(-6).toUpperCase()}`;
    // Secure unique attendance token generated ONLY after successful registration
    const qrToken = `qrat_${crypto.randomBytes(16).toString('hex')}`;
    const qrPayload = `ATTENDANCE:${qrToken}`;

    const newReg: EventRegistration = {
      id: regId,
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
      ticket_code: regStatus === 'Confirmed' ? ticketCode : undefined,
      qr_token: regStatus === 'Confirmed' ? qrToken : undefined,
      qr_payload: regStatus === 'Confirmed' ? qrPayload : undefined,
      registered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    db.registrations.unshift(newReg);
    event.current_participants = (event.current_participants || 0) + totalParticipants;
    saveDatabase(db);

    // ========================================================================
    // AUTOMATED EVENT-PASS EMAIL FEATURE
    // Automatically sends the exact same generated pass to the registrant's email.
    // Failure to send must NEVER cancel or invalidate the successful registration.
    // ========================================================================
    const isEmailAutoEnabled = db.settings.automated_email_enabled !== false;
    let emailSent = false;
    let emailStatus: 'sent' | 'failed' | 'disabled' = isEmailAutoEnabled ? 'failed' : 'disabled';

    if (isEmailAutoEnabled && regStatus === 'Confirmed') {
      try {
        const mailResult = await sendEventPassEmail(event, newReg, db.settings);
        if (mailResult.success) {
          emailSent = true;
          emailStatus = 'sent';
          newReg.email_status = 'sent';
          newReg.email_sent_at = new Date().toISOString();
        } else {
          newReg.email_status = 'failed';
          newReg.email_error = mailResult.error;
        }
        saveDatabase(db);
      } catch (mailErr: any) {
        console.error('[Automated Email Dispatch Error]', mailErr.message);
        newReg.email_status = 'failed';
        newReg.email_error = mailErr.message;
        saveDatabase(db);
      }
    } else if (!isEmailAutoEnabled) {
      newReg.email_status = 'disabled';
      saveDatabase(db);
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? `Registration successful! Your event pass has been sent to your registered email address.`
        : `Registration successful! ${
            participationType !== 'SOLO' ? `Team '${teamName}' registered` : `Registered`
          } with status: ${regStatus}.`,
      registration: newReg,
      ticket_code: newReg.ticket_code,
      qr_token: newReg.qr_token,
      qr_payload: newReg.qr_payload,
      email_sent: emailSent,
      email_status: emailStatus,
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
    const sorted = [...db.team].sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : (a.order_index !== undefined ? a.order_index : 999);
      const orderB = b.order !== undefined ? b.order : (b.order_index !== undefined ? b.order_index : 999);
      return orderA - orderB;
    });
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
  const handleJoinSubmission = (req: express.Request, res: express.Response) => {
    // Backend enforcement: reject submissions if Join Us Status is OFF
    const isJoinUsOpen = db.settings
      ? (db.settings.join_us_status !== undefined
          ? db.settings.join_us_status
          : db.settings.is_recruitment_open !== false)
      : true;

    if (!isJoinUsOpen) {
      res.status(403).json({
        error: "We're currently not accepting new club member applications.",
      });
      return;
    }

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
  };

  app.post('/api/join', rateLimiter(20, 60000), handleJoinSubmission);
  app.post('/api/join-applications', rateLimiter(20, 60000), handleJoinSubmission);

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
    const rawCode = decodeURIComponent(req.params.code || '');
    const cleaned = rawCode.trim();

    if (!cleaned) {
      res.status(400).json({
        valid: false,
        status: 'BadRequest',
        error: 'Please enter a Certificate ID or Student Roll Number.',
      });
      return;
    }

    const queryUpper = cleaned.toUpperCase();
    const queryNormalized = cleaned.replace(/\s+/g, '').toUpperCase();

    // Reusable public sanitization helper
    const sanitizePublicCert = (cert: Certificate) => ({
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
    });

    // 1. Search by exact certificate_code (case-insensitive & trimmed)
    const codeMatches = db.certificates.filter((c) => {
      const cCode = (c.certificate_code || '').trim().toUpperCase();
      const cCodeNorm = (c.certificate_code || '').replace(/\s+/g, '').toUpperCase();
      return cCode === queryUpper || cCodeNorm === queryNormalized;
    });

    if (codeMatches.length > 0) {
      const cert = codeMatches[0];
      const publicCert = sanitizePublicCert(cert);

      if (!cert.is_valid) {
        res.status(200).json({
          valid: false,
          status: 'Revoked',
          error: 'CERTIFICATE REVOKED by Department of CSE (AIML) & AI Authority.',
          certificate: publicCert,
          certificates: [publicCert],
          count: 1,
          match_type: 'certificate_id',
          verification_time: new Date().toISOString(),
          verified_by: 'Department of CSE (AIML) & AI, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
        });
        return;
      }

      res.json({
        valid: true,
        status: 'Valid',
        certificate: publicCert,
        certificates: [publicCert],
        count: 1,
        match_type: 'certificate_id',
        verification_time: new Date().toISOString(),
        verified_by: 'Department of CSE (AIML) & AI, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      });
      return;
    }

    // 2. Search by student roll number using existing `student_roll_no` field
    const rollMatches = db.certificates.filter((c) => {
      const rollNo = (c.student_roll_no || '').replace(/\s+/g, '').toUpperCase();
      if (!rollNo) return false;
      if (rollNo === queryNormalized) return true;

      // Handle university/college roll number alias between '26' and '2G' (e.g. 23261A3204 <-> 232G1A3204)
      const normalizedDbRoll = rollNo.replace(/^(\d{2})26(1A.+)$/, '$12G$2');
      const normalizedInputRoll = queryNormalized.replace(/^(\d{2})26(1A.+)$/, '$12G$2');
      return normalizedDbRoll === normalizedInputRoll;
    });

    if (rollMatches.length === 1) {
      const cert = rollMatches[0];
      const publicCert = sanitizePublicCert(cert);

      if (!cert.is_valid) {
        res.status(200).json({
          valid: false,
          status: 'Revoked',
          error: 'CERTIFICATE REVOKED by Department of CSE (AIML) & AI Authority.',
          certificate: publicCert,
          certificates: [publicCert],
          count: 1,
          match_type: 'roll_number',
          verification_time: new Date().toISOString(),
          verified_by: 'Department of CSE (AIML) & AI, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
        });
        return;
      }

      res.json({
        valid: true,
        status: 'Valid',
        certificate: publicCert,
        certificates: [publicCert],
        count: 1,
        match_type: 'roll_number',
        verification_time: new Date().toISOString(),
        verified_by: 'Department of CSE (AIML) & AI, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      });
      return;
    }

    if (rollMatches.length > 1) {
      const publicCerts = rollMatches.map(sanitizePublicCert);
      res.json({
        valid: true,
        status: 'MultipleFound',
        certificates: publicCerts,
        count: publicCerts.length,
        match_type: 'roll_number',
        message: `Found ${publicCerts.length} certificates registered under roll number ${cleaned.toUpperCase()}.`,
        verification_time: new Date().toISOString(),
        verified_by: 'Department of CSE (AIML) & AI, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      });
      return;
    }

    // 3. Neither certificate ID nor roll number matched
    res.status(404).json({
      valid: false,
      status: 'NotFound',
      error: 'Certificate not found. Please verify the Certificate ID or Student Roll Number and try again.',
    });
  });

  // ==========================================
  // AUTHENTICATION & ACCESS CONTROL
  // ==========================================
  app.post('/api/auth/login', rateLimiter(60, 60000), (req, res) => {
    try {
      const { username, email, identifier: rawIdentifier, password } = req.body || {};
      const identifier = (rawIdentifier || username || email || '').trim().toLowerCase();

      console.log(`[Auth] Administrator login attempt for identifier: "${identifier}"`);
      console.log(`[Auth Diagnostics] ADMIN_SECRET configured: ${Boolean(process.env.ADMIN_SECRET || process.env.SESSION_SECRET)}, Bootstrap Admin configured: ${Boolean(process.env.ADMIN_BOOTSTRAP_PASSWORD || process.env.ADMIN_BOOTSTRAP_EMAIL)}, Database admins count: ${db.admin_users.length}`);

      if (!identifier || !password) {
        res.status(400).json({
          success: false,
          error: 'Please provide your administrator email or username, and password.',
          message: 'Please provide your administrator email or username, and password.',
        });
        return;
      }

      // Find admin user in database by username or email
      const adminUser = db.admin_users.find(
        (u) =>
          u.username.toLowerCase() === identifier ||
          u.email.toLowerCase() === identifier
      );

      if (!adminUser) {
        console.warn(`[Auth] Login rejected: Unknown administrator identifier "${identifier}".`);
        logAdminAction('Admin Login Failed', 'Auth', identifier, `Failed login attempt for unknown account '${identifier}'`, identifier, req);
        res.status(401).json({
          success: false,
          error: 'Invalid administrator credentials.',
          message: 'Invalid credentials',
        });
        return;
      }

      if (adminUser.status === 'INACTIVE') {
        console.warn(`[Auth] Login rejected: Account "${adminUser.username}" is INACTIVE.`);
        logAdminAction('Admin Login Blocked', 'Auth', adminUser.id, `Login blocked: Account '${adminUser.username}' is marked INACTIVE`, adminUser.email, req);
        res.status(403).json({
          success: false,
          error: 'Your administrator account is currently inactive. Please contact the Super Administrator.',
          message: 'Your administrator account is inactive.',
        });
        return;
      }

      if (adminUser.status === 'REVOKED') {
        console.warn(`[Auth] Login rejected: Account "${adminUser.username}" is REVOKED.`);
        logAdminAction('Admin Login Blocked', 'Auth', adminUser.id, `Login blocked: Account '${adminUser.username}' access is REVOKED`, adminUser.email, req);
        res.status(403).json({
          success: false,
          error: 'Your administrator access has been revoked. Contact the department administration.',
          message: 'Your administrator access has been revoked.',
        });
        return;
      }

      if (adminUser.status !== 'ACTIVE') {
        res.status(403).json({
          success: false,
          error: 'Invalid administrator credentials.',
          message: 'Invalid credentials',
        });
        return;
      }

      // Verify PBKDF2 password hash
      const calculatedHash = hashPassword(password, adminUser.salt);
      if (calculatedHash !== adminUser.password_hash) {
        console.warn(`[Auth] Login rejected: Incorrect password for "${adminUser.username}".`);
        logAdminAction('Admin Login Failed', 'Auth', adminUser.id, `Failed login attempt: Incorrect password for '${adminUser.username}'`, adminUser.email, req);
        res.status(401).json({
          success: false,
          error: 'Invalid administrator credentials.',
          message: 'Invalid credentials',
        });
        return;
      }

      // Update login timestamp
      adminUser.last_login_at = new Date().toISOString();
      adminUser.updated_at = new Date().toISOString();
      saveDatabase(db);

      // Invalidate any previous sessions for this administrator so each login starts with a fresh, independent session
      invalidateUserSessions(adminUser.id);

      // Issue cryptographically secure signed session token with independent 24-hour maximum lifetime
      const now = Date.now();
      const expiresAt = now + ADMIN_MAX_SESSION_LIFETIME;
      const sessionToken = generateSignedSessionToken(adminUser.id, now, expiresAt);
      activeSessions.set(sessionToken, {
        token: sessionToken,
        userId: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        createdAt: now,
        lastActivityAt: now,
        expiresAt,
        mustChangePassword: !!adminUser.must_change_password,
      });
      saveSessions(activeSessions);

      // Set secure HTTP-only cookie with same max age
      res.cookie('intelligenz_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: ADMIN_MAX_SESSION_LIFETIME,
        path: '/',
      });

      console.log(`[Auth] Admin login succeeded for "${adminUser.username}" (${adminUser.role}).`);

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
        message: 'Login successful',
        token: sessionToken,
        sessionStart: now,
        idleTimeout: ADMIN_IDLE_TIMEOUT,
        maxLifetime: ADMIN_MAX_SESSION_LIFETIME,
        warningDuration: ADMIN_SESSION_WARNING,
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
    } catch (err: any) {
      console.error('[Auth Error] Uncaught error in login handler:', err?.message || err);
      res.status(500).json({
        success: false,
        error: 'Authentication service temporarily unavailable',
        message: 'Authentication service temporarily unavailable',
      });
    }
  });

  app.get('/api/auth/session-config', (_req, res) => {
    res.json({
      idleTimeout: ADMIN_IDLE_TIMEOUT,
      maxLifetime: ADMIN_MAX_SESSION_LIFETIME,
      warningDuration: ADMIN_SESSION_WARNING,
    });
  });

  app.get('/api/auth/verify', (req, res) => {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ valid: false, error: 'No authorization token provided.' });
      return;
    }

    const session = activeSessions.get(token);
    if (!session) {
      res.clearCookie('intelligenz_session', { path: '/' });
      res.status(401).json({ valid: false, error: 'Session expired or invalid.' });
      return;
    }

    const now = Date.now();
    const sessionCreatedAt = session.createdAt || session.lastActivityAt || now;
    if ((now - sessionCreatedAt) > ADMIN_MAX_SESSION_LIFETIME || (session.expiresAt && session.expiresAt <= now)) {
      activeSessions.delete(token);
      saveSessions(activeSessions);
      res.clearCookie('intelligenz_session', { path: '/' });
      res.status(401).json({ valid: false, error: 'Session reached maximum lifetime limit (8 hours).', code: 'SESSION_MAX_LIFETIME' });
      return;
    }

    const sessionLastActivity = session.lastActivityAt || now;
    if ((now - sessionLastActivity) > ADMIN_IDLE_TIMEOUT) {
      activeSessions.delete(token);
      saveSessions(activeSessions);
      res.clearCookie('intelligenz_session', { path: '/' });
      res.status(401).json({ valid: false, error: 'Session expired due to 15 minutes of inactivity.', code: 'SESSION_IDLE_TIMEOUT' });
      return;
    }

    const user = db.admin_users.find((u) => u.id === session.userId);
    if (!user || user.status !== 'ACTIVE') {
      activeSessions.delete(token);
      saveSessions(activeSessions);
      res.clearCookie('intelligenz_session', { path: '/' });
      res.status(403).json({ valid: false, error: 'User account is inactive or revoked.' });
      return;
    }

    // Refresh lastActivity timestamp
    session.lastActivityAt = now;
    throttledSaveSessions();

    res.json({
      valid: true,
      sessionStart: sessionCreatedAt,
      lastActivityAt: now,
      idleTimeout: ADMIN_IDLE_TIMEOUT,
      maxLifetime: ADMIN_MAX_SESSION_LIFETIME,
      warningDuration: ADMIN_SESSION_WARNING,
      remainingIdleMs: Math.max(0, ADMIN_IDLE_TIMEOUT - (now - session.lastActivityAt)),
      remainingLifetimeMs: Math.max(0, (sessionCreatedAt + ADMIN_MAX_SESSION_LIFETIME) - now),
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

  app.post('/api/auth/stay-signed-in', (req, res) => {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'No authorization token provided.', code: 'UNAUTHORIZED' });
      return;
    }

    const session = activeSessions.get(token);
    if (!session) {
      res.clearCookie('intelligenz_session', { path: '/' });
      res.status(401).json({ error: 'Session expired or invalid. Please sign in again.', code: 'SESSION_INVALID' });
      return;
    }

    const now = Date.now();
    const sessionCreatedAt = session.createdAt || session.lastActivityAt || now;
    if ((now - sessionCreatedAt) > ADMIN_MAX_SESSION_LIFETIME || (session.expiresAt && session.expiresAt <= now)) {
      activeSessions.delete(token);
      saveSessions(activeSessions);
      res.clearCookie('intelligenz_session', { path: '/' });
      res.status(401).json({ error: 'Session reached maximum lifetime limit (8 hours).', code: 'SESSION_MAX_LIFETIME' });
      return;
    }

    const sessionLastActivity = session.lastActivityAt || now;
    if ((now - sessionLastActivity) > ADMIN_IDLE_TIMEOUT) {
      activeSessions.delete(token);
      saveSessions(activeSessions);
      res.clearCookie('intelligenz_session', { path: '/' });
      res.status(401).json({ error: 'Session expired due to 15 minutes of inactivity.', code: 'SESSION_IDLE_TIMEOUT' });
      return;
    }

    // Reset inactivity timer
    session.lastActivityAt = now;
    saveSessions(activeSessions);

    res.json({
      success: true,
      lastActivityAt: now,
      remainingLifetimeMs: Math.max(0, (sessionCreatedAt + ADMIN_MAX_SESSION_LIFETIME) - now),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractToken(req);
    if (token) {
      const session = activeSessions.get(token);
      if (session) {
        logAdminAction('Admin Logout', 'Auth', session.userId, `Administrator session signed out for ${session.email}`, session.email, req);
        activeSessions.delete(token);
        saveSessions(activeSessions);
      }
    }
    res.clearCookie('intelligenz_session', { path: '/' });
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
    const token = extractToken(req);
    if (token) {
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
    const body = req.body || {};
    const pos = (body.position || body.role || 'Member').trim();
    const photo = (body.photo_url || body.image_url || '').trim();
    const linkedin = (body.linkedin || body.social_links?.linkedin || '').trim();
    const github = (body.github || body.social_links?.github || '').trim();
    const email = (body.email || body.social_links?.email || '').trim();

    const newMember: TeamMember = {
      id: body.id || `tm-${Date.now()}`,
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
      featured: body.featured !== undefined ? !!body.featured : false,
      order: body.order !== undefined ? Number(body.order) : (db.team.length + 1),
      order_index: body.order_index !== undefined ? Number(body.order_index) : (body.order !== undefined ? Number(body.order) : (db.team.length + 1)),
    };
    db.team.push(newMember);
    saveDatabase(db);

    logAdminAction(
      'Team Member Added',
      'TeamMember',
      newMember.id,
      `Admin added team member ${newMember.name} (${newMember.position})`,
      (req as AuthenticatedRequest).adminUser?.email,
      req
    );

    res.status(201).json(newMember);
  });

  adminRouter.put('/team/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const index = db.team.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    const body = req.body || {};
    const existing = db.team[index];
    const pos = (body.position || body.role || existing.position || existing.role || 'Member').trim();
    const photo = (body.photo_url !== undefined ? body.photo_url : (body.image_url !== undefined ? body.image_url : (existing.photo_url || existing.image_url || ''))).trim();
    const linkedin = (body.linkedin !== undefined ? body.linkedin : (body.social_links?.linkedin !== undefined ? body.social_links.linkedin : (existing.linkedin || existing.social_links?.linkedin || ''))).trim();
    const github = (body.github !== undefined ? body.github : (body.social_links?.github !== undefined ? body.social_links.github : (existing.github || existing.social_links?.github || ''))).trim();
    const email = (body.email !== undefined ? body.email : (body.social_links?.email !== undefined ? body.social_links.email : (existing.email || existing.social_links?.email || ''))).trim();

    db.team[index] = {
      ...existing,
      ...body,
      id: existing.id,
      name: body.name !== undefined ? body.name.trim() : existing.name,
      position: pos,
      role: pos,
      category: body.category !== undefined ? body.category : existing.category,
      department: body.department !== undefined ? body.department.trim() : existing.department,
      year: body.year !== undefined ? body.year.trim() : existing.year,
      bio: body.bio !== undefined ? body.bio.trim() : existing.bio,
      photo_url: photo,
      image_url: photo,
      linkedin,
      github,
      email,
      social_links: {
        ...(existing.social_links || {}),
        linkedin,
        github,
        email,
        ...(body.social_links || {}),
      },
      featured: body.featured !== undefined ? !!body.featured : existing.featured,
      order: body.order !== undefined ? Number(body.order) : existing.order,
      order_index: body.order_index !== undefined ? Number(body.order_index) : existing.order_index,
    };
    saveDatabase(db);

    logAdminAction(
      'Team Member Updated',
      'TeamMember',
      existing.id,
      `Admin updated team member ${db.team[index].name} (${db.team[index].position})`,
      (req as AuthenticatedRequest).adminUser?.email,
      req
    );

    res.json(db.team[index]);
  });

  adminRouter.delete('/team/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), (req, res) => {
    const target = db.team.find((t) => t.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    db.team = db.team.filter((t) => t.id !== req.params.id);
    saveDatabase(db);

    logAdminAction(
      'Team Member Deleted',
      'TeamMember',
      req.params.id,
      `Admin removed team member ${target.name} (${target.position || target.role})`,
      (req as AuthenticatedRequest).adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Team member deleted' });
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

  adminRouter.put('/settings', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const updatedSettings = { ...db.settings, ...req.body };
    if (req.body.join_us_status !== undefined) {
      updatedSettings.is_recruitment_open = !!req.body.join_us_status;
      updatedSettings.join_us_status = !!req.body.join_us_status;
    } else if (req.body.is_recruitment_open !== undefined) {
      updatedSettings.is_recruitment_open = !!req.body.is_recruitment_open;
      updatedSettings.join_us_status = !!req.body.is_recruitment_open;
    }
    if (req.body.automated_email_enabled !== undefined) {
      updatedSettings.automated_email_enabled = !!req.body.automated_email_enabled;
    }
    db.settings = updatedSettings;
    saveDatabase(db);
    res.json(db.settings);
  });

  // Admin Email Management & Status (SUPER_ADMIN, ADMIN)
  adminRouter.get('/email/status', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    const { transporter, isLiveSmtp, providerInfo, host, port, secure, user } = getEmailTransporter();
    
    let isConnected = false;
    let connectionError: string | null = null;

    const rawPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
    if (!rawPass) {
      connectionError = 'Google App Password (SMTP_PASS) is not configured. Please set a 16-character App Password.';
    } else {
      try {
        await transporter.verify();
        isConnected = true;
      } catch (err: any) {
        isConnected = false;
        connectionError = sanitizeSmtpError(err);
      }
    }

    const senderName =
      process.env.SMTP_FROM_NAME || db.settings.email_sender_name || 'IntelliGenZ Club';
    const senderAddress =
      process.env.SMTP_FROM ||
      process.env.SMTP_FROM_EMAIL ||
      db.settings.email_sender_address ||
      'intelligenz@drkvsrit.ac.in';

    res.json({
      enabled: db.settings.automated_email_enabled !== false,
      is_live_smtp: isLiveSmtp,
      connected: isConnected,
      smtp_status: isConnected ? 'Connected' : 'Not Connected',
      connection_error: connectionError,
      provider_info: providerInfo,
      sender_name: senderName,
      sender_address: senderAddress,
      smtp_host: host || 'smtp.gmail.com',
      smtp_port: port || 465,
      smtp_secure: secure,
      smtp_user_masked: user ? `${user.slice(0, 3)}***@${user.split('@')[1] || 'drkvsrit.ac.in'}` : null,
      total_sent_this_session: sentPassEmailRegistrations.size,
    });
  });

  adminRouter.post('/email/test', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const { email } = req.body;
    const targetEmail = (email || req.adminUser?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid recipient email address for testing.' });
      return;
    }

    const { transporter, isLiveSmtp, providerInfo } = getEmailTransporter();
    const senderName =
      process.env.SMTP_FROM_NAME || db.settings.email_sender_name || 'IntelliGenZ Club';
    const senderAddress =
      process.env.SMTP_FROM ||
      process.env.SMTP_FROM_EMAIL ||
      db.settings.email_sender_address ||
      'intelligenz@drkvsrit.ac.in';
    const fromAddress = `"${senderName}" <${senderAddress}>`;

    const subject = 'IntelliGenZ SMTP Test Email';
    const textBody = 'This is a test email from the IntelliGenZ Club email system. SMTP configuration is working correctly.';
    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>IntelliGenZ SMTP Test Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0A0B0E; color: #E5E7EB; margin: 0; padding: 24px;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #0D1017; border: 1px solid #1A1C23; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
    <div style="background-color: #05070A; border-bottom: 2px solid #00E5FF; padding: 20px 24px; text-align: center;">
      <h1 style="color: #00E5FF; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: 0.5px;">IntelliGenZ Club</h1>
      <p style="color: #9CA3AF; font-size: 11px; margin: 4px 0 0; text-transform: uppercase;">DR. K. V. Subba Reddy Institute of Technology</p>
    </div>
    <div style="padding: 24px;">
      <h2 style="font-size: 16px; font-weight: 700; color: #10B981; margin-top: 0; margin-bottom: 12px;">
        ✓ SMTP Configuration Verified
      </h2>
      <p style="font-size: 13.5px; line-height: 1.6; color: #D1D5DB; margin-bottom: 20px;">
        ${textBody}
      </p>
      <div style="background-color: #11141D; border: 1px solid #1F2430; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #9CA3AF; line-height: 1.6;">
        <div><strong style="color: #FFFFFF;">Host:</strong> smtp.gmail.com:465 (SSL)</div>
        <div><strong style="color: #FFFFFF;">Sender:</strong> ${senderAddress}</div>
        <div><strong style="color: #FFFFFF;">Recipient:</strong> ${targetEmail}</div>
        <div><strong style="color: #FFFFFF;">Timestamp:</strong> ${new Date().toUTCString()}</div>
      </div>
      <p style="font-size: 12px; color: #6B7280; margin-top: 20px; margin-bottom: 0;">
        Regards,<br>
        <strong style="color: #FFFFFF;">IntelliGenZ Club</strong><br>
        Department of CSE (AIML) &amp; AI
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: targetEmail,
        subject,
        text: textBody,
        html: htmlBody,
      });

      logAdminAction(
        'Test Email Sent',
        'Settings',
        'email_system',
        `Admin dispatched SMTP test email to ${targetEmail} (messageId: ${info.messageId || 'ok'})`,
        req.adminUser?.email,
        req
      );

      res.json({
        success: true,
        message: `Test email successfully sent to ${targetEmail}. SMTP configuration is working correctly.`,
        messageId: info.messageId,
        simulated: !isLiveSmtp,
      });
    } catch (err: any) {
      console.error('[Admin Test Email Error]', err);
      const safeError = sanitizeSmtpError(err);
      res.status(500).json({ error: safeError || 'Failed to dispatch test email via SMTP.' });
    }
  });

  adminRouter.post('/email/resend/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const regId = req.params.id;
    const reg = db.registrations.find((r) => r.id === regId);
    if (!reg) {
      res.status(404).json({ error: 'Event registration not found.' });
      return;
    }

    const event = db.events.find((e) => e.id === reg.event_id) || {
      id: reg.event_id,
      title: reg.event_title || 'IntelliGenZ Technical Event',
      slug: 'event',
      description: '',
      short_description: '',
      event_image: '',
      date: new Date().toISOString().slice(0, 10),
      start_time: '10:00 AM',
      end_time: '04:00 PM',
      venue: 'Campus Auditorium',
      category: 'Workshop' as const,
      maximum_participants: 100,
      current_participants: 1,
      status: 'Upcoming' as const,
      featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const result = await sendEventPassEmail(event, reg, db.settings, reg.email);
      if (result.success) {
        reg.email_status = 'sent';
        reg.email_sent_at = new Date().toISOString();
        saveDatabase(db);
        logAdminAction(
          'Event Pass Resent',
          'Registration',
          reg.id,
          `Admin resent Event Pass email to ${reg.email} for registration ${reg.id}`,
          req.adminUser?.email,
          req
        );
        res.json({
          success: true,
          message: `Event Pass email successfully re-sent to ${reg.email}.`,
        });
      } else {
        reg.email_status = 'failed';
        reg.email_error = result.error;
        saveDatabase(db);
        res.status(500).json({ error: result.error || 'Failed to re-send event pass email.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to re-send event pass email.' });
    }
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

  function sanitizeScanQuery(raw: string): string {
    let q = (raw || '').trim();
    if (!q) return '';
    // Handle JSON payloads from QR codes
    if (q.startsWith('{') && q.endsWith('}')) {
      try {
        const obj = JSON.parse(q);
        const candidate =
          obj.token ||
          obj.qr_token ||
          obj.attendance_token ||
          obj.ticket ||
          obj.ticket_code ||
          obj.roll_number ||
          obj.rollNumber ||
          obj.registration_id ||
          obj.id ||
          obj.code;
        if (candidate) return String(candidate).trim();
      } catch {
        // proceed
      }
    }
    // Handle ATTENDANCE:<token> format
    if (/^attendance:/i.test(q)) {
      return q.replace(/^attendance:/i, '').trim();
    }
    // Handle QR: or TICKET: prefixes
    if (/^(qr|ticket):/i.test(q)) {
      return q.replace(/^(qr|ticket):/i, '').trim();
    }
    // Handle URL payloads from QR codes
    if (q.includes('://') || q.startsWith('http')) {
      try {
        const url = new URL(q);
        const queryParam =
          url.searchParams.get('token') ||
          url.searchParams.get('qr_token') ||
          url.searchParams.get('ticket') ||
          url.searchParams.get('code') ||
          url.searchParams.get('roll') ||
          url.searchParams.get('id');
        if (queryParam) return queryParam.trim();
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          const last = parts[parts.length - 1];
          if (
            last.toUpperCase().startsWith('TKT-') ||
            last.startsWith('reg-') ||
            last.startsWith('qrat_') ||
            /^[0-9]{2}[A-Z0-9]{8}$/i.test(last)
          ) {
            return last.trim();
          }
        }
      } catch {
        // proceed
      }
    }
    return q;
  }

  function findParticipantMatch(
    rawQuery: string,
    preferredEventId?: string
  ): {
    registration: EventRegistration;
    participant: {
      name: string;
      roll_number: string;
      email: string;
      department: string;
      year?: string;
      is_leader: boolean;
      team_name?: string;
      participation_type: string;
    };
  } | null {
    const rawTrimmed = (rawQuery || '').trim();
    const rawTrimmedLower = rawTrimmed.toLowerCase();
    const sanitized = sanitizeScanQuery(rawTrimmed);
    const term = sanitized.toLowerCase();
    if (!term && !rawTrimmedLower) return null;

    const normTermUpper = term.toUpperCase();
    const withoutTkt = term.replace(/^tkt-?/i, '');

    // Function to test if a given registration matches the query
    const checkRegistration = (r: EventRegistration) => {
      const regIdLower = r.id.toLowerCase();
      const ticketSuffix = r.id.slice(-6).toLowerCase();
      const ticketSuffix4 = r.id.slice(-4).toLowerCase();
      const ticketCodeLower = (r.ticket_code || `tkt-${ticketSuffix}`).toLowerCase();
      const qrTokenLower = (r.qr_token || '').toLowerCase();
      const qrPayloadLower = (r.qr_payload || '').toLowerCase();
      const leaderRollUpper = (r.roll_number || '').trim().toUpperCase();
      const leaderEmailLower = (r.email || '').trim().toLowerCase();
      const leaderNameLower = (r.full_name || r.participant_name || '').trim().toLowerCase();

      // Check unique QR token and payload match
      const qrMatched =
        Boolean(qrTokenLower && (qrTokenLower === term || qrTokenLower === rawTrimmedLower || `attendance:${qrTokenLower}` === rawTrimmedLower)) ||
        Boolean(qrPayloadLower && (qrPayloadLower === term || qrPayloadLower === rawTrimmedLower));

      // Check leader / solo credentials
      const leaderMatched =
        qrMatched ||
        ticketCodeLower === term ||
        ticketCodeLower === withoutTkt ||
        `tkt-${ticketCodeLower}` === term ||
        regIdLower === term ||
        regIdLower === withoutTkt ||
        `tkt-${ticketSuffix}` === term ||
        ticketSuffix === term ||
        ticketSuffix === withoutTkt ||
        ticketSuffix4 === term ||
        ticketSuffix4 === withoutTkt ||
        leaderRollUpper === normTermUpper ||
        leaderEmailLower === term ||
        (leaderNameLower.length > 3 && leaderNameLower === term);

      if (leaderMatched) {
        return {
          registration: r,
          participant: {
            name: r.full_name || r.participant_name || 'Participant',
            roll_number: r.roll_number,
            email: r.email,
            department: r.department || 'CSE (AIML)',
            year: r.year,
            is_leader: true,
            team_name: r.team_name,
            participation_type: r.participation_type || 'SOLO',
          },
        };
      }

      // Check team members if present
      if (r.team_members && Array.isArray(r.team_members)) {
        for (const m of r.team_members) {
          const mRollUpper = (m.roll_number || '').trim().toUpperCase();
          const mEmailLower = (m.email || '').trim().toLowerCase();
          const mNameLower = (m.full_name || '').trim().toLowerCase();

          if (
            mRollUpper === normTermUpper ||
            mEmailLower === term ||
            (mNameLower.length > 3 && mNameLower === term)
          ) {
            return {
              registration: r,
              participant: {
                name: m.full_name,
                roll_number: m.roll_number,
                email: m.email,
                department: m.department || r.department || 'CSE (AIML)',
                year: m.year || r.year,
                is_leader: false,
                team_name: r.team_name,
                participation_type: r.participation_type || 'TEAM',
              },
            };
          }
        }

        // If ticket code or QR token matched and it's a team, return the leader by default
        if (
          qrMatched ||
          ticketCodeLower === term ||
          ticketCodeLower === withoutTkt ||
          `tkt-${ticketCodeLower}` === term ||
          regIdLower === term ||
          `tkt-${ticketSuffix}` === term ||
          ticketSuffix === term ||
          ticketSuffix === withoutTkt
        ) {
          return {
            registration: r,
            participant: {
              name: r.full_name,
              roll_number: r.roll_number,
              email: r.email,
              department: r.department || 'CSE (AIML)',
              year: r.year,
              is_leader: true,
              team_name: r.team_name,
              participation_type: r.participation_type || 'TEAM',
            },
          };
        }
      }

      return null;
    };

    // 1. If preferred event provided, search within preferred event first
    if (preferredEventId) {
      for (const r of db.registrations) {
        if (r.event_id === preferredEventId) {
          const match = checkRegistration(r);
          if (match) return match;
        }
      }
    }

    // 2. Search all registrations (to catch registrations in other events for wrong_event detection)
    for (const r of db.registrations) {
      const match = checkRegistration(r);
      if (match) return match;
    }

    return null;
  }

  // GET Checkins (optionally filtered by event_id)
  adminRouter.get('/checkins', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const eventId = req.query.event_id as string;
    let list = [...db.checkins];
    if (eventId) {
      list = list.filter((c) => c.event_id === eventId);
    }
    list.sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime());
    res.json(list);
  });

  // VERIFY TICKET / ROLL NUMBER (Pre-checkin verification)
  adminRouter.post('/attendance/verify', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const { code, event_id } = req.body;
    const cleanQuery = sanitizeScanQuery(code || '');

    if (!cleanQuery) {
      res.status(400).json({
        status: 'not_found',
        error: 'Please enter a ticket code, student roll number, or scan a QR code to verify.',
      });
      return;
    }

    const match = findParticipantMatch(cleanQuery, event_id);
    if (!match) {
      res.status(404).json({
        status: 'not_found',
        error: 'No valid registration was found for this ticket/roll number.',
        query: cleanQuery,
      });
      return;
    }

    const { registration: reg, participant } = match;
    const registeredEvent = db.events.find((e) => e.id === reg.event_id);
    const selectedEvent = event_id ? db.events.find((e) => e.id === event_id) : null;
    const ticketCode = `TKT-${reg.id.slice(-6).toUpperCase()}`;

    // Check 1: Wrong Event Check
    if (event_id && reg.event_id !== event_id) {
      res.status(400).json({
        status: 'wrong_event',
        error: 'Wrong event: Participant is registered for another event.',
        registered_event_id: reg.event_id,
        registered_event_title: registeredEvent?.title || reg.event_title || 'Another Event',
        selected_event_id: event_id,
        selected_event_title: selectedEvent?.title || 'Selected Event',
        participant,
        ticket_code: ticketCode,
      });
      return;
    }

    // Check 2: Registration Status / Eligibility Check
    const regStatus = (reg.status || 'Confirmed').toLowerCase();
    if (regStatus === 'cancelled') {
      res.status(400).json({
        status: 'not_eligible',
        error: 'This registration has been cancelled and cannot be checked in.',
        reason: 'Cancelled',
        participant,
        registration: {
          id: reg.id,
          event_id: reg.event_id,
          status: reg.status,
          team_name: reg.team_name,
        },
        ticket_code: ticketCode,
      });
      return;
    }

    if (regStatus === 'waitlisted') {
      res.status(400).json({
        status: 'not_eligible',
        error: 'This registration is waitlisted and cannot be checked in until approved.',
        reason: 'Waitlisted',
        participant,
        registration: {
          id: reg.id,
          event_id: reg.event_id,
          status: reg.status,
          team_name: reg.team_name,
        },
        ticket_code: ticketCode,
      });
      return;
    }

    // Check 3: Duplicate Check-In Protection
    const existingCheckin = db.checkins.find(
      (c) =>
        c.event_id === reg.event_id &&
        ((c.roll_number && c.roll_number.toUpperCase() === participant.roll_number.toUpperCase()) ||
          (!reg.team_members?.length && c.registration_id === reg.id))
    );

    if (existingCheckin) {
      res.status(409).json({
        status: 'already_checked_in',
        error: `Participant ${participant.name} (${participant.roll_number}) is already checked in.`,
        record: existingCheckin,
        participant,
        ticket_code: ticketCode,
        event: {
          id: registeredEvent?.id || reg.event_id,
          title: registeredEvent?.title || reg.event_title || 'IntelliGenZ Event',
          date: registeredEvent?.date || '',
          venue: registeredEvent?.venue || '',
        },
      });
      return;
    }

    // All Clear: Eligible for check-in
    res.json({
      status: 'eligible',
      message: 'Registration verified and ready for check-in.',
      participant,
      registration: {
        id: reg.id,
        event_id: reg.event_id,
        status: reg.status,
        team_name: reg.team_name,
        participation_type: reg.participation_type || 'SOLO',
      },
      event: {
        id: registeredEvent?.id || reg.event_id,
        title: registeredEvent?.title || reg.event_title || 'IntelliGenZ Event',
        date: registeredEvent?.date || '',
        start_time: registeredEvent?.start_time || '',
        venue: registeredEvent?.venue || '',
      },
      ticket_code: ticketCode,
    });
  });

  // EXECUTE CHECK-IN (Atomic & duplicate protected)
  adminRouter.post('/checkin', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const { code, event_id, registration_id, roll_number, method } = req.body;
    const queryTerm = sanitizeScanQuery(code || roll_number || registration_id || '');

    if (!queryTerm) {
      res.status(400).json({ error: 'Please provide ticket code or student roll number to check-in.' });
      return;
    }

    const match = findParticipantMatch(queryTerm, event_id);
    if (!match) {
      res.status(404).json({
        status: 'not_found',
        error: 'No valid event registration found. Please verify ticket or roll number.',
      });
      return;
    }

    const { registration: reg, participant } = match;
    const registeredEvent = db.events.find((e) => e.id === reg.event_id);
    const selectedEvent = event_id ? db.events.find((e) => e.id === event_id) : null;
    const ticketCode = `TKT-${reg.id.slice(-6).toUpperCase()}`;

    // Enforce Event Match
    if (event_id && reg.event_id !== event_id) {
      res.status(400).json({
        status: 'wrong_event',
        error: `This participant is registered for '${registeredEvent?.title || 'Another Event'}', not '${selectedEvent?.title || 'the selected event'}'.`,
        registered_event_id: reg.event_id,
        registered_event_title: registeredEvent?.title,
        selected_event_id: event_id,
        selected_event_title: selectedEvent?.title,
        participant,
      });
      return;
    }

    // Enforce Registration Eligibility
    const regStatus = (reg.status || 'Confirmed').toLowerCase();
    if (regStatus === 'cancelled' || regStatus === 'waitlisted') {
      res.status(400).json({
        status: 'not_eligible',
        error: `Registration is ${reg.status} and cannot be checked in.`,
        participant,
      });
      return;
    }

    // Backend Unique Constraint Check: event_id + roll_number / registration_id
    const alreadyCheckedIn = db.checkins.find(
      (c) =>
        c.event_id === reg.event_id &&
        ((c.roll_number && c.roll_number.toUpperCase() === participant.roll_number.toUpperCase()) ||
          (!reg.team_members?.length && c.registration_id === reg.id))
    );

    if (alreadyCheckedIn) {
      res.status(409).json({
        status: 'already_checked_in',
        error: `Participant ${participant.name} (${participant.roll_number}) was already checked in at ${new Date(alreadyCheckedIn.checked_in_at).toLocaleTimeString()}.`,
        record: alreadyCheckedIn,
        participant,
      });
      return;
    }

    // Create persistent Attendance Record
    const checkinRecord: AttendanceRecord = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      registration_id: reg.id,
      event_id: reg.event_id,
      event_title: registeredEvent?.title || reg.event_title || 'IntelliGenZ Event',
      participant_name: participant.name,
      roll_number: participant.roll_number,
      email: participant.email,
      department: participant.department || reg.department || 'CSE (AIML)',
      checked_in_at: new Date().toISOString(),
      checkin_method: method || 'Rapid Scanner',
    };

    // Update registration status to Attended if it was Confirmed
    if (reg.status === 'Confirmed') {
      reg.status = 'Attended';
    }

    db.checkins.unshift(checkinRecord);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: `Checked in: ${participant.name} (${participant.roll_number})`,
      record: checkinRecord,
      participant,
      ticket_code: ticketCode,
    });
  });

  // GET FULL ATTENDANCE ROSTER (Synchronized with registrations and checkins)
  adminRouter.get('/attendance/roster', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const eventId = req.query.event_id as string;
    const selectedEvent = eventId ? db.events.find((e) => e.id === eventId) : null;

    const eventRegistrations = db.registrations.filter((r) => (!eventId || r.event_id === eventId) && r.status !== 'Cancelled');
    const eventCheckins = db.checkins.filter((c) => !eventId || c.event_id === eventId);

    // Build unique participant entries
    const rosterItems: any[] = [];
    const checkinMap = new Map<string, AttendanceRecord>();

    for (const c of eventCheckins) {
      checkinMap.set(`${c.event_id}__${c.roll_number.toUpperCase()}`, c);
      checkinMap.set(`${c.event_id}__${c.registration_id}`, c);
    }

    for (const reg of eventRegistrations) {
      const ticketCode = `TKT-${reg.id.slice(-6).toUpperCase()}`;

      // Leader / Individual participant
      const leaderKey = `${reg.event_id}__${(reg.roll_number || '').toUpperCase()}`;
      const leaderCheckin = checkinMap.get(leaderKey) || checkinMap.get(`${reg.event_id}__${reg.id}`);

      rosterItems.push({
        registration_id: reg.id,
        ticket_code: ticketCode,
        participant_name: reg.full_name || reg.participant_name || 'Participant',
        roll_number: reg.roll_number,
        email: reg.email,
        department: reg.department || 'CSE (AIML)',
        year: reg.year || '3rd Year',
        registration_status: reg.status,
        team_name: reg.team_name,
        is_leader: true,
        checked_in: !!leaderCheckin,
        checked_in_at: leaderCheckin?.checked_in_at,
        checkin_method: leaderCheckin?.checkin_method,
        checkin_id: leaderCheckin?.id,
      });

      // Team members
      if (reg.team_members && Array.isArray(reg.team_members)) {
        for (const m of reg.team_members) {
          const mKey = `${reg.event_id}__${(m.roll_number || '').toUpperCase()}`;
          const mCheckin = checkinMap.get(mKey);

          rosterItems.push({
            registration_id: reg.id,
            ticket_code: ticketCode,
            participant_name: m.full_name,
            roll_number: m.roll_number,
            email: m.email,
            department: m.department || reg.department || 'CSE (AIML)',
            year: m.year || reg.year || '3rd Year',
            registration_status: reg.status,
            team_name: reg.team_name,
            is_leader: false,
            checked_in: !!mCheckin,
            checked_in_at: mCheckin?.checked_in_at,
            checkin_method: mCheckin?.checkin_method,
            checkin_id: mCheckin?.id,
          });
        }
      }
    }

    const totalRegistered = rosterItems.length;
    const checkedInCount = rosterItems.filter((i) => i.checked_in).length;
    const remainingCount = Math.max(0, totalRegistered - checkedInCount);
    const attendanceRate = totalRegistered > 0 ? Math.round((checkedInCount / totalRegistered) * 100) : 0;

    res.json({
      event: selectedEvent
        ? {
            id: selectedEvent.id,
            title: selectedEvent.title,
            date: selectedEvent.date,
            start_time: selectedEvent.start_time,
            venue: selectedEvent.venue,
          }
        : undefined,
      stats: {
        registered: totalRegistered,
        checked_in: checkedInCount,
        remaining: remainingCount,
        attendance_rate: attendanceRate,
      },
      roster: rosterItems,
    });
  });

  // REMOVE CHECK-IN
  adminRouter.delete('/checkins/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    const target = db.checkins.find((c) => c.id === req.params.id);
    db.checkins = db.checkins.filter((c) => c.id !== req.params.id);
    
    // If the registration had status Attended, revert to Confirmed if no other checkin remains for this reg
    if (target) {
      const otherCheckin = db.checkins.find((c) => c.registration_id === target.registration_id);
      if (!otherCheckin) {
        const reg = db.registrations.find((r) => r.id === target.registration_id);
        if (reg && reg.status === 'Attended') {
          reg.status = 'Confirmed';
        }
      }
    }

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
      gallery: Array.isArray(backupData.gallery) ? backupData.gallery : db.gallery,
      join_applications: Array.isArray(backupData.join_applications) ? backupData.join_applications : db.join_applications,
      registrations: Array.isArray(backupData.registrations) ? backupData.registrations : db.registrations,
      messages: Array.isArray(backupData.messages) ? backupData.messages : db.messages,
      admin_users: existingAdminUsers,
      certificates: Array.isArray(backupData.certificates) ? backupData.certificates : db.certificates,
      newsletter_subscribers: Array.isArray(backupData.newsletter_subscribers) ? backupData.newsletter_subscribers : db.newsletter_subscribers,
      newsletter_broadcasts: Array.isArray(backupData.newsletter_broadcasts) ? backupData.newsletter_broadcasts : db.newsletter_broadcasts,
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

-- 8. Gallery Images Table
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

-- 9. Contact Messages Table
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
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Read policies for public tables
CREATE POLICY "Allow public read on events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public read on announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow public read on team" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Allow public read on projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public read on gallery" ON public.gallery_images FOR SELECT USING (true);

-- Insert policies for public submissions
CREATE POLICY "Allow public join application submit" ON public.join_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public event registration" ON public.event_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public contact message submit" ON public.contact_messages FOR INSERT WITH CHECK (true);
`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(sql);
  });

  // 404 for unknown API endpoints
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
  });

  export async function startServer() {
    // In serverless environments like Vercel, the app is exported directly and listen is not needed
    if (isVercel) {
      console.log('[Serverless] IntelliGenZ API initialized for serverless runtime.');
      return;
    }

    const PORT = 3000;
    const httpServer = http.createServer(app);

    // Vite middleware for development vs static build in production
    if (process.env.NODE_ENV !== 'production') {
      const isHmrDisabled = process.env.DISABLE_HMR === 'true';
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: isHmrDisabled
            ? false
            : {
                server: httpServer,
              },
        },
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

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`⚡ INTELLIGENZ Club Server running on port ${PORT} [http://0.0.0.0:${PORT}]`);
      console.log(`🏛️ Institution: DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY`);
      console.log(`🤖 Department: Department of CSE (AIML) & AI`);
    });
  }

  export default app;

  if (!isVercel) {
    startServer().catch((err) => {
      console.error('Fatal server startup error:', err);
    });
  }
