// ==========================================================
// Centralized Authentication & Session Expiration Configuration
// ==========================================================

export const AUTH_CONFIG = {
  // 15 minutes of inactivity triggers automatic session expiration
  IDLE_TIMEOUT_MS: 15 * 60 * 1000, // 900,000 ms

  // 24 hours maximum session lifetime regardless of user activity
  MAX_SESSION_LIFETIME_MS: 24 * 60 * 60 * 1000, // 86,400,000 ms

  // Warning modal displayed 2 minutes prior to inactivity timeout
  SESSION_WARNING_MS: 2 * 60 * 1000, // 120,000 ms

  // Throttle user activity event listeners to prevent unnecessary CPU overhead
  ACTIVITY_THROTTLE_MS: 3000, // 3,000 ms

  // Multi-tab synchronization broadcast channel
  BROADCAST_CHANNEL: 'intelligenz_admin_auth_sync',

  // Local & Session storage keys
  STORAGE_KEYS: {
    TOKEN: 'intelligenz_admin_token',
    USER: 'intelligenz_admin_user',
    LAST_ACTIVITY: 'intelligenz_admin_last_activity',
    SESSION_START: 'intelligenz_admin_session_start',
    EXPIRED_REASON: 'intelligenz_admin_expired_reason',
    CROSS_TAB_EVENT: 'intelligenz_admin_cross_tab_event',
  },
} as const;
