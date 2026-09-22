export type UserRole = 'student' | 'admin';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  studentId?: string;
  batch?: string;
  subject?: string;
  passwordHash: string; // bcrypt hashed password
  plainPassword?: string;
  createdAt: string;
  status: 'active' | 'suspended';
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isSuperAdmin?: boolean;
    studentId?: string;
    batch?: string;
    subject?: string;
  };
  expiresAt: number;
}

export interface LoginCredentials {
  identifier: string; // Email or Student ID
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  session?: AuthSession;
  autoRoleSwitched?: boolean;
  actualRole?: UserRole;
}
