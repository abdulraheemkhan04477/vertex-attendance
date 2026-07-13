import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useStore } from '../store/useStore';
import { sessionsDB, generateId } from '../services/db';

export function useAuth() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuthenticated, setCurrentUser, currentUser } = useStore();

  const login = useCallback(
    (username: string, password: string): boolean => {
      const ok = authService.login(username, password);
      if (ok) {
        setAuthenticated(true);
        const user = authService.getCurrentUser();
        setCurrentUser(user);
        if (user) {
          const sessionId = generateId();
          localStorage.setItem('vertex_session_id', sessionId);
          sessionsDB.add({
            id: sessionId,
            userId: user.id,
            device: navigator.userAgent,
            ip: '127.0.0.1', // Simulated IP
            lastActive: new Date().toISOString(),
            isCurrent: true,
          });
        }
      }
      return ok;
    },
    [setAuthenticated, setCurrentUser],
  );

  const logout = useCallback(() => {
    const sessionId = localStorage.getItem('vertex_session_id');
    if (sessionId) {
      sessionsDB.delete(sessionId);
      localStorage.removeItem('vertex_session_id');
    }
    authService.logout();
    setAuthenticated(false);
    setCurrentUser(null);
    navigate('/login');
  }, [setAuthenticated, setCurrentUser, navigate]);

  return { isAuthenticated, login, logout, currentUser };
}
