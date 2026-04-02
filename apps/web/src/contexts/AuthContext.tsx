import React, { createContext, useContext, useState, useEffect } from 'react';

// Tipagem base de Usuário
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'secretaria' | 'professor' | 'aluno';
  tenantId?: string;
}

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

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Hook nativo para validar Sessões Armazenadas Localmente
  useEffect(() => {
    const savedToken = localStorage.getItem('@academiaflow_raw_token');
    const savedUser = localStorage.getItem('@academiaflow_profile');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
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
      {children}
    </AuthContext.Provider>
  );
};
