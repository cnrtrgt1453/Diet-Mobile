import React, { useState, useEffect, useCallback } from 'react';
import { Platform, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, View, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth, API_BASE_URL } from '../context/auth-context';

export default function HomeScreen() {
  const { userInfo, userToken, logout } = useAuth();
  const theme = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, glp1: 0, lipedema: 0, weightManagement: 0, hormonalBalance: 0 });
  const [todayDiet, setTodayDiet] = useState<any>(null);
  
  // Danışan ekleme modalı state'leri
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [category, setCategory] = useState<'GLP_1' | 'LIPEDEMA' | 'WEIGHT_MANAGEMENT' | 'HORMONAL_BALANCE'>('WEIGHT_MANAGEMENT');
  const [notes, setNotes] = useState('');
  const [glp1InjectionDay, setGlp1InjectionDay] = useState('');
  const [glp1Dosage, setGlp1Dosage] = useState('');
  const [lipedemaStage, setLipedemaStage] = useState('1');
  const [hormoneTargetCycle, setHormoneTargetCycle] = useState('');

  const isDietitian = userInfo?.role === 'ROLE_DIETITIAN';

  const loadData = useCallback(async () => {
    if (!userToken) return;
    try {
      if (isDietitian) {
        const res = await axios.get(`${API_BASE_URL}/api/v1/clients/stats`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setStats(res.data);
      } else {
        const res = await axios.get(`${API_BASE_URL}/api/v1/diets/my/today`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        if (typeof res.data === 'object') {
          setTodayDiet(res.data);
        } else {
          setTodayDiet(null);
        }
      }
    } catch (e: any) {
      console.error("Data load error:", e.message);
    }
  }, [userToken, isDietitian]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddClient = async () => {
    if (!name || !email) {
      Alert.alert("Hata", "Lütfen en azından İsim ve E-posta giriniz.");
      return;
    }
    try {
      const payload: any = {
        name,
        email,
        height: height ? parseFloat(height) : null,
        currentWeight: currentWeight ? parseFloat(currentWeight) : null,
        targetWeight: targetWeight ? parseFloat(targetWeight) : null,
        category,
        notes,
      };

      if (category === 'GLP_1') {
        payload.glp1InjectionDay = glp1InjectionDay;
        payload.glp1Dosage = glp1Dosage;
      } else if (category === 'LIPEDEMA') {
        payload.lipedemaStage = parseInt(lipedemaStage);
        payload.antiInflammatoryCompliant = true;
      } else if (category === 'HORMONAL_BALANCE') {
        payload.hormoneTargetCycle = hormoneTargetCycle;
      }

      await axios.post(`${API_BASE_URL}/api/v1/clients`, payload, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      Alert.alert("Başarılı", "Yeni danışan başarıyla eklendi.");
      setIsAddModalVisible(false);
      // Reset form
      setName('');
      setEmail('');
      setHeight('');
      setCurrentWeight('');
      setTargetWeight('');
      setCategory('WEIGHT_MANAGEMENT');
      setNotes('');
      setGlp1InjectionDay('');
      setGlp1Dosage('');
      setLipedemaStage('1');
      setHormoneTargetCycle('');
      
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Danışan eklenirken hata oluştu.");
    }
  };

  const handleToggleDiet = async () => {
    if (!todayDiet) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/v1/diets/my/${todayDiet.id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setTodayDiet(res.data);
      Alert.alert("Başarılı", res.data.completed ? "Bugünkü diyetinizi tamamladınız! Harika iş 🌟" : "Diyet durumu güncellendi.");
    } catch (e: any) {
      Alert.alert("Hata", "Diyet durumu güncellenemedi.");
    }
  };

  // BMI Hesaplama Yardımcısı
  const calculateBMI = (w: number, h: number) => {
    if (!w || !h) return null;
    const bmi = w / ((h / 100) * (h / 100));
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: "Zayıf", color: "#FF9800" };
    if (bmi < 25) return { text: "Normal", color: "#4CAF50" };
    if (bmi < 30) return { text: "Fazla Kilolu", color: "#FF9800" };
    return { text: "Obez", color: "#F44336" };
  };

  const translateCategory = (cat: string) => {
    switch (cat) {
      case 'GLP_1': return 'GLP-1 Destekli';
      case 'LIPEDEMA': return 'Lipödem Diyeti';
      case 'HORMONAL_BALANCE': return 'Hormonal Denge';
      default: return 'Kilo Yönetimi';
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
    >
      <SafeAreaView style={styles.safeArea}>
        
        {/* Karşılama Alanı */}
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={styles.welcomeSubtitle}>DietApp Platformu</ThemedText>
            <ThemedText type="title" style={[styles.welcomeTitle, { color: theme.text }]}>
              {isDietitian ? `Hoş geldiniz,` : `Merhaba,`}
            </ThemedText>
            <ThemedText type="title" style={[styles.nameTitle, { color: theme.primary }]}>
              {userInfo?.name || "Kullanıcı"}
            </ThemedText>
          </View>
          <TouchableOpacity style={[styles.logoutBtn, { borderColor: theme.textSecondary }]} onPress={logout}>
            <ThemedText style={[styles.logoutText, { color: theme.textSecondary }]}>Çıkış</ThemedText>
          </TouchableOpacity>
        </View>

        {isDietitian ? (
          /* ========================================================
             DIETITIAN DASHBOARD VIEW
             ======================================================== */
          <View style={styles.dashboardSection}>
            <ThemedText style={styles.sectionTitle}>Klinik İstatistikleri</ThemedText>
            
            {/* İstatistik Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.statEmoji}>👥</ThemedText>
                <ThemedText style={styles.statValue}>{stats.total}</ThemedText>
                <ThemedText style={styles.statLabel}>Toplam Danışan</ThemedText>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.statEmoji}>💉</ThemedText>
                <ThemedText style={styles.statValue}>{stats.glp1}</ThemedText>
                <ThemedText style={styles.statLabel}>GLP-1 Takip</ThemedText>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.statEmoji}>🦵</ThemedText>
                <ThemedText style={styles.statValue}>{stats.lipedema}</ThemedText>
                <ThemedText style={styles.statLabel}>Lipödem Diyeti</ThemedText>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.statEmoji}>🧬</ThemedText>
                <ThemedText style={styles.statValue}>{stats.hormonalBalance + stats.weightManagement}</ThemedText>
                <ThemedText style={styles.statLabel}>Denge & Kilo</ThemedText>
              </View>
            </View>

            {/* Hızlı Aksiyon Butonu */}
            <TouchableOpacity 
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => setIsAddModalVisible(true)}
            >
              <ThemedText style={styles.primaryActionBtnText}>➕ Yeni Danışan Kaydı Ekle</ThemedText>
            </TouchableOpacity>

            {/* Bilgilendirme Kartı */}
            <View style={[styles.infoCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.infoCardTitle}>📍 Alsancak Klinik & Online Takip</ThemedText>
              <ThemedText style={styles.infoCardDesc}>
                İzmir Alsancak kliniğinizdeki seanslarınızı ve online danışanlarınızı takip etmek için "Explore (Rehber)" sekmesini kullanın. Buradan her danışanın kilo grafiğini inceleyebilir, haftalık seans ölçümü girebilir ve kişiye özel günlük diyet menülerini oluşturabilirsiniz.
              </ThemedText>
            </View>

          </View>
        ) : (
          /* ========================================================
             CLIENT DASHBOARD VIEW
             ======================================================== */
          <View style={styles.dashboardSection}>
            
            {/* Kilo & BMI Kartı */}
            <View style={[styles.profileSummaryCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.badgeRow}>
                <View style={[styles.categoryBadge, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText style={styles.categoryBadgeText}>
                    {translateCategory(userInfo?.category || 'WEIGHT_MANAGEMENT')}
                  </ThemedText>
                </View>
                <ThemedText style={styles.heightText}>Boy: {userInfo?.height || 0} cm</ThemedText>
              </View>
              
              <View style={styles.weightDetailsRow}>
                <View style={styles.weightCol}>
                  <ThemedText style={styles.weightLabel}>Başlangıç</ThemedText>
                  <ThemedText style={styles.weightValue}>{userInfo?.currentWeight || 0} kg</ThemedText>
                </View>
                <View style={styles.weightDivider} />
                <View style={styles.weightCol}>
                  <ThemedText style={styles.weightLabel}>Hedef</ThemedText>
                  <ThemedText style={styles.weightValue}>{userInfo?.targetWeight || 0} kg</ThemedText>
                </View>
                <View style={styles.weightDivider} />
                <View style={styles.weightCol}>
                  <ThemedText style={styles.weightLabel}>Vücut Kitle İndeksi</ThemedText>
                  {(() => {
                    const bmi = calculateBMI(userInfo?.currentWeight, userInfo?.height);
                    if (!bmi) return <ThemedText style={styles.weightValue}>-</ThemedText>;
                    const cat = getBMICategory(parseFloat(bmi));
                    return (
                      <View style={styles.bmiWrapper}>
                        <ThemedText style={styles.weightValue}>{bmi}</ThemedText>
                        <ThemedText style={[styles.bmiCategoryText, { color: cat.color }]}>({cat.text})</ThemedText>
                      </View>
                    );
                  })()}
                </View>
              </View>

              {userInfo?.category === 'GLP_1' && (
                <View style={styles.categoryMetaRow}>
                  <ThemedText style={styles.categoryMetaText}>💉 Enjeksiyon Günü: <ThemedText style={styles.boldText}>{userInfo?.glp1InjectionDay || "Belirtilmedi"}</ThemedText></ThemedText>
                  <ThemedText style={styles.categoryMetaText}>Doz: <ThemedText style={styles.boldText}>{userInfo?.glp1Dosage || "0"}</ThemedText></ThemedText>
                </View>
              )}

              {userInfo?.category === 'LIPEDEMA' && (
                <View style={styles.categoryMetaRow}>
                  <ThemedText style={styles.categoryMetaText}>🦵 Lipödem Evresi: <ThemedText style={styles.boldText}>Evre {userInfo?.lipedemaStage || "1"}</ThemedText></ThemedText>
                  <ThemedText style={styles.categoryMetaText}>Ödem Karşıtı Beslenme: <ThemedText style={styles.boldText}>Aktif</ThemedText></ThemedText>
                </View>
              )}

              {userInfo?.category === 'HORMONAL_BALANCE' && (
                <View style={styles.categoryMetaRow}>
                  <ThemedText style={styles.categoryMetaText}>🧬 Hedef Faz: <ThemedText style={styles.boldText}>{userInfo?.hormoneTargetCycle || "Belirtilmedi"}</ThemedText></ThemedText>
                </View>
              )}
            </View>

            {/* Diyet Takip Kartı */}
            <ThemedText style={styles.sectionTitle}>Bugünkü Diyet Programınız</ThemedText>
            
            {todayDiet ? (
              <View style={[styles.dietCard, { borderColor: theme.primary, backgroundColor: '#FFFFFF' }]}>
                <View style={[styles.dietCardHeader, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText style={styles.dietCardTitle}>🥗 {todayDiet.title || "Günlük Menü"}</ThemedText>
                  <ThemedText style={styles.dietCardCal}>{todayDiet.targetCalories} kcal</ThemedText>
                </View>
                
                <View style={styles.mealRow}>
                  <ThemedText style={styles.mealLabel}>🍳 Kahvaltı</ThemedText>
                  <ThemedText style={styles.mealValue}>{todayDiet.breakfast || "Planlanmadı"}</ThemedText>
                </View>

                <View style={styles.mealRow}>
                  <ThemedText style={styles.mealLabel}>🍲 Öğle Yemeği</ThemedText>
                  <ThemedText style={styles.mealValue}>{todayDiet.lunch || "Planlanmadı"}</ThemedText>
                </View>

                <View style={styles.mealRow}>
                  <ThemedText style={styles.mealLabel}>🥗 Akşam Yemeği</ThemedText>
                  <ThemedText style={styles.mealValue}>{todayDiet.dinner || "Planlanmadı"}</ThemedText>
                </View>

                {todayDiet.snacks && (
                  <View style={styles.mealRow}>
                    <ThemedText style={styles.mealLabel}>☕ Ara Öğün</ThemedText>
                    <ThemedText style={styles.mealValue}>{todayDiet.snacks}</ThemedText>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.dietToggleBtn, { backgroundColor: todayDiet.completed ? '#4CAF50' : theme.primary }]}
                  onPress={handleToggleDiet}
                >
                  <ThemedText style={styles.dietToggleBtnText}>
                    {todayDiet.completed ? "✓ Bugünü Başarıyla Tamamladım!" : "Bugün Diyetime Uydum"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.noDietCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.noDietText}>📭 Diyetisyeniniz henüz bugün için bir diyet planı atamadı.</ThemedText>
              </View>
            )}

            {/* Diyetisyen Künyesi */}
            <View style={[styles.dietitianCreditsCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.creditsEmoji}>👩‍⚕️</ThemedText>
              <View style={styles.creditsTextContainer}>
                <ThemedText style={styles.creditsLabel}>Diyetisyeniniz</ThemedText>
                <ThemedText style={styles.creditsName}>Şüheda Terat</ThemedText>
                <ThemedText style={styles.creditsLocation}>İzmir / Alsancak Kliniği</ThemedText>
              </View>
            </View>

          </View>
        )}

      </SafeAreaView>

      {/* ========================================================
         YENİ DANIŞAN EKLEME MODALI (DIETITIAN ONLY)
         ======================================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.background }]}>
            
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Yeni Danışan Kaydı</ThemedText>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsAddModalVisible(false)}>
                <ThemedText style={styles.modalCloseBtnText}>Kapat</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <ThemedText style={styles.inputLabel}>Adı Soyadı</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Örn: Ayşe Yılmaz"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <ThemedText style={styles.inputLabel}>E-posta Adresi (Sosyal giriş için kullanılacak)</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Örn: ayse.yilmaz@gmail.com"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <View style={styles.inputRow}>
                <View style={styles.inputRowCol}>
                  <ThemedText style={styles.inputLabel}>Boy (cm)</ThemedText>
                  <TextInput 
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                    placeholder="165"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>
                <View style={styles.inputRowCol}>
                  <ThemedText style={styles.inputLabel}>Kilo (kg)</ThemedText>
                  <TextInput 
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                    placeholder="78.5"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={currentWeight}
                    onChangeText={setCurrentWeight}
                  />
                </View>
                <View style={styles.inputRowCol}>
                  <ThemedText style={styles.inputLabel}>Hedef (kg)</ThemedText>
                  <TextInput 
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                    placeholder="65.0"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                  />
                </View>
              </View>

              <ThemedText style={styles.inputLabel}>Klinik Kategori</ThemedText>
              <View style={styles.categorySelectRow}>
                {(['WEIGHT_MANAGEMENT', 'GLP_1', 'LIPEDEMA', 'HORMONAL_BALANCE'] as const).map((catOption) => (
                  <TouchableOpacity
                    key={catOption}
                    style={[
                      styles.categorySelectBtn,
                      { borderColor: theme.primary },
                      category === catOption ? { backgroundColor: theme.primary } : {}
                    ]}
                    onPress={() => setCategory(catOption)}
                  >
                    <ThemedText style={[
                      styles.categorySelectBtnText,
                      category === catOption ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.primary }
                    ]}>
                      {catOption === 'GLP_1' ? 'GLP-1' : catOption === 'LIPEDEMA' ? 'Lipödem' : catOption === 'HORMONAL_BALANCE' ? 'Hormon' : 'Kilo'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Kategoriye Özel Alanlar */}
              {category === 'GLP_1' && (
                <View style={styles.conditionalFields}>
                  <ThemedText style={styles.inputLabel}>Enjeksiyon Günü</ThemedText>
                  <TextInput 
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                    placeholder="Pazartesi"
                    placeholderTextColor={theme.textSecondary}
                    value={glp1InjectionDay}
                    onChangeText={setGlp1InjectionDay}
                  />
                  <ThemedText style={styles.inputLabel}>İlaç Dozu (mg)</ThemedText>
                  <TextInput 
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                    placeholder="0.5 mg"
                    placeholderTextColor={theme.textSecondary}
                    value={glp1Dosage}
                    onChangeText={setGlp1Dosage}
                  />
                </View>
              )}

              {category === 'LIPEDEMA' && (
                <View style={styles.conditionalFields}>
                  <ThemedText style={styles.inputLabel}>Lipödem Evresi (1-2-3)</ThemedText>
                  <View style={styles.categorySelectRow}>
                    {['1', '2', '3'].map((stage) => (
                      <TouchableOpacity
                        key={stage}
                        style={[
                          styles.categorySelectBtn,
                          { borderColor: theme.primary },
                          lipedemaStage === stage ? { backgroundColor: theme.primary } : {}
                        ]}
                        onPress={() => setLipedemaStage(stage)}
                      >
                        <ThemedText style={[
                          styles.categorySelectBtnText,
                          lipedemaStage === stage ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.primary }
                        ]}>
                          Evre {stage}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {category === 'HORMONAL_BALANCE' && (
                <View style={styles.conditionalFields}>
                  <ThemedText style={styles.inputLabel}>Hedef Döngü Fazı (PCOS, Tiroid Takip)</ThemedText>
                  <TextInput 
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                    placeholder="Luteal Faz / Genel Takip"
                    placeholderTextColor={theme.textSecondary}
                    value={hormoneTargetCycle}
                    onChangeText={setHormoneTargetCycle}
                  />
                </View>
              )}

              <ThemedText style={styles.inputLabel}>Klinik / Diyetisyen Notları</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Danışan hakkında klinik gözlemleriniz..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddClient}
              >
                <ThemedText style={styles.saveBtnText}>Kaydet ve Başlat</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: '#81A588',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '300',
  },
  nameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dashboardSection: {
    gap: Spacing.four,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: Spacing.two,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.half,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#546E5A',
  },
  primaryActionBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoCard: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#546E5A',
  },
  
  // Danışan Paneli Styles
  profileSummaryCard: {
    padding: Spacing.four,
    borderRadius: 18,
    gap: Spacing.three,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  heightText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#546E5A',
  },
  weightDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: Spacing.one,
  },
  weightCol: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  weightLabel: {
    fontSize: 11,
    color: '#546E5A',
  },
  weightValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weightDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#C5DFCC',
  },
  bmiWrapper: {
    alignItems: 'center',
  },
  bmiCategoryText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 10,
    borderRadius: 10,
  },
  categoryMetaText: {
    fontSize: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  dietCard: {
    borderWidth: 2,
    borderRadius: 18,
    overflow: 'hidden',
  },
  dietCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  dietCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  dietCardCal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  mealRow: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#E1EFE4',
    gap: 4,
  },
  mealLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  mealValue: {
    fontSize: 14,
    color: '#1C3A24',
    lineHeight: 18,
  },
  dietToggleBtn: {
    margin: Spacing.three,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietToggleBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  noDietCard: {
    padding: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
  },
  noDietText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#546E5A',
  },
  dietitianCreditsCard: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  creditsEmoji: {
    fontSize: 32,
  },
  creditsTextContainer: {
    flex: 1,
  },
  creditsLabel: {
    fontSize: 10,
    color: '#81A588',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  creditsName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditsLocation: {
    fontSize: 12,
    color: '#546E5A',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E1EFE4',
    paddingBottom: Spacing.three,
    marginBottom: Spacing.three,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseBtnText: {
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  modalForm: {
    gap: Spacing.two,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#546E5A',
    marginTop: Spacing.half,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  inputRowCol: {
    flex: 1,
  },
  categorySelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginVertical: Spacing.half,
  },
  categorySelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  categorySelectBtnText: {
    fontSize: 12,
  },
  conditionalFields: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    borderRadius: 10,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: '#E1EFE4',
  },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
