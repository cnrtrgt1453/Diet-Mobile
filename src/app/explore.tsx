import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, ScrollView, RefreshControl, TouchableOpacity, View, TextInput, Alert, Modal, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth, API_BASE_URL } from '../context/auth-context';
import { LineChart, BarChart } from 'react-native-gifted-charts';

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
  const [clientDailyLogs, setClientDailyLogs] = useState<any[]>([]);
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
  const [myDailyLogs, setMyDailyLogs] = useState<any[]>([]);
  const [activeChartTab, setActiveChartTab] = useState<'WEIGHT' | 'FAT' | 'WATER'>('WEIGHT');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  // Sohbet (Chat) State'leri
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [chatWithUser, setChatWithUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchChatHistory = useCallback(async () => {
    if (!userToken || !chatWithUser) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/messages/history/${chatWithUser.id}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setChatMessages(res.data);
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  }, [userToken, chatWithUser]);

  useEffect(() => {
    if (!isChatModalVisible || !chatWithUser || !userToken) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Fetch initial chat history
    fetchChatHistory();

    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/chat?token=' + encodeURIComponent(userToken);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected (explore)");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          const msg = data.data;

          // Check if message is relevant to active chat
          const isFromChatWithUser = msg.sender.id === chatWithUser.id;
          const isToChatWithUser = msg.recipient && msg.recipient.id === chatWithUser.id;
          const isRelevantBroadcast = msg.broadcast && userInfo?.role === 'ROLE_USER' && msg.sender.id === userInfo?.dietitian?.id;

          if (isFromChatWithUser || isToChatWithUser || isRelevantBroadcast) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected (explore)");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isChatModalVisible, chatWithUser, userToken, fetchChatHistory, userInfo]);

  const handleSendChatMessage = async () => {
    if (!typedMessage.trim() || !chatWithUser) return;

    const messageContent = typedMessage.trim();
    setTypedMessage('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        recipientId: chatWithUser.id,
        content: messageContent,
        isBroadcast: false
      }));
    } else {
      setIsSendingMessage(true);
      try {
        await axios.post(`${API_BASE_URL}/api/v1/messages/send/${chatWithUser.id}`, {
          content: messageContent
        }, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        fetchChatHistory();
      } catch (err: any) {
        Alert.alert("Hata", err.response?.data || "Mesaj gönderilemedi.");
      } finally {
        setIsSendingMessage(false);
      }
    }
  };

  // Grafik için veri hazırlama
  const getChartData = () => {
    if (activeChartTab === 'WEIGHT') {
      return [...myMeasurements]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(m => ({
          date: m.date,
          value: m.weight,
          label: m.weight + ' kg',
          note: m.note,
          details: `Kas: ${m.muscleMass || '-'} kg | Yağ: %${m.bodyFat || '-'}`
        }));
    } else if (activeChartTab === 'FAT') {
      return [...myMeasurements]
        .filter(m => m.bodyFat !== null && m.bodyFat !== undefined)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(m => ({
          date: m.date,
          value: m.bodyFat,
          label: '%' + m.bodyFat,
          note: m.note,
          details: `Ağırlık: ${m.weight} kg | Kas: ${m.muscleMass || '-'} kg`
        }));
    } else {
      return [...myDailyLogs]
        .filter(l => l.waterIntakeMl !== null && l.waterIntakeMl !== undefined)
        .sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime())
        .map(l => ({
          date: l.logDate,
          value: l.waterIntakeMl / 1000, // mL -> Litre
          label: (l.waterIntakeMl / 1000).toFixed(1) + ' L',
          note: l.glp1SideEffects || l.currentHormonalPhase ? `Faz: ${l.currentHormonalPhase || '-'} | Yan Etki: ${l.glp1SideEffects || 'Yok'}` : null,
          details: `Su Tüketimi: ${l.waterIntakeMl} mL`
        }));
    }
  };

  const chartData = getChartData();
  const chartValues = chartData.map(d => d.value);
  const maxVal = chartValues.length > 0 ? Math.max(...chartValues) : 0;
  const minVal = chartValues.length > 0 ? Math.min(...chartValues) : 0;
  const midVal = (maxVal + minVal) / 2;

  const selectedItem = selectedPointIndex !== null && selectedPointIndex < chartData.length 
    ? chartData[selectedPointIndex] 
    : chartData.length > 0 ? chartData[chartData.length - 1] : null;

  const trendVal = chartData.length > 1 ? chartData[chartData.length - 1].value - chartData[0].value : 0;

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

        const resLogs = await axios.get(`${API_BASE_URL}/api/v1/logs/daily/my`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setMyDailyLogs(resLogs.data);
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

      // Günlük klinik logları çek (Faz 1)
      const resLogs = await axios.get(`${API_BASE_URL}/api/v1/logs/daily/client/${client.id}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setClientDailyLogs(resLogs.data);

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
              style={[styles.searchInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
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
                  <View key={client.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[styles.clientCard, { backgroundColor: theme.backgroundElement, flex: 1, marginBottom: 0 }]}
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

                    <TouchableOpacity 
                      style={[styles.clientChatBtn, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        setChatWithUser(client);
                        setIsChatModalVisible(true);
                      }}
                    >
                      <Text style={styles.clientChatBtnText}>💬</Text>
                    </TouchableOpacity>
                  </View>
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

            {/* Etkileşimli Grafikler */}
            <ThemedText style={styles.subSectionTitle}>📊 İlerleme Grafikleriniz</ThemedText>
            
            {/* Sekme Seçici */}
            <View style={styles.chartSelectorContainer}>
              <TouchableOpacity
                style={[styles.chartSelectorTab, activeChartTab === 'WEIGHT' && styles.chartSelectorTabActive]}
                onPress={() => { setActiveChartTab('WEIGHT'); setSelectedPointIndex(null); }}
              >
                <Text style={[styles.chartSelectorText, activeChartTab === 'WEIGHT' && styles.chartSelectorTextActive]}>⚖️ Ağırlık</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartSelectorTab, activeChartTab === 'FAT' && styles.chartSelectorTabActive]}
                onPress={() => { setActiveChartTab('FAT'); setSelectedPointIndex(null); }}
              >
                <Text style={[styles.chartSelectorText, activeChartTab === 'FAT' && styles.chartSelectorTextActive]}>🔥 Yağ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartSelectorTab, activeChartTab === 'WATER' && styles.chartSelectorTabActive]}
                onPress={() => { setActiveChartTab('WATER'); setSelectedPointIndex(null); }}
              >
                <Text style={[styles.chartSelectorText, activeChartTab === 'WATER' && styles.chartSelectorTextActive]}>💧 Su</Text>
              </TouchableOpacity>
            </View>

            {chartData.length > 0 ? (
              <View style={[styles.chartCard, { backgroundColor: theme.backgroundElement }]}>
                {/* Değer gösterge başlığı */}
                <View style={styles.chartHeaderRow}>
                  <View>
                    <Text style={[styles.chartHeaderSubtitle, { color: theme.textSecondary }]}>
                      {selectedItem ? `${selectedItem.date} Kaydı` : 'Son Değer'}
                    </Text>
                    <Text style={[styles.chartHeaderTitle, { color: theme.text }]}>
                      {selectedItem ? selectedItem.label : chartData[chartData.length - 1].label}
                    </Text>
                  </View>
                  <View style={styles.trendContainer}>
                    {trendVal !== 0 && (
                      <View style={[styles.trendBadge, { backgroundColor: trendVal < 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                        <Text style={{ color: trendVal < 0 ? '#2E7D32' : '#C62828', fontWeight: 'bold', fontSize: 11 }}>
                          {trendVal < 0 ? '↓' : '↑'} {Math.abs(trendVal).toFixed(1)} {activeChartTab === 'WATER' ? 'L' : activeChartTab === 'FAT' ? '%' : 'kg'}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.trendLabel, { color: theme.textSecondary }]}>genel değişim</Text>
                  </View>
                </View>

                {/* Grafik Alanı */}
                <View style={styles.chartContentContainer}>
                  {activeChartTab === 'WATER' ? (
                    <BarChart
                      data={chartData.map((point, index) => ({
                        value: point.value,
                        label: point.date.substring(8, 10) + '/' + point.date.substring(5, 7),
                        frontColor: (selectedPointIndex === index || (selectedPointIndex === null && index === chartData.length - 1)) ? theme.primary : '#A5D6A7',
                        onPress: () => setSelectedPointIndex(index),
                      }))}
                      width={280}
                      height={180}
                      barWidth={22}
                      spacing={18}
                      noOfSections={4}
                      yAxisThickness={1}
                      xAxisThickness={1}
                      yAxisColor={theme.backgroundSelected}
                      xAxisColor={theme.backgroundSelected}
                      yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 9 }}
                      hideRules
                      showVerticalLines={false}
                    />
                  ) : (
                    <LineChart
                      data={chartData.map((point, index) => ({
                        value: point.value,
                        label: point.date.substring(8, 10) + '/' + point.date.substring(5, 7),
                        dataPointText: point.value.toFixed(1),
                        textColor: theme.text,
                        textShiftY: -8,
                        textShiftX: -10,
                        textFontSize: 9,
                        dataPointColor: (selectedPointIndex === index || (selectedPointIndex === null && index === chartData.length - 1)) ? theme.primary : '#81C784',
                        dataPointRadius: (selectedPointIndex === index || (selectedPointIndex === null && index === chartData.length - 1)) ? 6 : 4,
                      }))}
                      width={280}
                      height={180}
                      thickness={3}
                      color={theme.primary}
                      noOfSections={4}
                      yAxisThickness={1}
                      xAxisThickness={1}
                      yAxisColor={theme.backgroundSelected}
                      xAxisColor={theme.backgroundSelected}
                      yAxisTextStyle={{ color: theme.textSecondary, fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: theme.textSecondary, fontSize: 9 }}
                      initialSpacing={20}
                      spacing={40}
                      hideRules
                      showVerticalLines={false}
                      onPress={(item: any, index: number) => {
                        setSelectedPointIndex(index);
                      }}
                    />
                  )}
                </View>

                {/* Seçili noktanın detayları ve notu */}
                {selectedItem && (selectedItem.details || selectedItem.note) && (
                  <View style={[styles.chartDetailBox, { borderTopColor: theme.backgroundSelected }]}>
                    {selectedItem.details && (
                      <Text style={[styles.chartDetailText, { color: theme.text }]}>{selectedItem.details}</Text>
                    )}
                    {selectedItem.note && (
                      <Text style={[styles.chartNoteText, { color: theme.textSecondary }]}>💡 Not: "{selectedItem.note}"</Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.emptyChartCard, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Grafik için henüz yeterli veri bulunmuyor.</Text>
              </View>
            )}

            {/* Listelenmiş Ölçüm Geçmişi */}
            <ThemedText style={styles.subSectionTitle}>📋 Ölçüm Kayıt Defteri</ThemedText>
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

                {/* Klinik Günlük Rapor Paneli (Faz 1) */}
                <ThemedText style={styles.modalSectionTitle}>📋 Klinik Günlük Takip Raporu (Son 14 Gün)</ThemedText>
                {clientDailyLogs.length > 0 ? (
                  clientDailyLogs.map((log) => (
                    <View key={log.id} style={[styles.logReportCard, { backgroundColor: theme.backgroundElement }]}>
                      <View style={styles.logReportHeader}>
                        <ThemedText style={styles.logReportDate}>{log.logDate}</ThemedText>
                        <ThemedText style={styles.logReportWater}>💧 {log.waterIntakeMl || 0} ml</ThemedText>
                      </View>
                      
                      {selectedClient.category === 'GLP_1' && (
                        <View style={styles.logReportMeta}>
                          <ThemedText style={styles.logReportText}>💉 Yan Etki Düzeyi: <ThemedText style={styles.boldText}>{log.glp1SideEffectLevel || 0}/5</ThemedText></ThemedText>
                          {log.glp1SideEffects ? <ThemedText style={styles.logReportNote}>Semptomlar: {log.glp1SideEffects}</ThemedText> : null}
                        </View>
                      )}

                      {selectedClient.category === 'LIPEDEMA' && (
                        <View style={styles.logReportMeta}>
                          <ThemedText style={styles.logReportText}>🦵 Bacak Ağrısı: <ThemedText style={styles.boldText}>{log.lipedemaPainLevel || 0}/5</ThemedText></ThemedText>
                          <View style={styles.logReportChips}>
                            <View style={[styles.miniChip, log.glutenFreeCompliant ? styles.chipSuccess : styles.chipError]}><ThemedText style={styles.miniChipText}>Glütensiz</ThemedText></View>
                            <View style={[styles.miniChip, log.sugarFreeCompliant ? styles.chipSuccess : styles.chipError]}><ThemedText style={styles.miniChipText}>Şekersiz</ThemedText></View>
                            <View style={[styles.miniChip, log.dairyFreeCompliant ? styles.chipSuccess : styles.chipError]}><ThemedText style={styles.miniChipText}>Sütsüz</ThemedText></View>
                          </View>
                        </View>
                      )}

                      {selectedClient.category === 'HORMONAL_BALANCE' && (
                        <View style={styles.logReportMeta}>
                          <ThemedText style={styles.logReportText}>🧬 Döngü Fazı: <ThemedText style={styles.boldText}>{log.currentHormonalPhase || "Girilmedi"}</ThemedText></ThemedText>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <ThemedText style={styles.emptyText}>Son 14 güne ait klinik günlük takip kaydı bulunmuyor.</ThemedText>
                )}

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
              style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Ağırlık (kg) - Örn: 76.2"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={mWeight}
              onChangeText={setMWeight}
            />

            <TextInput 
              style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Yağ Oranı (%) - Örn: 22.4"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={mFat}
              onChangeText={setMFat}
            />

            <TextInput 
              style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Kas Kütlesi (kg) - Örn: 30.1"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={mMuscle}
              onChangeText={setMMuscle}
            />

            <TextInput 
              style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Seans Notu..."
              placeholderTextColor={theme.textSecondary}
              value={mNote}
              onChangeText={setMNote}
            />

            <View style={styles.innerActionRow}>
              <TouchableOpacity 
                style={[styles.innerBtn, styles.cancelBtn, { backgroundColor: theme.backgroundSelected }]} 
                onPress={() => setIsMeasurementModalVisible(false)}
              >
                <ThemedText style={[styles.cancelBtnText, { color: theme.textSecondary }]}>İptal</ThemedText>
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
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                placeholder="Örn: Pazartesi Detoksu"
                placeholderTextColor={theme.textSecondary}
                value={dTitle}
                onChangeText={setDTitle}
              />

              <ThemedText style={styles.inputLabel}>Tarih (YYYY-MM-DD)</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                value={dDate}
                onChangeText={setDDate}
              />

              <ThemedText style={styles.inputLabel}>Hedef Kalori</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                placeholder="Örn: 1400"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={dCalories}
                onChangeText={setDCalories}
              />

              <ThemedText style={styles.inputLabel}>🍳 Kahvaltı</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                placeholder="Kahvaltı menüsü..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={2}
                value={dBreakfast}
                onChangeText={setDBreakfast}
              />

              <ThemedText style={styles.inputLabel}>🍲 Öğle Yemeği</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                placeholder="Öğle yemeği menüsü..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={2}
                value={dLunch}
                onChangeText={setDLunch}
              />

              <ThemedText style={styles.inputLabel}>🥗 Akşam Yemeği</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                placeholder="Akşam yemeği menüsü..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={2}
                value={dDinner}
                onChangeText={setDDinner}
              />

              <ThemedText style={styles.inputLabel}>☕ Ara Öğün & Atıştırmalıklar</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
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

      {/* SOHBET (CHAT) MODALI */}
      <Modal
        visible={isChatModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setIsChatModalVisible(false);
          setChatWithUser(null);
          setChatMessages([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, height: '90%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">💬 {chatWithUser?.name || "Sohbet"}</ThemedText>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => {
                setIsChatModalVisible(false);
                setChatWithUser(null);
                setChatMessages([]);
              }}>
                <ThemedText style={styles.modalCloseBtnText}>Kapat</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ flex: 1, padding: 12 }} 
              contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
              ref={(ref) => ref?.scrollToEnd({ animated: true })}
            >
              {chatMessages.length === 0 ? (
                <Text style={styles.noResultsText}>Sohbet geçmişi bulunmuyor. İlk mesajı siz yazın!</Text>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.sender.id === userInfo?.id;
                  if (msg.isBroadcast) {
                    return (
                      <View key={msg.id} style={[styles.chatMsgRow, { justifyContent: 'flex-start' }]}>
                        <View style={styles.broadcastBubble}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Text style={{ fontSize: 14 }}>📢</Text>
                            <Text style={styles.broadcastTitle}>Toplu Duyuru</Text>
                          </View>
                          <Text style={styles.broadcastContent}>{msg.content}</Text>
                          <Text style={styles.broadcastFooter}>⚠️ Bu bir duyurudur, doğrudan yanıtlanamaz.</Text>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={msg.id} style={[styles.chatMsgRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
                      <View style={[
                        styles.chatBubble, 
                        isMe ? [styles.myBubble, { backgroundColor: theme.primary }] : [styles.otherBubble, { backgroundColor: theme.backgroundSelected }]
                      ]}>
                        <Text style={[styles.chatText, isMe ? { color: '#FFFFFF' } : { color: theme.text }]}>
                          {msg.content}
                        </Text>
                        <Text style={[styles.chatTime, isMe ? { color: 'rgba(255, 255, 255, 0.7)' } : { color: theme.textSecondary }]}>
                          {new Date(msg.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.chatInputRow, { borderTopColor: theme.backgroundSelected }]}>
              <TextInput
                style={[styles.chatInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Mesajınızı yazın..."
                placeholderTextColor={theme.textSecondary}
                value={typedMessage}
                onChangeText={setTypedMessage}
              />
              <TouchableOpacity 
                style={[styles.chatSendBtn, { backgroundColor: theme.primary }]}
                onPress={handleSendChatMessage}
                disabled={isSendingMessage}
              >
                {isSendingMessage ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.chatSendBtnText}>Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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

  // Günlük log raporlama kartları (Diyetisyen Raporu)
  logReportCard: {
    padding: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.one,
    gap: 4,
  },
  logReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logReportDate: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logReportWater: {
    fontSize: 12,
    fontWeight: '600',
  },
  logReportMeta: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 4,
  },
  logReportText: {
    fontSize: 12,
  },
  logReportNote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#546E5A',
  },
  logReportChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1C3A24',
  },
  chipSuccess: {
    backgroundColor: '#C8E6C9',
  },
  chipError: {
    backgroundColor: '#FFCDD2',
  },
  boldText: {
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
  // Chat Styles
  clientChatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  clientChatBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  chatMsgRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: 4,
  },
  chatBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  myBubble: {
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    borderBottomLeftRadius: 2,
  },
  chatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  chatInputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  chatSendBtn: {
    width: 70,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // Broadcast announcement bubble
  broadcastBubble: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE0B2',
    borderWidth: 1,
    borderBottomLeftRadius: 2,
    width: '90%',
    maxWidth: '90%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  broadcastTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E65100',
  },
  broadcastContent: {
    fontSize: 14,
    color: '#4E342E',
    lineHeight: 20,
  },
  broadcastFooter: {
    fontSize: 10,
    color: '#E65100',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Segmented control styles
  chartSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECEFF1',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  chartSelectorTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  chartSelectorTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#546E7A',
  },
  chartSelectorTextActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  // Chart card styles
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyChartCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartHeaderSubtitle: {
    fontSize: 11,
    marginBottom: 2,
  },
  chartHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  trendContainer: {
    alignItems: 'flex-end',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2,
  },
  trendLabel: {
    fontSize: 9,
  },
  chartContentContainer: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  yAxisLabels: {
    width: 32,
    justifyContent: 'space-between',
    paddingVertical: 10,
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yAxisText: {
    fontSize: 10,
  },
  chartScrollContent: {
    flexGrow: 1,
    paddingLeft: 8,
    paddingRight: 16,
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 12,
  },
  chartBarCol: {
    width: 36,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: 14,
    backgroundColor: '#ECEFF1',
    borderRadius: 7,
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  barFill: {
    width: 14,
    borderRadius: 7,
  },
  barDateText: {
    fontSize: 9,
  },
  barDateTextActive: {
    fontWeight: 'bold',
  },
  chartDetailBox: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
    gap: 4,
  },
  chartDetailText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartNoteText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
