import bcrypt from 'bcryptjs';
import { UserAccount, AuthSession, UserRole, AuthResponse } from '@/types/auth';

const STORAGE_USERS_KEY = 'tp_accounts_v1';
const STORAGE_SESSION_KEY = 'tp_active_session_v1';

// Initial pre-provisioned system accounts
export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr_admin_001',
    name: 'Administrator',
    email: 'admin@testportal.com',
    role: 'admin',
    passwordHash: '$2b$10$tGD9AKmrqa4S784A7ektPuA9cWmXBmij5wsKK8SKnsrWRTO16QQ.u', // Admin@Portal2025
    createdAt: '2025-01-01T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'usr_stu_001',
    name: 'Alex Morgan',
    email: 'alex.morgan@testportal.com',
    studentId: 'STU-2025-001',
    batch: 'CS Major - Section A',
    role: 'student',
    passwordHash: '$2b$10$sqEIFWLJAffDZi9NCY7lg./r2bikFGvzp9pt4kTQSphpVZW5JEAMS', // Student@Alex2025
    createdAt: '2025-02-15T09:00:00.000Z',
    status: 'active',
  },
  {
    id: 'usr_stu_002',
    name: 'Sarah Chen',
    email: 'sarah.chen@testportal.com',
    studentId: 'STU-2025-002',
    batch: 'Software Eng - Section B',
    role: 'student',
    passwordHash: '$2b$10$evJg3YmwiNMc85vMWJSg1Ojx45Ip5tbECp1YoNmGvS9juJfmJVItO', // Student@Sarah2025
    createdAt: '2025-02-16T11:30:00.000Z',
    status: 'active',
  },
];

export const DEFAULT_CREDENTIALS = {
  admin: {
    email: 'admin@testportal.com',
    password: 'Admin@Portal2025',
    label: 'Primary System Admin',
  },
  student: {
    identifier: 'STU-2025-001',
    email: 'alex.morgan@testportal.com',
    password: 'Student@Alex2025',
    label: 'Enrolled Candidate (Alex Morgan)',
  },
};

/**
 * Retrieve all registered accounts from localStorage, initializing with default accounts if empty
 */
export function getAllUsers(): UserAccount[] {
  if (typeof window === 'undefined') {
    return INITIAL_USERS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read users from localStorage:', err);
    return INITIAL_USERS;
  }
}

/**
 * Save user list to local storage
 */
export function saveUsers(users: UserAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to write users to localStorage:', err);
  }
}

/**
 * Generate secure pseudo-JWT session token
 */
export function generateSessionToken(user: UserAccount): string {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    studentId: user.studentId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 3, // 3 days validity
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const pseudoSig = btoa(user.id + ':' + payload.exp).slice(0, 16);
  return `tp_${encoded}.${pseudoSig}`;
}

/**
 * Perform bcrypt-based login authentication
 */
export function authenticateUser(
  identifier: string,
  plainPassword: string,
  expectedRole: UserRole
): AuthResponse {
  const trimmedId = identifier.trim().toLowerCase();
  const trimmedPassword = plainPassword.trim();

  if (!trimmedId || !trimmedPassword) {
    return {
      success: false,
      message: 'Please provide both your identification credential and password.',
    };
  }

  const users = getAllUsers();
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === trimmedId ||
      (u.studentId && u.studentId.toLowerCase() === trimmedId)
  );

  if (!user) {
    return {
      success: false,
      message:
        expectedRole === 'student'
          ? 'Student account not found. Please contact your institutional administrator for credentials.'
          : 'Invalid administrator credentials.',
    };
  }

  if (user.role !== expectedRole) {
    return {
      success: false,
      message: `Access denied. This account does not possess '${expectedRole}' authorization privileges.`,
    };
  }

  if (user.status !== 'active') {
    return {
      success: false,
      message: 'This account has been suspended. Please reach out to system admin.',
    };
  }

  // Bcrypt comparison
  const isMatch = bcrypt.compareSync(trimmedPassword, user.passwordHash);
  if (!isMatch) {
    return {
      success: false,
      message: 'Incorrect password. Verification failed.',
    };
  }

  // Create session
  const token = generateSessionToken(user);
  const session: AuthSession = {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      batch: user.batch,
    },
    expiresAt: Date.now() + 86400 * 3 * 1000,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  }

  return {
    success: true,
    message: 'Authentication successful.',
    session,
  };
}

/**
 * Retrieve active session from localStorage
 */
export function getActiveSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      clearActiveSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Clear session upon logout
 */
export function clearActiveSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

/**
 * Admin utility: Create a new student account with bcrypt hash
 */
export function createStudentAccount(
  name: string,
  email: string,
  studentId: string,
  batch: string,
  plainPassword: string
): { success: boolean; message: string; account?: UserAccount } {
  const users = getAllUsers();
  const existing = users.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() ||
      (u.studentId && u.studentId.toLowerCase() === studentId.trim().toLowerCase())
  );

  if (existing) {
    return {
      success: false,
      message: 'A student account with this Email or Student ID already exists.',
    };
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(plainPassword, salt);

  const newStudent: UserAccount = {
    id: `usr_stu_${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    studentId: studentId.trim().toUpperCase(),
    batch: batch.trim(),
    role: 'student',
    passwordHash,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  users.push(newStudent);
  saveUsers(users);

  return {
    success: true,
    message: `Account created successfully for ${newStudent.name}. Credentials ready for student distribution.`,
    account: newStudent,
  };
}
