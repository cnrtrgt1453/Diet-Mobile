import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { CustomAlert } from '../components/custom-alert';

// Android emulator local bilgisayardaki backend'e erişmek için 10.0.2.2 kullanır. iOS için localhost.
export const API_BASE_URL = 'http://192.168.1.159:8080';

interface AuthContextType {
  isLoading: boolean;
  userToken: string | null;
  userInfo: any | null;
  login: (provider: 'google' | 'facebook', socialToken: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  showAlert: (title: string, message: string, type?: 'success' | 'error') => void;
  refreshUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
    });
  };

  const refreshUserInfo = async () => {
    if (!userToken) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/test/me`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setUserInfo(response.data);
    } catch (e) {
      console.error('Failed to refresh user info:', e);
    }
  };

  // Uygulama açılışında kayıtlı JWT'yi kontrol et ve doğrula
  useEffect(() => {
    const bootstrapAsync = async () => {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync('userToken');
        if (token) {
          // Token geçerli mi backend'den sorgula
          const response = await axios.get(`${API_BASE_URL}/api/v1/test/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUserToken(token);
          setUserInfo(response.data);
        }
      } catch (e) {
        // Token geçersizse veya ağ hatası varsa temizle
        await SecureStore.deleteItemAsync('userToken');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (provider: 'google' | 'facebook', socialToken: string) => {
    setIsLoading(true);
    try {
      const endpoint = `${API_BASE_URL}/api/v1/auth/${provider}`;
      const response = await axios.post(endpoint, { token: socialToken });
      
      const { accessToken } = response.data;
      
      await SecureStore.setItemAsync('userToken', accessToken);
      setUserToken(accessToken);
      
      // Kullanıcı bilgilerini backend'den al
      const userRes = await axios.get(`${API_BASE_URL}/api/v1/test/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUserInfo(userRes.data);
    } catch (error: any) {
      console.error(`${provider} login error:`, error.response?.data || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPassword = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const endpoint = `${API_BASE_URL}/api/v1/auth/login`;
      const response = await axios.post(endpoint, { email: email.trim().toLowerCase(), password });
      
      const { accessToken } = response.data;
      
      await SecureStore.setItemAsync('userToken', accessToken);
      setUserToken(accessToken);
      
      // Kullanıcı bilgilerini al
      const userRes = await axios.get(`${API_BASE_URL}/api/v1/test/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUserInfo(userRes.data);
    } catch (error: any) {
      console.error('Password login error:', error.response?.data || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await SecureStore.deleteItemAsync('userToken');
      setUserToken(null);
      setUserInfo(null);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoading, userToken, userInfo, login, loginWithPassword, logout, showAlert, refreshUserInfo }}>
      {children}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth bir AuthProvider içerisinde kullanılmalıdır');
  }
  return context;
};
