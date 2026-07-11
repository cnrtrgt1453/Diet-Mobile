import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuth, API_BASE_URL } from '../context/auth-context';
import { useAppStore } from '../store/use-app-store';
import { registerForPushNotificationsAsync } from '../services/notification-service';

export function useHomeData() {
  const { userInfo, userToken, logout, showAlert, refreshUserInfo } = useAuth();
  const store = useAppStore();

  const [refreshing, setRefreshing] = useState(false);

  // Randevu ve Slot State'leri
  const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0]);
  const [appTime, setAppTime] = useState('');
  const [appNote, setAppNote] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');

  // Modals visibility
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const [isAppModalVisible, setIsAppModalVisible] = useState(false);
  const [isSlotModalVisible, setIsSlotModalVisible] = useState(false);
  const [isClinicAnalyticsModalVisible, setIsClinicAnalyticsModalVisible] = useState(false);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Profile edit states (Dietitian)
  const [isEditProfileModalVisible, setIsEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editYoutube, setEditYoutube] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Profile edit states (Client)
  const [isClientEditModalVisible, setIsClientEditModalVisible] = useState(false);
  const [clientEditName, setClientEditName] = useState('');
  const [clientEditHeight, setClientEditHeight] = useState('');
  const [clientEditCurrentWeight, setClientEditCurrentWeight] = useState('');
  const [clientEditTargetWeight, setClientEditTargetWeight] = useState('');
  const [clientEditCategory, setClientEditCategory] = useState<'WEIGHT_MANAGEMENT' | 'GLP_1' | 'LIPEDEMA' | 'HORMONAL_BALANCE'>('WEIGHT_MANAGEMENT');
  const [clientEditGlp1Day, setClientEditGlp1Day] = useState('Pazartesi');
  const [clientEditGlp1Dosage, setClientEditGlp1Dosage] = useState('0.25 mg');
  const [clientEditLipedemaStage, setClientEditLipedemaStage] = useState('1');
  const [clientEditAntiInflammatory, setClientEditAntiInflammatory] = useState(true);
  const [clientEditHormoneCycle, setClientEditHormoneCycle] = useState('Foliküler Faz');
  const [isSavingClientProfile, setIsSavingClientProfile] = useState(false);

  // Add client modal states
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

  // Finder states
  const [isFindDietitianModalVisible, setIsFindDietitianModalVisible] = useState(false);
  const [isLoadingDietitians, setIsLoadingDietitians] = useState(false);

  // Chat states
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [chatWithUser, setChatWithUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Broadcast states
  const [isBroadcastModalVisible, setIsBroadcastModalVisible] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Daily log states
  const [waterIntake, setWaterIntake] = useState(0);
  const [sideEffectLevel, setSideEffectLevel] = useState(0);
  const [selectedSideEffects, setSelectedSideEffects] = useState<string[]>([]);
  const [glp1Nausea, setGlp1Nausea] = useState(0);
  const [glp1Constipation, setGlp1Constipation] = useState(0);
  const [glp1Diarrhea, setGlp1Diarrhea] = useState(0);
  const [glp1Vomiting, setGlp1Vomiting] = useState(false);
  const [glp1InjectionSite, setGlp1InjectionSite] = useState('None');
  
  const [painLevel, setPainLevel] = useState(0);
  const [lipedemaPainLevelVas, setLipedemaPainLevelVas] = useState(0);
  const [glutenFree, setGlutenFree] = useState(true);
  const [sugarFree, setSugarFree] = useState(true);
  const [dairyFree, setDairyFree] = useState(true);
  const [processedFoodFree, setProcessedFoodFree] = useState(true);
  const [alcoholFree, setAlcoholFree] = useState(true);
  
  const [hormonalPhase, setHormonalPhase] = useState('Foliküler Faz');
  const [fastingBloodGlucose, setFastingBloodGlucose] = useState('');
  const [insulinLevel, setInsulinLevel] = useState('');
  const [cycleDay, setCycleDay] = useState('');
  const [insulinCraving, setInsulinCraving] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);

  const isDietitian = userInfo?.role === 'ROLE_DIETITIAN';
  const isAdmin = userInfo?.role === 'ROLE_DIETITIAN' && userInfo?.email === 'suhedaterat2@gmail.com';

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

  // Load stats, todayDiet, appointments, notifications, applications, and connectionRequests
  const loadData = useCallback(async () => {
    if (!userToken) return;

    if (!isDietitian) {
      // Sync logs from offline storage first
      try {
        const queueStr = await SecureStore.getItemAsync('@offline_logs_queue');
        if (queueStr) {
          const queue = JSON.parse(queueStr);
          if (queue.length > 0) {
            const remainingQueue = [];
            let successCount = 0;
            for (const logItem of queue) {
              try {
                await axios.post(`${API_BASE_URL}/api/v1/logs/daily`, logItem, {
                  headers: { Authorization: `Bearer ${userToken}` }
                });
                successCount++;
              } catch (err: any) {
                if (!err.response || err.message === 'Network Error') {
                  remainingQueue.push(logItem);
                }
              }
            }
            await SecureStore.setItemAsync('@offline_logs_queue', JSON.stringify(remainingQueue));
            if (successCount > 0) {
              showAlert('Eşitleme Başarılı', `${successCount} adet çevrimdışı günlük kaydınız başarıyla senkronize edildi! 🔄`, 'success');
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync offline logs:', err);
      }
    }

    try {
      if (isDietitian) {
        await Promise.all([
          store.loadStats(userToken || ''),
          store.loadAppointments(userToken || '', true),
          store.loadConnectionRequests(userToken || '', true)
        ]);
        if (isAdmin) {
          await store.loadApplications(userToken || '');
        }
      } else {
        await Promise.all([
          store.loadTodayDiet(userToken || ''),
          store.loadAppointments(userToken || '', false),
          store.loadConnectionRequests(userToken || '', false)
        ]);

        if (userInfo?.id) {
          await store.loadClientAnalytics(userToken || '', userInfo.id);
        }

        // Pre-fill today's log fields if exists in cache
        const cachedLog = await SecureStore.getItemAsync('@cached_today_log');
        if (cachedLog) {
          const todayLog = JSON.parse(cachedLog);
          setWaterIntake(todayLog.waterIntakeMl || 0);
          setSideEffectLevel(todayLog.glp1SideEffectLevel || 0);
          setSelectedSideEffects(todayLog.glp1SideEffects ? todayLog.glp1SideEffects.split(', ') : []);
          setGlp1Nausea(todayLog.glp1NauseaSeverity || 0);
          setGlp1Constipation(todayLog.glp1ConstipationSeverity || 0);
          setGlp1Diarrhea(todayLog.glp1DiarrheaSeverity || 0);
          setGlp1Vomiting(todayLog.glp1Vomiting || false);
          setGlp1InjectionSite(todayLog.glp1InjectionSite || 'None');
          setPainLevel(todayLog.lipedemaPainLevel || 0);
          setLipedemaPainLevelVas(todayLog.lipedemaPainLevelVas || 0);
          setGlutenFree(todayLog.glutenFreeCompliant !== false);
          setSugarFree(todayLog.sugarFreeCompliant !== false);
          setDairyFree(todayLog.dairyFreeCompliant !== false);
          setProcessedFoodFree(todayLog.processedFoodFreeCompliant !== false);
          setAlcoholFree(todayLog.alcoholFreeCompliant !== false);
          setHormonalPhase(todayLog.currentHormonalPhase || 'Foliküler Faz');
          setFastingBloodGlucose(todayLog.fastingBloodGlucose ? todayLog.fastingBloodGlucose.toString() : '');
          setInsulinLevel(todayLog.insulinLevel ? todayLog.insulinLevel.toString() : '');
          setCycleDay(todayLog.cycleDay ? todayLog.cycleDay.toString() : '');
          setInsulinCraving(todayLog.insulinCravingLevel || 0);
        }
      }
    } catch (e: any) {
      console.error("Data load error in dashboard hook:", e.message);
    }
  }, [userToken, isDietitian, isAdmin, userInfo, store]);

  // Pull notifications periodically
  useEffect(() => {
    if (!userToken) return;
    store.loadNotifications(userToken || '');
    const interval = setInterval(() => store.loadNotifications(userToken || ''), 15000);
    return () => clearInterval(interval);
  }, [userToken]);

  // Register push notifications
  useEffect(() => {
    if (userToken) {
      registerForPushNotificationsAsync(userToken || '');
    }
  }, [userToken]);

  // WebSocket Chat Connection
  useEffect(() => {
    if (!isChatModalVisible || !chatWithUser || !userToken) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    fetchChatHistory();

    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/chat?token=' + encodeURIComponent(userToken || '');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          const msg = data.data;
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

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isChatModalVisible, chatWithUser, userToken, fetchChatHistory, userInfo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) {
      Alert.alert("Hata", "Lütfen duyuru içeriği giriniz.");
      return;
    }
    setIsSendingBroadcast(true);
    try {
      await axios.post(`${API_BASE_URL}/api/v1/messages/broadcast`, {
        content: broadcastText.trim()
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Toplu duyuru tüm danışanlarınıza gönderildi.");
      setIsBroadcastModalVisible(false);
      setBroadcastText('');
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Toplu duyuru gönderilemedi.");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const openClientEditProfile = () => {
    setClientEditName(userInfo?.name || '');
    setClientEditHeight(userInfo?.height?.toString() || '');
    setClientEditCurrentWeight(userInfo?.currentWeight?.toString() || '');
    setClientEditTargetWeight(userInfo?.targetWeight?.toString() || '');
    setClientEditCategory(userInfo?.category || 'WEIGHT_MANAGEMENT');
    setClientEditGlp1Day(userInfo?.glp1InjectionDay || 'Pazartesi');
    setClientEditGlp1Dosage(userInfo?.glp1Dosage || '0.25 mg');
    setClientEditLipedemaStage(userInfo?.lipedemaStage?.toString() || '1');
    setClientEditAntiInflammatory(userInfo?.antiInflammatoryCompliant !== false);
    setClientEditHormoneCycle(userInfo?.hormoneTargetCycle || 'Foliküler Faz');
    setIsClientEditModalVisible(true);
  };

  const openDietitianEditProfile = () => {
    setEditName(userInfo?.name || '');
    setEditNotes(userInfo?.notes || '');
    setEditInstagram(userInfo?.instagramUrl || '');
    setEditLinkedin(userInfo?.linkedinUrl || '');
    setEditYoutube(userInfo?.youtubeUrl || '');
    setEditProfilePicture(userInfo?.profilePictureUrl || '');
    setIsEditProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName) {
      Alert.alert("Hata", "Ad Soyad alanı zorunludur.");
      return;
    }
    setIsSavingProfile(true);
    try {
      await axios.put(`${API_BASE_URL}/api/v1/users/profile`, {
        name: editName,
        notes: editNotes,
        instagramUrl: editInstagram.trim(),
        linkedinUrl: editLinkedin.trim(),
        youtubeUrl: editYoutube.trim(),
        profilePictureUrl: editProfilePicture.trim(),
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Profil bilgileriniz başarıyla güncellendi.");
      setIsEditProfileModalVisible(false);
      await refreshUserInfo();
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Profil güncellenirken hata oluştu.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveClientProfile = async () => {
    if (!clientEditName) {
      Alert.alert("Hata", "Ad Soyad alanı zorunludur.");
      return;
    }
    if (!clientEditHeight || !clientEditCurrentWeight || !clientEditTargetWeight) {
      Alert.alert("Hata", "Lütfen boy, mevcut kilo ve hedef kilo alanlarını doldurun.");
      return;
    }

    const heightNum = parseFloat(clientEditHeight);
    const weightNum = parseFloat(clientEditCurrentWeight);
    const targetNum = parseFloat(clientEditTargetWeight);

    if (isNaN(heightNum) || isNaN(weightNum) || isNaN(targetNum)) {
      Alert.alert("Hata", "Lütfen geçerli sayısal değerler giriniz.");
      return;
    }

    setIsSavingClientProfile(true);
    try {
      const data: any = {
        name: clientEditName,
        height: heightNum,
        currentWeight: weightNum,
        targetWeight: targetNum,
        category: clientEditCategory,
      };

      if (clientEditCategory === 'GLP_1') {
        data.glp1InjectionDay = clientEditGlp1Day;
        data.glp1Dosage = clientEditGlp1Dosage;
      } else if (clientEditCategory === 'LIPEDEMA') {
        data.lipedemaStage = parseInt(clientEditLipedemaStage);
        data.antiInflammatoryCompliant = clientEditAntiInflammatory;
      } else if (clientEditCategory === 'HORMONAL_BALANCE') {
        data.hormoneTargetCycle = clientEditHormoneCycle;
      }

      await axios.put(`${API_BASE_URL}/api/v1/users/profile`, data, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      Alert.alert("Başarılı", "Profil bilgileriniz başarıyla güncellendi.");
      setIsClientEditModalVisible(false);
      await refreshUserInfo();
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Profil güncellenirken hata oluştu.");
    } finally {
      setIsSavingClientProfile(false);
    }
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
    if (!store.todayDiet) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/v1/diets/my/${store.todayDiet.id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      store.todayDiet = res.data;
      Alert.alert("Başarılı", res.data.completed ? "Bugünkü diyetinizi tamamladınız! Harika iş 🌟" : "Diyet durumu güncellendi.");
      loadData();
    } catch (e: any) {
      Alert.alert("Hata", "Diyet durumu güncellenemedi.");
    }
  };

  const fetchAvailableSlots = useCallback(async (dateStr: string) => {
    if (!userInfo?.dietitian?.id || !userToken) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/appointments/availability/dietitian/${userInfo.dietitian.id}?date=${dateStr}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setAvailableSlots(res.data);
      setSelectedSlotId(null);
    } catch (e) {
      console.error("Failed to load available slots:", e);
      setAvailableSlots([]);
    }
  }, [userInfo, userToken]);

  const handleAddSlot = async () => {
    if (!slotDate || !slotStartTime || !slotEndTime) {
      Alert.alert("Hata", "Lütfen tarih, başlangıç saati ve bitiş saati giriniz.");
      return;
    }
    try {
      const payload = {
        date: slotDate,
        startTime: slotStartTime,
        endTime: slotEndTime
      };
      await axios.post(`${API_BASE_URL}/api/v1/appointments/availability`, payload, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Çalışma saat slotu başarıyla eklendi.");
      setIsSlotModalVisible(false);
      setSlotStartTime('');
      setSlotEndTime('');
      loadData();
    } catch (e: any) {
      Alert.alert("Hata", e.response?.data || "Slot oluşturulamadı.");
    }
  };

  const handleRequestAppointment = async () => {
    if (!selectedSlotId) {
      Alert.alert("Hata", "Lütfen listeden boş bir randevu saati seçiniz.");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/v1/appointments/book-slot/${selectedSlotId}`, {
        note: appNote
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Randevunuz başarıyla rezerve edildi ve onaylandı! 🎉");
      setIsAppModalVisible(false);
      setSelectedSlotId(null);
      setAppNote('');
      loadData();
    } catch (e: any) {
      Alert.alert("Hata", e.response?.data || "Randevu rezerve edilemedi.");
    }
  };

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

  const handleStartReviewApplication = async (id: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/admin/applications/${id}/start-review`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Başvuru inceleme sürecine alındı.");
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "İncelemeye alınamadı.");
    }
  };

  const handleApproveApplication = async (id: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/admin/applications/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Başvuru onaylandı. Kullanıcı artık diyetisyen rolündedir.");
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Onaylama işlemi gerçekleştirilemedi.");
    }
  };

  const handleRejectApplication = async () => {
    if (!selectedApplication) return;
    if (!rejectionReason) {
      Alert.alert("Hata", "Lütfen red gerekçesi giriniz.");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/v1/admin/applications/${selectedApplication.id}/reject`, {
        rejectionReason: rejectionReason
      }, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Başvuru reddedildi.");
      setIsRejectModalVisible(false);
      setRejectionReason('');
      setSelectedApplication(null);
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Reddetme işlemi gerçekleştirilemedi.");
    }
  };

  const handleSendConnectionRequest = async (dietitianId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/connections/request/${dietitianId}`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Çalışma talebiniz başarıyla gönderildi. Diyetisyenin onaylaması bekleniyor.");
      store.loadConnectionRequests(userToken || '', false);
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Talep gönderilemedi.");
    }
  };

  const handleApproveConnectionRequest = async (requestId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/connections/requests/${requestId}/approve`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Çalışma talebi onaylandı. Danışan listenize eklendi.");
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Talep onaylanamadı.");
    }
  };

  const handleRejectConnectionRequest = async (requestId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/connections/requests/${requestId}/reject`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Çalışma talebi reddedildi.");
      loadData();
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Talep reddedilemedi.");
    }
  };

  const handleSaveDailyLog = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const payload: any = {
      logDate: todayStr,
      waterIntakeMl: waterIntake,
      glp1SideEffectLevel: userInfo?.category === 'GLP_1' ? sideEffectLevel : null,
      glp1SideEffects: userInfo?.category === 'GLP_1' ? selectedSideEffects.join(', ') : null,
      glp1NauseaSeverity: userInfo?.category === 'GLP_1' ? glp1Nausea : null,
      glp1ConstipationSeverity: userInfo?.category === 'GLP_1' ? glp1Constipation : null,
      glp1DiarrheaSeverity: userInfo?.category === 'GLP_1' ? glp1Diarrhea : null,
      glp1Vomiting: userInfo?.category === 'GLP_1' ? glp1Vomiting : null,
      glp1InjectionSite: userInfo?.category === 'GLP_1' ? glp1InjectionSite : null,
      lipedemaPainLevel: userInfo?.category === 'LIPEDEMA' ? painLevel : null,
      lipedemaPainLevelVas: userInfo?.category === 'LIPEDEMA' ? lipedemaPainLevelVas : null,
      glutenFreeCompliant: userInfo?.category === 'LIPEDEMA' ? glutenFree : null,
      sugarFreeCompliant: userInfo?.category === 'LIPEDEMA' ? sugarFree : null,
      dairyFreeCompliant: userInfo?.category === 'LIPEDEMA' ? dairyFree : null,
      processedFoodFreeCompliant: userInfo?.category === 'LIPEDEMA' ? processedFoodFree : null,
      alcoholFreeCompliant: userInfo?.category === 'LIPEDEMA' ? alcoholFree : null,
      currentHormonalPhase: userInfo?.category === 'HORMONAL_BALANCE' ? hormonalPhase : null,
      fastingBloodGlucose: userInfo?.category === 'HORMONAL_BALANCE' && fastingBloodGlucose ? parseFloat(fastingBloodGlucose) : null,
      insulinLevel: userInfo?.category === 'HORMONAL_BALANCE' && insulinLevel ? parseFloat(insulinLevel) : null,
      cycleDay: userInfo?.category === 'HORMONAL_BALANCE' && cycleDay ? parseInt(cycleDay) : null,
      insulinCravingLevel: userInfo?.category === 'HORMONAL_BALANCE' ? insulinCraving : null
    };

    try {
      await axios.post(`${API_BASE_URL}/api/v1/logs/daily`, payload, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      await SecureStore.setItemAsync('@cached_today_log', JSON.stringify(payload));
      showAlert("Başarılı", "Günlük durum kaydınız kaydedildi! 🌟", "success");
    } catch (err: any) {
      if (!err.response || err.message === 'Network Error') {
        try {
          const queueStr = await SecureStore.getItemAsync('@offline_logs_queue');
          let queue = queueStr ? JSON.parse(queueStr) : [];
          const existingIndex = queue.findIndex((item: any) => item.logDate === payload.logDate);
          if (existingIndex > -1) {
            queue[existingIndex] = payload;
          } else {
            queue.push(payload);
          }
          await SecureStore.setItemAsync('@offline_logs_queue', JSON.stringify(queue));
          await SecureStore.setItemAsync('@cached_today_log', JSON.stringify(payload));
          showAlert("Çevrimdışı Kayıt", "İnternet bağlantısı bulunamadı. Günlük durum kaydınız cihazınıza kaydedildi ve internet bağlantısı kurulduğunda eşitlenecektir.", "success");
        } catch (storageErr) {
          console.error('Failed to save log offline:', storageErr);
        }
      } else {
        showAlert("Hata", "Günlük durum verileri kaydedilemedi.", "error");
      }
    }
  };

  const loadDietDataForFinder = async () => {
    setIsLoadingDietitians(true);
    try {
      await store.loadDietitiansAndRequests(userToken || '');
    } catch (e) {
      console.error("Failed to load dietitian finder data:", e);
    } finally {
      setIsLoadingDietitians(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      store.loadNotifications(userToken || '');
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      store.loadNotifications(userToken || '');
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    userInfo,
    userToken,
    logout,
    refreshing,
    onRefresh,
    isDietitian,
    isAdmin,

    // App state
    store,

    // Appointments states & setters
    appDate, setAppDate,
    appTime, setAppTime,
    appNote, setAppNote,
    availableSlots,
    selectedSlotId, setSelectedSlotId,
    slotDate, setSlotDate,
    slotStartTime, setSlotStartTime,
    slotEndTime, setSlotEndTime,
    fetchAvailableSlots,

    // Modals
    isNotifModalVisible, setIsNotifModalVisible,
    isAppModalVisible, setIsAppModalVisible,
    isSlotModalVisible, setIsSlotModalVisible,
    isClinicAnalyticsModalVisible, setIsClinicAnalyticsModalVisible,
    isRejectModalVisible, setIsRejectModalVisible,
    selectedApplication, setSelectedApplication,
    rejectionReason, setRejectionReason,

    // Profile edit (dietitian)
    isEditProfileModalVisible, setIsEditProfileModalVisible,
    editName, setEditName,
    editNotes, setEditNotes,
    editInstagram, setEditInstagram,
    editLinkedin, setEditLinkedin,
    editYoutube, setEditYoutube,
    editProfilePicture, setEditProfilePicture,
    isSavingProfile,
    openDietitianEditProfile,
    handleSaveProfile,

    // Profile edit (client)
    isClientEditModalVisible, setIsClientEditModalVisible,
    clientEditName, setClientEditName,
    clientEditHeight, setClientEditHeight,
    clientEditCurrentWeight, setClientEditCurrentWeight,
    clientEditTargetWeight, setClientEditTargetWeight,
    clientEditCategory, setClientEditCategory,
    clientEditGlp1Day, setClientEditGlp1Day,
    clientEditGlp1Dosage, setClientEditGlp1Dosage,
    clientEditLipedemaStage, setClientEditLipedemaStage,
    clientEditAntiInflammatory, setClientEditAntiInflammatory,
    clientEditHormoneCycle, setClientEditHormoneCycle,
    isSavingClientProfile,
    openClientEditProfile,
    handleSaveClientProfile,

    // Add client
    isAddModalVisible, setIsAddModalVisible,
    name, setName,
    email, setEmail,
    height, setHeight,
    currentWeight, setCurrentWeight,
    targetWeight, setTargetWeight,
    category, setCategory,
    notes, setNotes,
    glp1InjectionDay, setGlp1InjectionDay,
    glp1Dosage, setGlp1Dosage,
    lipedemaStage, setLipedemaStage,
    hormoneTargetCycle, setHormoneTargetCycle,
    handleAddClient,

    // Finder
    isFindDietitianModalVisible, setIsFindDietitianModalVisible,
    isLoadingDietitians,
    loadDietDataForFinder,
    handleSendConnectionRequest,

    // Chat
    isChatModalVisible, setIsChatModalVisible,
    chatWithUser, setChatWithUser,
    chatMessages,
    typedMessage, setTypedMessage,
    isSendingMessage,
    handleSendChatMessage,

    // Broadcast
    isBroadcastModalVisible, setIsBroadcastModalVisible,
    broadcastText, setBroadcastText,
    isSendingBroadcast,
    handleSendBroadcast,

    // Daily logs
    waterIntake, setWaterIntake,
    sideEffectLevel, setSideEffectLevel,
    selectedSideEffects, setSelectedSideEffects,
    glp1Nausea, setGlp1Nausea,
    glp1Constipation, setGlp1Constipation,
    glp1Diarrhea, setGlp1Diarrhea,
    glp1Vomiting, setGlp1Vomiting,
    glp1InjectionSite, setGlp1InjectionSite,
    painLevel, setPainLevel,
    lipedemaPainLevelVas, setLipedemaPainLevelVas,
    glutenFree, setGlutenFree,
    sugarFree, setSugarFree,
    dairyFree, setDairyFree,
    processedFoodFree, setProcessedFoodFree,
    alcoholFree, setAlcoholFree,
    hormonalPhase, setHormonalPhase,
    fastingBloodGlucose, setFastingBloodGlucose,
    insulinLevel, setInsulinLevel,
    cycleDay, setCycleDay,
    insulinCraving, setInsulinCraving,
    handleSaveDailyLog,
    handleToggleDiet,

    // Handlers
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleRequestAppointment,
    handleAddSlot,
    handleUpdateAppointment,
    handleStartReviewApplication,
    handleApproveApplication,
    handleRejectApplication,
    handleApproveConnectionRequest,
    handleRejectConnectionRequest,
  };
}
