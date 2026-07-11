import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export const ApplicationStatusScreen: React.FC = () => {
  const { userInfo, logout, refreshUserInfo, showAlert } = useAuth();
  const theme = useTheme();
  
  const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
  const [applyName, setApplyName] = useState(userInfo?.name || '');
  const [applyEmail, setApplyEmail] = useState(userInfo?.email || '');
  const [applyUniversity, setApplyUniversity] = useState('');
  const [applyDiploma, setApplyDiploma] = useState('');
  const [applyExperience, setApplyExperience] = useState('');
  const [applyDocUrl, setApplyDocUrl] = useState('');
  const [applyNote, setApplyNote] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const status = userInfo?.dietitianApplicationStatus; // PENDING or REJECTED
  const reason = userInfo?.dietitianRejectionReason;

  const handleApplySubmit = async () => {
    if (!applyName || !applyEmail || !applyUniversity || !applyDiploma || !applyExperience) {
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
        note: applyNote
      });

      showAlert("Başarılı", "Diyetisyen başvurunuz yeniden alındı. Değerlendirme süreci yeniden başlamıştır.", "success");
      setIsApplyModalVisible(false);
      await refreshUserInfo();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Başvuru Hatası", err.response?.data || "Başvuru yapılırken bir hata oluştu.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoLeaf}>🥗</Text>
          <Text style={[styles.title, { color: theme.primary }]}>DietApp</Text>
        </View>

        {/* Status Card */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          {status === 'PENDING' ? (
            <View style={styles.statusWrapper}>
              <View style={[styles.statusIconCircle, styles.pendingCircle]}>
                <Text style={styles.statusIcon}>⏳</Text>
              </View>
              <Text style={[styles.statusTitle, styles.pendingText, { color: '#FFB300' }]}>Başvurunuz İncelemede</Text>
              <Text style={[styles.statusDescription, { color: theme.text }]}>
                Diyetisyenlik başvurunuz başarıyla alındı. Yönetici diyetisyenimiz diploma numaranızı ve mezuniyet bilgilerinizi inceledikten sonra hesabınız aktif edilecektir.
              </Text>
              <Text style={[styles.infoNote, { backgroundColor: theme.background, color: theme.textSecondary }]}>
                İşlem tamamlandığında bir sonraki girişinizde paneliniz otomatik olarak açılacaktır. Lütfen aralıklarla kontrol ediniz.
              </Text>
            </View>
          ) : (
            <View style={styles.statusWrapper}>
              <View style={[styles.statusIconCircle, styles.rejectedCircle]}>
                <Text style={styles.statusIcon}>❌</Text>
              </View>
              <Text style={[styles.statusTitle, styles.rejectedText, { color: '#D32F2F' }]}>Başvurunuz Reddedildi</Text>
              <Text style={[styles.statusDescription, { color: theme.text }]}>
                Girdiğiniz bilgiler doğrulanamadığı için diyetisyenlik başvurunuz reddedilmiştir.
              </Text>
              
              {reason ? (
                <View style={[styles.reasonBox, { backgroundColor: 'rgba(211, 47, 47, 0.15)', borderColor: 'rgba(211, 47, 47, 0.3)' }]}>
                  <Text style={[styles.reasonTitle, { color: '#FF8A80' }]}>Reddedilme Nedeni:</Text>
                  <Text style={[styles.reasonText, { color: theme.text }]}>{reason}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.reapplyBtn, { backgroundColor: theme.primary }]}
                onPress={() => setIsApplyModalVisible(true)}
              >
                <Text style={styles.reapplyBtnText}>Bilgileri Güncelle ve Yeniden Başvur</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Refresh button */}
          <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]} onPress={refreshUserInfo}>
            <Text style={[styles.refreshBtnText, { color: theme.text }]}>🔄 Durumu Güncelle</Text>
          </TouchableOpacity>

          {/* Logout button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Diyetisyen Başvuru Modalı (Yeniden Başvuru İçin) */}
      <Modal
        visible={isApplyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsApplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Bilgileri Güncelle 🥗</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Başvurunuzu düzeltmek için lütfen aşağıdaki alanları güncelleyip tekrar gönderin.
            </Text>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>Ad Soyad *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                  placeholder="Ad Soyad"
                  placeholderTextColor={theme.textSecondary}
                  value={applyName}
                  onChangeText={setApplyName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>E-posta *</Text>
                <TextInput
                  style={[styles.modalInput, styles.disabledInput, { backgroundColor: theme.backgroundSelected, color: theme.textSecondary, borderColor: theme.backgroundSelected }]}
                  editable={false}
                  value={applyEmail}
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
                  placeholder="Eklemek istediğiniz notlar..."
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
                  <Text style={styles.modalSubmitBtnText}>Yeniden Başvur</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoLeaf: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  statusWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  statusIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingCircle: {
    backgroundColor: '#FFF8E1',
  },
  rejectedCircle: {
    backgroundColor: '#FFEBEE',
  },
  statusIcon: {
    fontSize: 36,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pendingText: {
    color: '#FFB300',
  },
  rejectedText: {
    color: '#D32F2F',
  },
  statusDescription: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoNote: {
    fontSize: 12,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  reasonBox: {
    width: '100%',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#D32F2F',
    lineHeight: 18,
  },
  reapplyBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  reapplyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  refreshBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B0BEC5',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  refreshBtnText: {
    color: '#37474F',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutBtnText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '600',
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
  disabledInput: {
    backgroundColor: '#EEEEEE',
    color: '#777777',
    borderColor: '#DDDDDD',
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
});
