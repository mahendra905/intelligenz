import type {
  EventStatus,
  EventCategory,
  ParticipationType,
  TeamMemberRegistration,
  EventWinner,
  Event,
  AnnouncementCategory,
  Announcement,
  ApplicationStatus,
  JoinApplication,
  EventRegistration,
  TeamCategory,
  TeamMember,
  ProjectCategory,
  Project,
  GalleryImage,
  ContactMessage,
  CommunityImpactStat,
  SiteStats as Stats,
  SiteSettings as AppSettings,
  CertificateType,
  Certificate,
  NewsletterSubscriber,
  NewsletterBroadcast,
} from '../src/types';

export type {
  EventStatus,
  EventCategory,
  ParticipationType,
  TeamMemberRegistration,
  EventWinner,
  Event,
  AnnouncementCategory,
  Announcement,
  ApplicationStatus,
  JoinApplication,
  EventRegistration,
  TeamCategory,
  TeamMember,
  ProjectCategory,
  Project,
  GalleryImage,
  ContactMessage,
  CommunityImpactStat,
  Stats,
  AppSettings,
  CertificateType,
  Certificate,
  NewsletterSubscriber,
  NewsletterBroadcast,
};

export interface AttendanceRecord {
  id: string;
  registration_id: string;
  event_id: string;
  event_title: string;
  participant_name: string;
  roll_number: string;
  email: string;
  department: string;
  checked_in_at: string;
  checkin_method: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  admin_email: string;
  details: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

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

export interface DatabaseSchema {
  settings: AppSettings;
  stats: Stats;
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
  audit_logs: AuditLogEntry[];
}
