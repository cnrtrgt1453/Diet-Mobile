import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, Modal, TextInput, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { useAuth, API_BASE_URL } from '../context/auth-context';
import axios from 'axios';
import { useTheme } from '@/hooks/use-theme';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { login, loginWithPassword, isLoading, showAlert } = useAuth();
  const theme = useTheme();
  const [isMockMode, setIsMockMode] = useState(true); // Geliştirme kolaylığı için varsayılan true

  // Rol Seçim Aşaması
  const [roleSelection, setRoleSelection] = useState<'NONE' | 'DIETITIAN' | 'CLIENT'>('NONE');

  // Diyetisyen Giriş Formu State'leri
  const [dietitianEmail, setDietitianEmail] = useState('');
  const [dietitianPassword, setDietitianPassword] = useState('');
  const [isLoggingInDietitian, setIsLoggingInDietitian] = useState(false);

  // Diyetisyen Başvuru Formu State'leri
  const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
  const [applyName, setApplyName] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyUniversity, setApplyUniversity] = useState('');
  const [applyDiploma, setApplyDiploma] = useState('');
  const [applyExperience, setApplyExperience] = useState('');
  const [applyDocUrl, setApplyDocUrl] = useState('');
  const [applyNote, setApplyNote] = useState('');
  const [applyPassword, setApplyPassword] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleApplySubmit = async () => {
    if (!applyName || !applyEmail || !applyUniversity || !applyDiploma || !applyExperience || !applyPassword) {
      Alert.alert("Hata", "Lütfen tüm zorunlu alanları (*) doldurunuz.");
      return;
    }

    const expYears = parseInt(applyExperience);
    if (isNaN(expYears) || expYears < 0) {
      Alert.alert("Hata", "Lütfen geçerli bir deneyim yılı giriniz.");
      return;
    }

    setIsApplying(true);
    try {
      await axios.post(`${API_BASE_URL}/api/v1/auth/apply-dietitian`, {
        fullName: applyName,
        email: applyEmail.trim().toLowerCase(),
        university: applyUniversity,
        diplomaNumber: applyDiploma,
        experienceYears: expYears,
        documentUrl: applyDocUrl,
        note: applyNote,
        password: applyPassword
      });

      showAlert("Başarılı", "Diyetisyen başvurunuz alındı. Giriş ekranından başvuru e-postanız ve şifrenizle giriş yaparak başvuru durumunuzu takip edebilirsiniz.", "success");
      
      // Reset form
      setApplyName('');
      setApplyEmail('');
      setApplyUniversity('');
      setApplyDiploma('');
      setApplyExperience('');
      setApplyDocUrl('');
      setApplyNote('');
      setApplyPassword('');
      setIsApplyModalVisible(false);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Başvuru Hatası", err.response?.data || "Başvuru yapılırken bir hata oluştu.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleDietitianLogin = async () => {
    if (!dietitianEmail || !dietitianPassword) {
      Alert.alert("Hata", "Lütfen e-posta ve şifrenizi giriniz.");
      return;
    }
    setIsLoggingInDietitian(true);
    try {
      await loginWithPassword(dietitianEmail, dietitianPassword);
      showAlert("Başarılı", "Diyetisyen olarak giriş yapıldı.", "success");
    } catch (err: any) {
      Alert.alert("Giriş Hatası", err.response?.data || "E-posta veya şifre hatalı.");
    } finally {
      setIsLoggingInDietitian(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!dietitianEmail) {
      Alert.alert("Şifre Sıfırlama", "Lütfen şifre sıfırlama bağlantısı göndermek için e-posta alanını doldurunuz.");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/v1/auth/forgot-password?email=${encodeURIComponent(dietitianEmail.trim().toLowerCase())}`);
      Alert.alert("Başarılı", `Şifre sıfırlama bağlantısı ${dietitianEmail} e-posta adresinize gönderildi!`);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Hata", err.response?.data || "Şifre sıfırlama talebi gönderilemedi.");
    }
  };

  // Google OAuth Talebi Yapılandırması (Kendi ID'lerinizi buraya ekleyebilirsiniz)
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: '1084592554421-uou6riks1a4ej720oec3k1t6ejoc2q3j.apps.googleusercontent.com',
  });

  // Facebook OAuth Talebi Yapılandırması (Kendi App ID'nizi buraya ekleyebilirsiniz)
  const [fbRequest, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
    clientId: '1052532350545638',
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
      showAlert('Başarılı', `${provider === 'google' ? 'Google' : 'Facebook'} ile başarıyla giriş yapıldı.`, 'success');
    } catch (err: any) {
      showAlert('Giriş Hatası', 'Kimlik doğrulanırken bir sorun oluştu.', 'error');
    }
  };

  const triggerMockLogin = async (provider: 'google' | 'facebook') => {
    const mockToken = provider === 'google' ? 'mock-token-google' : 'mock-token-facebook';
    await handleSocialLogin(provider, mockToken);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>

        {roleSelection === 'NONE' && (
          <>
            {/* Logo Bölümü */}
            <View style={styles.logoContainer}>
              <View style={[styles.logoCircle, { backgroundColor: theme.backgroundElement, shadowColor: theme.primary }]}>
                <Text style={styles.logoLeaf}>🥗</Text>
              </View>
              <Text style={[styles.logoText, { color: theme.text }]}>DietApp</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Diyetisyen ve Danışan Yönetim Platformu</Text>
            </View>

            <Text style={[styles.roleSelectionTitle, { color: theme.text }]}>Lütfen giriş yapmak için rolünüzü seçin:</Text>

            <TouchableOpacity 
              style={[styles.roleSelectBtn, { backgroundColor: theme.primary }]} 
              onPress={() => setRoleSelection('DIETITIAN')}
            >
              <Text style={styles.roleSelectEmoji}>👩‍⚕️</Text>
              <View style={styles.roleSelectTextContainer}>
                <Text style={styles.roleSelectTitleText}>Diyetisyen Girişi / Başvurusu</Text>
                <Text style={styles.roleSelectDescText}>E-posta ve şifre ile giriş yapın veya sisteme katılmak için başvurun.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleSelectBtn, { backgroundColor: '#1877F2', marginTop: 16 }]} 
              onPress={() => setRoleSelection('CLIENT')}
            >
              <Text style={styles.roleSelectEmoji}>👤</Text>
              <View style={styles.roleSelectTextContainer}>
                <Text style={styles.roleSelectTitleText}>Danışan Girişi</Text>
                <Text style={styles.roleSelectDescText}>Google veya Facebook hesabınızla hızlıca giriş yapın.</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {roleSelection === 'DIETITIAN' && (
          <>
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => setRoleSelection('NONE')}>
              <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>◀ Geri Dön</Text>
            </TouchableOpacity>

            {/* Logo Bölümü */}
            <View style={styles.logoContainerSmall}>
              <Text style={[styles.logoTextSmall, { color: theme.text }]}>👩‍⚕️ Diyetisyen Portalı</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>E-posta Adresi</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="diyetisyen@example.com"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={dietitianEmail}
                  onChangeText={setDietitianEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Şifre</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={dietitianPassword}
                  onChangeText={setDietitianPassword}
                />
              </View>

              <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                <Text style={[styles.forgotBtnText, { color: theme.primary }]}>Şifremi Unuttum</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]} 
                onPress={handleDietitianLogin}
                disabled={isLoggingInDietitian}
              >
                {isLoggingInDietitian ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>Giriş Yap</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>VEYA</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity 
                style={[styles.secondaryActionBtn, { borderColor: theme.primary, borderWidth: 1 }]} 
                onPress={() => setIsApplyModalVisible(true)}
              >
                <Text style={[styles.secondaryActionBtnText, { color: theme.primary }]}>📋 Diyetisyenliğe Başvur</Text>
              </TouchableOpacity>

              {isMockMode && (
                <TouchableOpacity 
                  style={[styles.secondaryActionBtn, { backgroundColor: theme.backgroundSelected, marginTop: 12, borderWidth: 1, borderColor: theme.primary }]} 
                  onPress={async () => {
                    setDietitianEmail('suhedaterat2@gmail.com');
                    setDietitianPassword('admin123');
                    setIsLoggingInDietitian(true);
                    try {
                      await loginWithPassword('suhedaterat2@gmail.com', 'admin123');
                      showAlert("Başarılı", "Diyetisyen olarak giriş yapıldı (Mock).", "success");
                    } catch (e) {
                      Alert.alert("Hata", "Mock girişi başarısız oldu.");
                    } finally {
                      setIsLoggingInDietitian(false);
                    }
                  }}
                >
                  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>🔧 Geliştirici Modu: Admin Bilgileri ile Giriş Yap</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {roleSelection === 'CLIENT' && (
          <>
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => setRoleSelection('NONE')}>
              <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>◀ Geri Dön</Text>
            </TouchableOpacity>

            {/* Logo Bölümü */}
            <View style={styles.logoContainerSmall}>
              <Text style={[styles.logoTextSmall, { color: theme.text }]}>👤 Danışan Portalı</Text>
              <Text style={[styles.logoSubtitleSmall, { color: theme.textSecondary }]}>Giriş yapmak veya yeni profil oluşturmak için sosyal hesap kullanın.</Text>
            </View>

            <View style={styles.buttonContainer}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#1877F2" />
              ) : (
                <>
                  {/* Google Giriş Butonu */}
                  <TouchableOpacity
                    style={[styles.button, styles.googleButton, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                    onPress={() => isMockMode ? triggerMockLogin('google') : googlePromptAsync()}
                  >
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={[styles.buttonText, { color: theme.text }]}>{isMockMode ? "Google ile Giriş Yap (Mock Danışan)" : "Google ile Giriş Yap"}</Text>
                  </TouchableOpacity>

                  {/* Facebook Giriş Butonu */}
                  <TouchableOpacity
                    style={[styles.button, styles.fbButton]}
                    onPress={() => isMockMode ? triggerMockLogin('facebook') : fbPromptAsync()}
                  >
                    <Text style={styles.fbIcon}>f</Text>
                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{isMockMode ? "Facebook ile Giriş Yap (Mock Danışan)" : "Facebook ile Giriş Yap"}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* Mock/Developer Modu Bilgilendirmesi */}
        {roleSelection === 'NONE' && (
          <View style={[styles.mockModeContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, marginTop: 32 }]}>
            <Text style={[styles.mockTitle, { color: theme.text }]}>🔧 Geliştirici Test Modu (Mock Login)</Text>
            <Text style={[styles.mockDesc, { color: theme.textSecondary }]}>
              Açık olduğunda, gerçek Google/Facebook hesap API kurulumlarına gerek olmadan doğrudan test hesapları ile sisteme giriş yapabilirsiniz.
            </Text>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Geliştirici Modu:</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, isMockMode ? styles.toggleOn : styles.toggleOff, isMockMode ? { backgroundColor: theme.primary } : {}]}
                onPress={() => setIsMockMode(!isMockMode)}
              >
                <Text style={styles.toggleText}>{isMockMode ? "AÇIK" : "KAPALI"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>

      {/* Diyetisyen Başvuru Modalı */}
      <Modal
        visible={isApplyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsApplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Diyetisyen Başvuru Formu 🥗</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Sisteme diyetisyen olarak katılmak için lütfen aşağıdaki bilgileri eksiksiz doldurun.
            </Text>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>Ad Soyad *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Örn: Şüheda Terat"
                  placeholderTextColor={theme.textSecondary}
                  value={applyName}
                  onChangeText={setApplyName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>E-posta *</Text>
                <Text style={styles.helperText}>Önemli: Başvurunuz onaylandıktan sonra giriş yaparken kullanacağınız e-posta adresidir.</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={applyEmail}
                  onChangeText={setApplyEmail}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>Giriş Şifresi *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Giriş için kullanacağınız şifre"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={applyPassword}
                  onChangeText={setApplyPassword}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>Mezun Olunan Üniversite *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Örn: Hacettepe Üniversitesi"
                  placeholderTextColor={theme.textSecondary}
                  value={applyUniversity}
                  onChangeText={setApplyUniversity}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>Diploma Numarası *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Örn: D-12345"
                  placeholderTextColor={theme.textSecondary}
                  value={applyDiploma}
                  onChangeText={setApplyDiploma}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>Deneyim Yılı *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Örn: 5"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={applyExperience}
                  onChangeText={setApplyExperience}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>Özgeçmiş / Belge Linki</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="LinkedIn veya PDF indirme linki"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={applyDocUrl}
                  onChangeText={setApplyDocUrl}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>Başvuru Notu / Motivasyon</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Kendinizi ve uzmanlıklarınızı tanıtan kısa bir not..."
                  placeholderTextColor={theme.textSecondary}
                  multiline={true}
                  numberOfLines={4}
                  value={applyNote}
                  onChangeText={setApplyNote}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }]}
                onPress={() => setIsApplyModalVisible(false)}
                disabled={isApplying}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn, { backgroundColor: theme.primary }]}
                onPress={handleApplySubmit}
                disabled={isApplying}
              >
                {isApplying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Başvuruyu Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  applyButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
    marginTop: 16,
  },
  applyIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  modalForm: {
    flexGrow: 0,
    marginBottom: 20,
  },
  modalInputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  modalInput: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FAFDFB',
    color: '#333',
  },
  helperText: {
    fontSize: 11,
    color: '#D32F2F',
    marginBottom: 6,
    lineHeight: 14,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  cancelBtn: {
    backgroundColor: '#ECEFF1',
    borderWidth: 1,
    borderColor: '#CFD8DC',
  },
  cancelBtnText: {
    color: '#546E7A',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSubmitBtn: {
    backgroundColor: '#2E7D32',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Role Selection & Portal styles
  roleSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C3A24',
    marginBottom: 24,
    textAlign: 'center',
  },
  roleSelectBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  roleSelectEmoji: {
    fontSize: 32,
  },
  roleSelectTextContainer: {
    flex: 1,
  },
  roleSelectTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  roleSelectDescText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    lineHeight: 15,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13,
    color: '#37474F',
    fontWeight: 'bold',
  },
  logoContainerSmall: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoTextSmall: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C3A24',
  },
  logoSubtitleSmall: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 6,
  },
  formContainer: {
    width: '100%',
    gap: 16,
  },
  formInput: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotBtnText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: 'bold',
  },
  primaryActionBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryActionBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryActionBtnText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CFD8DC',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#78909C',
  },
  inputGroup: {
    width: '100%',
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
