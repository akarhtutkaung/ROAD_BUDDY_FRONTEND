import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI, User as ApiUser, LoginRequest, RegisterRequest } from '@/services/api';

// Base user properties that all user objects should have
export interface BaseUser {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  auth0Id?: string; // Keep for backward compatibility
}

// User data returned from auth endpoints (partial user data)
export interface AuthUser extends BaseUser {}

// Full user data with all properties
export interface User extends BaseUser, ApiUser {}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  loginWithApple: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateCarInfo: (carInfo: { color?: string; make?: string; model?: string; licensePlate?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const [accessToken, userData] = await AsyncStorage.multiGet(['accessToken', 'user']);

      if (accessToken[1] && userData[1]) {
        const user = JSON.parse(userData[1]);
        dispatch({ type: 'SET_USER', payload: user as User });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.login({ email, password });

      if (response.success && response.data) {
        const { accessToken, refreshToken, user } = response.data;

        // Store tokens and user data
        await AsyncStorage.multiSet([
          ['accessToken', accessToken],
          ['refreshToken', refreshToken],
          ['user', JSON.stringify(user)],
        ]);

        dispatch({ type: 'SET_USER', payload: user as User });
      } else {
        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Login failed' });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.register(data);

      if (response.success) {
        // For now, since backend returns placeholder response,
        // create a basic user object from the registration data
        const user: User = {
          id: 'temp-id', // Backend would provide real ID
          email: data.email,
          name: data.name,
          phoneNumber: data.phoneNumber,
          settings: {
            notificationsEnabled: true,
            voiceGuidance: true,
            units: 'imperial',
          },
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        };

        // Store user data (no tokens since backend is placeholder)
        await AsyncStorage.setItem('user', JSON.stringify(user));

        dispatch({ type: 'SET_USER', payload: user });
      } else {
        throw new Error(response.error?.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Registration failed' });
      throw error;
    }
  };

  const loginWithGoogle = async (token: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.googleLogin(token);

      if (response.success && response.data) {
        const { accessToken, refreshToken, user } = response.data;

        // Store tokens and user data
        await AsyncStorage.multiSet([
          ['accessToken', accessToken],
          ['refreshToken', refreshToken],
          ['user', JSON.stringify(user)],
        ]);

        dispatch({ type: 'SET_USER', payload: user as User });
      } else {
        throw new Error(response.error?.message || 'Google login failed');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Google login failed' });
      throw error;
    }
  };

  const loginWithApple = async (token: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.appleLogin(token);

      if (response.success && response.data) {
        const { accessToken, refreshToken, user } = response.data;

        // Store tokens and user data
        await AsyncStorage.multiSet([
          ['accessToken', accessToken],
          ['refreshToken', refreshToken],
          ['user', JSON.stringify(user)],
        ]);

        dispatch({ type: 'SET_USER', payload: user as User });
      } else {
        throw new Error(response.error?.message || 'Apple login failed');
      }
    } catch (error: any) {
      console.error('Apple login error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Apple login failed' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear stored data
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!state.user) throw new Error('No user logged in');

    try {
      const response = await userAPI.updateProfile(updates);

      if (response.success && response.data) {
        const updatedUser = response.data;

        // Update stored user data
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch({ type: 'SET_USER', payload: updatedUser });
      } else {
        throw new Error(response.error?.message || 'Profile update failed');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const updateCarInfo = async (carInfo: { color?: string; make?: string; model?: string; licensePlate?: string }) => {
    if (!state.user) throw new Error('No user logged in');

    try {
      const response = await userAPI.updateCarInfo(carInfo);

      if (response.success && response.data) {
        const updatedUser = response.data;

        // Update stored user data
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch({ type: 'SET_USER', payload: updatedUser });
      } else {
        throw new Error(response.error?.message || 'Car info update failed');
      }
    } catch (error: any) {
      console.error('Error updating car info:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    loginWithGoogle,
    loginWithApple,
    logout,
    updateProfile,
    updateCarInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
