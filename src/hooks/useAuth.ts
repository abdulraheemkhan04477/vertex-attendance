import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useStore } from '../store/useStore';

export function useAuth() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuthenticated } = useStore();

  const login = useCallback(
    (username: string, password: string): boolean => {
      const ok = authService.login(username, password);
      if (ok) setAuthenticated(true);
      return ok;
    },
    [setAuthenticated],
  );

  const logout = useCallback(() => {
    authService.logout();
    setAuthenticated(false);
    navigate('/login');
  }, [setAuthenticated, navigate]);

  return { isAuthenticated, login, logout };
}
