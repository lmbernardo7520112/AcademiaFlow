import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@academiaflow/shared';

// Re-export User for consumers that import from AuthContext
export type { User };

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (userData: User, jwt: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook nativo para validar Sessões Armazenadas Localmente
  useEffect(() => {
    const savedToken = localStorage.getItem('@academiaflow_raw_token');
    const savedUser = localStorage.getItem('@academiaflow_profile');

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Erro ao recuperar perfil", e);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User, jwt: string) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem('@academiaflow_raw_token', jwt);
    localStorage.setItem('@academiaflow_profile', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('@academiaflow_raw_token');
    localStorage.removeItem('@academiaflow_profile');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
