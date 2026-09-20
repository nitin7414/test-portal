import bcrypt from 'bcryptjs';
import { UserAccount, AuthSession, UserRole, AuthResponse } from '@/types/auth';

const STORAGE_USERS_KEY = 'tp_accounts_v2';
const STORAGE_SESSION_KEY = 'tp_active_session_v2';

// Primary developer administrator account
export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr_admin_dev_001',
    name: 'Developer Administrator',
    email: 'developer@testportal.com',
    role: 'admin',
    isSuperAdmin: true,
    passwordHash: '$2b$10$jDSHK2pgFSDrsOYegIeTqOP4/Mfb7cuhaxizcav/hvodVeIj.Imf.', // DevAdmin@2025!Portal
    createdAt: '2025-01-01T00:00:00.000Z',
    status: 'active',
  },
];

/**
 * Retrieve all registered accounts from localStorage, ensuring demo credentials always remain
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
    const stored: UserAccount[] = JSON.parse(raw);
    const existingIds = new Set(stored.map((u) => u.id));
    let modified = false;

    // Ensure demo accounts (admin and alex morgan) are always accessible
    for (const initUser of INITIAL_USERS) {
      if (!existingIds.has(initUser.id)) {
        stored.unshift(initUser);
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(stored));
    }

    return stored;
  } catch (err) {
    console.error('Failed to read users from localStorage:', err);
    return INITIAL_USERS;
  }
}

/**
 * Save user list to local storage and broadcast synchronization event
 */
export function saveUsers(users: UserAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('tp_users_updated'));
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
      isSuperAdmin: user.id === 'usr_admin_dev_001' || user.isSuperAdmin === true,
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
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedId = studentId.trim().toUpperCase();
  const trimmedBatch = batch.trim();
  const trimmedPass = plainPassword.trim();

  if (!trimmedName || !trimmedEmail || !trimmedId || !trimmedPass) {
    return {
      success: false,
      message: 'All fields (Full Name, Email Address, Student ID, and Password) are required.',
    };
  }

  if (trimmedName.length < 2) {
    return {
      success: false,
      message: 'Student name must contain at least 2 characters.',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return {
      success: false,
      message: 'Please provide a valid email address (e.g. name@university.edu).',
    };
  }

  if (trimmedPass.length < 6) {
    return {
      success: false,
      message: 'Password must be at least 6 characters long.',
    };
  }

  const users = getAllUsers();
  const existing = users.find(
    (u) =>
      u.email.toLowerCase() === trimmedEmail ||
      (u.studentId && u.studentId.toLowerCase() === trimmedId.toLowerCase())
  );

  if (existing) {
    const fieldConflict = existing.email.toLowerCase() === trimmedEmail ? 'Email address' : 'Student ID';
    return {
      success: false,
      message: `A candidate account with this ${fieldConflict} ("${fieldConflict === 'Email address' ? trimmedEmail : trimmedId}") already exists.`,
    };
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(trimmedPass, salt);

  const newStudent: UserAccount = {
    id: `usr_stu_${Date.now()}`,
    name: trimmedName,
    email: trimmedEmail,
    studentId: trimmedId,
    batch: trimmedBatch || 'General Batch',
    role: 'student',
    passwordHash,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  users.push(newStudent);
  saveUsers(users);

  return {
    success: true,
    message: `Account created successfully for ${newStudent.name}.`,
    account: newStudent,
  };
}

/**
 * Suggest next sequential Student ID based on existing students (e.g. STU-2025-003)
 */
export function getNextStudentId(): string {
  const users = getAllUsers();
  let maxSeq = 2; // Baseline from demo accounts STU-2025-001 & STU-2025-002
  const currentYear = new Date().getFullYear();

  for (const u of users) {
    if (u.studentId) {
      const match = u.studentId.match(/STU-(\d{4})-(\d+)/i) || u.studentId.match(/STU-(\d+)/i);
      if (match) {
        const parsed = parseInt(match[2] || match[1], 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const padded = nextSeq < 100 ? String(nextSeq).padStart(3, '0') : String(nextSeq);
  return `STU-${currentYear}-${padded}`;
}

/**
 * Generate a friendly yet secure temporary password for provisioned students
 */
export function generateSecureTemporaryPassword(): string {
  const adjectives = ['Alpha', 'Delta', 'Nova', 'Cyber', 'Apex', 'Hyper', 'Swift'];
  const nouns = ['Student', 'Candidate', 'Portal', 'Learner', 'Scholar', 'Coder'];
  const symbols = ['@', '#', '!', '$'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${sym}${year}${randomDigits}`;
}

/**
 * Admin utility: Create a new administrator account with bcrypt hash
 */
export function createAdminAccount(
  name: string,
  email: string,
  plainPassword: string,
  requesterId?: string
): { success: boolean; message: string; account?: UserAccount } {
  // STRICT AUTHORIZATION: Only the Developer Administrator (developer only) can create new administrators!
  if (!requesterId) {
    return {
      success: false,
      message: 'Permission denied: Requester identity is required to provision administrators.',
    };
  }

  const users = getAllUsers();
  const requester = users.find((u) => u.id === requesterId);
  if (!requester || (requester.id !== 'usr_admin_dev_001' && !requester.isSuperAdmin)) {
    return {
      success: false,
      message: 'Permission denied: Only the Developer Administrator is authorized to provision new admins. Standard administrators can only add students.',
    };
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPass = plainPassword.trim();

  if (!trimmedName || !trimmedEmail || !trimmedPass) {
    return {
      success: false,
      message: 'All fields (Administrator Full Name, Email Address, and Password) are required.',
    };
  }

  if (trimmedName.length < 2) {
    return {
      success: false,
      message: 'Administrator name must contain at least 2 characters.',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return {
      success: false,
      message: 'Please provide a valid administrator email address.',
    };
  }

  if (trimmedPass.length < 8) {
    return {
      success: false,
      message: 'Administrator password must be at least 8 characters long.',
    };
  }

  const existing = users.find((u) => u.email.toLowerCase() === trimmedEmail);

  if (existing) {
    return {
      success: false,
      message: `An account with email "${trimmedEmail}" already exists.`,
    };
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(trimmedPass, salt);

  const newAdmin: UserAccount = {
    id: `usr_admin_${Date.now()}`,
    name: trimmedName,
    email: trimmedEmail,
    role: 'admin',
    isSuperAdmin: false, // Standard admins can ONLY add students, never other admins
    passwordHash,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  users.push(newAdmin);
  saveUsers(users);

  return {
    success: true,
    message: `Administrator account created successfully for ${newAdmin.name}.`,
    account: newAdmin,
  };
}


