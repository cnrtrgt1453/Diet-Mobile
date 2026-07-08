import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { useAuth } from '../context/auth-context';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { login, isLoading } = useAuth();
  const [isMockMode, setIsMockMode] = useState(true); // Geliştirme kolaylığı için varsayılan true

  // Google OAuth Talebi Yapılandırması (Kendi ID'lerinizi buraya ekleyebilirsiniz)
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  });

  // Facebook OAuth Talebi Yapılandırması (Kendi App ID'nizi buraya ekleyebilirsiniz)
  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: 'YOUR_FACEBOOK_APP_ID',
  });

  // Google Giriş Yanıtı Takibi
  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.authentication) {
      const socialToken = googleResponse.authentication.idToken || googleResponse.authentication.accessToken;
      if (socialToken) {
        handleSocialLogin('google', socialToken);
      }
    }
  }, [googleResponse]);

  // Facebook Giriş Yanıtı Takibi
  useEffect(() => {
    if (fbResponse?.type === 'success' && fbResponse.authentication) {
      const socialToken = fbResponse.authentication.accessToken;
      if (socialToken) {
        handleSocialLogin('facebook', socialToken);
      }
    }
  }, [fbResponse]);

  const handleSocialLogin = async (provider: 'google' | 'facebook', token: string) => {
    try {
      await login(provider, token);
      Alert.alert('Başarılı', `${provider === 'google' ? 'Google' : 'Facebook'} ile başarıyla giriş yapıldı.`);
    } catch (err: any) {
      Alert.alert('Giriş Hatası', 'Kimlik doğrulanırken bir sorun oluştu.');
    }
  };

  const triggerMockLogin = async (provider: 'google' | 'facebook') => {
    const mockToken = provider === 'google' ? 'mock-token-google' : 'mock-token-facebook';
    await handleSocialLogin(provider, mockToken);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Logo Bölümü */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLeaf}>🥗</Text>
          </View>
          <Text style={styles.logoText}>DietApp</Text>
          <Text style={styles.subtitle}>Diyetisyen ve Danışan Yönetim Platformu</Text>
        </View>

        {/* Giriş Butonları */}
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : (
            <>
              {/* Google Giriş Butonu */}
              <TouchableOpacity
                style={[styles.button, styles.googleButton]}
                onPress={() => isMockMode ? triggerMockLogin('google') : googlePromptAsync()}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.buttonText}>{isMockMode ? "Google (Diyetisyen Şüheda Terat)" : "Google ile Giriş Yap"}</Text>
              </TouchableOpacity>

              {/* Facebook Giriş Butonu */}
              <TouchableOpacity
                style={[styles.button, styles.fbButton]}
                onPress={() => isMockMode ? triggerMockLogin('facebook') : fbPromptAsync()}
              >
                <Text style={styles.fbIcon}>f</Text>
                <Text style={styles.buttonText}>{isMockMode ? "Facebook (Örnek Danışan)" : "Facebook ile Giriş Yap"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Mock/Developer Modu Bilgilendirmesi */}
        <View style={[styles.mockModeContainer, { backgroundColor: '#E1EFE4', borderColor: '#C8E6C9' }]}>
          <Text style={[styles.mockTitle, { color: '#1C3A24' }]}>🔧 Geliştirici Test Modu (Mock Login)</Text>
          <Text style={[styles.mockDesc, { color: '#546E5A' }]}>
            Açık olduğunda, gerçek Google/Facebook hesap API kurulumlarına gerek olmadan doğrudan test hesapları ile sisteme giriş yapabilirsiniz.
          </Text>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: '#1C3A24' }]}>Geliştirici Modu:</Text>
            <TouchableOpacity 
              style={[styles.toggleBtn, isMockMode ? styles.toggleOn : styles.toggleOff]}
              onPress={() => setIsMockMode(!isMockMode)}
            >
              <Text style={styles.toggleText}>{isMockMode ? "AÇIK" : "KAPALI"}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F8F3',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  logoLeaf: {
    fontSize: 42,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    minHeight: 120,
    justifyContent: 'center',
    marginBottom: 32,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EA4335',
    marginRight: 12,
  },
  fbButton: {
    backgroundColor: '#1877F2',
  },
  fbIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  mockModeContainer: {
    width: '100%',
    backgroundColor: '#ECEFF1',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#CFD8DC',
  },
  mockTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 4,
  },
  mockDesc: {
    fontSize: 12,
    color: '#546E7A',
    lineHeight: 16,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#455A64',
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleOn: {
    backgroundColor: '#2E7D32',
  },
  toggleOff: {
    backgroundColor: '#78909C',
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
