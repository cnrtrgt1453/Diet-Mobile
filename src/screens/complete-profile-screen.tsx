import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth, API_BASE_URL } from '../context/auth-context';

export const CompleteProfileScreen: React.FC = () => {
  const { userToken, showAlert, refreshUserInfo, logout } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [category, setCategory] = useState<'GLP_1' | 'LIPEDEMA' | 'WEIGHT_MANAGEMENT' | 'HORMONAL_BALANCE'>('WEIGHT_MANAGEMENT');
  
  // GLP-1 Fields
  const [glp1InjectionDay, setGlp1InjectionDay] = useState('Pazartesi');
  const [glp1Dosage, setGlp1Dosage] = useState('0.25 mg');
  
  // Lipedema Fields
  const [lipedemaStage, setLipedemaStage] = useState('1');
  const [antiInflammatoryCompliant, setAntiInflammatoryCompliant] = useState(true);
  
  // Hormonal Fields
  const [hormoneTargetCycle, setHormoneTargetCycle] = useState('Foliküler Faz');

  const handleSubmit = async () => {
    if (!height || !currentWeight || !targetWeight) {
      showAlert('Hata', 'Lütfen boy, mevcut kilo ve hedef kilo alanlarını doldurun.', 'error');
      return;
    }

    const heightNum = parseFloat(height);
    const weightNum = parseFloat(currentWeight);
    const targetNum = parseFloat(targetWeight);

    if (isNaN(heightNum) || isNaN(weightNum) || isNaN(targetNum)) {
      showAlert('Hata', 'Lütfen geçerli sayısal değerler girin.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        height: heightNum,
        currentWeight: weightNum,
        targetWeight: targetNum,
        category,
      };

      if (category === 'GLP_1') {
        data.glp1InjectionDay = glp1InjectionDay;
        data.glp1Dosage = glp1Dosage;
      } else if (category === 'LIPEDEMA') {
        data.lipedemaStage = parseInt(lipedemaStage);
        data.antiInflammatoryCompliant = antiInflammatoryCompliant;
      } else if (category === 'HORMONAL_BALANCE') {
        data.hormoneTargetCycle = hormoneTargetCycle;
      }

      await axios.put(`${API_BASE_URL}/api/v1/users/profile`, data, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      showAlert('Başarılı', 'Profiliniz başarıyla oluşturuldu!', 'success');
      
      // Refresh context user info to trigger home screen routing
      await refreshUserInfo();
    } catch (err: any) {
      console.error(err);
      showAlert('Hata', err.response?.data || 'Profil güncellenirken bir sorun oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoLeaf}>🥗</Text>
            <Text style={styles.title}>Profilini Tamamla</Text>
            <Text style={styles.subtitle}>
              Diyetisyeninizin size özel program oluşturabilmesi için bilgilerinizi eksiksiz doldurun.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Height */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Boy (cm) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 165"
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />
            </View>

            {/* Current Weight */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mevcut Ağırlık (kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 75.5"
                keyboardType="numeric"
                value={currentWeight}
                onChangeText={setCurrentWeight}
              />
            </View>

            {/* Target Weight */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hedef Ağırlık (kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: 65.0"
                keyboardType="numeric"
                value={targetWeight}
                onChangeText={setTargetWeight}
              />
            </View>

            {/* Category Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Takip Programı Kategorisi *</Text>
              <View style={styles.categoryContainer}>
                {(
                  [
                    { id: 'WEIGHT_MANAGEMENT', label: 'Kilo Yönetimi' },
                    { id: 'GLP_1', label: 'GLP-1 Takip' },
                    { id: 'LIPEDEMA', label: 'Lipödem' },
                    { id: 'HORMONAL_BALANCE', label: 'Hormonal Denge' },
                  ] as const
                ).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.categoryButton,
                      category === item.id && styles.categoryButtonActive,
                    ]}
                    onPress={() => setCategory(item.id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === item.id && styles.categoryTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Conditional Fields based on Category */}
            {category === 'GLP_1' && (
              <View style={styles.extraSection}>
                <Text style={styles.extraTitle}>💉 GLP-1 Takip Detayları</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Enjeksiyon Günü</Text>
                  <View style={styles.selectRow}>
                    {['Pazartesi', 'Çarşamba', 'Cuma', 'Pazar'].map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.subSelectButton,
                          glp1InjectionDay === day && styles.subSelectButtonActive,
                        ]}
                        onPress={() => setGlp1InjectionDay(day)}
                      >
                        <Text style={[styles.subSelectText, glp1InjectionDay === day && styles.subSelectTextActive]}>
                          {day.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Dozaj</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Örn: 0.5 mg"
                    value={glp1Dosage}
                    onChangeText={setGlp1Dosage}
                  />
                </View>
              </View>
            )}

            {category === 'LIPEDEMA' && (
              <View style={styles.extraSection}>
                <Text style={styles.extraTitle}>🦵 Lipödem Takip Detayları</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Lipödem Evresi</Text>
                  <View style={styles.selectRow}>
                    {['1', '2', '3', '4'].map((stage) => (
                      <TouchableOpacity
                        key={stage}
                        style={[
                          styles.subSelectButton,
                          lipedemaStage === stage && styles.subSelectButtonActive,
                        ]}
                        onPress={() => setLipedemaStage(stage)}
                      >
                        <Text style={[styles.subSelectText, lipedemaStage === stage && styles.subSelectTextActive]}>
                          Evre {stage}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.switchGroup}>
                  <Text style={styles.switchLabel}>Anti-inflamatuar Diyete Uyum</Text>
                  <Switch
                    trackColor={{ false: '#767577', true: '#81C784' }}
                    thumbColor={antiInflammatoryCompliant ? '#2E7D32' : '#f4f3f4'}
                    value={antiInflammatoryCompliant}
                    onValueChange={setAntiInflammatoryCompliant}
                  />
                </View>
              </View>
            )}

            {category === 'HORMONAL_BALANCE' && (
              <View style={styles.extraSection}>
                <Text style={styles.extraTitle}>🧬 Hormonal Denge Detayları</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Hedef Döngü / Faz</Text>
                  <View style={styles.categoryContainer}>
                    {['Menstrüasyon', 'Foliküler Faz', 'Ovulasyon', 'Luteal Faz'].map((phase) => (
                      <TouchableOpacity
                        key={phase}
                        style={[
                          styles.categoryButton,
                          styles.halfWidth,
                          hormoneTargetCycle === phase && styles.categoryButtonActive,
                        ]}
                        onPress={() => setHormoneTargetCycle(phase)}
                      >
                        <Text style={[styles.categoryText, hormoneTargetCycle === phase && styles.categoryTextActive]}>
                          {phase}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Profilimi Kaydet ve Başla</Text>
              )}
            </TouchableOpacity>

            {/* Logout link */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F8F3',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoLeaf: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#FAFDFB',
    color: '#333',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#FAFDFB',
  },
  categoryButtonActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555555',
  },
  categoryTextActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  extraSection: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 18,
  },
  extraTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 14,
  },
  selectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subSelectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: '#FAFDFB',
  },
  subSelectButtonActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  subSelectText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555555',
  },
  subSelectTextActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  halfWidth: {
    width: '48%',
  },
  submitBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '600',
  },
});
