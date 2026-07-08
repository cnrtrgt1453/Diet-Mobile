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
  
  // Randevu State'leri
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [approvedAppointments, setApprovedAppointments] = useState<any[]>([]);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [isAppModalVisible, setIsAppModalVisible] = useState(false);
  const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [appTime, setAppTime] = useState('');
  const [appNote, setAppNote] = useState('');

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
        // İstatistikleri çek
        const resStats = await axios.get(`${API_BASE_URL}/api/v1/clients/stats`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setStats(resStats.data);

        // Bekleyen randevuları çek
        const resPending = await axios.get(`${API_BASE_URL}/api/v1/appointments/dietitian?status=PENDING`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setPendingAppointments(resPending.data);

        // Onaylanmış randevuları çek
        const resApproved = await axios.get(`${API_BASE_URL}/api/v1/appointments/dietitian?status=APPROVED`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setApprovedAppointments(resApproved.data);
      } else {
        // Bugünün diyetini çek
        const resDiet = await axios.get(`${API_BASE_URL}/api/v1/diets/my/today`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        if (typeof resDiet.data === 'object') {
          setTodayDiet(resDiet.data);
        } else {
          setTodayDiet(null);
        }

        // Danışanın randevularını çek
        const resApps = await axios.get(`${API_BASE_URL}/api/v1/appointments/my`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setMyAppointments(resApps.data);
      }
    } catch (e: any) {
      console.error("Data load error in dashboard:", e.message);
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

  // Randevu Talebi Gönder
  const handleRequestAppointment = async () => {
    if (!appDate || !appTime) {
      Alert.alert("Hata", "Lütfen randevu tarihi ve saatini doldurunuz.");
      return;
    }
    try {
      const payload = {
        appointmentDate: appDate,
        appointmentTime: appTime,
        note: appNote
      };
      await axios.post(`${API_BASE_URL}/api/v1/appointments`, payload, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Randevu talebiniz diyetisyeninize iletildi.");
      setIsAppModalVisible(false);
      setAppTime('');
      setAppNote('');
      loadData();
    } catch (e: any) {
      Alert.alert("Hata", e.response?.data || "Randevu talebi oluşturulamadı.");
    }
  };

  // Randevu Durumunu Güncelle (Onayla / Reddet)
  const handleUpdateAppointment = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/appointments/${id}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", status === 'APPROVED' ? "Randevu onaylandı." : "Randevu reddedildi.");
      loadData();
    } catch (e) {
      Alert.alert("Hata", "İşlem gerçekleştirilemedi.");
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

  const translateAppStatus = (status: string) => {
    switch (status) {
      case 'APPROVED': return { text: 'Onaylandı', color: '#2E7D32', bg: '#E2EFE5' };
      case 'REJECTED': return { text: 'Reddedildi', color: '#C62828', bg: '#FFEBEE' };
      default: return { text: 'Onay Bekliyor', color: '#EF6C00', bg: '#FFF3E0' };
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

            <TouchableOpacity 
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => setIsAddModalVisible(true)}
            >
              <ThemedText style={styles.primaryActionBtnText}>➕ Yeni Danışan Kaydı Ekle</ThemedText>
            </TouchableOpacity>

            {/* Bekleyen Randevu Talepleri */}
            <ThemedText style={styles.sectionTitle}>📅 Bekleyen Randevu Talepleri ({pendingAppointments.length})</ThemedText>
            {pendingAppointments.length > 0 ? (
              pendingAppointments.map((app) => (
                <View key={app.id} style={[styles.appRequestCard, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.appCardHeader}>
                    <ThemedText style={styles.appClientName}>{app.client.name}</ThemedText>
                    <View style={[styles.miniBadge, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText style={styles.miniBadgeText}>{translateCategory(app.client.category)}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.appDateTime}>🗓 Tarih: <ThemedText style={styles.boldText}>{app.appointmentDate}</ThemedText> | Saat: <ThemedText style={styles.boldText}>{app.appointmentTime}</ThemedText></ThemedText>
                  {app.note ? <ThemedText style={styles.appNote}>Not: "{app.note}"</ThemedText> : null}
                  
                  <View style={styles.appActionRow}>
                    <TouchableOpacity 
                      style={[styles.appBtn, styles.appRejectBtn]}
                      onPress={() => handleUpdateAppointment(app.id, 'REJECTED')}
                    >
                      <ThemedText style={styles.appRejectText}>Reddet</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.appBtn, { backgroundColor: theme.primary }]}
                      onPress={() => handleUpdateAppointment(app.id, 'APPROVED')}
                    >
                      <ThemedText style={styles.appApproveText}>Onayla</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.noItemsCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.noItemsText}>🎉 Bekleyen randevu talebi bulunmuyor.</ThemedText>
              </View>
            )}

            {/* Onaylanmış Randevular */}
            <ThemedText style={styles.sectionTitle}>🗓 Yaklaşan Seanslar ({approvedAppointments.length})</ThemedText>
            {approvedAppointments.length > 0 ? (
              approvedAppointments.map((app) => (
                <View key={app.id} style={[styles.appApprovedCard, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.appCardHeader}>
                    <ThemedText style={styles.appClientName}>{app.client.name}</ThemedText>
                    <ThemedText style={styles.appApprovedTime}>{app.appointmentDate} | {app.appointmentTime}</ThemedText>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.noItemsCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.noItemsText}>Bu haftaya planlanmış seans bulunmuyor.</ThemedText>
              </View>
            )}

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
                  <ThemedText style={styles.categoryMetaText}>💉 Enjeksiyon: <ThemedText style={styles.boldText}>{userInfo?.glp1InjectionDay || "Belirtilmedi"}</ThemedText></ThemedText>
                  <ThemedText style={styles.categoryMetaText}>Doz: <ThemedText style={styles.boldText}>{userInfo?.glp1Dosage || "0"}</ThemedText></ThemedText>
                </View>
              )}

              {userInfo?.category === 'LIPEDEMA' && (
                <View style={styles.categoryMetaRow}>
                  <ThemedText style={styles.categoryMetaText}>🦵 Lipödem: <ThemedText style={styles.boldText}>Evre {userInfo?.lipedemaStage || "1"}</ThemedText></ThemedText>
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

            {/* Randevu İsteme & Durumları */}
            <View style={styles.rowBetween}>
              <ThemedText style={styles.sectionTitle}>📅 Randevu Talepleriniz</ThemedText>
              <TouchableOpacity 
                style={[styles.smallAppBtn, { backgroundColor: theme.primary }]}
                onPress={() => setIsAppModalVisible(true)}
              >
                <ThemedText style={styles.smallAppBtnText}>Talep Oluştur</ThemedText>
              </TouchableOpacity>
            </View>

            {myAppointments.length > 0 ? (
              myAppointments.map((app) => {
                const statInfo = translateAppStatus(app.status);
                return (
                  <View key={app.id} style={[styles.appClientCard, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.appClientText}>
                      <ThemedText style={styles.appClientDateTime}>{app.appointmentDate} | {app.appointmentTime}</ThemedText>
                      {app.note ? <ThemedText style={styles.appClientNote}>Not: "{app.note}"</ThemedText> : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statInfo.bg }]}>
                      <ThemedText style={[styles.statusBadgeText, { color: statInfo.color }]}>{statInfo.text}</ThemedText>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.noItemsCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.noItemsText}>Henüz yapılmış bir randevu talebiniz bulunmuyor.</ThemedText>
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
         DANIŞAN RANDEVU TALEP MODALI (CLIENT ONLY)
         ======================================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAppModalVisible}
        onRequestClose={() => setIsAppModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '60%' }]}>
            
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">🗓 Randevu Talebi</ThemedText>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsAppModalVisible(false)}>
                <ThemedText style={styles.modalCloseBtnText}>İptal</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <ThemedText style={styles.inputLabel}>Randevu Tarihi (YYYY-MM-DD)</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                value={appDate}
                onChangeText={setAppDate}
              />

              <ThemedText style={styles.inputLabel}>Randevu Saati (HH:MM)</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                placeholder="Örn: 14:30"
                placeholderTextColor={theme.textSecondary}
                value={appTime}
                onChangeText={setAppTime}
              />

              <ThemedText style={styles.inputLabel}>Diyetisyeninize Not</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text }]}
                placeholder="Randevu sebebi veya sormak istediğiniz sorular..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                value={appNote}
                onChangeText={setAppNote}
              />

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleRequestAppointment}
              >
                <ThemedText style={styles.saveBtnText}>Talebi Gönder</ThemedText>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

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

              <ThemedText style={styles.inputLabel}>E-posta Adresi</ThemedText>
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // Randevu Talepleri (Diyetisyen)
  appRequestCard: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.one,
  },
  appCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appClientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  appDateTime: {
    fontSize: 13,
    color: '#546E5A',
  },
  appNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#546E5A',
    backgroundColor: 'rgba(255,255,255,0.4)',
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  appActionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  appBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appRejectBtn: {
    backgroundColor: '#FFEBEE',
  },
  appRejectText: {
    color: '#C62828',
    fontWeight: 'bold',
    fontSize: 13,
  },
  appApproveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  noItemsCard: {
    padding: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 13,
    color: '#546E5A',
  },
  appApprovedCard: {
    padding: Spacing.three,
    borderRadius: 14,
  },
  appApprovedTime: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E7D32',
  },

  // Randevu Talepleri (Danışan)
  smallAppBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallAppBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appClientCard: {
    padding: Spacing.three,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appClientText: {
    flex: 1,
  },
  appClientDateTime: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  appClientNote: {
    fontSize: 12,
    color: '#546E5A',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
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
