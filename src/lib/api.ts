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
  AttendanceVerificationResult,
  AttendanceRosterResponse,
  AuditLog,
  ParticipationType,
  TeamMemberRegistration,
  EventWinner,
} from '../types';


import { authStorage } from './authStorage';
import { adminSessionCoordinator } from './adminSession';

export { authStorage };

// Secure HTTP 401/403 interceptor wrapper around standard fetch without mutating window.fetch
const baseFetch = typeof globalThis !== 'undefined' && globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : (args: any) => window.fetch(args);

let adminAbortController: AbortController = new AbortController();

export const abortAllAdminRequests = () => {
  try {
    adminAbortController.abort();
  } catch {
    // ignore
  }
  adminAbortController = new AbortController();
};

const secureFetch = async (...args: Parameters<typeof globalThis.fetch>): Promise<Response> => {
  const [resource, init] = args;
  const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : String(resource);
  const isLogin = url.includes('/api/auth/login');
  const isLogout = url.includes('/api/auth/logout');
  const isProtectedAdminApi = url.includes('/api/admin');

  // Short-circuit protected admin endpoints if user is not authenticated or already logged out
  if (isProtectedAdminApi && !authStorage.isAuthenticated()) {
    return new Response(JSON.stringify({ error: 'User is not authenticated' }), {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // On authenticated admin request, record activity to keep idle timer reset
  if (authStorage.isAuthenticated() && !isLogin && !isLogout) {
    adminSessionCoordinator.recordActivity(false);
  }

  // Combine signal with active admin abort controller for protected requests
  let signal = init?.signal;
  if (isProtectedAdminApi) {
    if (signal && typeof AbortSignal.any === 'function') {
      signal = AbortSignal.any([signal, adminAbortController.signal]);
    } else {
      signal = signal || adminAbortController.signal;
    }
  }

  try {
    const response = await baseFetch(resource, { ...init, signal });

    // If server rejects with 401/403 due to session expiry or revocation
    // ONLY trigger termination if the client was actively authenticated (not during or after logout)
    if (
      (response.status === 401 || (response.status === 403 && isProtectedAdminApi)) &&
      !isLogin &&
      !isLogout &&
      authStorage.isAuthenticated()
    ) {
      let reason: 'inactivity' | 'max_lifetime' | 'unauthorized' = 'unauthorized';
      try {
        const cloned = response.clone();
        const data = await cloned.json();
        if (data.code === 'SESSION_IDLE_TIMEOUT') {
          reason = 'inactivity';
        } else if (data.code === 'SESSION_MAX_LIFETIME') {
          reason = 'max_lifetime';
        }
      } catch {
        // ignore json parse errors
      }

      adminSessionCoordinator.terminateSession(reason);
    }

    return response;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Request aborted' }), {
        status: 499,
        statusText: 'Client Closed Request',
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw err;
  }
};

// Shadow fetch for all API methods in this module
const fetch = secureFetch;

async function safeJson<T = any>(res: Response, fallbackError: string = 'Operation failed'): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await res.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('The page')) {
        throw new Error(`Server returned HTTP ${res.status} (${res.statusText || 'Error'}). Please check backend connection.`);
      }
      if (text.trim()) {
        throw new Error(text.slice(0, 160));
      }
    } catch (err: any) {
      throw new Error(err.message || fallbackError);
    }
  }

  if (!res.ok) {
    const message = data?.error || data?.message || fallbackError;
    throw new Error(message);
  }

  return data as T;
}

function authHeaders(): Record<string, string> {
  const token = authStorage.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Public API
  getSettings: async (): Promise<SiteSettings> => {
    const res = await fetch('/api/settings');
    return safeJson<SiteSettings>(res, 'Failed to load settings');
  },

  // Public Stats
  getStats: async (): Promise<SiteStats> => {
    const res = await fetch('/api/stats');
    return safeJson<SiteStats>(res, 'Failed to load stats');
  },

  getCommunityImpactStats: async (): Promise<CommunityImpactStat[]> => {
    const res = await fetch('/api/public/community-impact');
    return safeJson<CommunityImpactStat[]>(res, 'Failed to load community impact statistics');
  },

  getEvents: async (params?: { category?: string; status?: string; featured?: boolean }): Promise<Event[]> => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.featured) query.append('featured', 'true');
    const res = await fetch(`/api/events?${query.toString()}`);
    return safeJson<Event[]>(res, 'Failed to load events');
  },

  getEventBySlug: async (slug: string): Promise<Event> => {
    const res = await fetch(`/api/events/${encodeURIComponent(slug)}`);
    return safeJson<Event>(res, 'Event not found');
  },

  registerForEvent: async (eventId: string, data: {
    full_name: string;
    email: string;
    phone?: string;
    college?: string;
    department: string;
    year: string;
    roll_number: string;
    team_name?: string;
    team_members?: TeamMemberRegistration[];
  }): Promise<{
    success: boolean;
    message: string;
    registration: EventRegistration;
    ticket_code?: string;
    qr_token?: string;
    qr_payload?: string;
    email_sent?: boolean;
    email_status?: string;
  }> => {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Registration failed');
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/registrations`);
    return safeJson<EventRegistration[]>(res, 'Failed to load event registrations');
  },

  getEventWinners: async (eventId: string): Promise<{ event_id: string; title: string; status: string; results?: string; winners: EventWinner[] }> => {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/winners`);
    return safeJson(res, 'Failed to load event winners');
  },

  getAnnouncements: async (params?: { category?: string; featured?: boolean }): Promise<Announcement[]> => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.featured) query.append('featured', 'true');
    const res = await fetch(`/api/announcements?${query.toString()}`);
    return safeJson<Announcement[]>(res, 'Failed to load announcements');
  },

  getAnnouncementBySlug: async (slug: string): Promise<Announcement> => {
    const res = await fetch(`/api/announcements/${encodeURIComponent(slug)}`);
    return safeJson<Announcement>(res, 'Announcement not found');
  },

  getTeam: async (): Promise<TeamMember[]> => {
    const res = await fetch('/api/team');
    return safeJson<TeamMember[]>(res, 'Failed to load team members');
  },

  getProjects: async (category?: string): Promise<Project[]> => {
    const url = category && category !== 'All' ? `/api/projects?category=${encodeURIComponent(category)}` : '/api/projects';
    const res = await fetch(url);
    return safeJson<Project[]>(res, 'Failed to load projects');
  },

  getGallery: async (album?: string): Promise<GalleryImage[]> => {
    const url = album && album !== 'All' ? `/api/gallery?album=${encodeURIComponent(album)}` : '/api/gallery';
    const res = await fetch(url);
    return safeJson<GalleryImage[]>(res, 'Failed to load gallery');
  },

  submitJoinApplication: async (data: Partial<JoinApplication>): Promise<{ success: boolean; message: string; application_id: string; application?: JoinApplication }> => {
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to submit application');
  },

  submitApplication: async (data: Partial<JoinApplication>): Promise<{ success: boolean; message: string; application_id: string; application?: JoinApplication }> => {
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to submit application');
  },

  submitContactMessage: async (data: { name: string; email: string; subject: string; message: string }): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to send message');
  },

  search: async (query: string): Promise<{ events: Event[]; announcements: Announcement[]; projects: Project[] }> => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    return safeJson(res, 'Search failed');
  },

  // Auth
  login: async (credentials: { identifier?: string; username?: string; email?: string; password: string }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await safeJson(res, 'Invalid administrator credentials.');
    authStorage.setToken(data.token);
    authStorage.setUser(data.user);
    adminSessionCoordinator.resetSessionOnLogin(data.sessionStart || Date.now());
    return data;
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // Ignore network errors on signout
    }
    adminSessionCoordinator.terminateSession('manual');
  },

  staySignedIn: async (): Promise<boolean> => {
    return adminSessionCoordinator.staySignedIn();
  },

  verifyAuth: async () => {
    try {
      const res = await fetch('/api/auth/verify', {
        headers: authHeaders(),
      });
      if (!res.ok) {
        authStorage.clearToken();
        return false;
      }
      const data = await safeJson(res, 'Verification failed');
      if (data.valid && data.user) {
        authStorage.setUser(data.user);
        if (data.sessionStart && typeof data.sessionStart === 'number') {
          try {
            localStorage.setItem('intelligenz_admin_session_start', data.sessionStart.toString());
          } catch {
            // ignore
          }
        }
        return true;
      }
      authStorage.clearToken();
      return false;
    } catch {
      return false;
    }
  },

  // Image Upload System (50 MB Persistent Storage)
  uploadImage: async (
    file: File,
    category: string = 'media'
  ): Promise<{ url: string; filename: string; size: number; mime_type: string; original_name?: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file for upload.'));
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/admin/uploads/image', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              data: base64Data,
              category,
            }),
          });
          const data = await safeJson(res, 'Image upload failed. Please try again.');
          resolve(data);
        } catch (err: any) {
          reject(err);
        }
      };
      reader.readAsDataURL(file);
    });
  },

  // Admin Whitelist & Access Control Management (Super Admin)
  adminGetAdmins: async () => {
    const res = await fetch('/api/admin/admins', { headers: authHeaders() });
    return safeJson(res, 'Failed to fetch administrators list');
  },

  adminCreateAdmin: async (data: {
    name: string;
    username: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
    password?: string;
    temporaryPassword?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  }) => {
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to create administrator');
  },

  adminUpdateAdmin: async (
    id: string,
    data: {
      name?: string;
      username?: string;
      email?: string;
      role?: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
      status?: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
    }
  ) => {
    const res = await fetch(`/api/admin/admins/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to update administrator');
  },

  adminSetAdminPassword: async (id: string, password: string) => {
    const res = await fetch(`/api/admin/admins/${encodeURIComponent(id)}/password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ password, newPassword: password }),
    });
    return safeJson(res, 'Failed to set administrator password');
  },

  adminResetAdminPassword: async (id: string, password?: string) => {
    const res = await fetch(`/api/admin/admins/${encodeURIComponent(id)}/password`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ password, newPassword: password }),
    });
    return safeJson(res, 'Failed to reset administrator password');
  },

  adminUpdateAdminStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE' | 'REVOKED') => {
    const res = await fetch(`/api/admin/admins/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    return safeJson(res, 'Failed to update administrator status');
  },

  adminDeleteAdmin: async (id: string) => {
    const res = await fetch(`/api/admin/admins/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete administrator');
  },

  // Admin Profile & Security
  adminGetProfile: async () => {
    const res = await fetch('/api/admin/profile', { headers: authHeaders() });
    return safeJson(res, 'Failed to load admin profile');
  },

  adminUpdateProfile: async (data: { email?: string; username?: string }) => {
    const res = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const result = await safeJson(res, 'Failed to update profile');
    if (result.user) {
      authStorage.setUser(result.user);
    }
    return result;
  },

  adminChangePassword: async (data: { currentPassword?: string; newPassword: string }) => {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to change password');
  },

  // Admin APIs
  getAdminOverview: async () => {
    const res = await fetch('/api/admin/overview', { headers: authHeaders() });
    return safeJson(res, 'Failed to fetch admin overview');
  },

  adminCreateEvent: async (eventData: Partial<Event>) => {
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(eventData),
    });
    return safeJson(res, 'Failed to create event');
  },

  adminUpdateEvent: async (id: string, eventData: Partial<Event>) => {
    const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(eventData),
    });
    return safeJson(res, 'Failed to update event');
  },

  adminDuplicateEvent: async (id: string) => {
    const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to duplicate event');
  },

  adminDeleteEvent: async (id: string) => {
    const res = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete event');
  },

  adminGetEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/registrations`, {
      headers: authHeaders(),
    });
    return safeJson<EventRegistration[]>(res, 'Failed to load event registrations');
  },

  adminUpdateEventWinners: async (
    eventId: string,
    data: {
      first_registration_id?: string;
      second_registration_id?: string;
      third_registration_id?: string;
      winners?: EventWinner[];
      results?: string;
    }
  ): Promise<{ success: boolean; message: string; event: Event }> => {
    const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/winners`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to update winners');
  },

  adminDeleteEventWinner: async (eventId: string, position: string) => {
    const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/winners/${encodeURIComponent(position)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to remove winner');
  },

  adminCreateAnnouncement: async (data: Partial<Announcement>) => {
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to create announcement');
  },

  adminUpdateAnnouncement: async (id: string, data: Partial<Announcement>) => {
    const res = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to update announcement');
  },

  adminDeleteAnnouncement: async (id: string) => {
    const res = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete announcement');
  },

  adminGetApplications: async (): Promise<JoinApplication[]> => {
    const res = await fetch('/api/admin/join-applications', { headers: authHeaders() });
    if (res.status === 401) {
      authStorage.clearToken();
      window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: { authenticated: false } }));
      return [];
    }
    const data = await safeJson(res, 'Failed to load applications');
    return Array.isArray(data) ? data : [];
  },

  adminUpdateApplicationStatus: async (id: string, status: string, reviewer_notes?: string) => {
    const res = await fetch(`/api/admin/join-applications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, reviewer_notes }),
    });
    return safeJson(res, 'Failed to update application');
  },

  adminDeleteApplication: async (id: string) => {
    const res = await fetch(`/api/admin/join-applications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete application');
  },

  adminGetRegistrations: async (eventId?: string): Promise<EventRegistration[]> => {
    const url = eventId ? `/api/admin/registrations?event_id=${encodeURIComponent(eventId)}` : '/api/admin/registrations';
    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 401) {
      authStorage.clearToken();
      window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: { authenticated: false } }));
      return [];
    }
    const data = await safeJson(res, 'Failed to load registrations');
    return Array.isArray(data) ? data : [];
  },

  adminUpdateRegistrationStatus: async (id: string, status: string) => {
    const res = await fetch(`/api/admin/registrations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    return safeJson(res, 'Failed to update registration');
  },

  adminDeleteRegistration: async (id: string) => {
    const res = await fetch(`/api/admin/registrations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete registration');
  },

  adminGetMessages: async (): Promise<ContactMessage[]> => {
    const res = await fetch('/api/admin/messages', { headers: authHeaders() });
    if (res.status === 401) {
      authStorage.clearToken();
      window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: { authenticated: false } }));
      return [];
    }
    const data = await safeJson(res, 'Failed to load messages');
    return Array.isArray(data) ? data : [];
  },

  adminUpdateMessage: async (id: string, data: { is_read?: boolean; responded?: boolean }) => {
    const res = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to update message');
  },

  adminDeleteMessage: async (id: string) => {
    const res = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete message');
  },

  adminCreateTeamMember: async (data: Partial<TeamMember>) => {
    const res = await fetch('/api/admin/team', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to create team member');
  },

  adminUpdateTeamMember: async (id: string, data: Partial<TeamMember>) => {
    const res = await fetch(`/api/admin/team/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to update team member');
  },

  adminDeleteTeamMember: async (id: string) => {
    const res = await fetch(`/api/admin/team/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete team member');
  },

  adminCreateProject: async (data: Partial<Project>) => {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to create project');
  },

  adminUpdateProject: async (id: string, data: Partial<Project>) => {
    const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to update project');
  },

  adminDeleteProject: async (id: string) => {
    const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete project');
  },

  adminCreateGalleryItem: async (data: Partial<GalleryImage>) => {
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to add gallery item');
  },

  adminUpdateGalleryItem: async (id: string, data: Partial<GalleryImage>) => {
    const res = await fetch(`/api/admin/gallery/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to update gallery item');
  },

  adminDeleteGalleryItem: async (id: string) => {
    const res = await fetch(`/api/admin/gallery/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete gallery item');
  },

  adminUpdateStats: async (stats: Partial<SiteStats>) => {
    const res = await fetch('/api/admin/stats', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(stats),
    });
    return safeJson(res, 'Failed to update stats');
  },

  adminGetCommunityImpactStats: async (): Promise<CommunityImpactStat[]> => {
    const res = await fetch('/api/admin/community-impact', {
      headers: authHeaders(),
    });
    return safeJson<CommunityImpactStat[]>(res, 'Failed to load community impact statistics');
  },

  adminUpdateCommunityImpactStat: async (
    id: string,
    data: Partial<CommunityImpactStat>
  ): Promise<CommunityImpactStat> => {
    const res = await fetch(`/api/admin/community-impact/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson<CommunityImpactStat>(res, 'Failed to update community impact statistic');
  },

  adminSaveAllCommunityImpactStats: async (
    stats: CommunityImpactStat[]
  ): Promise<CommunityImpactStat[]> => {
    const res = await fetch('/api/admin/community-impact', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(stats),
    });
    return safeJson<CommunityImpactStat[]>(res, 'Failed to save community impact statistics');
  },

  adminCreateCommunityImpactStat: async (
    data: Partial<CommunityImpactStat>
  ): Promise<CommunityImpactStat> => {
    const res = await fetch('/api/admin/community-impact', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson<CommunityImpactStat>(res, 'Failed to create community impact statistic');
  },

  adminDeleteCommunityImpactStat: async (id: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`/api/admin/community-impact/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete community impact statistic');
  },

  adminUpdateSettings: async (settings: Partial<SiteSettings>) => {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    return safeJson(res, 'Failed to update settings');
  },

  adminGetEmailStatus: async (): Promise<{
    enabled: boolean;
    is_live_smtp: boolean;
    connected?: boolean;
    smtp_status?: 'Connected' | 'Not Connected' | 'Not Configured';
    connection_error?: string | null;
    provider_info: string;
    sender_name: string;
    sender_address: string;
    smtp_host: string | null;
    smtp_port?: number | null;
    smtp_secure?: boolean;
    smtp_user_masked?: string | null;
    total_sent_this_session: number;
  }> => {
    const res = await fetch('/api/admin/email/status', {
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to fetch email status');
  },

  adminSendTestEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/admin/email/test', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email }),
    });
    return safeJson(res, 'Failed to send test email');
  },

  adminResendEventPassEmail: async (registrationId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`/api/admin/email/resend/${encodeURIComponent(registrationId)}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to resend event pass email');
  },

  getSupabaseSchemaSql: async (): Promise<string> => {
    const res = await fetch('/api/export-supabase-sql');
    if (!res.ok) throw new Error('Failed to fetch SQL');
    return res.text();
  },

  getSupabaseSchema: async (): Promise<{ schema: string }> => {
    const res = await fetch('/api/export-supabase-sql');
    if (!res.ok) throw new Error('Failed to fetch SQL');
    const text = await res.text();
    return { schema: text };
  },

  // Aliases for admin actions
  adminLogin: async (credentials: { identifier?: string; username?: string; email?: string; password: string } | string, maybePassword?: string) => {
    if (typeof credentials === 'string') {
      return api.login({ identifier: credentials, username: credentials, password: maybePassword || '' });
    }
    return api.login(credentials);
  },

  cancelPendingAdminRequests: () => {
    abortAllAdminRequests();
  },

  adminLogout: async () => {
    abortAllAdminRequests();
    authStorage.clearToken();
    try {
      await baseFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }
  },

  getAdminProfile: async () => {
    return api.adminGetProfile();
  },

  updateAdminProfile: async (data: { email?: string; username?: string; name?: string }) => {
    return api.adminUpdateProfile(data);
  },

  changeAdminPassword: async (data: { current_password?: string; currentPassword?: string; new_password?: string; newPassword?: string }) => {
    return api.adminChangePassword({
      currentPassword: data.currentPassword || data.current_password || '',
      newPassword: data.newPassword || data.new_password || '',
    });
  },

  getOverviewStats: async () => {
    return api.getAdminOverview();
  },

  getApplications: async () => {
    return api.adminGetApplications();
  },

  deleteApplication: async (id: string) => {
    return api.adminDeleteApplication(id);
  },

  getRegistrations: async (eventId?: string) => {
    return api.adminGetRegistrations(eventId);
  },

  updateRegistrationStatus: async (id: string, status: string) => {
    return api.adminUpdateRegistrationStatus(id, status);
  },

  deleteRegistration: async (id: string) => {
    return api.adminDeleteRegistration(id);
  },

  getMessages: async () => {
    return api.adminGetMessages();
  },

  updateMessageStatus: async (id: string, is_read: boolean, is_responded?: boolean) => {
    return api.adminUpdateMessage(id, { is_read, responded: is_responded });
  },

  deleteMessage: async (id: string) => {
    return api.adminDeleteMessage(id);
  },

  createProject: async (data: Partial<Project>) => {
    return api.adminCreateProject(data);
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    return api.adminUpdateProject(id, data);
  },

  deleteProject: async (id: string) => {
    return api.adminDeleteProject(id);
  },

  createTeamMember: async (data: Partial<TeamMember>) => {
    return api.adminCreateTeamMember(data);
  },

  updateTeamMember: async (id: string, data: Partial<TeamMember>) => {
    return api.adminUpdateTeamMember(id, data);
  },

  deleteTeamMember: async (id: string) => {
    return api.adminDeleteTeamMember(id);
  },

  createGalleryItem: async (data: Partial<GalleryImage>) => {
    return api.adminCreateGalleryItem(data);
  },

  updateGalleryItem: async (id: string, data: Partial<GalleryImage>) => {
    return api.adminUpdateGalleryItem(id, data);
  },

  deleteGalleryItem: async (id: string) => {
    return api.adminDeleteGalleryItem(id);
  },

  createEvent: async (eventData: Partial<Event>) => {
    return api.adminCreateEvent(eventData);
  },

  updateEvent: async (id: string, eventData: Partial<Event>) => {
    return api.adminUpdateEvent(id, eventData);
  },

  duplicateEvent: async (id: string) => {
    return api.adminDuplicateEvent(id);
  },

  deleteEvent: async (id: string) => {
    return api.adminDeleteEvent(id);
  },

  createAnnouncement: async (data: Partial<Announcement>) => {
    return api.adminCreateAnnouncement(data);
  },

  updateAnnouncement: async (id: string, data: Partial<Announcement>) => {
    return api.adminUpdateAnnouncement(id, data);
  },

  deleteAnnouncement: async (id: string) => {
    return api.adminDeleteAnnouncement(id);
  },

  updateApplicationStatus: async (id: string, status: any, notes?: string) => {
    return api.adminUpdateApplicationStatus(id, status, notes);
  },

  updateStats: async (stats: Partial<SiteStats>) => {
    return api.adminUpdateStats(stats);
  },

  updateSettings: async (settings: Partial<SiteSettings>) => {
    return api.adminUpdateSettings(settings);
  },

  // ==========================================
  // NEWSLETTER (Public & Admin)
  // ==========================================
  subscribeNewsletter: async (data: { email: string; name?: string; department?: string; source?: string }): Promise<{ success: boolean; message: string; subscriber?: NewsletterSubscriber }> => {
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to subscribe to newsletter');
  },

  adminGetNewsletterSubscribers: async (): Promise<NewsletterSubscriber[]> => {
    const res = await fetch('/api/admin/newsletter/subscribers', { headers: authHeaders() });
    return safeJson<NewsletterSubscriber[]>(res, 'Failed to load subscribers');
  },

  adminDeleteNewsletterSubscriber: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/admin/newsletter/subscribers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete subscriber');
  },

  adminGetNewsletterBroadcasts: async (): Promise<NewsletterBroadcast[]> => {
    const res = await fetch('/api/admin/newsletter/broadcasts', { headers: authHeaders() });
    return safeJson<NewsletterBroadcast[]>(res, 'Failed to load broadcasts');
  },

  adminSendNewsletterBroadcast: async (data: { subject: string; message: string; target?: string }): Promise<{ success: boolean; message: string; broadcast: NewsletterBroadcast }> => {
    const res = await fetch('/api/admin/newsletter/broadcast', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to send broadcast');
  },

  // ==========================================
  // CERTIFICATES (Public & Admin)
  // ==========================================
  getCertificates: async (q?: string): Promise<Certificate[]> => {
    const url = q ? `/api/certificates?q=${encodeURIComponent(q)}` : '/api/certificates';
    const res = await fetch(url);
    return safeJson<Certificate[]>(res, 'Failed to load certificates');
  },

  verifyCertificate: async (code: string): Promise<{
    valid: boolean;
    status?: string;
    certificate?: Certificate;
    certificates?: Certificate[];
    count?: number;
    match_type?: string;
    verification_time?: string;
    verified_by?: string;
    error?: string;
    message?: string;
  }> => {
    const res = await fetch(`/api/certificates/verify/${encodeURIComponent(code.trim())}`);
    return safeJson(res, 'Verification lookup failed');
  },

  adminGetCertificates: async (): Promise<Certificate[]> => {
    const res = await fetch('/api/admin/certificates', { headers: authHeaders() });
    return safeJson<Certificate[]>(res, 'Failed to load certificates');
  },

  adminCreateCertificate: async (data: Partial<Certificate>): Promise<Certificate> => {
    const res = await fetch('/api/admin/certificates', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson<Certificate>(res, 'Failed to create certificate');
  },

  adminBatchCreateCertificates: async (data: {
    event_id?: string;
    event_title: string;
    certificate_type: string;
    issue_date: string;
    issued_by?: string;
    designation?: string;
    students: Array<{ student_name: string; student_roll_no: string; student_email: string; department?: string; notes?: string }>;
  }): Promise<{ success: boolean; message: string; certificates: Certificate[] }> => {
    const res = await fetch('/api/admin/certificates/batch', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to batch generate certificates');
  },

  adminUpdateCertificate: async (id: string, data: Partial<Certificate>): Promise<Certificate> => {
    const res = await fetch(`/api/admin/certificates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson<Certificate>(res, 'Failed to update certificate');
  },

  adminDeleteCertificate: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/admin/certificates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete certificate');
  },

  // ==========================================
  // ATTENDANCE & CHECK-IN (Admin)
  // ==========================================
  adminGetCheckins: async (eventId?: string): Promise<AttendanceRecord[]> => {
    const url = eventId ? `/api/admin/checkins?event_id=${encodeURIComponent(eventId)}` : '/api/admin/checkins';
    const res = await fetch(url, { headers: authHeaders() });
    return safeJson<AttendanceRecord[]>(res, 'Failed to load check-ins');
  },

  adminVerifyAttendance: async (data: {
    code: string;
    event_id?: string;
  }): Promise<AttendanceVerificationResult> => {
    const res = await fetch('/api/admin/attendance/verify', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to verify attendance code');
  },

  adminGetAttendanceRoster: async (eventId?: string): Promise<AttendanceRosterResponse> => {
    const url = eventId
      ? `/api/admin/attendance/roster?event_id=${encodeURIComponent(eventId)}`
      : '/api/admin/attendance/roster';
    const res = await fetch(url, { headers: authHeaders() });
    return safeJson<AttendanceRosterResponse>(res, 'Failed to load attendance roster');
  },

  adminCheckinParticipant: async (data: {
    code?: string;
    event_id?: string;
    registration_id?: string;
    roll_number?: string;
    email?: string;
    method?: string;
  }): Promise<{ success: boolean; message: string; record: AttendanceRecord; participant?: any; status?: string; error?: string; ticket_code?: string }> => {
    const res = await fetch('/api/admin/checkin', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Check-in failed');
  },

  adminDeleteCheckin: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/admin/checkins/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to delete check-in record');
  },

  // ==========================================
  // AUDIT LOGS & DATABASE BACKUPS (Admin)
  // ==========================================
  adminGetAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch('/api/admin/audit-logs', {
      headers: authHeaders(),
    });
    return safeJson<AuditLog[]>(res, 'Failed to load audit logs');
  },

  adminExportBackup: async (): Promise<any> => {
    const res = await fetch('/api/admin/backup/export', {
      headers: authHeaders(),
    });
    return safeJson(res, 'Failed to export database backup');
  },

  adminRestoreBackup: async (data: any): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/admin/backup/restore', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return safeJson(res, 'Failed to restore database');
  },
};

export const adminApi = api;


