import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const memoryStorage: Record<string, string> = {};

const SafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      }
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('SafeStorage.getItem fallback to memory:', e);
      return memoryStorage[key] || null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('SafeStorage.setItem fallback to memory:', e);
      memoryStorage[key] = value;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('SafeStorage.removeItem fallback to memory:', e);
      delete memoryStorage[key];
    }
  }
};

interface User {
  _id: string;
  email?: string;
  mobileNumber?: string;
  displayName?: string;
  profileImage?: string;
  slogan?: string;
  gender?: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  // Temporary storage for register flow
  pendingRegisterData: {
    displayName?: string;
    email?: string;
    mobileNumber?: string;
    password?: string;
  } | null;
  sendOtpCode: (payload: { email?: string; mobileNumber?: string }) => Promise<void>;
  verifyOtpCode: (otp: string, isRegister?: boolean) => Promise<void>;
  loginWithPasswordCode: (payload: { email?: string; password?: string }) => Promise<void>;
  updatePendingRegisterData: (data: { displayName: string; email?: string; mobileNumber?: string; password?: string }) => void;
  logout: () => void;
  clearError: () => void;
  updateUserLocal: (updatedUser: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true to bootstrap persisted state
  const [error, setError] = useState<string | null>(null);

  // Stable refs so refreshUser always reads latest values without closure issues
  const userRef = useRef<User | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  
  // Temporary data storage during Register -> Verify OTP flow
  const [pendingRegisterData, setPendingRegisterData] = useState<{
    displayName?: string;
    email?: string;
    mobileNumber?: string;
    password?: string;
  } | null>(null);

  // Keep track of what we sent the OTP to (email or mobileNumber)
  const [otpTarget, setOtpTarget] = useState<{ email?: string; mobileNumber?: string } | null>(null);

  const clearError = () => setError(null);

  const setupSocketListeners = (socketInstance: any) => {
    if (!socketInstance) return;
    
    socketInstance.on('sessionRevoked', () => {
      console.log('Socket: Session has been revoked by admin. Logging out...');
      logout();
    });

    socketInstance.on('connect_error', (err: any) => {
      console.log('Socket connect_error:', err.message);
      if (err.message && (err.message.includes('Session') || err.message.includes('auth') || err.message.includes('inactive'))) {
        logout();
      }
    });
  };

  // Bootstrap persisted authentication state on startup
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await SafeStorage.getItem('userToken');
        const storedUser = await SafeStorage.getItem('userData');
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          const socket = connectSocket(storedToken);
          setupSocketListeners(socket);
        }
      } catch (e) {
        console.error('Failed to load persisted authentication state:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const updatePendingRegisterData = (data: { displayName: string; email?: string; mobileNumber?: string; password?: string }) => {
    setPendingRegisterData(data);
  };

  const sendOtpCode = async (payload: { email?: string; mobileNumber?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.sendOtp(payload);
      setOtpTarget(payload);
      
      // For local/development, log or show the mock OTP to make developer's life easier
      if (res.mockOtp) {
        console.log(`[DEVELOPMENT ONLY] OTP code sent: ${res.mockOtp}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtpCode = async (otp: string, isRegister: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const target = isRegister ? pendingRegisterData : otpTarget;
      if (!target || (!target.email && !target.mobileNumber)) {
        throw new Error('No target phone/email found to verify OTP.');
      }

      const payload = {
        email: target.email,
        mobileNumber: target.mobileNumber,
        otp,
      };

      const res = await api.verifyOtp(payload);
      const { token: receivedToken, user: receivedUser } = res;

      let finalUser = receivedUser;

      // If it is a registration flow and we have pending profile data (like displayName)
      if (isRegister && pendingRegisterData?.displayName) {
        try {
          const profileRes = await api.updateProfile(receivedUser._id, receivedToken, {
            displayName: pendingRegisterData.displayName,
            password: pendingRegisterData.password,
          });
          finalUser = profileRes.user;
        } catch (profileErr) {
          console.error('Failed to update user profile name after verification:', profileErr);
          // Don't fail the login even if profile name update fails
        }
      }

      setToken(receivedToken);
      setUser(finalUser);
      setPendingRegisterData(null); // Clear temporary data
      
      // Save credentials to persistent storage
      await SafeStorage.setItem('userToken', receivedToken);
      await SafeStorage.setItem('userData', JSON.stringify(finalUser));

      // Establish WebSocket connection and register listener
      const socket = connectSocket(receivedToken);
      setupSocketListeners(socket);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPasswordCode = async (payload: { email?: string; password?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.loginWithPassword(payload);
      const { token: receivedToken, user: receivedUser } = res;

      setToken(receivedToken);
      setUser(receivedUser);
      setPendingRegisterData(null);

      // Save credentials to persistent storage
      await SafeStorage.setItem('userToken', receivedToken);
      await SafeStorage.setItem('userData', JSON.stringify(receivedUser));

      // Establish WebSocket connection and register listener
      const socket = connectSocket(receivedToken);
      setupSocketListeners(socket);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setOtpTarget(null);
    setPendingRegisterData(null);
    
    // Clear storage
    SafeStorage.removeItem('userToken').catch(console.error);
    SafeStorage.removeItem('userData').catch(console.error);

    // Disconnect WebSocket
    disconnectSocket();
  };

  const updateUserLocal = async (updatedUser: any) => {
    setUser(updatedUser);
    await SafeStorage.setItem('userData', JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    const currentToken = tokenRef.current;
    const currentUserId = userRef.current?._id;
    if (!currentToken || !currentUserId) return;
    try {
      const res = await api.getProfile(currentUserId, currentToken);
      const freshUser = res.data?.user || res.user || res.data;
      if (freshUser) {
        setUser(freshUser);
        await SafeStorage.setItem('userData', JSON.stringify(freshUser));
      }
    } catch (e) {
      console.warn('refreshUser failed:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        pendingRegisterData,
        sendOtpCode,
        verifyOtpCode,
        loginWithPasswordCode,
        updatePendingRegisterData,
        logout,
        clearError,
        updateUserLocal,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
