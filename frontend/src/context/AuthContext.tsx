import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, getMe } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('civicfix_token');
        if (token) {
          const me = await getMe();
          setUser(me);
        }
      } catch (err) {
        localStorage.removeItem('civicfix_token');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = (token: string, u: User) => {
    localStorage.setItem('civicfix_token', token);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('civicfix_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
