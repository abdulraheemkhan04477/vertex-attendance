import { authDB, studentsDB } from './db';
import type { Student } from '../types';

const ADMIN_USERNAME = 'vertex';
const ADMIN_PASSWORD = 'ABDUL1234';
const TOKEN_VALUE = 'vertex_admin_v1';

export const authService = {
  login(username: string, password: string): boolean {
    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      authDB.setToken(TOKEN_VALUE);
      return true;
    }
    return false;
  },

  logout(): void {
    authDB.clearToken();
  },

  isAuthenticated(): boolean {
    return authDB.getToken() === TOKEN_VALUE;
  },
};

export const studentAuthService = {
  login(rollNumber: string, password: string): boolean {
    const student = studentsDB.getByRollNumber(rollNumber);
    if (student && student.password === password) {
      authDB.setStudentToken(rollNumber);
      return true;
    }
    return false;
  },

  logout(): void {
    authDB.clearStudentToken();
  },

  isAuthenticated(): boolean {
    return !!authDB.getStudentToken();
  },

  getCurrentStudent(): Student | null {
    const rollNumber = authDB.getStudentToken();
    if (!rollNumber) return null;
    return studentsDB.getByRollNumber(rollNumber) || null;
  }
};
