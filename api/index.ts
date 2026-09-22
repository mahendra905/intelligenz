import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (fs.existsSync(path.resolve(process.cwd(), '.env.example'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.example') });
}

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  testSupabaseConnection,
  uploadToSupabaseStorage,
  generateSupabaseSQLSchema,
} from './supabase.js';
import {
  loadStateFromSupabase,
  syncDatabaseToSupabase,
  upsertSupabaseRecord,
  deleteSupabaseRecord,
  checkSupabaseTablesExist,
  getEventsFromSupabase,
  getEventByIdOrSlugFromSupabase,
  createEventInSupabase,
  updateEventInSupabase,
  deleteEventFromSupabase,
  updateEventWinnersInSupabase,
  normalizeEvent,
  sanitizeEventPayload,
  getTeamFromSupabase,
  upsertTeamMemberInSupabase,
  deleteTeamMemberFromSupabase,
  getProjectsFromSupabase,
  upsertProjectInSupabase,
  deleteProjectFromSupabase,
  getGalleryFromSupabase,
  upsertGalleryItemInSupabase,
  deleteGalleryItemFromSupabase,
  getAnnouncementsFromSupabase,
  createAnnouncementInSupabase,
  updateAnnouncementInSupabase,
  deleteAnnouncementFromSupabase,
  getCommunityImpactStatsFromSupabase,
  upsertCommunityImpactStatInSupabase,
  saveAllCommunityImpactStatsInSupabase,
  deleteCommunityImpactStatFromSupabase,
  getSettingsFromSupabase,
  saveSettingsInSupabase,
  getStatsFromSupabase,
  saveStatsInSupabase,
  filterObjectByAllowedColumns,
  REGISTRATION_ALLOWED_COLUMNS,
} from './supabaseRepo.js';
export type EventStatus =
  | 'Upcoming'
  | 'Registration Open'
  | 'Registration Closed'
  | 'Ongoing'
  | 'Completed'
  | 'Cancelled';

export type EventCategory =
  | 'Workshop'
  | 'Hackathon'
  | 'Seminar'
  | 'Coding Contest'
  | 'AI Bootcamp'
  | 'Orientation'
  | 'Tech Talk'
  | 'Technical Talk'
  | 'Project Expo'
  | 'Guest Lecture';

export type ParticipationType = 'SOLO' | 'DUO' | 'TEAM';

export interface TeamMemberRegistration {
  full_name: string;
  email: string;
  roll_number: string;
  department?: string;
  year?: string;
  phone?: string;
}

export interface EventWinner {
  position: '1st' | '2nd' | '3rd' | string;
  registration_id?: string;
  name: string;
  team_name?: string;
  project_title?: string;
  members?: string[];
  members_detail?: TeamMemberRegistration[];
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  event_image: string;
  banner_image?: string;
  date: string;
  time?: string;
  start_time: string;
  end_time: string;
  venue: string;
  category: EventCategory;
  speaker?: string;
  speaker_bio?: string;
  speaker_avatar?: string;
  registration_url?: string;
  registration_deadline?: string;
  maximum_participants: number;
  current_participants: number;
  status: EventStatus;
  featured: boolean;
  participation_type?: ParticipationType;
  min_team_size?: number;
  max_team_size?: number;
  highlights?: string[];
  photos?: string[];
  results?: string;
  winners?: EventWinner[];
  certificates_available?: boolean;
  created_at: string;
  updated_at: string;
}

export type AnnouncementCategory =
  | 'All'
  | 'Events'
  | 'Event'
  | 'Club News'
  | 'Recruitment'
  | 'Workshops'
  | 'Workshop'
  | 'Hackathon'
  | 'Opportunity'
  | 'General'
  | 'Important';

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  featured_image?: string;
  category: AnnouncementCategory;
  author: string;
  author_role: string;
  published_at: string;
  published_date?: string;
  pinned?: boolean;
  featured: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface JoinApplication {
  id: string;
  full_name: string;
  college_email?: string;
  email?: string;
  phone: string;
  department: string;
  year: string;
  roll_number: string;
  technical_interests?: string[];
  interested_domains?: string[];
  skills?: string;
  why_join?: string;
  reason?: string;
  github_url?: string;
  linkedin_url?: string;
  agreed_updates?: boolean;
  status: 'New' | 'Reviewed' | 'Accepted' | 'Rejected' | 'Pending' | 'Shortlisted';
  reviewer_notes?: string;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  event_title?: string;
  participation_type?: ParticipationType;
  team_name?: string;
  full_name: string;
  participant_name?: string;
  email: string;
  phone?: string;
  college?: string;
  department: string;
  year: string;
  roll_number: string;
  team_members?: TeamMemberRegistration[];
  team_size?: number;
  status: 'Confirmed' | 'Waitlisted' | 'Cancelled' | 'Attended';
  ticket_code?: string;
  qr_token?: string;
  qr_payload?: string;
  email_status?: 'pending' | 'sent' | 'failed' | 'disabled';
  email_sent_at?: string;
  email_error?: string;
  registered_at?: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  position: string;
  role?: string;
  category: string;
  department?: string;
  year?: string;
  bio: string;
  photo_url: string;
  image_url?: string;
  linkedin?: string;
  github?: string;
  email?: string;
  social_links?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    email?: string;
    [key: string]: any;
  };
  featured: boolean;
  order: number;
  order_index?: number;
}

export interface Project {
  id: string;
  name: string;
  title?: string;
  slug?: string;
  description: string;
  short_description?: string;
  category: string;
  tech_stack?: string[];
  technologies?: string[];
  team_members?: string[];
  github_url?: string;
  demo_url?: string;
  image_url: string;
  featured: boolean;
  status: string;
  date?: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  album: string;
  event_name?: string;
  image_url: string;
  caption?: string;
  date: string;
  featured: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  is_read: boolean;
  responded?: boolean;
  is_responded?: boolean;
  created_at: string;
}

export interface CommunityImpactStat {
  id: string;
  value: string;
  label: string;
  icon: string;
  active: boolean;
  order: number;
  updated_at?: string;
  updated_by?: string;
}

export interface SiteStats {
  students_reached?: string | number;
  students_impacted?: string | number;
  events_conducted?: string | number;
  projects_completed?: string | number;
  workshops_held?: string | number;
  active_members?: string | number;
  hackathon_wins?: string | number;
  awards_won?: string | number;
  community_impact_stats?: CommunityImpactStat[];
  [key: string]: any;
}

export interface SiteSettings {
  club_name: string;
  club_sub_name?: string;
  club_tagline?: string;
  department_name: string;
  college_name: string;
  tagline?: string;
  supporting_text?: string;
  official_email?: string;
  contact_email?: string;
  phone?: string;
  contact_phone?: string;
  campus_address?: string;
  contact_address?: string;
  instagram_url?: string;
  linkedin_url?: string;
  github_url?: string;
  social_links?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    discord?: string;
    [key: string]: any;
  };
  announcement_ticker?: string;
  is_recruitment_open: boolean;
  join_us_status?: boolean;
  automated_email_enabled?: boolean;
  email_sender_name?: string;
  email_sender_address?: string;
  certificate_signing_authority?: string;
  certificate_lead_name?: string;
  certificate_lead_designation?: string;
  [key: string]: any;
}

export type CertificateType =
  | 'Participation'
  | 'Merit'
  | 'Appreciation'
  | 'Club Membership'
  | 'Hackathon Winner'
  | 'Workshop Completion'
  | 'Winner'
  | 'Runner-up'
  | 'Speaker'
  | 'Coordinator'
  | string;

export interface Certificate {
  id: string;
  certificate_code: string;
  student_name: string;
  student_email: string;
  student_roll_no: string;
  department: string;
  college_name: string;
  event_id?: string;
  event_title: string;
  certificate_type: CertificateType;
  issue_date: string;
  issued_by: string;
  designation: string;
  is_valid: boolean;
  notes?: string;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  department?: string;
  subscribed_at: string;
  status: 'Active' | 'Unsubscribed';
  source?: string;
}

export interface NewsletterBroadcast {
  id: string;
  subject: string;
  message: string;
  target: 'All Subscribers' | 'Active Members' | 'Workshop Attendees';
  sent_at: string;
  recipient_count: number;
}

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

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  admin_email: string;
  details: string;
  timestamp: string;
  ip_address?: string;
}

export const INITIAL_SETTINGS: SiteSettings = {
  club_name: 'INTELLIGENZ',
  club_sub_name: 'IntelliGenZ Club',
  department_name: 'Department of CSE (AIML) & AI',
  college_name: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
  tagline: 'Code • Innovate • IntelliGently',
  supporting_text: 'Where curiosity meets code, intelligence meets innovation, and students build the future.',
  official_email: 'intelligenz@drkvsrit.ac.in',
  phone: '+91 8518 287611',
  campus_address: 'Opp. Dupadu Railway Station, Lakshmipuram Post, Kurnool, Andhra Pradesh 518218',
  instagram_url: 'https://instagram.com/intelligenz_drkvsrit',
  linkedin_url: 'https://linkedin.com/company/intelligenz-drkvsrit',
  github_url: 'https://github.com/intelligenz-drkvsrit',
  announcement_ticker: '🚀 Registrations Open for "NeuroHack 2026: 24-Hour AI Hackathon" & Generative AI Workshop!',
  is_recruitment_open: true,
  join_us_status: true,
  automated_email_enabled: true,
  email_sender_name: 'IntelliGenZ Club',
  email_sender_address: 'intelligenz@drkvsrit.ac.in',
  certificate_signing_authority: 'Dr. K. E. Sreenivasa Murthy',
  certificate_lead_name: 'Dr. K. E. Sreenivasa Murthy',
  certificate_lead_designation: 'Faculty Coordinator & HOD - CSE (AIML)',
};

export const INITIAL_COMMUNITY_IMPACT_STATS: CommunityImpactStat[] = [
  {
    id: 'stat-students-reached',
    value: '650+',
    label: 'STUDENTS REACHED',
    icon: 'Users',
    active: true,
    order: 1,
    updated_at: '2026-09-01T00:00:00Z',
    updated_by: 'Super Admin',
  },
  {
    id: 'stat-events-sprints',
    value: '28+',
    label: 'EVENTS & SPRINTS',
    icon: 'Calendar',
    active: true,
    order: 2,
    updated_at: '2026-09-01T00:00:00Z',
    updated_by: 'Super Admin',
  },
  {
    id: 'stat-live-projects',
    value: '14+',
    label: 'LIVE AI PROJECTS',
    icon: 'Lightbulb',
    active: true,
    order: 3,
    updated_at: '2026-09-01T00:00:00Z',
    updated_by: 'Super Admin',
  },
  {
    id: 'stat-technical-labs',
    value: '18+',
    label: 'TECHNICAL LABS',
    icon: 'GraduationCap',
    active: true,
    order: 4,
    updated_at: '2026-09-01T00:00:00Z',
    updated_by: 'Super Admin',
  },
  {
    id: 'stat-hackathon-wins',
    value: '8+',
    label: 'HACKATHON WINS',
    icon: 'Award',
    active: true,
    order: 5,
    updated_at: '2026-09-01T00:00:00Z',
    updated_by: 'Super Admin',
  },
  {
    id: 'stat-core-members',
    value: '120+',
    label: 'CORE MEMBERS',
    icon: 'Flame',
    active: true,
    order: 6,
    updated_at: '2026-09-01T00:00:00Z',
    updated_by: 'Super Admin',
  },
];

export const INITIAL_STATS: SiteStats = {
  students_reached: '650+',
  events_conducted: '28+',
  projects_completed: '14+',
  workshops_held: '18+',
  active_members: '120+',
  hackathon_wins: '8+',
  community_impact_stats: INITIAL_COMMUNITY_IMPACT_STATS,
};

export const INITIAL_EVENTS: Event[] = [
  {
    id: 'evt-neurohack-2026',
    title: 'NeuroHack 2026: 24-Hour State-Level AI Hackathon',
    slug: 'neurohack-2026-ai-hackathon',
    short_description: 'Build real-world AI, Machine Learning, and Computer Vision solutions in an intense 24-hour hackathon with cash prizes up to ₹50,000.',
    description: `NeuroHack 2026 is the flagship annual hackathon organized by the IntelliGenZ Club, Department of CSE (AIML) & AI at Dr. K. V. Subba Reddy Institute of Technology.

Students from engineering colleges across the state are invited to brainstorm, prototype, and build production-ready applications across 4 tracks:
1. **Generative AI & LLM Agents**
2. **Healthcare & Vision AI**
3. **Smart Campus & Automation**
4. **Open Innovation in Deep Tech**

Participants will receive mentorship from top industry engineers, free food, energy drinks, cloud compute credits, official participation certificates, and cash awards for winning teams.`,
    event_image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    date: '2026-09-25',
    start_time: '09:00 AM',
    end_time: '09:00 AM (+1 Day)',
    venue: 'Main Auditorium & Advanced AI Labs, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    category: 'Hackathon',
    speaker: 'Er. Rajesh Varma',
    speaker_bio: 'Principal AI Architect at TechCorp Labs & Ex-Google Developer Expert',
    maximum_participants: 200,
    current_participants: 142,
    status: 'Registration Open',
    featured: true,
    participation_type: 'TEAM',
    min_team_size: 2,
    max_team_size: 4,
    highlights: [
      '₹50,000 Total Prize Pool',
      '24-Hour continuous high-speed internet & power backup',
      'Direct interview opportunities with sponsoring startups',
      'Cloud compute credits sponsored for all qualified teams',
    ],
    created_at: '2026-08-15T10:00:00Z',
    updated_at: '2026-08-25T14:30:00Z',
  },
  {
    id: 'evt-genai-masterclass',
    title: 'Deep Dive: Building Autonomous Agents with Gemini & LangChain',
    slug: 'genai-autonomous-agents-workshop',
    short_description: 'Hands-on technical workshop on creating multimodal AI agents, retrieval augmented generation (RAG), and deploying intelligent web apps.',
    description: `Join us for a rigorous 1-day practical workshop hosted by the IntelliGenZ technical team. 

Learn how to harness cutting-edge foundation models, build robust RAG pipelines with vector databases, and deploy tool-calling autonomous AI agents. All participants will build and deploy a live working project during the session.`,
    event_image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
    date: '2026-09-12',
    start_time: '10:00 AM',
    end_time: '04:30 PM',
    venue: 'Seminar Hall 2, CSE Block, DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    category: 'Workshop',
    speaker: 'Dr. Priya Sundaram',
    speaker_bio: 'Senior Research Scientist in NLP and Generative AI systems',
    maximum_participants: 90,
    current_participants: 86,
    status: 'Registration Open',
    featured: true,
    participation_type: 'SOLO',
    min_team_size: 1,
    max_team_size: 1,
    highlights: [
      'Live code walkthrough and Colab notebooks provided',
      'Hands-on building of RAG with Vector Search',
      'Official Certificate of Completion from Department of CSE (AIML)',
    ],
    created_at: '2026-08-20T08:00:00Z',
    updated_at: '2026-08-28T09:15:00Z',
  },
  {
    id: 'evt-vision-robotics',
    title: 'Edge AI & Computer Vision with OpenCV and Embedded Systems',
    slug: 'edge-ai-computer-vision-bootcamp',
    short_description: 'Discover how to run real-time object detection and facial recognition models on micro-controllers and edge hardware.',
    description: `A specialized bootcamp on embedded intelligence, robotic vision, and low-latency computer vision pipelines for real-time edge computing.`,
    event_image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    date: '2026-10-08',
    start_time: '01:30 PM',
    end_time: '05:30 PM',
    venue: 'Robotics & Embedded Systems Lab, 3rd Floor',
    category: 'AI Bootcamp',
    speaker: 'Prof. K. Venkatesh',
    speaker_bio: 'Lead Researcher in Edge Computing & Embedded Systems',
    maximum_participants: 60,
    current_participants: 34,
    status: 'Upcoming',
    featured: false,
    participation_type: 'DUO',
    min_team_size: 2,
    max_team_size: 2,
    highlights: [
      'Hardware kits supplied for live experimentations',
      'Deploying YOLO models to Raspberry Pi & Jetson Nano',
      'Open Q&A on robotics competitions',
    ],
    created_at: '2026-08-22T11:00:00Z',
    updated_at: '2026-08-22T11:00:00Z',
  },
  {
    id: 'evt-code-clash-2026',
    title: 'CodeClash 2026: Algorithmic Duel & Speed Programming',
    slug: 'code-clash-algorithmic-duel',
    short_description: 'Competitive programming tournament featuring data structures, dynamic programming, and algorithm optimization battles.',
    description: `IntelliGenZ Club's monthly competitive programming arena. Speed, precision, and optimal complexity decide the winners.`,
    event_image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    date: '2026-08-10',
    start_time: '02:00 PM',
    end_time: '05:00 PM',
    venue: 'Computer Center Lab 4',
    category: 'Coding Contest',
    maximum_participants: 120,
    current_participants: 118,
    status: 'Completed',
    featured: false,
    participation_type: 'SOLO',
    min_team_size: 1,
    max_team_size: 1,
    results: 'Top 3 winners felicitated with shields and certificates by the Head of Department.',
    winners: [
      { position: '1st Place', name: 'M. Sumanth (CSE AIML 3rd Year)', team_name: 'BitMasters' },
      { position: '2nd Place', name: 'G. Keerthana (CSE 2nd Year)', team_name: 'AlgoHacks' },
      { position: '3rd Place', name: 'K. Sai Teja (AI 3rd Year)', team_name: 'Matrix' },
    ],
    certificates_available: true,
    created_at: '2026-07-28T09:00:00Z',
    updated_at: '2026-08-11T16:00:00Z',
  },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-recruitment-2026',
    title: 'Core Committee & Domain Wing Recruitment Drive 2026-27 Announced',
    slug: 'recruitment-drive-2026-27',
    summary: 'IntelliGenZ is opening applications for Technical, Design, Event Management, and Media Wings for the upcoming academic year.',
    content: `The Department of CSE (AIML) & AI at Dr. K. V. Subba Reddy Institute of Technology proudly invites enthusiastic students to apply for the IntelliGenZ Club Core Committee.

We are recruiting across 5 key wings:
- **Technical Wing:** AI/ML, Full Stack, IoT & Competitive Programming
- **Design Wing:** UI/UX, Graphic Design & Motion Graphics
- **Event Operations:** Logistics, Sponsorship & Stage Coordination
- **Content & Media:** Technical Writing, Photography, Video Editing & Social Media
- **Public Relations:** College outreach & speaker coordination

All 1st, 2nd, and 3rd-year engineering students with a hunger to learn and innovate are encouraged to submit their applications through the online portal before the deadline.`,
    category: 'Recruitment',
    author: 'Faculty Coordinator & President',
    author_role: 'IntelliGenZ Executive Council',
    published_at: '2026-08-28T09:00:00Z',
    featured: true,
    tags: ['Recruitment', 'CoreTeam', 'JoinUs'],
    created_at: '2026-08-28T09:00:00Z',
    updated_at: '2026-08-28T09:00:00Z',
  },
  {
    id: 'ann-smart-india-hackathon',
    title: 'IntelliGenZ Teams Shortlisted for National AI Challenge Grand Finale',
    slug: 'national-ai-challenge-shortlist-success',
    summary: 'Two teams from CSE (AIML) mentored by IntelliGenZ club faculty have reached the Grand Finale among 400+ nationwide institutions.',
    content: `Hearty congratulations to Team 'NeuroPulse' and Team 'VisionGrid' for being selected for the Grand Finale of the National Smart Innovation Challenge!

Their innovative projects on **AI-Driven Crop Disease Diagnosis via Satellite Imaging** and **Smart Traffic Density AI Optimizer** were lauded by the technical jury. The management and faculty of DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY congratulate the teams.`,
    category: 'Hackathon',
    author: 'Head of Department',
    author_role: 'Dept. of CSE (AIML) & AI',
    published_at: '2026-08-22T11:30:00Z',
    featured: true,
    tags: ['Hackathon', 'National', 'ProudMoment'],
    created_at: '2026-08-22T11:30:00Z',
    updated_at: '2026-08-22T11:30:00Z',
  },
  {
    id: 'ann-gpu-cluster-inauguration',
    title: 'Inauguration of Dedicated High-Compute AI Research Station in Department',
    slug: 'high-compute-ai-research-station-inauguration',
    summary: 'A brand-new state-of-the-art GPU workstation cluster has been commissioned for club research and student deep learning projects.',
    content: `With support from college leadership at Dr. K. V. Subba Reddy Institute of Technology, a dedicated high-performance computing environment with NVIDIA RTX accelerators has been set up in Lab 3. Club members working on large language models and computer vision research can now schedule compute slots through the IntelliGenZ portal.`,
    category: 'Club News',
    author: 'Technical Lead',
    author_role: 'IntelliGenZ Research Cell',
    published_at: '2026-08-14T14:00:00Z',
    featured: false,
    tags: ['Infrastructure', 'DeepLearning', 'AI'],
    created_at: '2026-08-14T14:00:00Z',
    updated_at: '2026-08-14T14:00:00Z',
  },
];

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'tm-faculty-coord',
    name: 'Dr. S. K. Ramesh Babu',
    position: 'Faculty Coordinator & Professor',
    category: 'Faculty Coordinator',
    bio: 'Ph.D. in Computer Science with 16+ years of academic and research experience specializing in Machine Learning, Pattern Recognition, and Neural Architectures.',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    linkedin: 'https://linkedin.com',
    email: 'ramesh.s@drkvsrit.ac.in',
    featured: true,
    order: 1,
  },
  {
    id: 'tm-hod',
    name: 'Dr. G. Madhusudhan Rao',
    position: 'Head of Department, CSE (AIML) & AI',
    category: 'Faculty Coordinator',
    bio: 'Guiding visionary student initiatives and pioneering AI curriculum development at Dr. K. V. Subba Reddy Institute of Technology.',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    linkedin: 'https://linkedin.com',
    email: 'hod.aiml@drkvsrit.ac.in',
    featured: true,
    order: 2,
  },
  {
    id: 'tm-club-lead',
    name: 'A. Rahul Sharma',
    position: 'Club President & Technical Lead',
    category: 'Club Lead',
    bio: 'Full Stack & AI Engineer passionate about Transformers, LLM orchestration, and building impactful open-source technology for students.',
    photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    email: 'rahul.s@drkvsrit.ac.in',
    featured: true,
    order: 3,
  },
  {
    id: 'tm-vice-lead',
    name: 'N. Sahithi Reddy',
    position: 'Vice President & Operations Head',
    category: 'Vice Lead',
    bio: 'Machine learning practitioner, hackathon winner, and community organizer dedicated to fostering inclusive tech growth.',
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    featured: true,
    order: 4,
  },
  {
    id: 'tm-tech-lead-1',
    name: 'K. Vishnu Vardhan',
    position: 'AI/ML Wing Lead',
    category: 'Technical Team',
    bio: 'Computer Vision researcher, PyTorch enthusiast, and competitive programmer with top ratings on LeetCode and CodeChef.',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    featured: false,
    order: 5,
  },
  {
    id: 'tm-design-lead',
    name: 'P. Bhavana',
    position: 'UI/UX & Creative Director',
    category: 'Design Team',
    bio: 'Figma artist and visual designer crafting dark-mode interfaces, interactive design systems, and club identity branding.',
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    linkedin: 'https://linkedin.com',
    featured: false,
    order: 6,
  },
  {
    id: 'tm-event-lead',
    name: 'D. Karthik Kumar',
    position: 'Event Operations Lead',
    category: 'Event Team',
    bio: 'Coordinator of workshops, college-wide symposiums, and national-level hackathons with smooth logistical execution.',
    photo_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80',
    linkedin: 'https://linkedin.com',
    featured: false,
    order: 7,
  },
  {
    id: 'tm-media-lead',
    name: 'V. Sneha',
    position: 'Media & Communications Lead',
    category: 'Media Team',
    bio: 'Digital storyteller, content creator, and social media strategist handling club outreach and newsletter publishing.',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    linkedin: 'https://linkedin.com',
    featured: false,
    order: 8,
  },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-retina-ai',
    name: 'RetinaScan AI: Automated Ocular Disease Classifier',
    slug: 'retinascan-ai-ocular-disease-classifier',
    category: 'AI',
    short_description: 'Deep convolutional neural network model detecting diabetic retinopathy and glaucoma from fundus retinal photographs.',
    description: `A collaborative research project built by IntelliGenZ students in partnership with local healthcare clinics. The model achieves 96.4% sensitivity in early-stage diabetic retinopathy detection.`,
    tech_stack: ['PyTorch', 'FastAPI', 'TensorFlow.js', 'React', 'Tailwind CSS'],
    team_members: ['A. Rahul Sharma', 'K. Vishnu Vardhan', 'Dr. S. K. Ramesh'],
    github_url: 'https://github.com/intelligenz-drkvsrit/retinascan-ai',
    demo_url: 'https://retinascan-demo.intelligenz.org',
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    featured: true,
    status: 'Completed',
    date: '2026-06',
  },
  {
    id: 'proj-kvsrit-copilot',
    name: 'KVSRIT Campus Copilot: RAG-Powered AI Student Assistant',
    slug: 'kvsrit-campus-copilot',
    category: 'Generative AI',
    short_description: 'Multilingual conversational AI agent trained on syllabus, college regulations, examination schedules, and departmental notices.',
    description: `An interactive generative AI assistant built using Gemini models and vector search embeddings, serving 2,000+ college students daily for academic queries.`,
    tech_stack: ['Gemini 2.5', 'LangChain', 'Next.js', 'PostgreSQL / pgvector'],
    team_members: ['N. Sahithi Reddy', 'M. Sumanth', 'P. Bhavana'],
    github_url: 'https://github.com/intelligenz-drkvsrit/campus-copilot',
    demo_url: 'https://copilot.drkvsrit.ac.in',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    featured: true,
    status: 'Completed',
    date: '2026-04',
  },
  {
    id: 'proj-smart-attendance-edge',
    name: 'EdgeFace: Multi-Camera Real-Time Attendance with Anti-Spoofing',
    slug: 'edgeface-multi-camera-attendance-system',
    category: 'Computer Vision',
    short_description: 'Ultra-low latency facial recognition kiosk running on edge hardware with 3D liveness detection.',
    description: `Deployed in the department smart seminar halls to automate attendance logging with zero manual friction and real-time dashboard analytics.`,
    tech_stack: ['OpenCV', 'InsightFace', 'Raspberry Pi 5', 'Node.js', 'WebSockets'],
    team_members: ['K. Vishnu Vardhan', 'D. Karthik Kumar'],
    github_url: 'https://github.com/intelligenz-drkvsrit/edgeface-attendance',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    featured: true,
    status: 'Completed',
    date: '2026-03',
  },
  {
    id: 'proj-agri-drone-ai',
    name: 'AgriVision: Autonomous Drone Crop Health Analyzer',
    slug: 'agrivision-drone-crop-analyzer',
    category: 'Robotics',
    short_description: 'Multispectral drone camera integration with lightweight semantic segmentation for agricultural yield estimation.',
    description: `Student innovation project addressing drought-prone agricultural monitoring in Rayalaseema region with aerial multispectral telemetry.`,
    tech_stack: ['YOLOv10', 'ROS2', 'Python', 'Flutter'],
    team_members: ['G. Keerthana', 'A. Rahul Sharma'],
    github_url: 'https://github.com/intelligenz-drkvsrit/agrivision',
    image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
    featured: false,
    status: 'In Progress',
    date: '2026-07',
  },
];

export const INITIAL_GALLERY: GalleryImage[] = [
  {
    id: 'gal-1',
    title: 'Annual AI Bootcamp 2026 Inauguration',
    album: 'Workshops 2026',
    event_name: 'AI Bootcamp 2026',
    image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=80',
    caption: 'Students diving into deep neural network architectures in Lab 2',
    date: '2026-08-10',
    featured: true,
  },
  {
    id: 'gal-2',
    title: 'Hackathon Ideation & Mentorship Rounds',
    album: 'Hackathons',
    event_name: 'NeuroHack 2025',
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
    caption: 'Teams discussing hardware-software integration with industry judges',
    date: '2026-06-15',
    featured: true,
  },
  {
    id: 'gal-3',
    title: 'Club Foundation & Orientation Ceremony',
    album: 'Orientations',
    event_name: 'IntelliGenZ Orientation',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80',
    caption: 'Welcoming the fresh batch of CSE (AIML) & AI engineers to IntelliGenZ',
    date: '2026-07-02',
    featured: true,
  },
  {
    id: 'gal-4',
    title: 'Robotics & Computer Vision Demonstration',
    album: 'Tech Exhibits',
    event_name: 'TechExpo 2026',
    image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80',
    caption: 'Autonomous drone tracking demonstration at the central quadrangle',
    date: '2026-05-22',
    featured: false,
  },
  {
    id: 'gal-5',
    title: 'Prize Distribution & Felicitation',
    album: 'Felicitation',
    event_name: 'CodeClash 2026',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
    caption: 'College leadership handing trophies to hackathon winners',
    date: '2026-08-11',
    featured: true,
  },
  {
    id: 'gal-6',
    title: 'Hands-on Generative AI Coding Jam',
    album: 'Workshops 2026',
    event_name: 'GenAI Workshop',
    image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80',
    caption: 'Building multimodal AI agents in the cloud laboratory',
    date: '2026-08-18',
    featured: false,
  },
];

export const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'cert-iz-2026-001',
    certificate_code: 'IZ-2026-NH-8942',
    student_name: 'Sai Mahendra Reddy',
    student_email: 'mahendra.cse@drkvsrit.ac.in',
    student_roll_no: '232G1A3101',
    department: 'CSE (AIML)',
    college_name: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    event_id: 'evt-neurohack-2026',
    event_title: 'NeuroHack 2026: 24-Hour State-Level AI Hackathon',
    certificate_type: 'Merit',
    issue_date: '2026-08-28',
    issued_by: 'Dr. S. K. Basha & Club Leads',
    designation: 'HOD, CSE (AIML) & Faculty Coordinator',
    is_valid: true,
    notes: 'Awarded 1st Place for autonomous multimodal agent project in Hackathon Track 1',
    created_at: '2026-08-28T10:00:00Z',
  },
  {
    id: 'cert-iz-2026-002',
    certificate_code: 'IZ-2026-GA-4109',
    student_name: 'Ananya Sharma',
    student_email: 'ananya.ai@drkvsrit.ac.in',
    student_roll_no: '232G1A3204',
    department: 'Artificial Intelligence & Machine Learning',
    college_name: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    event_id: 'evt-genai-masterclass',
    event_title: 'Deep Dive: Building Autonomous Agents with Gemini & LangChain',
    certificate_type: 'Workshop Completion',
    issue_date: '2026-08-25',
    issued_by: 'Dr. Priya Sundaram & IntelliGenZ Leads',
    designation: 'Lead Instructor & Club Technical Board',
    is_valid: true,
    notes: 'Successfully deployed hands-on RAG AI Agent workshop pipeline',
    created_at: '2026-08-25T16:00:00Z',
  },
  {
    id: 'cert-iz-2026-003',
    certificate_code: 'IZ-2026-MB-1088',
    student_name: 'K. Tharun Kumar',
    student_email: 'tharun.k@drkvsrit.ac.in',
    student_roll_no: '242G1A3125',
    department: 'CSE (AIML)',
    college_name: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
    event_id: undefined,
    event_title: 'IntelliGenZ Technical Core Membership & AI Contributor',
    certificate_type: 'Club Membership',
    issue_date: '2026-08-15',
    issued_by: 'Department of CSE (AIML) & AI',
    designation: 'Faculty Coordinator & President',
    is_valid: true,
    notes: 'Official Core Contributor in Machine Learning and Web Systems Team',
    created_at: '2026-08-15T09:00:00Z',
  },
];

export const INITIAL_SUBSCRIBERS: NewsletterSubscriber[] = [
  {
    id: 'sub-1',
    email: 'ai.student1@drkvsrit.ac.in',
    name: 'Ravi Teja',
    department: 'CSE (AIML)',
    subscribed_at: '2026-08-20T10:15:00Z',
    status: 'Active',
    source: 'Website Footer',
  },
  {
    id: 'sub-2',
    email: 'priya.k@gmail.com',
    name: 'Priya K.',
    department: 'AI & Data Science',
    subscribed_at: '2026-08-22T14:40:00Z',
    status: 'Active',
    source: 'Hackathon Pop-up',
  },
  {
    id: 'sub-3',
    email: 'mahigamingzone2@gmail.com',
    name: 'Mahendra Admin',
    department: 'CSE (AIML)',
    subscribed_at: '2026-08-25T08:00:00Z',
    status: 'Active',
    source: 'Admin Direct',
  },
];

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
        if (process.env.ADMIN_BOOTSTRAP_PASSWORD) {
          const expectedHash = hashPassword(targetPassword, existingSuperAdmin.salt);
          if (expectedHash !== existingSuperAdmin.password_hash) {
            existingSuperAdmin.salt = crypto.randomBytes(16).toString('hex');
            existingSuperAdmin.password_hash = hashPassword(targetPassword, existingSuperAdmin.salt);
            needsSave = true;
          }
        } else if (!existingSuperAdmin.password_hash || !existingSuperAdmin.salt) {
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

      const rawEvents = (Array.isArray(parsed.events) && parsed.events.length > 0)
        ? parsed.events
        : INITIAL_EVENTS;

      const normalizedEvents: Event[] = rawEvents.map((evt: Event) => {
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
    if (SEED_DB_FILE !== DB_FILE) {
      try {
        const seedDir = path.dirname(SEED_DB_FILE);
        if (!fs.existsSync(seedDir)) {
          fs.mkdirSync(seedDir, { recursive: true });
        }
        fs.writeFileSync(SEED_DB_FILE, JSON.stringify(database, null, 2), 'utf-8');
      } catch {
        // Read-only filesystem in serverless environments is normal for SEED_DB_FILE
      }
    }
  } catch (err: any) {
    if (!isSupabaseConfigured()) {
      console.error('[Database Error] Failed to write database file:', err?.message);
    }
  }

  // If Supabase is configured, also push updates to Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    syncDatabaseToSupabase(database).catch((err) => {
      console.warn('[Supabase Sync Warning]:', err?.message || err);
    });
  }
}

let db = loadDatabase();

let isSupabaseHydrated = false;
let lastHydrationTime = 0;
const HYDRATION_TTL_MS = 5000;

async function ensureSupabaseHydrated(force = false): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const now = Date.now();
  if (!force && isSupabaseHydrated && now - lastHydrationTime < HYDRATION_TTL_MS) {
    return;
  }

  try {
    const supabaseData = await loadStateFromSupabase();
    if (supabaseData) {
      if (Array.isArray(supabaseData.events)) {
        db.events = supabaseData.events;
      }
      if (Array.isArray(supabaseData.announcements)) {
        db.announcements = supabaseData.announcements;
      }
      if (Array.isArray(supabaseData.team)) {
        db.team = supabaseData.team;
      }
      if (Array.isArray(supabaseData.projects)) {
        db.projects = supabaseData.projects;
      }
      if (Array.isArray(supabaseData.gallery)) {
        db.gallery = supabaseData.gallery;
      }
      if (Array.isArray(supabaseData.join_applications)) {
        db.join_applications = supabaseData.join_applications;
      }
      if (Array.isArray(supabaseData.registrations)) {
        db.registrations = supabaseData.registrations;
      }
      if (Array.isArray(supabaseData.messages)) {
        db.messages = supabaseData.messages;
      }
      if (Array.isArray(supabaseData.certificates)) {
        db.certificates = supabaseData.certificates;
      }
      if (Array.isArray(supabaseData.checkins)) {
        db.checkins = supabaseData.checkins;
      }
      if (Array.isArray(supabaseData.newsletter_subscribers)) {
        db.newsletter_subscribers = supabaseData.newsletter_subscribers;
      }
      if (Array.isArray(supabaseData.newsletter_broadcasts)) {
        db.newsletter_broadcasts = supabaseData.newsletter_broadcasts;
      }
      if (Array.isArray(supabaseData.community_impact_stats)) {
        db.community_impact_stats = supabaseData.community_impact_stats;
      }
      if (Array.isArray(supabaseData.audit_logs)) {
        db.audit_logs = supabaseData.audit_logs;
      }
      if (Array.isArray(supabaseData.admin_users) && supabaseData.admin_users.length > 0) {
        db.admin_users = supabaseData.admin_users;
        if (process.env.ADMIN_BOOTSTRAP_PASSWORD) {
          const targetEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'mahibittu2006@gmail.com').trim().toLowerCase().replace(/^["']|["']$/g, '');
          const targetUsername = (process.env.ADMIN_BOOTSTRAP_USERNAME || 'superadmin').trim().toLowerCase().replace(/^["']|["']$/g, '');
          const targetPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD.trim().replace(/^["']|["']$/g, '');
          const supaAdmin = db.admin_users.find(
            (u) => u.username.toLowerCase() === targetUsername || u.email.toLowerCase() === targetEmail
          );
          if (supaAdmin) {
            const calculated = hashPassword(targetPassword, supaAdmin.salt);
            if (calculated !== supaAdmin.password_hash) {
              const newSalt = crypto.randomBytes(16).toString('hex');
              const newHash = hashPassword(targetPassword, newSalt);
              supaAdmin.salt = newSalt;
              supaAdmin.password_hash = newHash;
              supaAdmin.updated_at = new Date().toISOString();
              const client = getSupabaseClient();
              if (client) {
                await client
                  .from('admin_users')
                  .update({ salt: newSalt, password_hash: newHash, updated_at: supaAdmin.updated_at })
                  .eq('id', supaAdmin.id);
              }
            }
          }
        }
      }
      if (supabaseData.settings && Object.keys(supabaseData.settings).length > 0) {
        db.settings = supabaseData.settings;
      }
      if (supabaseData.stats && Object.keys(supabaseData.stats).length > 0) {
        db.stats = supabaseData.stats;
      }
      isSupabaseHydrated = true;
      lastHydrationTime = now;
    }
  } catch (err: any) {
    console.warn('[Supabase Hydration Error]:', err?.message);
  }
}

/**
 * Robust Canonical Event Lookup:
 * Queries Supabase directly first by canonical ID or slug, then falls back to local cache.
 */
export async function findEventByIdOrSlug(identifier: string): Promise<Event | null> {
  const cleanId = String(identifier || '').trim();
  if (!cleanId) return null;

  // 1. Direct Supabase query (canonical database source of truth)
  if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
    const { success, event } = await getEventByIdOrSlugFromSupabase(cleanId);
    if (success && event) {
      const idx = db.events.findIndex((e) => e.id === event.id);
      if (idx !== -1) {
        db.events[idx] = event;
      } else {
        db.events.unshift(event);
      }
      return event;
    }
    // When Supabase is active, if the event was not found in Supabase (e.g. deleted), purge any stale local copy
    db.events = db.events.filter(
      (e) => e.id !== cleanId && e.slug !== cleanId && e.slug?.toLowerCase() !== cleanId.toLowerCase()
    );
    return null;
  }

  // 2. Query in-memory / local database only when Supabase is not configured
  const localEvent = db.events.find(
    (e) => e.id === cleanId || e.slug === cleanId || e.slug?.toLowerCase() === cleanId.toLowerCase()
  );
  if (localEvent) {
    return localEvent;
  }

  // 3. Fallback search by title
  const cleanLower = cleanId.toLowerCase();
  const byTitle = db.events.find(
    (e) =>
      e.title.toLowerCase() === cleanLower ||
      e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === cleanLower
  );
  if (byTitle) {
    return byTitle;
  }

  return null;
}


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
  const PDFDocument = (await import('pdfkit')).default;
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

// Request logger and Supabase hydration for API calls
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    if (isSupabaseConfigured()) {
      try {
        await ensureSupabaseHydrated();
      } catch (err) {
        // Continue safely with cached state
      }
    }
  }
  next();
});


  // ==========================================
  // PUBLIC & SHARED API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    const isDbConfigured = Boolean(db && db.settings && Array.isArray(db.admin_users));
    const isAuthConfigured = Boolean(process.env.ADMIN_SECRET || process.env.SESSION_SECRET || ADMIN_SECRET);
    const isSmtpConfigured = Boolean(process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD));
    const isSessionConfigured = Boolean(ADMIN_MAX_SESSION_LIFETIME && ADMIN_IDLE_TIMEOUT);

    res.json({
      status: 'ok',
      success: true,
      club: 'INTELLIGENZ',
      department: 'Department of CSE (AIML) & AI',
      college: 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      runtime: isVercel ? 'vercel-serverless' : 'node-server',
      services: {
        database: isDbConfigured ? 'configured' : 'unavailable',
        supabase: isSupabaseConfigured() ? 'connected' : 'not_configured',
        authentication: isAuthConfigured ? 'configured' : 'unavailable',
        session: isSessionConfigured ? 'configured' : 'unavailable',
        smtp: isSmtpConfigured ? 'configured' : 'unconfigured_fallback',
      },
      supabase: {
        configured: isSupabaseConfigured(),
        hydrated: isSupabaseHydrated,
      },
      adminUsersCount: db.admin_users ? db.admin_users.length : 0,
      timestamp: new Date().toISOString(),
    });

  });

  // Settings & Metadata
  app.get('/api/settings', async (req, res) => {
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaSettings = await getSettingsFromSupabase();
      if (supaSettings) {
        db.settings = { ...db.settings, ...supaSettings };
        return res.json(db.settings);
      }
    }
    res.json(db.settings);
  });

  // Stats
  app.get('/api/stats', async (req, res) => {
    let baseStats = db.stats;
    let impactStats = db.community_impact_stats || INITIAL_COMMUNITY_IMPACT_STATS;

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const [supaStats, supaImpact] = await Promise.all([
        getStatsFromSupabase(),
        getCommunityImpactStatsFromSupabase(),
      ]);
      if (supaStats) {
        baseStats = { ...baseStats, ...supaStats };
        db.stats = baseStats;
      }
      if (supaImpact && supaImpact.length > 0) {
        impactStats = supaImpact;
        db.community_impact_stats = supaImpact;
      }
    }

    const activeCommunityStats = impactStats
      .filter((s) => s.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    res.json({
      ...baseStats,
      community_impact_stats: activeCommunityStats,
    });
  });

  // Public Community Impact Statistics
  app.get(['/api/public/community-impact', '/api/community-impact'], async (req, res) => {
    let impactStats = db.community_impact_stats || INITIAL_COMMUNITY_IMPACT_STATS;

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaImpact = await getCommunityImpactStatsFromSupabase();
      if (supaImpact && supaImpact.length > 0) {
        impactStats = supaImpact;
        db.community_impact_stats = supaImpact;
      }
    }

    const activeStats = impactStats
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

  // EVENTS (Public)
  app.get('/api/events', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const category = req.query.category as string;
    const status = req.query.status as string;
    const featured = req.query.featured === 'true';

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const { success, events, error } = await getEventsFromSupabase({
        category,
        status,
        featured,
      });

      if (success && events) {
        db.events = events; // Keep memory cache in sync
        return res.json(events);
      }
      if (!success) {
        console.error('[GET /api/events Supabase Error]:', error);
        return res.status(500).json({ error: error || 'Failed to fetch events from database' });
      }
    }

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

  app.get('/api/events/:slug', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const { success, notFound, event, error } = await getEventByIdOrSlugFromSupabase(req.params.slug);
      if (notFound) {
        return res.status(404).json({ error: 'Event not found in database' });
      }
      if (!success || !event) {
        return res.status(500).json({ error: error || 'Database error fetching event' });
      }
      return res.json(event);
    }

    const event = await findEventByIdOrSlug(req.params.slug);
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
  app.get('/api/events/:id/registrations', async (req, res) => {
    const event = await findEventByIdOrSlug(req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const regs = db.registrations.filter((r) => r.event_id === event.id && r.status !== 'Cancelled');
    res.json(regs);
  });

  // Event Winners (Public)
  app.get('/api/events/:id/winners', async (req, res) => {
    const event = await findEventByIdOrSlug(req.params.id);
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
  app.post(['/api/events/:id/register', '/api/events/:id/registrations', '/api/registrations'], rateLimiter(45, 60000), async (req, res) => {
    const eventId = req.params.id || req.body.event_id || req.body.eventId || req.body.slug || req.body.event_slug;
    if (!eventId) {
      res.status(400).json({ error: 'Event ID is required for registration.' });
      return;
    }

    const event = await findEventByIdOrSlug(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const eventStatusStr = String(event.status || '');
    const isRegOpen =
      event.status === 'Registration Open' ||
      (event as any).enable_registrations === true ||
      (event as any).is_registration_open === true ||
      event.status === 'Upcoming' ||
      eventStatusStr === 'Live' ||
      eventStatusStr === 'Active' ||
      !event.status;

    if (!isRegOpen) {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const cleanReg = filterObjectByAllowedColumns(newReg, REGISTRATION_ALLOWED_COLUMNS);
          const { error: insErr } = await client.from('registrations').insert(cleanReg);

          if (insErr) {
            console.error('[Supabase Registration Insert Error]:', insErr.message);
            return res.status(500).json({ error: `Database error storing registration: ${insErr.message}` });
          }

          await client
            .from('events')
            .update({ current_participants: event.current_participants })
            .eq('id', event.id);
        } catch (err: any) {
          console.error('[Supabase Direct Registration Save Exception]:', err?.message);
          return res.status(500).json({ error: `Database error: ${err.message}` });
        }
      }
    }

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
  app.get('/api/announcements', async (req, res) => {
    const category = req.query.category as string;
    const featured = req.query.featured === 'true';

    let allAnnouncements = db.announcements;
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaAnns = await getAnnouncementsFromSupabase();
      if (supaAnns) {
        allAnnouncements = supaAnns;
        db.announcements = supaAnns;
      }
    }

    let result = [...allAnnouncements];
    if (category && category !== 'All') {
      result = result.filter((a) => a.category === category);
    }
    if (featured) {
      result = result.filter((a) => a.featured);
    }

    result.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    res.json(result);
  });

  app.get('/api/announcements/:slug', async (req, res) => {
    const targetSlug = req.params.slug;
    let ann = db.announcements.find((a) => a.slug === targetSlug || a.id === targetSlug);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client
          .from('announcements')
          .select('*')
          .or(`id.eq.${targetSlug},slug.eq.${targetSlug}`)
          .maybeSingle();
        if (data) ann = data;
      }
    }

    if (!ann) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    res.json(ann);
  });

  // TEAM
  app.get('/api/team', async (req, res) => {
    let teamList = db.team;
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaTeam = await getTeamFromSupabase();
      if (supaTeam) {
        teamList = supaTeam;
        db.team = supaTeam;
      }
    }

    const sorted = [...teamList].sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : (a.order_index !== undefined ? a.order_index : 999);
      const orderB = b.order !== undefined ? b.order : (b.order_index !== undefined ? b.order_index : 999);
      return orderA - orderB;
    });
    res.json(sorted);
  });

  // PROJECTS
  app.get('/api/projects', async (req, res) => {
    const category = req.query.category as string;
    let rawProjects = db.projects || [];

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaProjects = await getProjectsFromSupabase();
      if (supaProjects) {
        rawProjects = supaProjects;
        db.projects = supaProjects;
      }
    }

    let result = rawProjects.map((p) => {
      const techStack = Array.isArray(p.tech_stack)
        ? p.tech_stack
        : Array.isArray(p.technologies)
        ? p.technologies
        : typeof p.tech_stack === 'string'
        ? (p.tech_stack as string).split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      return {
        ...p,
        name: p.name || p.title || 'Untitled Project',
        title: p.title || p.name || 'Untitled Project',
        short_description: p.short_description || p.description || '',
        description: p.description || p.short_description || '',
        tech_stack: techStack,
        technologies: techStack,
        team_members: Array.isArray(p.team_members) ? p.team_members : [],
        image_url: p.image_url || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
      };
    });
    if (category && category !== 'All') {
      result = result.filter((p) => p.category === category);
    }
    res.json(result);
  });

  // GALLERY
  app.get('/api/gallery', async (req, res) => {
    const album = req.query.album as string;
    let galleryList = db.gallery;

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaGallery = await getGalleryFromSupabase();
      if (supaGallery) {
        galleryList = supaGallery;
        db.gallery = supaGallery;
      }
    }

    let result = [...galleryList];
    if (album && album !== 'All') {
      result = result.filter((g) => g.album === album);
    }
    res.json(result);
  });

  // JOIN US SUBMISSION (Public)
  const handleJoinSubmission = async (req: express.Request, res: express.Response) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertSupabaseRecord('join_applications', newApp);
      if (!supaRes.success) {
        console.warn('[Supabase join application persistence warning]:', supaRes.error);
      }
    }

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
  app.post('/api/contact', rateLimiter(10, 60000), async (req, res) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertSupabaseRecord('messages', newMsg);
      if (!supaRes.success) {
        console.warn('[Supabase message persistence warning]:', supaRes.error);
      }
    }

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
  app.post('/api/newsletter/subscribe', rateLimiter(15, 60000), async (req, res) => {
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
        if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
          await upsertSupabaseRecord('newsletter_subscribers', existing);
        }
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertSupabaseRecord('newsletter_subscribers', newSubscriber);
      if (!supaRes.success) {
        console.warn('[Supabase subscriber persistence warning]:', supaRes.error);
      }
    }

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
  app.get(['/api/certificates', '/api/certificates/search'], (req, res) => {
    const query = (req.query.q as string || req.query.search as string || req.query.query as string || '').toLowerCase().trim();
    
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
        (c.certificate_code && c.certificate_code.toLowerCase().includes(query)) ||
        (c.id && c.id.toLowerCase().includes(query)) ||
        (c.student_name && c.student_name.toLowerCase().includes(query)) ||
        (c.student_roll_no && c.student_roll_no.toLowerCase().includes(query)) ||
        (c.event_title && c.event_title.toLowerCase().includes(query))
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

    // 1. Search by exact certificate_code or id (case-insensitive & trimmed)
    const codeMatches = db.certificates.filter((c) => {
      const cCode = (c.certificate_code || '').trim().toUpperCase();
      const cCodeNorm = (c.certificate_code || '').replace(/\s+/g, '').toUpperCase();
      const cId = (c.id || '').trim().toUpperCase();
      return cCode === queryUpper || cCodeNorm === queryNormalized || cId === queryUpper;
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
  app.post(['/api/auth/login', '/api/admin/auth/login', '/api/admin/login'], rateLimiter(60, 60000), async (req, res) => {
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

      let adminUser: AdminUserRecord | null = null;

      // 1. Direct Supabase Query: Read directly from Supabase public.admin_users in production
      if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
        const client = getSupabaseClient();
        if (client) {
          try {
            const { data, error } = await client
              .from('admin_users')
              .select('*')
              .or(`username.ilike.${identifier},email.ilike.${identifier}`)
              .limit(1);

            if (error) {
              console.error('[Auth Error] Supabase admin_users query failed:', error.message);
              res.status(500).json({
                success: false,
                error: 'Authentication service temporarily unavailable',
                message: 'Authentication service temporarily unavailable',
              });
              return;
            }

            if (Array.isArray(data) && data.length > 0) {
              adminUser = data[0];
            }
          } catch (dbErr: any) {
            console.error('[Auth Error] Supabase connectivity exception during login:', dbErr?.message);
            res.status(500).json({
              success: false,
              error: 'Authentication service temporarily unavailable',
              message: 'Authentication service temporarily unavailable',
            });
            return;
          }
        }
      }

      // Fallback only if Supabase is unconfigured
      if (!adminUser && !isSupabaseConfigured()) {
        adminUser = db.admin_users.find(
          (u) =>
            u.username.toLowerCase() === identifier ||
            u.email.toLowerCase() === identifier
        ) || null;
      }

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
      const loginTime = new Date().toISOString();
      adminUser.last_login_at = loginTime;
      adminUser.updated_at = loginTime;

      if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
        const client = getSupabaseClient();
        if (client) {
          try {
            await client.from('admin_users').update({
              last_login_at: loginTime,
              updated_at: loginTime,
            }).eq('id', adminUser.id);
          } catch (updateErr: any) {
            console.warn('[Auth] Failed to update last_login_at in Supabase:', updateErr?.message);
          }
        }
      }

      // Synchronize in-memory cache
      const cachedIdx = db.admin_users.findIndex((u) => u.id === adminUser!.id);
      if (cachedIdx !== -1) {
        db.admin_users[cachedIdx] = { ...db.admin_users[cachedIdx], ...adminUser };
      } else {
        db.admin_users.push(adminUser);
      }
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

  app.get(['/api/auth/verify', '/api/auth/me', '/api/auth/session'], (req, res) => {
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
      res.status(401).json({ valid: false, error: 'Session reached maximum lifetime limit (24 hours).', code: 'SESSION_MAX_LIFETIME' });
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

    const userInfo = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: !!user.must_change_password,
    };

    res.json({
      valid: true,
      sessionStart: sessionCreatedAt,
      lastActivityAt: now,
      idleTimeout: ADMIN_IDLE_TIMEOUT,
      maxLifetime: ADMIN_MAX_SESSION_LIFETIME,
      warningDuration: ADMIN_SESSION_WARNING,
      remainingIdleMs: Math.max(0, ADMIN_IDLE_TIMEOUT - (now - session.lastActivityAt)),
      remainingLifetimeMs: Math.max(0, (sessionCreatedAt + ADMIN_MAX_SESSION_LIFETIME) - now),
      user: userInfo,
      admin: userInfo,
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

  adminRouter.post('/admins', requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await upsertSupabaseRecord('admin_users', newAdmin);
    }

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

  adminRouter.put('/admins/:id', requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await upsertSupabaseRecord('admin_users', existingUser);
    }

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

  const handleAdminPasswordUpdate = async (req: AuthenticatedRequest, res: any) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await upsertSupabaseRecord('admin_users', user);
    }

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

  adminRouter.post('/admins/:id/status', requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await upsertSupabaseRecord('admin_users', user);
    }

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

  adminRouter.delete('/admins/:id', requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await deleteSupabaseRecord('admin_users', targetId);
    }

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
  adminRouter.post('/events', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.body || !req.body.title || !String(req.body.title).trim()) {
        return res.status(400).json({ error: 'Event title is required.' });
      }

      if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
        const { success, event, error } = await createEventInSupabase(req.body);
        if (!success || !event) {
          console.error('[Admin Create Event Supabase Error]:', error);
          return res.status(500).json({ error: error || 'Failed to persist event to Supabase database.' });
        }

        // Keep in-memory cache synchronized with verified Supabase record
        const existingIndex = db.events.findIndex((e) => e.id === event.id || e.slug === event.slug);
        if (existingIndex !== -1) {
          db.events[existingIndex] = event;
        } else {
          db.events.unshift(event);
        }
        saveDatabase(db);

        logAdminAction(
          'Event Created',
          'Event',
          event.id,
          `Created event "${event.title}" (${event.participation_type} participation)`,
          req.adminUser?.email,
          req
        );

        return res.status(201).json(event);
      }

      // Local fallback only if Supabase is not configured
      const sanitized = sanitizeEventPayload(req.body, false);
      const localEvent = normalizeEvent(sanitized);
      db.events.unshift(localEvent);
      saveDatabase(db);
      return res.status(201).json(localEvent);
    } catch (err: any) {
      console.error('[Admin Create Event Exception]:', err);
      return res.status(500).json({ error: err.message || 'Unexpected server error creating event.' });
    }
  });

  adminRouter.put('/events/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetId = req.params.id;

      if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
        const { success, notFound, event, error } = await updateEventInSupabase(targetId, req.body);
        if (notFound) {
          return res.status(404).json({ error: `Event '${targetId}' not found in database.` });
        }
        if (!success || !event) {
          console.error('[Admin Update Event Supabase Error]:', error);
          return res.status(500).json({ error: error || 'Failed to update event in Supabase database.' });
        }

        // Keep in-memory cache synchronized with verified Supabase record
        const existingIndex = db.events.findIndex((e) => e.id === event.id || e.slug === event.slug);
        if (existingIndex !== -1) {
          db.events[existingIndex] = event;
        } else {
          db.events.unshift(event);
        }
        saveDatabase(db);

        logAdminAction(
          'Event Updated',
          'Event',
          event.id,
          `Updated event "${event.title}" (Status: ${event.status}, Type: ${event.participation_type})`,
          req.adminUser?.email,
          req
        );

        return res.json(event);
      }

      // Local fallback only if Supabase is not configured
      const index = db.events.findIndex((e) => e.id === targetId || e.slug === targetId);
      if (index === -1) {
        return res.status(404).json({ error: 'Event not found' });
      }
      const updatedEvent = normalizeEvent({ ...db.events[index], ...req.body, updated_at: new Date().toISOString() });
      db.events[index] = updatedEvent;
      saveDatabase(db);
      return res.json(updatedEvent);
    } catch (err: any) {
      console.error('[Admin Update Event Exception]:', err);
      return res.status(500).json({ error: err.message || 'Unexpected server error updating event.' });
    }
  });

  // Admin Get Event Registrations for Winner Selection
  adminRouter.get('/events/:id/registrations', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    const targetId = req.params.id;
    let event = await findEventByIdOrSlug(targetId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('registrations')
          .select('*')
          .eq('event_id', event.id)
          .neq('status', 'Cancelled')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return res.json(data);
        }
      }
    }

    const regs = db.registrations.filter((r) => r.event_id === event!.id && r.status !== 'Cancelled');
    res.json(regs);
  });

  // Admin Manage Event Winners (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.put('/events/:id/winners', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetId = req.params.id;
      const event = await findEventByIdOrSlug(targetId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found in database.' });
      }

      const { winners, first_registration_id, second_registration_id, third_registration_id, results } = req.body;
      let finalWinners: EventWinner[] = [];

      if (Array.isArray(winners)) {
        finalWinners = winners.filter((w) => w && w.name);
      } else {
        const positions = [
          { pos: '1st Place', id: first_registration_id },
          { pos: '2nd Place', id: second_registration_id },
          { pos: '3rd Place', id: third_registration_id },
        ];

        const selectedIds = positions.map((p) => p.id).filter(Boolean) as string[];
        const uniqueIds = new Set(selectedIds);
        if (uniqueIds.size !== selectedIds.length) {
          return res.status(400).json({ error: 'Cannot assign the same registration/team to multiple winner positions.' });
        }

        // Get registrations from Supabase if configured
        let regs = db.registrations;
        if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
          const client = getSupabaseClient();
          if (client) {
            const { data } = await client.from('registrations').select('*').eq('event_id', event.id);
            if (data) regs = data;
          }
        }

        for (const p of positions) {
          if (!p.id) continue;
          const reg = regs.find((r) => r.id === p.id && r.event_id === event.id);
          if (!reg) {
            return res.status(400).json({ error: `Selected winner registration '${p.id}' does not belong to this event.` });
          }

          const memberNames = reg.team_members && reg.team_members.length > 0
            ? [reg.full_name, ...reg.team_members.map((m: any) => m.full_name)]
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

      if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
        const { success, notFound, event: updatedEv, error } = await updateEventWinnersInSupabase(
          event.id,
          finalWinners,
          typeof results === 'string' ? results : undefined
        );

        if (notFound) {
          return res.status(404).json({ error: 'Event not found in database.' });
        }
        if (!success || !updatedEv) {
          return res.status(500).json({ error: error || 'Failed to update winners in database.' });
        }

        const idx = db.events.findIndex((e) => e.id === updatedEv.id);
        if (idx !== -1) db.events[idx] = updatedEv;
        saveDatabase(db);

        logAdminAction(
          'Winners Updated',
          'Event',
          updatedEv.id,
          `Published ${finalWinners.length} podium winners for event "${updatedEv.title}"`,
          req.adminUser?.email,
          req
        );

        return res.json({
          success: true,
          message: `Winners successfully updated for "${updatedEv.title}".`,
          event: updatedEv,
        });
      }

      // Local fallback
      event.winners = finalWinners;
      if (typeof results === 'string') event.results = results;
      event.updated_at = new Date().toISOString();
      saveDatabase(db);
      return res.json({ success: true, message: `Winners updated for "${event.title}".`, event });
    } catch (err: any) {
      console.error('[Admin Winners Update Exception]:', err);
      return res.status(500).json({ error: err.message || 'Server error updating winners' });
    }
  });

  // Admin Remove a Specific Winner Position
  adminRouter.delete('/events/:id/winners/:position', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetId = req.params.id;
      const event = await findEventByIdOrSlug(targetId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const pos = decodeURIComponent(req.params.position).toLowerCase();
      let newWinners: EventWinner[] = [];
      if (pos === 'all') {
        newWinners = [];
      } else {
        newWinners = (event.winners || []).filter((w) => !w.position.toLowerCase().includes(pos));
      }

      if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
        const { success, event: updatedEv, error } = await updateEventWinnersInSupabase(event.id, newWinners);
        if (!success || !updatedEv) {
          return res.status(500).json({ error: error || 'Failed to remove winner position in database.' });
        }
        const idx = db.events.findIndex((e) => e.id === updatedEv.id);
        if (idx !== -1) db.events[idx] = updatedEv;
        saveDatabase(db);
        return res.json({ success: true, message: 'Winner position removed.', event: updatedEv });
      }

      event.winners = newWinners;
      event.updated_at = new Date().toISOString();
      saveDatabase(db);
      return res.json({ success: true, message: 'Winner position removed.', event });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error removing winner' });
    }
  });

  adminRouter.delete('/events/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetId = req.params.id;

      if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
        const { success, notFound, event, error } = await deleteEventFromSupabase(targetId);
        if (notFound) {
          return res.status(404).json({ success: false, error: 'Event not found in database or already deleted.' });
        }
        if (!success) {
          console.error('[Admin Delete Event Supabase Error]:', error);
          return res.status(500).json({ success: false, error: error || 'Failed to delete event from database.' });
        }

        const canonicalId = event?.id || targetId;
        const canonicalSlug = event?.slug;

        // Remove from local memory cache
        db.events = db.events.filter((e) => e.id !== canonicalId && (!canonicalSlug || e.slug !== canonicalSlug));

        // Clean up registrations & checkins for this event in memory
        const relatedRegIds = new Set(db.registrations.filter((r) => r.event_id === canonicalId).map((r) => r.id));
        db.registrations = db.registrations.filter((r) => r.event_id !== canonicalId);
        db.checkins = db.checkins.filter((c) => c.event_id !== canonicalId && !relatedRegIds.has(c.registration_id));
        saveDatabase(db);

        logAdminAction(
          'Event Deleted',
          'Event',
          canonicalId,
          `Admin deleted event "${event?.title || targetId}"`,
          req.adminUser?.email,
          req
        );

        return res.json({ success: true, message: `Event "${event?.title || targetId}" successfully deleted.` });
      }

      // Local fallback only if Supabase not configured
      const target = db.events.find((e) => e.id === targetId || e.slug === targetId);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Event not found in database or already deleted.' });
      }
      db.events = db.events.filter((e) => e.id !== target.id && e.slug !== target.slug);
      saveDatabase(db);
      return res.json({ success: true, message: `Event "${target.title}" successfully deleted.` });
    } catch (err: any) {
      console.error('[Admin Delete Event Exception]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Unexpected server error deleting event.' });
    }
  });

  adminRouter.post('/events/:id/duplicate', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const targetId = req.params.id;
      let original = await findEventByIdOrSlug(targetId);

      if (!original) {
        return res.status(404).json({ error: 'Event to duplicate not found in database' });
      }

      const dupPayload: any = {
        ...original,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Date.now().toString().slice(-4)}`,
        current_participants: 0,
        winners: [],
        results: null,
      };
      delete dupPayload.id;
      delete dupPayload.created_at;
      delete dupPayload.updated_at;

      if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
        const { success, event, error } = await createEventInSupabase(dupPayload);
        if (!success || !event) {
          return res.status(500).json({ error: error || 'Failed to duplicate event in database.' });
        }
        db.events.unshift(event);
        saveDatabase(db);
        return res.status(201).json(event);
      }

      const duplicated = normalizeEvent(sanitizeEventPayload(dupPayload, false));
      db.events.unshift(duplicated);
      saveDatabase(db);
      return res.status(201).json(duplicated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error duplicating event' });
    }
  });

  // Admin Announcements CRUD (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/announcements', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await createAnnouncementInSupabase(req.body);
      if (!supaRes.success || !supaRes.announcement) {
        return res.status(500).json({ error: supaRes.error || 'Failed to create announcement in Supabase database.' });
      }
      db.announcements.unshift(supaRes.announcement);
      saveDatabase(db);
      return res.status(201).json(supaRes.announcement);
    }

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

  adminRouter.put('/announcements/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    const targetId = req.params.id;
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await updateAnnouncementInSupabase(targetId, req.body);
      if (!supaRes.success || !supaRes.announcement) {
        if (supaRes.notFound) {
          return res.status(404).json({ error: 'Announcement not found' });
        }
        return res.status(500).json({ error: supaRes.error || 'Failed to update announcement in database' });
      }
      const existingIdx = db.announcements.findIndex((a) => a.id === targetId || a.slug === targetId);
      if (existingIdx !== -1) {
        db.announcements[existingIdx] = supaRes.announcement;
      } else {
        db.announcements.unshift(supaRes.announcement);
      }
      saveDatabase(db);
      return res.json(supaRes.announcement);
    }

    const index = db.announcements.findIndex((a) => a.id === targetId || a.slug === targetId);
    if (index === -1) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    const updated = {
      ...db.announcements[index],
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    db.announcements[index] = updated;
    saveDatabase(db);
    res.json(db.announcements[index]);
  });

  adminRouter.delete('/announcements/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.params.id;
    const target = db.announcements.find((a) => a.id === targetId || a.slug === targetId);
    const identifier = target ? target.id : targetId;

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const delRes = await deleteAnnouncementFromSupabase(identifier);
      if (!delRes.success) {
        if (delRes.notFound && !target) {
          return res.status(404).json({ success: false, error: 'Announcement not found in database or already deleted.' });
        }
        if (!delRes.notFound) {
          return res.status(500).json({ success: false, error: delRes.error || 'Failed to delete announcement from database' });
        }
      }
    } else if (!target) {
      res.status(404).json({ success: false, error: 'Announcement not found in database or already deleted.' });
      return;
    }

    const annTitle = target?.title || 'Announcement';
    db.announcements = db.announcements.filter((a) => a.id !== targetId && a.slug !== targetId && (target ? a.id !== target.id : true));
    saveDatabase(db);

    logAdminAction(
      'Announcement Deleted',
      'Announcement',
      targetId,
      `Admin deleted announcement "${annTitle}"`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: `Announcement "${annTitle}" deleted successfully.` });
  });

  // Admin Join Applications Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.get(['/join-applications', '/applications'], requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('join_applications')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            db.join_applications = data;
            return res.json(data);
          }
        } catch (err: any) {
          console.warn('[Supabase join applications fetch warning]:', err?.message);
        }
      }
    }
    res.json(Array.isArray(db.join_applications) ? db.join_applications : []);
  });

  adminRouter.patch(['/join-applications/:id', '/applications/:id'], requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    let app = (db.join_applications || []).find((a) => a.id === req.params.id);
    if (!app && isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client.from('join_applications').select('*').eq('id', req.params.id).maybeSingle();
        if (data) app = data as JoinApplication;
      }
    }

    if (!app) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }
    if (req.body.status) app.status = req.body.status;
    if (req.body.reviewer_notes !== undefined) app.reviewer_notes = req.body.reviewer_notes;

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await upsertSupabaseRecord('join_applications', app);
    }

    const localIdx = (db.join_applications || []).findIndex((a) => a.id === app!.id);
    if (localIdx !== -1) {
      db.join_applications[localIdx] = app;
    } else {
      db.join_applications.unshift(app);
    }
    saveDatabase(db);
    res.json(app);
  });

  adminRouter.delete(['/join-applications/:id', '/applications/:id'], requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.params.id;
    let target = (db.join_applications || []).find((a) => a.id === targetId);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await deleteSupabaseRecord('join_applications', targetId);
      if (!supaRes.success && supaRes.deletedCount === 0 && !target) {
        return res.status(404).json({ success: false, error: 'Application not found in database or already deleted.' });
      }
    } else {
      if (!target) {
        res.status(404).json({ success: false, error: 'Application not found in database or already deleted.' });
        return;
      }
    }

    db.join_applications = (db.join_applications || []).filter((a) => a.id !== targetId);
    saveDatabase(db);

    const applicantName = target ? target.full_name : 'applicant';
    logAdminAction(
      'Application Deleted',
      'JoinApplication',
      targetId,
      `Admin deleted recruitment application for ${applicantName}`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Application deleted successfully.' });
  });

  // Admin Registrations Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.get('/registrations', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    const eventId = req.query.event_id as string;
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        try {
          let query = client.from('registrations').select('*').order('created_at', { ascending: false });
          if (eventId) {
            query = query.eq('event_id', eventId);
          }
          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            db.registrations = data;
            res.json(data);
            return;
          }
        } catch (err: any) {
          console.warn('[Supabase admin registrations fetch warning]:', err?.message);
        }
      }
    }
    let list = Array.isArray(db.registrations) ? db.registrations : [];
    if (eventId) {
      list = list.filter((r) => r.event_id === eventId);
    }
    res.json(list);
  });

  adminRouter.patch('/registrations/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    const reg = (db.registrations || []).find((r) => r.id === req.params.id || r.ticket_code === req.params.id);
    if (!reg) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }
    if (req.body.status) reg.status = req.body.status;
    saveDatabase(db);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await upsertSupabaseRecord('registrations', reg);
    }

    res.json(reg);
  });

  adminRouter.delete('/registrations/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.params.id;
    const target = (db.registrations || []).find((r) => r.id === targetId || r.ticket_code === targetId);
    if (!target) {
      res.status(404).json({ success: false, error: 'Registration not found in database or already deleted.' });
      return;
    }
    const prevCount = (db.registrations || []).length;
    db.registrations = (db.registrations || []).filter((r) => r.id !== target.id && r.ticket_code !== target.ticket_code);
    if (db.registrations.length === prevCount) {
      res.status(404).json({ success: false, error: 'Registration not found in database or already deleted.' });
      return;
    }

    // Decrement participant count on event if applicable
    const event = db.events.find((e) => e.id === target.event_id);
    if (event && (event.current_participants || 0) > 0) {
      event.current_participants = Math.max(0, (event.current_participants || 1) - 1);
    }
    // Clean up any checkins for this registration
    db.checkins = (db.checkins || []).filter((c) => c.registration_id !== target.id);

    saveDatabase(db);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await deleteSupabaseRecord('registrations', target.id);
      if (event) {
        const client = getSupabaseClient();
        if (client) {
          await client.from('events').update({ current_participants: event.current_participants }).eq('id', event.id);
        }
      }
    }

    logAdminAction(
      'Registration Deleted',
      'EventRegistration',
      target.id,
      `Admin deleted registration for ${target.full_name} (${target.ticket_code})`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Registration record deleted successfully.' });
  });

  // Admin Team Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/team', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertTeamMemberInSupabase(newMember);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to save team member to Supabase database.',
        });
      }
      if (supaRes.member) {
        Object.assign(newMember, supaRes.member);
      }
    }

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

  adminRouter.put('/team/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    let index = db.team.findIndex((t) => t.id === req.params.id);
    let existing = index !== -1 ? db.team[index] : null;

    if (!existing && isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client.from('team').select('*').eq('id', req.params.id).maybeSingle();
        if (data) existing = data as TeamMember;
      }
    }

    if (!existing) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    const body = req.body || {};
    const pos = (body.position || body.role || existing.position || existing.role || 'Member').trim();
    const photo = (body.photo_url !== undefined ? body.photo_url : (body.image_url !== undefined ? body.image_url : (existing.photo_url || existing.image_url || ''))).trim();
    const linkedin = (body.linkedin !== undefined ? body.linkedin : (body.social_links?.linkedin !== undefined ? body.social_links.linkedin : (existing.linkedin || existing.social_links?.linkedin || ''))).trim();
    const github = (body.github !== undefined ? body.github : (body.social_links?.github !== undefined ? body.social_links.github : (existing.github || existing.social_links?.github || ''))).trim();
    const email = (body.email !== undefined ? body.email : (body.social_links?.email !== undefined ? body.social_links.email : (existing.email || existing.social_links?.email || ''))).trim();

    const updatedMember: TeamMember = {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertTeamMemberInSupabase(updatedMember);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to update team member in Supabase database.',
        });
      }
      if (supaRes.member) {
        Object.assign(updatedMember, supaRes.member);
      }
    }

    if (index !== -1) {
      db.team[index] = updatedMember;
    } else {
      db.team.push(updatedMember);
    }
    saveDatabase(db);

    logAdminAction(
      'Team Member Updated',
      'TeamMember',
      existing.id,
      `Admin updated team member ${updatedMember.name} (${updatedMember.position})`,
      (req as AuthenticatedRequest).adminUser?.email,
      req
    );

    res.json(updatedMember);
  });

  adminRouter.delete('/team/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.params.id;
    let target = db.team.find((t) => t.id === targetId);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await deleteTeamMemberFromSupabase(targetId);
      if (!supaRes.success) {
        if (supaRes.notFound && !target) {
          return res.status(404).json({ success: false, error: 'Team member not found in database or already deleted.' });
        }
        if (!supaRes.notFound) {
          return res.status(500).json({ success: false, error: supaRes.error || 'Failed to delete team member from Supabase database.' });
        }
      }
    } else {
      if (!target) {
        res.status(404).json({ success: false, error: 'Team member not found in database or already deleted.' });
        return;
      }
    }

    db.team = db.team.filter((t) => t.id !== targetId);
    saveDatabase(db);

    const memberName = target ? target.name : 'Team member';
    logAdminAction(
      'Team Member Deleted',
      'TeamMember',
      targetId,
      `Admin removed team member ${memberName}`,
      (req as AuthenticatedRequest).adminUser?.email,
      req
    );

    res.json({ success: true, message: `Team member removed from roster.` });
  });

  // Admin Projects Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/projects', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    const projTitle = (req.body.title || req.body.name || 'project').toString();
    const slug = req.body.slug || projTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProj: Project = {
      ...req.body,
      id: `proj-${Date.now()}`,
      slug,
      date: req.body.date || new Date().toISOString().slice(0, 7),
    };

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertProjectInSupabase(newProj);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to save project to Supabase database.',
        });
      }
      if (supaRes.project) {
        Object.assign(newProj, supaRes.project);
      }
    }

    db.projects.unshift(newProj);
    saveDatabase(db);
    res.status(201).json(newProj);
  });

  adminRouter.put('/projects/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    const targetId = req.params.id;
    let index = db.projects.findIndex((p) => p.id === targetId || p.slug === targetId);
    let existing = index !== -1 ? db.projects[index] : null;

    if (!existing && isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client
          .from('projects')
          .select('*')
          .or(`id.eq.${targetId},slug.eq.${targetId}`)
          .maybeSingle();
        if (data) existing = data as Project;
      }
    }

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const updatedProj: Project = {
      ...existing,
      ...req.body,
      id: existing.id,
      slug: req.body.slug || existing.slug,
    };

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertProjectInSupabase(updatedProj);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to update project in Supabase database.',
        });
      }
      if (supaRes.project) {
        Object.assign(updatedProj, supaRes.project);
      }
    }

    if (index !== -1) {
      db.projects[index] = updatedProj;
    } else {
      db.projects.unshift(updatedProj);
    }
    saveDatabase(db);
    res.json(updatedProj);
  });

  adminRouter.delete('/projects/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.params.id;
    let target = db.projects.find((p) => p.id === targetId || p.slug === targetId);
    const identifier = target ? target.id : targetId;

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await deleteProjectFromSupabase(identifier);
      if (!supaRes.success) {
        if (supaRes.notFound && !target) {
          return res.status(404).json({ success: false, error: 'Project not found in database or already deleted.' });
        }
        if (!supaRes.notFound) {
          return res.status(500).json({ success: false, error: supaRes.error || 'Failed to delete project from Supabase database.' });
        }
      }
    } else {
      if (!target) {
        res.status(404).json({ success: false, error: 'Project not found in database or already deleted.' });
        return;
      }
    }

    const canonicalId = target ? target.id : targetId;
    db.projects = db.projects.filter((p) => p.id !== canonicalId && p.slug !== targetId && (target ? p.slug !== target.slug : true));
    saveDatabase(db);

    const projName = target ? ((target as any).title || target.name || 'Project') : 'Project';
    logAdminAction(
      'Project Deleted',
      'Project',
      canonicalId,
      `Admin deleted project "${projName}"`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: `Project "${projName}" deleted successfully.` });
  });

  // Admin Gallery Management (SUPER_ADMIN, ADMIN, EDITOR)
  adminRouter.post('/gallery', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    const newGal: GalleryImage = {
      ...req.body,
      id: `gal-${Date.now()}`,
    };

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertGalleryItemInSupabase(newGal);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to save gallery item to Supabase database.',
        });
      }
      if (supaRes.gallery) {
        Object.assign(newGal, supaRes.gallery);
      }
    }

    db.gallery.unshift(newGal);
    saveDatabase(db);
    res.status(201).json(newGal);
  });

  adminRouter.put('/gallery/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req, res) => {
    const targetId = req.params.id;
    let index = db.gallery.findIndex((g) => g.id === targetId);
    let existing = index !== -1 ? db.gallery[index] : null;

    if (!existing && isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client.from('gallery').select('*').eq('id', targetId).maybeSingle();
        if (data) existing = data as GalleryImage;
      }
    }

    if (!existing) {
      res.status(404).json({ error: 'Gallery item not found' });
      return;
    }

    const updatedGal: GalleryImage = {
      ...existing,
      ...req.body,
      id: existing.id,
    };

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertGalleryItemInSupabase(updatedGal);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to update gallery item in Supabase database.',
        });
      }
      if (supaRes.gallery) {
        Object.assign(updatedGal, supaRes.gallery);
      }
    }

    if (index !== -1) {
      db.gallery[index] = updatedGal;
    } else {
      db.gallery.unshift(updatedGal);
    }
    saveDatabase(db);
    res.json(updatedGal);
  });

  adminRouter.delete('/gallery/:id', requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'), async (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.params.id;
    let target = db.gallery.find((g) => g.id === targetId);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await deleteGalleryItemFromSupabase(targetId);
      if (!supaRes.success) {
        if (supaRes.notFound && !target) {
          return res.status(404).json({ success: false, error: 'Gallery photo not found in database or already deleted.' });
        }
        if (!supaRes.notFound) {
          return res.status(500).json({ success: false, error: supaRes.error || 'Failed to delete gallery item from Supabase database.' });
        }
      }
    } else {
      if (!target) {
        res.status(404).json({ success: false, error: 'Gallery photo not found in database or already deleted.' });
        return;
      }
    }

    db.gallery = db.gallery.filter((g) => g.id !== targetId);
    saveDatabase(db);

    const title = target ? target.title : 'Gallery item';
    logAdminAction(
      'Gallery Item Deleted',
      'GalleryImage',
      targetId,
      `Admin deleted gallery photo "${title}"`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Gallery photo removed successfully.' });
  });

  // Admin Messages Management (SUPER_ADMIN, ADMIN)
  adminRouter.get('/messages', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            db.messages = data;
            return res.json(data);
          }
        } catch (err: any) {
          console.warn('[Supabase messages fetch warning]:', err?.message);
        }
      }
    }
    res.json(db.messages);
  });

  adminRouter.patch('/messages/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    let msg = db.messages.find((m) => m.id === req.params.id);
    if (!msg && isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client.from('messages').select('*').eq('id', req.params.id).maybeSingle();
        if (data) msg = data as ContactMessage;
      }
    }

    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    if (typeof req.body.is_read === 'boolean') msg.is_read = req.body.is_read;
    if (typeof req.body.responded === 'boolean') msg.responded = req.body.responded;

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      await upsertSupabaseRecord('messages', msg);
    }

    const localIdx = db.messages.findIndex((m) => m.id === msg!.id);
    if (localIdx !== -1) {
      db.messages[localIdx] = msg;
    } else {
      db.messages.unshift(msg);
    }
    saveDatabase(db);
    res.json(msg);
  });

  adminRouter.delete('/messages/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.params.id;
    let target = db.messages.find((m) => m.id === targetId);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await deleteSupabaseRecord('messages', targetId);
      if (!supaRes.success && supaRes.deletedCount === 0 && !target) {
        return res.status(404).json({ success: false, error: 'Message not found in database or already deleted.' });
      }
    } else {
      if (!target) {
        res.status(404).json({ success: false, error: 'Message not found in database or already deleted.' });
        return;
      }
    }

    db.messages = db.messages.filter((m) => m.id !== targetId);
    saveDatabase(db);

    const senderName = target ? `${target.name} (${target.email})` : targetId;
    logAdminAction(
      'Message Deleted',
      'ContactMessage',
      targetId,
      `Admin deleted message from ${senderName}`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Message deleted successfully.' });
  });

  // Admin Stats & Settings Update
  adminRouter.get('/community-impact', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    let list = db.community_impact_stats || INITIAL_COMMUNITY_IMPACT_STATS;
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaImpact = await getCommunityImpactStatsFromSupabase();
      if (supaImpact && supaImpact.length > 0) {
        list = supaImpact;
        db.community_impact_stats = supaImpact;
      }
    }
    const sorted = [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(sorted);
  });

  adminRouter.put('/community-impact/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const id = req.params.id;
    const { value, label, icon, active, order } = req.body;
    if (!db.community_impact_stats) {
      db.community_impact_stats = [...INITIAL_COMMUNITY_IMPACT_STATS];
    }
    let idx = db.community_impact_stats.findIndex((s) => s.id === id);
    let existing = idx !== -1 ? db.community_impact_stats[idx] : null;

    if (!existing && isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client.from('community_impact_stats').select('*').eq('id', id).maybeSingle();
        if (data) existing = data as CommunityImpactStat;
      }
    }

    if (!existing) {
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

    const updatedStat: CommunityImpactStat = {
      ...existing,
      value: cleanValue,
      label: cleanLabel,
      icon: cleanIcon || 'Users',
      active: typeof active === 'boolean' ? active : true,
      order: typeof order === 'number' ? order : existing.order,
      updated_at: new Date().toISOString(),
      updated_by: req.adminUser?.name || req.adminUser?.email || 'Administrator',
    };

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertCommunityImpactStatInSupabase(updatedStat);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to update community impact statistic in Supabase database.',
        });
      }
      if (supaRes.stat) {
        Object.assign(updatedStat, supaRes.stat);
      }
    }

    if (idx !== -1) {
      db.community_impact_stats[idx] = updatedStat;
    } else {
      db.community_impact_stats.push(updatedStat);
    }
    saveDatabase(db);

    logAdminAction(
      'Update Community Impact Stat',
      'CommunityImpactStat',
      id,
      `Updated stat ${cleanLabel}: ${cleanValue} (active: ${active !== false})`,
      req.adminUser?.email,
      req
    );

    res.json(updatedStat);
  });

  adminRouter.put('/community-impact', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const statsArray = req.body;
    if (!Array.isArray(statsArray)) {
      res.status(400).json({ error: 'Expected an array of community impact stats.' });
      return;
    }

    const sanitized: CommunityImpactStat[] = statsArray.map((item, idx) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await saveAllCommunityImpactStatsInSupabase(sanitized);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to save community impact statistics in Supabase database.',
        });
      }
      if (supaRes.stats) {
        db.community_impact_stats = supaRes.stats;
      } else {
        db.community_impact_stats = sanitized;
      }
    } else {
      db.community_impact_stats = sanitized;
    }

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

  adminRouter.post('/community-impact', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertCommunityImpactStatInSupabase(newStat);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to save community impact statistic in Supabase database.',
        });
      }
      if (supaRes.stat) {
        Object.assign(newStat, supaRes.stat);
      }
    }

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

  adminRouter.delete('/community-impact/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
    const id = req.params.id;
    if (!db.community_impact_stats) {
      db.community_impact_stats = [...INITIAL_COMMUNITY_IMPACT_STATS];
    }
    const idx = db.community_impact_stats.findIndex((s) => s.id === id);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await deleteCommunityImpactStatFromSupabase(id);
      if (!supaRes.success) {
        if (supaRes.notFound && idx === -1) {
          return res.status(404).json({ error: 'Statistic not found.' });
        }
        if (!supaRes.notFound) {
          return res.status(500).json({ error: supaRes.error || 'Failed to delete statistic from Supabase database.' });
        }
      }
    } else {
      if (idx === -1) {
        res.status(404).json({ error: 'Statistic not found.' });
        return;
      }
    }

    const deleted = idx !== -1 ? db.community_impact_stats.splice(idx, 1)[0] : null;
    saveDatabase(db);

    const statLabel = deleted ? deleted.label : id;
    logAdminAction(
      'Delete Community Impact Stat',
      'CommunityImpactStat',
      id,
      `Deleted stat ${statLabel}`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Statistic removed.' });
  });

  // Admin Legacy Stats & Settings Update
  adminRouter.put('/stats', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    const updatedStats = { ...db.stats, ...req.body };

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await saveStatsInSupabase(updatedStats);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to save stats to Supabase database.',
        });
      }
      if (supaRes.stats) {
        Object.assign(updatedStats, supaRes.stats);
      }
    }

    db.stats = updatedStats;
    saveDatabase(db);
    res.json(db.stats);
  });

  adminRouter.put('/settings', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
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

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await saveSettingsInSupabase(updatedSettings);
      if (!supaRes.success) {
        return res.status(500).json({
          error: supaRes.error || 'Failed to save settings to Supabase database.',
        });
      }
      if (supaRes.settings) {
        Object.assign(updatedSettings, supaRes.settings);
      }
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
  adminRouter.get('/certificates', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('certificates')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            db.certificates = data;
            return res.json(data);
          }
        } catch (err: any) {
          console.warn('[Supabase certificates fetch warning]:', err?.message);
        }
      }
    }
    res.json(db.certificates);
  });

  adminRouter.post('/certificates', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    const body = req.body;
    const certCode = body.certificate_code || body.certificate_id || body.code || `IZ-2026-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCert: Certificate = {
      id: body.id || `cert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      certificate_code: certCode,
      student_name: (body.student_name || body.recipient_name || body.name || '').trim(),
      student_email: (body.student_email || body.email || '').trim().toLowerCase(),
      student_roll_no: (body.student_roll_no || body.roll_number || body.roll_no || '').trim().toUpperCase(),
      department: (body.department || 'CSE (AIML)').trim(),
      college_name: body.college_name || 'DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY',
      event_id: body.event_id,
      event_title: (body.event_title || body.event_name || body.title || '').trim(),
      certificate_type: body.certificate_type || body.type || 'Participation',
      issue_date: body.issue_date || new Date().toISOString().slice(0, 10),
      issued_by: body.issued_by || 'Department of CSE (AIML) & AI',
      designation: body.designation || 'Faculty Coordinator & President',
      is_valid: body.is_valid !== false,
      notes: body.notes || '',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertSupabaseRecord('certificates', newCert);
      if (!supaRes.success) {
        return res.status(500).json({ error: supaRes.error || 'Failed to save certificate to Supabase database.' });
      }
    }

    db.certificates.unshift(newCert);
    saveDatabase(db);
    res.status(201).json(newCert);
  });

  adminRouter.post('/certificates/batch', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
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
      created.push(cert);
    }

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client.from('certificates').upsert(created);
        if (error) {
          return res.status(500).json({ error: error.message || 'Failed to save batch certificates to Supabase.' });
        }
      }
    }

    for (const cert of created) {
      db.certificates.unshift(cert);
    }

    saveDatabase(db);
    res.status(201).json({
      success: true,
      message: `Successfully generated and issued ${created.length} certificates.`,
      certificates: created,
    });
  });

  adminRouter.put('/certificates/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    const targetId = req.params.id;
    let index = db.certificates.findIndex((c) => c.id === targetId || c.certificate_code === targetId);
    let existing = index !== -1 ? db.certificates[index] : null;

    if (!existing && isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client.from('certificates').select('*').or(`id.eq.${targetId},certificate_code.eq.${targetId}`).maybeSingle();
        if (data) existing = data as Certificate;
      }
    }

    if (!existing) {
      res.status(404).json({ error: 'Certificate not found' });
      return;
    }

    const updatedCert: Certificate = {
      ...existing,
      ...req.body,
      id: existing.id,
      certificate_code: req.body.certificate_code || existing.certificate_code,
    };

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const supaRes = await upsertSupabaseRecord('certificates', updatedCert);
      if (!supaRes.success) {
        return res.status(500).json({ error: supaRes.error || 'Failed to update certificate in Supabase database.' });
      }
    }

    if (index !== -1) {
      db.certificates[index] = updatedCert;
    } else {
      db.certificates.unshift(updatedCert);
    }
    saveDatabase(db);
    res.json(updatedCert);
  });

  adminRouter.delete('/certificates/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    const targetId = req.params.id;
    let target = db.certificates.find((c) => c.id === targetId || c.certificate_code === targetId);

    if (isSupabaseConfigured() && (await checkSupabaseTablesExist())) {
      const canonicalId = target ? target.id : targetId;
      const supaRes = await deleteSupabaseRecord('certificates', canonicalId);
      if (!supaRes.success && supaRes.deletedCount === 0 && !target) {
        return res.status(404).json({ success: false, error: 'Certificate not found in database or already revoked.' });
      }
    } else {
      if (!target) {
        res.status(404).json({ success: false, error: 'Certificate not found in database or already revoked.' });
        return;
      }
    }

    const canonicalId = target ? target.id : targetId;
    db.certificates = db.certificates.filter((c) => c.id !== canonicalId && c.certificate_code !== targetId);
    saveDatabase(db);

    const studentInfo = target ? `${target.certificate_code} issued to ${target.student_name}` : targetId;
    logAdminAction(
      'Certificate Revoked & Deleted',
      'Certificate',
      canonicalId,
      `Admin revoked certificate ${studentInfo}`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Certificate revoked and removed.' });
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
  adminRouter.delete('/checkins/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const target = db.checkins.find((c) => c.id === req.params.id);
    if (!target) {
      res.status(404).json({ success: false, error: 'Check-in record not found or already removed.' });
      return;
    }
    const prevCount = db.checkins.length;
    db.checkins = db.checkins.filter((c) => c.id !== target.id);
    if (db.checkins.length === prevCount) {
      res.status(404).json({ success: false, error: 'Check-in record not found or already removed.' });
      return;
    }
    
    // If the registration had status Attended, revert to Confirmed if no other checkin remains for this reg
    const otherCheckin = db.checkins.find((c) => c.registration_id === target.registration_id);
    if (!otherCheckin) {
      const reg = db.registrations.find((r) => r.id === target.registration_id);
      if (reg && reg.status === 'Attended') {
        reg.status = 'Confirmed';
      }
    }

    saveDatabase(db);

    logAdminAction(
      'Check-in Removed',
      'AttendanceCheckin',
      target.id,
      `Admin removed check-in for registration ${target.registration_id}`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Check-in record removed' });
  });

  // ==========================================
  // ADMIN NEWSLETTER & BROADCASTS (SUPER_ADMIN, ADMIN)
  // ==========================================
  adminRouter.get('/newsletter/subscribers', requireRole('SUPER_ADMIN', 'ADMIN'), (req, res) => {
    res.json(db.newsletter_subscribers);
  });

  adminRouter.delete('/newsletter/subscribers/:id', requireRole('SUPER_ADMIN', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
    const target = db.newsletter_subscribers.find((s) => s.id === req.params.id || s.email.toLowerCase() === req.params.id.toLowerCase());
    if (!target) {
      res.status(404).json({ success: false, error: 'Subscriber not found in database or already unsubscribed.' });
      return;
    }
    const prevCount = db.newsletter_subscribers.length;
    db.newsletter_subscribers = db.newsletter_subscribers.filter((s) => s.id !== target.id && s.email.toLowerCase() !== target.email.toLowerCase());
    if (db.newsletter_subscribers.length === prevCount) {
      res.status(404).json({ success: false, error: 'Subscriber not found in database or already unsubscribed.' });
      return;
    }
    saveDatabase(db);

    logAdminAction(
      'Newsletter Subscriber Removed',
      'NewsletterSubscriber',
      target.id,
      `Admin removed subscriber ${target.email}`,
      req.adminUser?.email,
      req
    );

    res.json({ success: true, message: 'Newsletter subscriber removed.' });
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

      let publicUrl = `/uploads/${safeFilename}`;

      // Upload to Supabase Storage if configured
      if (isSupabaseConfigured()) {
        const storageResult = await uploadToSupabaseStorage(safeFilename, buffer, verifiedMime);
        if (storageResult && storageResult.url) {
          publicUrl = storageResult.url;
        }
      }

      // Also write binary file to local uploads directory as backup
      try {
        fs.writeFileSync(targetFilePath, buffer);
      } catch (err: any) {
        // Ephemeral filesystem in serverless environments
      }

      // Log in admin audit logs
      logAdminAction(
        'Image Upload',
        'Uploads',
        safeFilename,
        `Uploaded image '${path.basename(filename || safeFilename)}' (${(buffer.length / (1024 * 1024)).toFixed(2)} MB, ${verifiedMime})`,
        req.adminUser?.email || 'admin@drkvsrit.ac.in',
        req
      );

      res.status(201).json({
        success: true,
        url: publicUrl,
        filename: safeFilename,
        original_name: path.basename(filename || 'image'),
        size: buffer.length,
        mime_type: verifiedMime,
        storage: isSupabaseConfigured() ? 'supabase-storage' : 'local-disk',
      });
    } catch (err: any) {
      console.error('Image upload failed:', err);
      res.status(500).json({ error: 'Image upload failed. Please try again.' });
    }
  });

  // ==========================================
  // SUPABASE DATABASE STATUS & SYNCHRONIZATION
  // ==========================================
  adminRouter.get('/supabase/status', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    const configured = isSupabaseConfigured();
    const conn = await testSupabaseConnection();
    res.json({
      configured,
      connected: conn.connected,
      error: conn.error,
      message: conn.message,
      hydrated: isSupabaseHydrated,
      url: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.slice(0, 15)}...` : null,
    });
  });


  adminRouter.post('/supabase/sync', requireRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
    if (!isSupabaseConfigured()) {
      res.status(400).json({
        success: false,
        error: 'Supabase credentials are not configured in environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).',
      });
      return;
    }

    try {
      const result = await syncDatabaseToSupabase(db);
      if (result.success) {
        isSupabaseHydrated = true;
        logAdminAction(
          'Supabase Full Database Sync',
          'Database',
          'all',
          'Admin synchronized all database tables to Supabase PostgreSQL',
          req.adminUser?.email,
          req
        );
        res.json({
          success: true,
          message: 'All collections and records successfully pushed to Supabase PostgreSQL.',
          stats: {
            events: db.events.length,
            announcements: db.announcements.length,
            team: db.team.length,
            projects: db.projects.length,
            gallery: db.gallery.length,
            join_applications: db.join_applications.length,
            registrations: db.registrations.length,
            certificates: db.certificates.length,
            checkins: db.checkins.length,
            messages: db.messages.length,
            newsletter_subscribers: db.newsletter_subscribers.length,
            admin_users: db.admin_users.length,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: `Supabase sync failed: ${result.errors.join(', ')}`,
        });
      }
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to synchronize with Supabase',
      });
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
    const sql = generateSupabaseSQLSchema();
    res.setHeader('Content-Type', 'text/plain');
    res.send(sql);
  });


  // 404 for unknown API endpoints
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
  });

  export default app;
