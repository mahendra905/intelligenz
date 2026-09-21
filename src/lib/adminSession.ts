import { useState, useEffect, useCallback, useRef } from 'react';
import { AUTH_CONFIG } from '../config/authConfig';
import { authStorage } from './authStorage';

export type SessionTerminationReason = 'inactivity' | 'max_lifetime' | 'unauthorized' | 'manual' | 'cross_tab';

export interface SessionState {
  isWarningOpen: boolean;
  remainingMs: number;
  isVerifying: boolean;
}

class AdminSessionCoordinator {
  private channel: BroadcastChannel | null = null;
  private lastActivity = Date.now();
  private sessionStart = Date.now();
  private throttleTimeout: number | null = null;
  private isTerminated = false;

  constructor() {
    this.initTimes();
    this.initBroadcastChannel();
    this.initStorageListener();
  }

  private initTimes() {
    if (!authStorage.isAuthenticated()) {
      this.lastActivity = 0;
      this.sessionStart = 0;
      return;
    }
    const storedLast = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
    const storedStart = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_START);
    const now = Date.now();

    this.lastActivity = storedLast ? parseInt(storedLast, 10) : now;
    this.sessionStart = storedStart ? parseInt(storedStart, 10) : now;

    if (!storedLast) {
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, now.toString());
    }
    if (!storedStart) {
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_START, now.toString());
    }
  }

  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(AUTH_CONFIG.BROADCAST_CHANNEL);
        this.channel.onmessage = (e) => {
          this.handleBroadcastMessage(e.data);
        };
      }
    } catch {
      // Fallback relies on localStorage storage events
    }
  }

  private initStorageListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
      if (e.key === AUTH_CONFIG.STORAGE_KEYS.TOKEN && !e.newValue) {
        // Token was removed in another tab
        this.handleCrossTabLogout('cross_tab');
      } else if (e.key === AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY && e.newValue) {
        const time = parseInt(e.newValue, 10);
        if (!isNaN(time) && time > this.lastActivity) {
          this.lastActivity = time;
          window.dispatchEvent(new CustomEvent('intelligenz_session_activity_sync', { detail: { time } }));
        }
      } else if (e.key === AUTH_CONFIG.STORAGE_KEYS.CROSS_TAB_EVENT && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.handleBroadcastMessage(parsed);
        } catch {
          // ignore
        }
      }
    });
  }

  private handleBroadcastMessage(data: any) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'ACTIVITY') {
      const time = data.timestamp || Date.now();
      if (time > this.lastActivity) {
        this.lastActivity = time;
        window.dispatchEvent(new CustomEvent('intelligenz_session_activity_sync', { detail: { time } }));
      }
    } else if (data.type === 'LOGOUT') {
      this.handleCrossTabLogout(data.reason || 'cross_tab');
    } else if (data.type === 'STAY_SIGNED_IN') {
      const time = data.timestamp || Date.now();
      this.lastActivity = time;
      window.dispatchEvent(new CustomEvent('intelligenz_session_activity_sync', { detail: { time } }));
    }
  }

  private handleCrossTabLogout(reason: SessionTerminationReason) {
    if (this.isTerminated) return;
    this.isTerminated = true;
    authStorage.clearToken();
    window.dispatchEvent(new CustomEvent('intelligenz_session_terminated', { detail: { reason } }));
  }

  public recordActivity(force = false) {
    if (this.isTerminated || !authStorage.isAuthenticated()) return;

    const now = Date.now();
    if (!force && this.throttleTimeout !== null) {
      return;
    }

    this.lastActivity = now;
    try {
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, now.toString());
      if (this.channel) {
        this.channel.postMessage({ type: 'ACTIVITY', timestamp: now });
      }
    } catch {
      // ignore
    }

    if (!force) {
      this.throttleTimeout = window.setTimeout(() => {
        this.throttleTimeout = null;
      }, AUTH_CONFIG.ACTIVITY_THROTTLE_MS);
    }
  }

  public resetSessionOnLogin(startTime?: number) {
    this.isTerminated = false;
    const now = typeof startTime === 'number' && startTime > 0 ? startTime : Date.now();
    this.lastActivity = now;
    this.sessionStart = now;
    try {
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, now.toString());
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_START, now.toString());
      sessionStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.EXPIRED_REASON);
      if (this.channel) {
        this.channel.postMessage({ type: 'LOGIN', timestamp: now });
      }
    } catch {
      // ignore
    }
  }

  public initializeSession(startTimeOrToken?: number | string) {
    const startTime = typeof startTimeOrToken === 'number' ? startTimeOrToken : undefined;
    this.resetSessionOnLogin(startTime);
  }

  public getStatus() {
    if (!authStorage.isAuthenticated()) {
      return {
        now: Date.now(),
        lastActivity: 0,
        sessionStart: 0,
        idleElapsed: 0,
        lifetimeElapsed: 0,
        idleRemaining: 0,
        lifetimeRemaining: 0,
        isIdleExpired: false,
        isLifetimeExpired: false,
        isWarning: false,
      };
    }

    // Re-check localStorage for any recent activity written by other tabs
    try {
      const storedLast = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
      if (storedLast) {
        const parsed = parseInt(storedLast, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed > this.lastActivity) {
          this.lastActivity = parsed;
        }
      }
      const storedStart = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_START);
      if (storedStart) {
        const parsed = parseInt(storedStart, 10);
        if (!isNaN(parsed) && parsed > 0) {
          this.sessionStart = parsed;
        }
      }
    } catch {
      // ignore
    }

    // Fallback: If sessionStart is not set or 0, initialize to current time
    const now = Date.now();
    if (!this.sessionStart || isNaN(this.sessionStart) || this.sessionStart <= 0) {
      this.sessionStart = now;
      try {
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_START, this.sessionStart.toString());
      } catch {
        // ignore
      }
    }

    if (!this.lastActivity || isNaN(this.lastActivity) || this.lastActivity <= 0) {
      this.lastActivity = now;
      try {
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, this.lastActivity.toString());
      } catch {
        // ignore
      }
    }

    const idleElapsed = now - this.lastActivity;
    const lifetimeElapsed = now - this.sessionStart;

    const idleRemaining = Math.max(0, AUTH_CONFIG.IDLE_TIMEOUT_MS - idleElapsed);
    const lifetimeRemaining = Math.max(0, AUTH_CONFIG.MAX_SESSION_LIFETIME_MS - lifetimeElapsed);

    const isIdleExpired = idleElapsed >= AUTH_CONFIG.IDLE_TIMEOUT_MS;
    const isLifetimeExpired = lifetimeElapsed >= AUTH_CONFIG.MAX_SESSION_LIFETIME_MS;
    const isWarning = !isIdleExpired && idleRemaining <= AUTH_CONFIG.SESSION_WARNING_MS;

    return {
      now,
      lastActivity: this.lastActivity,
      sessionStart: this.sessionStart,
      idleElapsed,
      lifetimeElapsed,
      idleRemaining,
      lifetimeRemaining,
      isIdleExpired,
      isLifetimeExpired,
      isWarning,
    };
  }

  public async staySignedIn(): Promise<boolean> {
    if (!authStorage.isAuthenticated()) return false;
    try {
      const res = await fetch('/api/auth/stay-signed-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStorage.getToken() || ''}`,
        },
      });

      if (!res.ok) {
        // Backend invalidated the session
        this.terminateSession('inactivity');
        return false;
      }

      const now = Date.now();
      this.lastActivity = now;
      localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, now.toString());

      if (this.channel) {
        this.channel.postMessage({ type: 'STAY_SIGNED_IN', timestamp: now });
      }

      window.dispatchEvent(new CustomEvent('intelligenz_session_activity_sync', { detail: { time: now } }));
      return true;
    } catch {
      return false;
    }
  }

  public terminateSession(reason: SessionTerminationReason, redirectUrl = '/admin') {
    if (this.isTerminated) return;
    this.isTerminated = true;

    // Set human-readable reason for the login screen banner
    let message = '';
    if (reason === 'inactivity') {
      message = 'Your session has expired after 15 minutes of inactivity. Please sign in again.';
    } else if (reason === 'max_lifetime') {
      message = 'Your session reached the maximum 24-hour duration. Please sign in again.';
    } else if (reason === 'unauthorized') {
      message = 'Your session is no longer valid. Please sign in again.';
    }

    if (message) {
      try {
        sessionStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.EXPIRED_REASON, message);
      } catch {
        // ignore
      }
    } else if (reason === 'manual') {
      try {
        sessionStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.EXPIRED_REASON);
      } catch {
        // ignore
      }
    }

    // Broadcast logout to all other open admin tabs
    try {
      if (this.channel) {
        this.channel.postMessage({ type: 'LOGOUT', reason });
      }
      localStorage.setItem(
        AUTH_CONFIG.STORAGE_KEYS.CROSS_TAB_EVENT,
        JSON.stringify({ type: 'LOGOUT', reason, timestamp: Date.now() })
      );
    } catch {
      // ignore
    }

    // Clear client tokens
    authStorage.clearToken();
    try {
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_START);
    } catch {
      // ignore
    }

    // Notify listeners
    window.dispatchEvent(new CustomEvent('auth_state_changed'));
    window.dispatchEvent(new CustomEvent('intelligenz_session_terminated', { detail: { reason } }));

    // Send signout to server in background to clear server-side session and cookies
    try {
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {
      // ignore
    }

    // Redirect to admin login if automated expiry occurred and not already there
    if (reason !== 'manual' && window.location.pathname !== redirectUrl) {
      window.history.pushState({}, '', redirectUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }
}

// Global singleton coordinator
export const adminSessionCoordinator = new AdminSessionCoordinator();

// React Hook for the Admin Portal
export function useAdminSession(onLogout: () => void) {
  const [sessionState, setSessionState] = useState<SessionState>({
    isWarningOpen: false,
    remainingMs: AUTH_CONFIG.SESSION_WARNING_MS,
    isVerifying: false,
  });

  const checkRef = useRef<() => void>(() => {});

  const check = useCallback(() => {
    if (!authStorage.isAuthenticated()) {
      return;
    }

    const status = adminSessionCoordinator.getStatus();

    if (status.isLifetimeExpired) {
      adminSessionCoordinator.terminateSession('max_lifetime');
      onLogout();
      return;
    }

    if (status.isIdleExpired) {
      adminSessionCoordinator.terminateSession('inactivity');
      onLogout();
      return;
    }

    if (status.isWarning) {
      setSessionState((prev) => ({
        ...prev,
        isWarningOpen: true,
        remainingMs: status.idleRemaining,
      }));
    } else {
      setSessionState((prev) => {
        if (prev.isWarningOpen) {
          return { ...prev, isWarningOpen: false };
        }
        return prev;
      });
    }
  }, [onLogout]);

  checkRef.current = check;

  const handleStaySignedIn = useCallback(async () => {
    setSessionState((prev) => ({ ...prev, isVerifying: true }));
    const success = await adminSessionCoordinator.staySignedIn();
    setSessionState((prev) => ({
      ...prev,
      isVerifying: false,
      isWarningOpen: !success,
    }));
  }, []);

  const handleSignOutNow = useCallback(() => {
    onLogout();
  }, [onLogout]);

  useEffect(() => {
    if (!authStorage.isAuthenticated()) return;

    // Reset activity once on mount
    adminSessionCoordinator.recordActivity(true);

    // Register throttled activity listeners
    const handleActivity = () => {
      adminSessionCoordinator.recordActivity(false);
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    // Listen to cross-tab activity synchronization
    const handleSync = () => {
      checkRef.current();
    };
    window.addEventListener('intelligenz_session_activity_sync', handleSync);

    // Listen to termination events
    const handleTerminated = (e: Event) => {
      const customEvt = e as CustomEvent<{ reason?: SessionTerminationReason }>;
      if (customEvt.detail?.reason === 'manual') {
        return;
      }
      onLogout();
    };
    window.addEventListener('intelligenz_session_terminated', handleTerminated);

    // Interval checker running every 1 second
    const timer = setInterval(() => {
      checkRef.current();
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      window.removeEventListener('intelligenz_session_activity_sync', handleSync);
      window.removeEventListener('intelligenz_session_terminated', handleTerminated);
      clearInterval(timer);
    };
  }, [onLogout]);

  return {
    isWarningOpen: sessionState.isWarningOpen,
    remainingMs: sessionState.remainingMs,
    isVerifying: sessionState.isVerifying,
    staySignedIn: handleStaySignedIn,
    signOutNow: handleSignOutNow,
    recordActivity: () => adminSessionCoordinator.recordActivity(true),
  };
}
