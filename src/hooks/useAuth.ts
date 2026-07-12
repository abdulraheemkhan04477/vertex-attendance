import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useStore } from '../store/useStore';

export function useAuth() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuthenticated, setCurrentUser, currentUser } = useStore();

  const login = useCallback(
    (username: string, password: string): boolean => {
      const ok = authService.login(username, password);
      if (ok) {
        setAuthenticated(true);
        setCurrentUser(authService.getCurrentUser());
      }
      return ok;
    },
    [setAuthenticated, setCurrentUser],
  );

  const logout = useCallback(() => {
    authService.logout();
    setAuthenticated(false);
    setCurrentUser(null);
    navigate('/login');
  }, [setAuthenticated, setCurrentUser, navigate]);

  return { isAuthenticated, login, logout, currentUser };
}
