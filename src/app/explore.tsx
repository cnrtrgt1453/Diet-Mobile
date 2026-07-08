import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl, TouchableOpacity, View, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth, API_BASE_URL } from '../context/auth-context';

export default function ExploreScreen() {
  const { userInfo, userToken } = useAuth();
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Danışan Detay Modalı State'leri
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientMeasurements, setClientMeasurements] = useState<any[]>([]);
  const [clientDiets, setClientDiets] = useState<any[]>([]);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // Ölçüm Ekleme Modalı State'leri
  const [isMeasurementModalVisible, setIsMeasurementModalVisible] = useState(false);
  const [mWeight, setMWeight] = useState('');
  const [mFat, setMFat] = useState('');
  const [mMuscle, setMMuscle] = useState('');
  const [mNote, setMNote] = useState('');

  // Diyet Ekleme Modalı State'leri
  const [isDietPlanModalVisible, setIsDietPlanModalVisible] = useState(false);
  const [dTitle, setDTitle] = useState('');
  const [dBreakfast, setDBreakfast] = useState('');
  const [dLunch, setDLunch] = useState('');
  const [dDinner, setDDinner] = useState('');
  const [dSnacks, setDSnacks] = useState('');
  const [dCalories, setDCalories] = useState('');
  const [dDate, setDDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

  // Danışan Modu (ROLE_USER) State'leri
  const [myMeasurements, setMyMeasurements] = useState<any[]>([]);
  const [myDiets, setMyDiets] = useState<any[]>([]);

  const isDietitian = userInfo?.role === 'ROLE_DIETITIAN';

  const loadData = useCallback(async () => {
    if (!userToken) return;
    try {
      if (isDietitian) {
        const res = await axios.get(`${API_BASE_URL}/api/v1/clients`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setClients(res.data);
        setFilteredClients(res.data);
      } else {
        // Danışanın kendi ölçüm ve diyet geçmişi
        const resMeas = await axios.get(`${API_BASE_URL}/api/v1/clients/${userInfo.id}/measurements`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setMyMeasurements(resMeas.data);

        const resDiets = await axios.get(`${API_BASE_URL}/api/v1/diets/my`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setMyDiets(resDiets.data);
      }
    } catch (e: any) {
      console.error("Explore load error:", e.message);
    }
  }, [userToken, isDietitian, userInfo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filtreleme & Arama Mantığı
  useEffect(() => {
    if (!isDietitian) return;
    let filtered = clients;
    if (searchQuery) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }
    setFilteredClients(filtered);
  }, [searchQuery, selectedCategory, clients, isDietitian]);

  // Danışan Seçildiğinde Detayları Yükleme
  const handleSelectClient = async (client: any) => {
    setSelectedClient(client);
    try {
      const resMeas = await axios.get(`${API_BASE_URL}/api/v1/clients/${client.id}/measurements`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setClientMeasurements(resMeas.data);

      const resDiets = await axios.get(`${API_BASE_URL}/api/v1/clients/${client.id}/diets`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setClientDiets(resDiets.data);

      setIsDetailModalVisible(true);
    } catch (e) {
      Alert.alert("Hata", "Danışan verileri yüklenemedi.");
    }
  };

  // Yeni Ölçüm Ekleme
  const handleAddMeasurement = async () => {
    if (!mWeight) {
      Alert.alert("Hata", "Lütfen ağırlık değerini giriniz.");
      return;
    }
    try {
      const payload = {
        weight: parseFloat(mWeight),
        bodyFat: mFat ? parseFloat(mFat) : null,
        muscleMass: mMuscle ? parseFloat(mMuscle) : null,
        note: mNote,
        date: new Date().toISOString().split('T')[0]
      };
      const res = await axios.post(`${API_BASE_URL}/api/v1/clients/${selectedClient.id}/measurements`, payload, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      Alert.alert("Başarılı", "Ölçüm kaydı eklendi.");
      setClientMeasurements([res.data, ...clientMeasurements]);
      
      // Update selected client current weight local view
      setSelectedClient({ ...selectedClient, currentWeight: payload.weight });
      
      // Reset form
      setMWeight('');
      setMFat('');
      setMMuscle('');
      setMNote('');
      setIsMeasurementModalVisible(false);
      loadData();
    } catch (e) {
      Alert.alert("Hata", "Ölçüm kaydedilemedi.");
    }
  };

  // Yeni Diyet Ekleme
  const handleAddDiet = async () => {
    if (!dTitle || !dBreakfast || !dCalories) {
      Alert.alert("Hata", "Lütfen Diyet Başlığı, Kahvaltı ve Kalori alanlarını doldurunuz.");
      return;
    }
    try {
      const payload = {
        title: dTitle,
        breakfast: dBreakfast,
        lunch: dLunch,
        dinner: dDinner,
        snacks: dSnacks,
        targetCalories: parseInt(dCalories),
        date: dDate
      };

      const res = await axios.post(`${API_BASE_URL}/api/v1/clients/${selectedClient.id}/diets`, payload, {
        headers: { Authorization: `Bearer ${userToken}` }
      });

      Alert.alert("Başarılı", "Diyet programı başarıyla atandı.");
      setClientDiets([res.data, ...clientDiets]);

      // Reset form
      setDTitle('');
      setDBreakfast('');
      setDLunch('');
      setDDinner('');
      setDSnacks('');
      setDCalories('');
      setDDate(new Date().toISOString().split('T')[0]);
      setIsDietPlanModalVisible(false);
    } catch (e) {
      Alert.alert("Hata", "Diyet planı kaydedilemedi.");
    }
  };

  const translateCategory = (cat: string) => {
    switch (cat) {
      case 'GLP_1': return 'GLP-1';
      case 'LIPEDEMA': return 'Lipödem';
      case 'HORMONAL_BALANCE': return 'Hormon';
      default: return 'Kilo';
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
    >
      <SafeAreaView style={styles.safeArea}>

        {isDietitian ? (
          /* ========================================================
             DIETITIAN CLIENTS LIST VIEW
             ======================================================== */
          <View style={styles.section}>
            <ThemedText type="subtitle" style={[styles.pageTitle, { color: theme.text }]}>Danışan Rehberi</ThemedText>
            
            {/* Arama Barı */}
            <TextInput 
              style={[styles.searchInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
              placeholder="İsim veya e-posta ile ara..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Kategori Filtre Butonları */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {['ALL', 'WEIGHT_MANAGEMENT', 'GLP_1', 'LIPEDEMA', 'HORMONAL_BALANCE'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterBtn,
                    { borderColor: theme.primary },
                    selectedCategory === cat ? { backgroundColor: theme.primary } : {}
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <ThemedText style={[
                    styles.filterBtnText,
                    selectedCategory === cat ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.primary }
                  ]}>
                    {cat === 'ALL' ? 'Hepsi' : cat === 'GLP_1' ? 'GLP-1' : cat === 'LIPEDEMA' ? 'Lipödem' : cat === 'HORMONAL_BALANCE' ? 'Hormon' : 'Kilo'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Danışan Listesi */}
            <View style={styles.clientListWrapper}>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[styles.clientCard, { backgroundColor: theme.backgroundElement }]}
                    onPress={() => handleSelectClient(client)}
                  >
                    <View style={styles.clientCardInfo}>
                      <ThemedText style={styles.clientName}>{client.name}</ThemedText>
                      <ThemedText style={styles.clientEmail}>{client.email}</ThemedText>
                    </View>
                    
                    <View style={styles.clientCardBadgeCol}>
                      <View style={[styles.catBadge, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText style={styles.catBadgeText}>{translateCategory(client.category)}</ThemedText>
                      </View>
                      <ThemedText style={styles.clientWeightText}>
                        {client.currentWeight ? `${client.currentWeight} kg` : "Ölçüm yok"}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <ThemedText style={styles.noResultsText}>Danışan bulunamadı.</ThemedText>
              )}
            </View>
          </View>
        ) : (
          /* ========================================================
             CLIENT HISTORY VIEW
             ======================================================== */
          <View style={styles.section}>
            <ThemedText type="subtitle" style={[styles.pageTitle, { color: theme.text }]}>Takip Geçmişiniz</ThemedText>

            {/* Ölçüm Geçmişi */}
            <ThemedText style={styles.subSectionTitle}>📈 Ağırlık Takip Geçmişi</ThemedText>
            {myMeasurements.length > 0 ? (
              <View style={styles.historyList}>
                {myMeasurements.map((m) => (
                  <View key={m.id} style={[styles.historyCard, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.historyCardHeader}>
                      <ThemedText style={styles.historyCardDate}>{m.date}</ThemedText>
                      <ThemedText style={styles.historyCardWeight}>{m.weight} kg</ThemedText>
                    </View>
                    {(m.bodyFat || m.muscleMass) && (
                      <ThemedText style={styles.historyCardDetails}>
                        {m.bodyFat ? `Yağ: %${m.bodyFat} ` : ''}
                        {m.muscleMass ? `Kas: ${m.muscleMass} kg` : ''}
                      </ThemedText>
                    )}
                    {m.note && <ThemedText style={styles.historyCardNote}>Not: {m.note}</ThemedText>}
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.emptyText}>Henüz girilmiş bir ölçümünüz bulunmuyor.</ThemedText>
            )}

            {/* Geçmiş Diyetler */}
            <ThemedText style={styles.subSectionTitle}>📋 Geçmiş Diyet Planlarınız</ThemedText>
            {myDiets.length > 0 ? (
              <View style={styles.historyList}>
                {myDiets.map((d) => (
                  <View key={d.id} style={[styles.historyCard, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.historyCardHeader}>
                      <ThemedText style={styles.historyCardTitle}>{d.title}</ThemedText>
                      <ThemedText style={styles.historyCardStatus}>
                        {d.completed ? "✓ Uyum Sağlandı" : "✗ Eksik/Uymadı"}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.historyCardDate}>{d.date} | {d.targetCalories} kcal</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.emptyText}>Geçmiş diyet bulunmuyor.</ThemedText>
            )}
            
            {/* Klinik İletişim Bilgileri */}
            <View style={[styles.clinicContactCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.contactTitle}>📍 Şüheda Terat Beslenme & Danışmanlık</ThemedText>
              <ThemedText style={styles.contactText}>Adres: Alsancak, Konak / İzmir</ThemedText>
              <ThemedText style={styles.contactText}>Sosyal Medya: @suhedaterat.nutritionist</ThemedText>
              <ThemedText style={styles.contactFooter}>Bilim Temelli Yeni Nesil Beslenme 🥗</ThemedText>
            </View>
          </View>
        )}

      </SafeAreaView>

      {/* ========================================================
         DANIŞAN DETAY MODALI (DIETITIAN ONLY)
         ======================================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDetailModalVisible}
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.background }]}>
            
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{selectedClient?.name}</ThemedText>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsDetailModalVisible(false)}>
                <ThemedText style={styles.modalCloseBtnText}>Kapat</ThemedText>
              </TouchableOpacity>
            </View>

            {selectedClient && (
              <View style={styles.clientProfileArea}>
                <ThemedText style={styles.clientMeta}>E-posta: {selectedClient.email}</ThemedText>
                <ThemedText style={styles.clientMeta}>Kategori: {translateCategory(selectedClient.category)}</ThemedText>
                <ThemedText style={styles.clientMeta}>Güncel Kilo: {selectedClient.currentWeight || "-"} kg | Boy: {selectedClient.height || "-"} cm</ThemedText>
                {selectedClient.notes && (
                  <View style={styles.notesBox}>
                    <ThemedText style={styles.notesBoxTitle}>Notlar:</ThemedText>
                    <ThemedText style={styles.notesBoxDesc}>{selectedClient.notes}</ThemedText>
                  </View>
                )}

                {/* Hızlı Butonlar */}
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity 
                    style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setIsMeasurementModalVisible(true)}
                  >
                    <ThemedText style={styles.actionBtnText}>⚖️ Ölçüm Ekle</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}
                    onPress={() => setIsDietPlanModalVisible(true)}
                  >
                    <ThemedText style={styles.actionBtnText}>🥗 Diyet Ata</ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Ölçüm Geçmişi Tablosu */}
                <ThemedText style={styles.modalSectionTitle}>Ölçüm Geçmişi</ThemedText>
                {clientMeasurements.length > 0 ? (
                  clientMeasurements.map((m) => (
                    <View key={m.id} style={styles.detailRowItem}>
                      <ThemedText style={styles.detailRowDate}>{m.date}</ThemedText>
                      <ThemedText style={styles.detailRowWeight}>{m.weight} kg</ThemedText>
                      <ThemedText style={styles.detailRowFat}>Yağ: %{m.bodyFat || "-"}</ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText style={styles.emptyText}>Kayıtlı ölçüm yok.</ThemedText>
                )}

                {/* Atanan Diyetler Tablosu */}
                <ThemedText style={styles.modalSectionTitle}>Atanan Diyetler</ThemedText>
                {clientDiets.length > 0 ? (
                  clientDiets.map((d) => (
                    <View key={d.id} style={styles.detailRowItem}>
                      <ThemedText style={styles.detailRowDate}>{d.date}</ThemedText>
                      <ThemedText style={styles.detailRowTitle}>{d.title}</ThemedText>
                      <ThemedText style={styles.detailRowStatus}>
                        {d.completed ? "✓ Uyumlu" : "✗ Bekliyor"}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText style={styles.emptyText}>Atanmış diyet yok.</ThemedText>
                )}

              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ========================================================
         ÖLÇÜM EKLEME MODALI
         ======================================================== */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isMeasurementModalVisible}
        onRequestClose={() => setIsMeasurementModalVisible(false)}
      >
        <View style={styles.innerModalOverlay}>
          <View style={[styles.innerModalContent, { backgroundColor: theme.background }]}>
            <ThemedText type="subtitle" style={styles.innerModalTitle}>⚖️ Yeni Ölçüm Kaydı</ThemedText>
            
            <TextInput 
              style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
              placeholder="Ağırlık (kg) - Örn: 76.2"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={mWeight}
              onChangeText={setMWeight}
            />

            <TextInput 
              style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
              placeholder="Yağ Oranı (%) - Örn: 22.4"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={mFat}
              onChangeText={setMFat}
            />

            <TextInput 
              style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
              placeholder="Kas Kütlesi (kg) - Örn: 30.1"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={mMuscle}
              onChangeText={setMMuscle}
            />

            <TextInput 
              style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
              placeholder="Seans Notu..."
              placeholderTextColor={theme.textSecondary}
              value={mNote}
              onChangeText={setMNote}
            />

            <View style={styles.innerActionRow}>
              <TouchableOpacity 
                style={[styles.innerBtn, styles.cancelBtn]} 
                onPress={() => setIsMeasurementModalVisible(false)}
              >
                <ThemedText style={styles.cancelBtnText}>İptal</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.innerBtn, { backgroundColor: theme.primary }]} 
                onPress={handleAddMeasurement}
              >
                <ThemedText style={styles.innerBtnText}>Kaydet</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================
         DİYET EKLEME MODALI
         ======================================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDietPlanModalVisible}
        onRequestClose={() => setIsDietPlanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">🥗 Yeni Diyet Planı Yaz</ThemedText>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsDietPlanModalVisible(false)}>
                <ThemedText style={styles.modalCloseBtnText}>İptal</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <ThemedText style={styles.inputLabel}>Diyet Günü Başlığı</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Örn: Pazartesi Detoksu"
                placeholderTextColor={theme.textSecondary}
                value={dTitle}
                onChangeText={setDTitle}
              />

              <ThemedText style={styles.inputLabel}>Tarih (YYYY-MM-DD)</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                value={dDate}
                onChangeText={setDDate}
              />

              <ThemedText style={styles.inputLabel}>Hedef Kalori</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Örn: 1400"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={dCalories}
                onChangeText={setDCalories}
              />

              <ThemedText style={styles.inputLabel}>🍳 Kahvaltı</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Kahvaltı menüsü..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={2}
                value={dBreakfast}
                onChangeText={setDBreakfast}
              />

              <ThemedText style={styles.inputLabel}>🍲 Öğle Yemeği</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Öğle yemeği menüsü..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={2}
                value={dLunch}
                onChangeText={setDLunch}
              />

              <ThemedText style={styles.inputLabel}>🥗 Akşam Yemeği</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Akşam yemeği menüsü..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={2}
                value={dDinner}
                onChangeText={setDDinner}
              />

              <ThemedText style={styles.inputLabel}>☕ Ara Öğün & Atıştırmalıklar</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text }]} 
                placeholder="Ara öğünler..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={2}
                value={dSnacks}
                onChangeText={setDSnacks}
              />

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddDiet}
              >
                <ThemedText style={styles.saveBtnText}>Diyeti Atayıp Gönder</ThemedText>
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
  },
  section: {
    gap: Spacing.three,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: Spacing.two,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: Spacing.three,
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: Spacing.one,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: Spacing.two,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    marginRight: 8,
  },
  filterBtnText: {
    fontSize: 12,
  },
  clientListWrapper: {
    gap: Spacing.two,
  },
  clientCard: {
    padding: Spacing.three,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientCardInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  clientEmail: {
    fontSize: 12,
    color: '#546E5A',
  },
  clientCardBadgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  clientWeightText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  noResultsText: {
    fontSize: 14,
    color: '#546E5A',
    textAlign: 'center',
    marginTop: Spacing.four,
  },

  // Danışan Geçmiş Görünümü Styles
  historyList: {
    gap: Spacing.two,
  },
  historyCard: {
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.one,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardDate: {
    fontSize: 12,
    color: '#546E5A',
    fontWeight: '600',
  },
  historyCardWeight: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  historyCardDetails: {
    fontSize: 12,
    color: '#2E7D32',
  },
  historyCardNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#546E5A',
  },
  historyCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyCardStatus: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  emptyText: {
    fontSize: 13,
    color: '#546E5A',
    fontStyle: 'italic',
  },
  clinicContactCard: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.one,
    marginTop: Spacing.four,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#546E5A',
  },
  contactFooter: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginTop: 8,
  },

  // Modal Detay Styles
  clientProfileArea: {
    gap: Spacing.two,
  },
  clientMeta: {
    fontSize: 14,
  },
  notesBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: Spacing.three,
    borderRadius: 10,
    marginTop: Spacing.one,
  },
  notesBoxTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  notesBoxDesc: {
    fontSize: 13,
    color: '#546E5A',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  smallActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#E1EFE4',
    paddingBottom: 4,
  },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  detailRowDate: {
    fontSize: 12,
    color: '#546E5A',
  },
  detailRowWeight: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  detailRowFat: {
    fontSize: 12,
    color: '#546E5A',
  },
  detailRowTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  detailRowStatus: {
    fontSize: 11,
    color: '#2E7D32',
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
    marginBottom: Spacing.two,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
    paddingVertical: Spacing.two,
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

  // Inner Modals (Ölçüm Ekle vb)
  innerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  innerModalContent: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  innerModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  innerActionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  innerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#ECEFF1',
  },
  cancelBtnText: {
    color: '#37474F',
    fontWeight: 'bold',
  },
  innerBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
