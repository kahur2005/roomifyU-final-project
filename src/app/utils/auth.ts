import { User } from '../data/mockData';
import { getGasExecUrl } from '../../gasConfig';
import { gasPost, type GasEnvelope } from './gasClient';

interface UserCredentials {
  email: string;
  password: string;
}

const LEGACY_USER_KEY = 'roomify_current_user';
const SESSION_KEY = 'roomify_auth_session';

type PersistedAuth =
  | { kind: 'demo'; user: User }
  | { kind: 'gas'; token: string; user: User; expiresAt?: string };

// Demo fallback when no GAS URL is configured (offline / before backend deploy).
const demoUsersWithCredentials: (User & { password: string })[] = [
  {
    id: '1',
    name: 'Arry',
    email: 'arry@university.edu',
    password: '12345678',
    role: 'admin',
    department: 'Computer Science',
  },
  {
    id: '2',
    name: 'Jesse Pinkman',
    email: 'jesse@university.edu',
    password: '12345678',
    role: 'student',
    department: 'Computer Science',
  },
  {
    id: '3',
    name: 'Prof. Panji',
    email: 'panji@university.edu',
    password: '12345678',
    role: 'lecturer',
    department: 'Engineering',
  },
];

function persistAuth(data: PersistedAuth | null) {
  try {
    if (!data) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    // ignore quota / privacy mode
  }
}

function loadPersisted(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      return JSON.parse(raw) as PersistedAuth;
    }
    const legacy = localStorage.getItem(LEGACY_USER_KEY);
    if (legacy) {
      const user = JSON.parse(legacy) as User;
      if (user?.id && user.email) return { kind: 'demo', user };
    }
  } catch {
    return null;
  }
  return null;
}

function loginDemo_(credentials: UserCredentials): User | null {
  const user = demoUsersWithCredentials.find(
    (u) => u.email === credentials.email && u.password === credentials.password
  );
  if (!user) return null;
  const { password: _pw, ...userWithoutPassword } = user;
  persistAuth({ kind: 'demo', user: userWithoutPassword });
  return userWithoutPassword;
}

export const authService = {
  gasBackendConfigured: (): boolean => getGasExecUrl() !== null,

  /** True when the user logged in via GAS and has a stored session token (Sheets-backed APIs). */
  isGasSession: (): boolean => {
    const p = loadPersisted();
    return p?.kind === 'gas' && !!p.token;
  },

  /** Gas sessions must be checked on /app bootstrap; demo sessions do not. */
  requiresRemoteSessionValidation: (): boolean => {
    const p = loadPersisted();
    return p?.kind === 'gas';
  },

  getSessionToken: (): string | null => {
    const p = loadPersisted();
    return p?.kind === 'gas' ? p.token : null;
  },

  verifyRemoteSession: async (): Promise<boolean> => {
    const p = loadPersisted();
    if (!p || p.kind !== 'gas') return true;
    const out = (await gasPost({
      action: 'session',
      token: p.token,
    })) as GasEnvelope & { user?: User; expiresAt?: string };
    if (!out.ok || !out.user) {
      persistAuth(null);
      return false;
    }
    persistAuth({
      kind: 'gas',
      token: p.token,
      user: out.user,
      expiresAt: out.expiresAt,
    });
    return true;
  },

  login: async (credentials: UserCredentials): Promise<User | null> => {
    if (!getGasExecUrl()) {
      return loginDemo_(credentials);
    }

    const out = (await gasPost({
      action: 'login',
      email: credentials.email,
      password: credentials.password,
      client: typeof navigator !== 'undefined' ? { userAgent: navigator.userAgent } : {},
    })) as GasEnvelope & { token?: string; user?: User; expiresAt?: string };

    if (!out.ok || !out.token || !out.user) {
      return null;
    }

    persistAuth({
      kind: 'gas',
      token: out.token,
      user: out.user,
      expiresAt: out.expiresAt,
    });
    return out.user;
  },

  logout: () => {
    const p = loadPersisted();
    if (p?.kind === 'gas' && getGasExecUrl()) {
      void gasPost({
        action: 'logout',
        token: p.token,
      });
    }
    persistAuth(null);
  },

  getCurrentUser: (): User | null => loadPersisted()?.user ?? null,

  isAuthenticated: (): boolean => loadPersisted() !== null,

  getDemoUsers: () => demoUsersWithCredentials.map(({ password, ...user }) => user),
};
