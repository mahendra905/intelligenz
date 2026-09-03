import { AUTH_CONFIG } from '../config/authConfig';

const ADMIN_TOKEN_KEY = AUTH_CONFIG.STORAGE_KEYS.TOKEN;
const ADMIN_USER_KEY = AUTH_CONFIG.STORAGE_KEYS.USER;

export const authStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token: string): void => {
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } catch {
      // ignore
    }
  },
  clearToken: (): void => {
    try {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
    } catch {
      // ignore
    }
  },
  getUser: (): any => {
    try {
      const raw = localStorage.getItem(ADMIN_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: any): void => {
    try {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  },
  isAuthenticated: (): boolean => {
    try {
      return !!localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return false;
    }
  },
};
