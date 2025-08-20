import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import api from '../config/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  studentId?: string;
  university?: string;
  major?: string;
  year?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on app start
    const storedUser = localStorage.getItem('supabase_user');
    const storedToken = localStorage.getItem('supabase_token');
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        refreshProfile();
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('supabase_user');
        localStorage.removeItem('supabase_token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      
      const response = await api.post('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      const { user: userData, session } = response.data;
      
      if (!userData || !session) {
        console.error('Missing user data or session in response');
        toast.error('Invalid response from server');
        return false;
      }
      
      setUser(userData);
      localStorage.setItem('supabase_user', JSON.stringify(userData));
      localStorage.setItem('supabase_token', session.access_token);
      
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      
      const message = error.response?.data?.error || error.message || 'Login failed';
      toast.error(message);
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      console.log('Attempting registration for:', data.email);
      
      const response = await api.post('/api/auth/register', data);
      console.log('Registration response:', response.data);
      
      if (response.data.session) {
        const { user: userData, session } = response.data;
        setUser(userData);
        localStorage.setItem('supabase_user', JSON.stringify(userData));
        localStorage.setItem('supabase_token', session.access_token);
        toast.success('Registration successful!');
      } else {
        toast.success('Registration successful! Please check your email for verification.');
      }
      
      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      
      const message = error.response?.data?.error || error.message || 'Registration failed';
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('supabase_user');
    localStorage.removeItem('supabase_token');
    toast.success('Logged out successfully');
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      const response = await api.put('/api/auth/profile', data);
      const updatedUser = response.data.profile;
      
      setUser(updatedUser);
      localStorage.setItem('supabase_user', JSON.stringify(updatedUser));
      
      toast.success('Profile updated successfully!');
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Profile update failed';
      toast.error(message);
      return false;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      const response = await api.get('/api/auth/profile');
      const profile = response.data.profile;
      
      setUser(profile);
      localStorage.setItem('supabase_user', JSON.stringify(profile));
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 