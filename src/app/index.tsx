import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, View, TextInput, Alert, Modal, Text, Linking, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth, API_BASE_URL } from '../context/auth-context';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../services/notification-service';

export default function HomeScreen() {
  const { userInfo, userToken, logout, showAlert, refreshUserInfo } = useAuth();
  const theme = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, glp1: 0, lipedema: 0, weightManagement: 0, hormonalBalance: 0 });
  const [todayDiet, setTodayDiet] = useState<any>(null);

  // Bildirim State'leri
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  
  // Randevu State'leri
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [approvedAppointments, setApprovedAppointments] = useState<any[]>([]);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [isAppModalVisible, setIsAppModalVisible] = useState(false);
  const [appDate, setAppDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [appTime, setAppTime] = useState('');
  const [appNote, setAppNote] = useState('');

  // Admin Diyetisyen Başvuru State'leri
  const [applications, setApplications] = useState<any[]>([]);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Diyetisyen Profil Düzenleme State'leri
  const [isEditProfileModalVisible, setIsEditProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editYoutube, setEditYoutube] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Danışan Profil Düzenleme State'leri
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

  // Diyetisyen bulma & talep listesi state'leri
  const [dietitians, setDietitians] = useState<any[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [isFindDietitianModalVisible, setIsFindDietitianModalVisible] = useState(false);
  const [isLoadingDietitians, setIsLoadingDietitians] = useState(false);

  const loadDietDataForFinder = async () => {
    setIsLoadingDietitians(true);
    try {
      const resDietitians = await axios.get(`${API_BASE_URL}/api/v1/connections/dietitians`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setDietitians(resDietitians.data);

      const resMyReqs = await axios.get(`${API_BASE_URL}/api/v1/connections/my-requests`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setConnectionRequests(resMyReqs.data);
    } catch (e) {
      console.error("Failed to load dietitian finder data:", e);
    } finally {
      setIsLoadingDietitians(false);
    }
  };

  // Chat ve Broadcast State'leri
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [chatWithUser, setChatWithUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Broadcast Modal State'leri
  const [isBroadcastModalVisible, setIsBroadcastModalVisible] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

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
      console.log("WebSocket connected");
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
      console.log("WebSocket disconnected");
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

  // Günlük Takip Modülü Form State'leri
  const [waterIntake, setWaterIntake] = useState(0); // in ml
  const [sideEffectLevel, setSideEffectLevel] = useState(0); // 1-5
  const [selectedSideEffects, setSelectedSideEffects] = useState<string[]>([]);
  const [glp1Nausea, setGlp1Nausea] = useState(0); // 1-10
  const [glp1Constipation, setGlp1Constipation] = useState(0); // 1-10
  const [glp1Diarrhea, setGlp1Diarrhea] = useState(0); // 1-10
  const [glp1Vomiting, setGlp1Vomiting] = useState(false);
  const [glp1InjectionSite, setGlp1InjectionSite] = useState('None'); // Abdomen, Thigh, Arm, None
  
  const [painLevel, setPainLevel] = useState(0); // 1-5
  const [lipedemaPainLevelVas, setLipedemaPainLevelVas] = useState(0); // 1-10
  const [glutenFree, setGlutenFree] = useState(true);
  const [sugarFree, setSugarFree] = useState(true);
  const [dairyFree, setDairyFree] = useState(true);
  const [processedFoodFree, setProcessedFoodFree] = useState(true);
  const [alcoholFree, setAlcoholFree] = useState(true);
  
  const [hormonalPhase, setHormonalPhase] = useState('Foliküler Faz');
  const [fastingBloodGlucose, setFastingBloodGlucose] = useState('');
  const [insulinLevel, setInsulinLevel] = useState('');
  const [cycleDay, setCycleDay] = useState('');
  const [insulinCraving, setInsulinCraving] = useState(0); // 1-5

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
  const isAdmin = userInfo?.role === 'ROLE_DIETITIAN' && userInfo?.email === 'suhedaterat2@gmail.com';

  // Bildirimleri Çek
  const loadNotifications = useCallback(async () => {
    if (!userToken) return;
    try {
      const resNotifs = await axios.get(`${API_BASE_URL}/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setNotifications(resNotifs.data);

      const resCount = await axios.get(`${API_BASE_URL}/api/v1/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setUnreadCount(resCount.data);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  }, [userToken]);

  // Bildirimi Okundu İşaretle
  const handleMarkAsRead = async (id: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      loadNotifications();
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  };

  // Hepsini Okundu İşaretle
  const handleMarkAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      loadNotifications();
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  // Çevrimdışı log kaydetme yardımcısı
  const saveLogOffline = async (payload: any) => {
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
    } catch (err) {
      console.error('Failed to save log offline:', err);
    }
  };

  // Çevrimdışı logları senkronize etme
  const syncOfflineLogs = useCallback(async () => {
    try {
      const queueStr = await SecureStore.getItemAsync('@offline_logs_queue');
      if (!queueStr) return;
      
      const queue = JSON.parse(queueStr);
      if (queue.length === 0) return;
      
      const remainingQueue = [];
      let successCount = 0;
      
      for (const log of queue) {
        try {
          await axios.post(`${API_BASE_URL}/api/v1/logs/daily`, log, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          successCount++;
        } catch (err: any) {
          if (!err.response || err.message === 'Network Error') {
            remainingQueue.push(log);
          }
        }
      }
      
      await SecureStore.setItemAsync('@offline_logs_queue', JSON.stringify(remainingQueue));
      
      if (successCount > 0) {
        showAlert('Eşitleme Başarılı', `${successCount} adet çevrimdışı günlük kaydınız başarıyla senkronize edildi! 🔄`, 'success');
        loadData();
      }
    } catch (err) {
      console.error('Failed to sync offline logs:', err);
    }
  }, [userToken, showAlert]);

  const loadData = useCallback(async () => {
    if (!userToken) return;

    if (!isDietitian) {
      syncOfflineLogs();
    }

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

        // Eğer admin ise diyetisyen başvurularını çek
        if (userInfo?.email === 'suhedaterat2@gmail.com') {
          const resApps = await axios.get(`${API_BASE_URL}/api/v1/admin/applications`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          setApplications(resApps.data);
        }

        // Diyetisyene gelen bekleyen bağlantı isteklerini çek
        try {
          const resConn = await axios.get(`${API_BASE_URL}/api/v1/connections/pending-requests`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          setConnectionRequests(resConn.data);
        } catch (e) {
          console.error("Failed to load connection requests:", e);
        }
      } else {
        // --- DANIŞAN GİRİŞİ ---
        // Danışanın diyetisyene çalışma talepleri listesini çek
        try {
          const resMyReqs = await axios.get(`${API_BASE_URL}/api/v1/connections/my-requests`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          setConnectionRequests(resMyReqs.data);
        } catch (e) {
          console.error("Failed to load my requests:", e);
        }

        // Bugünün diyetini çek
        try {
          const resDiet = await axios.get(`${API_BASE_URL}/api/v1/diets/my/today`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          if (typeof resDiet.data === 'object') {
            setTodayDiet(resDiet.data);
            await SecureStore.setItemAsync('@cached_today_diet', JSON.stringify(resDiet.data));
          } else {
            setTodayDiet(null);
            await SecureStore.deleteItemAsync('@cached_today_diet');
          }
        } catch (e) {
          const cachedDiet = await SecureStore.getItemAsync('@cached_today_diet');
          if (cachedDiet) {
            setTodayDiet(JSON.parse(cachedDiet));
          }
        }

        // Danışanın randevularını çek
        try {
          const resApps = await axios.get(`${API_BASE_URL}/api/v1/appointments/my`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          setMyAppointments(resApps.data);
          await SecureStore.setItemAsync('@cached_my_appointments', JSON.stringify(resApps.data));
        } catch (e) {
          const cachedApps = await SecureStore.getItemAsync('@cached_my_appointments');
          if (cachedApps) {
            setMyAppointments(JSON.parse(cachedApps));
          }
        }

        // Bugünün günlük durum logunu çek
        let todayLog = null;
        try {
          const resLog = await axios.get(`${API_BASE_URL}/api/v1/logs/daily/my`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          const todayStr = new Date().toISOString().split('T')[0];
          todayLog = resLog.data.find((log: any) => log.logDate === todayStr);
          if (todayLog) {
            await SecureStore.setItemAsync('@cached_today_log', JSON.stringify(todayLog));
          } else {
            await SecureStore.deleteItemAsync('@cached_today_log');
          }
        } catch (e) {
          const cachedLog = await SecureStore.getItemAsync('@cached_today_log');
          if (cachedLog) {
            todayLog = JSON.parse(cachedLog);
          }
        }

        if (todayLog) {
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
      console.error("Data load error in dashboard:", e.message);
    }
  }, [userToken, isDietitian, syncOfflineLogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Bildirimleri periyodik sorgula
  useEffect(() => {
    if (!userToken) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [userToken, loadNotifications]);

  // Register push notifications when token is available
  useEffect(() => {
    if (userToken) {
      registerForPushNotificationsAsync(userToken);
    }
  }, [userToken]);

  // Foreground notification listener
  useEffect(() => {
    if (!userToken) return;

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      loadNotifications();
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification clicked:', response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [userToken, loadNotifications]);

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

  // Diyetisyen Başvurusu Onayla
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

  // Diyetisyen Başvurusu Reddet
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

  // Diyetisyen Profilini Güncelle
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

  // Danışan Profilini Güncelle
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
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Profil güncellenirken hata oluştu.");
    } finally {
      setIsSavingClientProfile(false);
    }
  };

  // Diyetisyene çalışma talebi gönder
  const handleSendConnectionRequest = async (dietitianId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/connections/request/${dietitianId}`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      Alert.alert("Başarılı", "Çalışma talebiniz başarıyla gönderildi. Diyetisyenin onaylaması bekleniyor.");
      
      const resMyReqs = await axios.get(`${API_BASE_URL}/api/v1/connections/my-requests`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setConnectionRequests(resMyReqs.data);
    } catch (err: any) {
      Alert.alert("Hata", err.response?.data || "Talep gönderilemedi.");
    }
  };

  // Diyetisyen çalışma talebini kabul etsin
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

  // Diyetisyen çalışma talebini reddetsin
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

  // Günlük log kaydet
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
        await saveLogOffline(payload);
        showAlert("Çevrimdışı Kayıt", "İnternet bağlantısı bulunamadı. Günlük durum kaydınız cihazınıza kaydedildi ve internet bağlantısı kurulduğunda eşitlenecektir.", "success");
      } else {
        showAlert("Hata", "Günlük durum verileri kaydedilemedi.", "error");
      }
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
    const isDark = theme.text === '#E2EFE5';
    switch (status) {
      case 'APPROVED': return { text: 'Onaylandı', color: theme.primary, bg: theme.backgroundSelected };
      case 'REJECTED': return { text: 'Reddedildi', color: isDark ? '#FF8A80' : '#C62828', bg: isDark ? 'rgba(211, 47, 47, 0.15)' : '#FFEBEE' };
      default: return { text: 'Onay Bekliyor', color: isDark ? '#FFB74D' : '#EF6C00', bg: isDark ? 'rgba(239, 108, 0, 0.15)' : '#FFF3E0' };
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Bildirim Zili */}
            <TouchableOpacity 
              style={[styles.notifBellBtn, { backgroundColor: theme.backgroundElement }]} 
              onPress={() => setIsNotifModalVisible(true)}
            >
              <Text style={styles.notifBellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.logoutBtn, { borderColor: theme.textSecondary }]} onPress={logout}>
              <ThemedText style={[styles.logoutText, { color: theme.textSecondary }]}>Çıkış</ThemedText>
            </TouchableOpacity>
          </View>
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

            <TouchableOpacity 
              style={[styles.primaryActionBtn, { backgroundColor: '#FF9800', marginTop: 10 }]}
              onPress={() => setIsBroadcastModalVisible(true)}
            >
              <ThemedText style={styles.primaryActionBtnText}>📢 Toplu Duyuru Gönder</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryActionBtn, { borderColor: theme.primary, borderWidth: 1 }]}
              onPress={() => {
                setEditName(userInfo?.name || '');
                setEditNotes(userInfo?.notes || '');
                setEditInstagram(userInfo?.instagramUrl || '');
                setEditLinkedin(userInfo?.linkedinUrl || '');
                setEditYoutube(userInfo?.youtubeUrl || '');
                setEditProfilePicture(userInfo?.profilePictureUrl || '');
                setIsEditProfileModalVisible(true);
              }}
            >
              <ThemedText style={[styles.secondaryActionBtnText, { color: theme.primary }]}>⚙️ Diyetisyen Profilini Düzenle</ThemedText>
            </TouchableOpacity>

            {/* Danışan Çalışma Talepleri Paneli */}
            {connectionRequests.length > 0 && (
              <View style={[styles.requestsPanel, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.requestsPanelTitle}>👥 Danışan Çalışma Talepleri ({connectionRequests.length})</ThemedText>
                <Text style={styles.requestsPanelSubtitle}>Sizinle çalışmak isteyen yeni danışan talepleri:</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 8, flexDirection: 'row' }}>
                  {connectionRequests.map((req) => (
                    <View key={req.id} style={[styles.requestCard, { backgroundColor: theme.backgroundSelected }]}>
                      <Text style={styles.requestClientName}>{req.client.name}</Text>
                      <Text style={styles.requestClientMeta}>
                        Boy: {req.client.height || '-'} cm | Kilo: {req.client.currentWeight || '-'} kg
                      </Text>
                      <Text style={styles.requestClientCategory}>
                        Kategori: {translateCategory(req.client.category || 'WEIGHT_MANAGEMENT')}
                      </Text>
                      
                      <View style={styles.requestActionRow}>
                        <TouchableOpacity 
                          style={[styles.requestBtn, styles.approveRequestBtn]}
                          onPress={() => handleApproveConnectionRequest(req.id)}
                        >
                          <Text style={styles.requestBtnText}>Kabul Et</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.requestBtn, styles.rejectRequestBtn]}
                          onPress={() => handleRejectConnectionRequest(req.id)}
                        >
                          <Text style={styles.requestBtnText}>Reddet</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Diyetisyen Başvuruları Paneli */}
            {isAdmin && (
              <>
                <ThemedText style={styles.sectionTitle}>📋 Diyetisyen Başvuruları ({applications.length})</ThemedText>
                {applications.length > 0 ? (
                  applications.map((app) => (
                    <View key={app.id} style={[styles.appRequestCard, { backgroundColor: theme.backgroundElement }]}>
                      <View style={styles.appCardHeader}>
                        <ThemedText style={styles.appClientName}>{app.fullName}</ThemedText>
                        <ThemedText style={styles.appApprovedTime}>{app.email}</ThemedText>
                      </View>
                      <ThemedText style={styles.appDateTime}>🎓 Okul: <ThemedText style={styles.boldText}>{app.university}</ThemedText> | Deneyim: <ThemedText style={styles.boldText}>{app.experienceYears} Yıl</ThemedText></ThemedText>
                      <ThemedText style={styles.appDateTime}>📜 Diploma No: <ThemedText style={styles.boldText}>{app.diplomaNumber}</ThemedText></ThemedText>
                      {app.documentUrl ? <ThemedText style={styles.appNote}>Belge/Link: {app.documentUrl}</ThemedText> : null}
                      {app.note ? <ThemedText style={styles.appNote}>Ön Yazı: "{app.note}"</ThemedText> : null}
                      
                      <View style={styles.appActionRow}>
                        <TouchableOpacity 
                          style={[styles.appBtn, styles.appRejectBtn]}
                          onPress={() => {
                            setSelectedApplication(app);
                            setIsRejectModalVisible(true);
                          }}
                        >
                          <ThemedText style={styles.appRejectText}>Reddet</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.appBtn, { backgroundColor: theme.primary }]}
                          onPress={() => handleApproveApplication(app.id)}
                        >
                          <ThemedText style={styles.appApproveText}>Onayla</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={[styles.noItemsCard, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText style={styles.noItemsText}>🎉 Bekleyen diyetisyen başvurusu bulunmuyor.</ThemedText>
                  </View>
                )}
              </>
            )}

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.categoryBadge, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={styles.categoryBadgeText}>
                      {translateCategory(userInfo?.category || 'WEIGHT_MANAGEMENT')}
                    </ThemedText>
                  </View>
                  <TouchableOpacity 
                    style={[styles.editProfileSummaryBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                    onPress={openClientEditProfile}
                  >
                    <ThemedText style={[styles.editProfileSummaryBtnText, { color: theme.primary }]}>⚙️ Düzenle</ThemedText>
                  </TouchableOpacity>
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
              <View style={[styles.dietCard, { borderColor: theme.primary, backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.dietCardHeader, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText style={styles.dietCardTitle}>🥗 {todayDiet.title || "Günlük Menü"}</ThemedText>
                  <ThemedText style={styles.dietCardCal}>{todayDiet.targetCalories} kcal</ThemedText>
                </View>

                { (todayDiet.targetProteinGrams || todayDiet.targetCarbsGrams || todayDiet.targetFatGrams) ? (
                  <View style={styles.macrosRow}>
                    {todayDiet.targetProteinGrams && (
                      <View style={styles.macroCol}>
                        <ThemedText style={styles.macroLabel}>Protein</ThemedText>
                        <ThemedText style={[styles.macroValue, { color: '#E57373' }]}>{todayDiet.targetProteinGrams}g</ThemedText>
                      </View>
                    )}
                    {todayDiet.targetCarbsGrams && (
                      <View style={styles.macroCol}>
                        <ThemedText style={styles.macroLabel}>Karbonhidrat</ThemedText>
                        <ThemedText style={[styles.macroValue, { color: '#81C784' }]}>{todayDiet.targetCarbsGrams}g</ThemedText>
                      </View>
                    )}
                    {todayDiet.targetFatGrams && (
                      <View style={styles.macroCol}>
                        <ThemedText style={styles.macroLabel}>Yağ</ThemedText>
                        <ThemedText style={[styles.macroValue, { color: '#FFD54F' }]}>{todayDiet.targetFatGrams}g</ThemedText>
                      </View>
                    )}
                  </View>
                ) : null }
                
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

            {/* Gelişmiş Günlük Takip Günlüğü (Faz 1) */}
            <ThemedText style={styles.sectionTitle}>📝 Günlük Takip Kaydınız (Şüheda Terat Klinik)</ThemedText>
            <View style={[styles.dailyLogCard, { backgroundColor: theme.backgroundElement }]}>
              
              {/* Su Girişi */}
              <View style={styles.logSubRow}>
                <View>
                  <ThemedText style={styles.logSubLabel}>💧 Günlük Su Tüketimi</ThemedText>
                  <ThemedText style={styles.logSubDesc}>Hedef: 2500 - 3000 ml</ThemedText>
                </View>
                <View style={styles.waterControls}>
                  <TouchableOpacity style={[styles.waterBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => setWaterIntake(Math.max(0, waterIntake - 250))}>
                    <ThemedText style={styles.waterBtnText}>-</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.waterText}>{waterIntake} ml</ThemedText>
                  <TouchableOpacity style={[styles.waterBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => setWaterIntake(waterIntake + 250)}>
                    <ThemedText style={styles.waterBtnText}>+</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Kategori Özel Takip: GLP-1 */}
              {userInfo?.category === 'GLP_1' && (
                <View style={styles.logCategoryCard}>
                  <ThemedText style={styles.logSubLabel}>💉 GLP-1 Genel Yan Etki Düzeyi ({sideEffectLevel}/5)</ThemedText>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[styles.ratingBtn, sideEffectLevel === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                        onPress={() => setSideEffectLevel(num)}
                      >
                        <ThemedText style={[styles.ratingText, sideEffectLevel === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }]}>{num}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ThemedText style={[styles.logSubLabel, { marginTop: 10 }]}>🤢 Bulantı Şiddeti ({glp1Nausea || 0}/10)</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[{ padding: 6, borderRadius: 6, minWidth: 28, alignItems: 'center' }, glp1Nausea === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                        onPress={() => setGlp1Nausea(num)}
                      >
                        <ThemedText style={[glp1Nausea === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 11 }]}>{num}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ThemedText style={[styles.logSubLabel, { marginTop: 10 }]}>💩 Kabızlık Şiddeti ({glp1Constipation || 0}/10)</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[{ padding: 6, borderRadius: 6, minWidth: 28, alignItems: 'center' }, glp1Constipation === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                        onPress={() => setGlp1Constipation(num)}
                      >
                        <ThemedText style={[glp1Constipation === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 11 }]}>{num}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ThemedText style={[styles.logSubLabel, { marginTop: 10 }]}>💧 İshal Şiddeti ({glp1Diarrhea || 0}/10)</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[{ padding: 6, borderRadius: 6, minWidth: 28, alignItems: 'center' }, glp1Diarrhea === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                        onPress={() => setGlp1Diarrhea(num)}
                      >
                        <ThemedText style={[glp1Diarrhea === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 11 }]}>{num}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingVertical: 4 }}>
                    <ThemedText style={[styles.logSubLabel, { marginVertical: 0 }]}>🤮 Kusma Yaşandı mı?</ThemedText>
                    <TouchableOpacity
                      style={[{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }, glp1Vomiting ? { backgroundColor: 'rgba(211, 47, 47, 0.15)' } : { backgroundColor: theme.backgroundSelected }]}
                      onPress={() => setGlp1Vomiting(!glp1Vomiting)}
                    >
                      <ThemedText style={{ color: glp1Vomiting ? '#D32F2F' : theme.text, fontSize: 13, fontWeight: '600' }}>
                        {glp1Vomiting ? 'Evet, Kusma Oldu' : 'Hayır, Olmadı'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  <ThemedText style={[styles.logSubLabel, { marginTop: 12 }]}>📍 Haftalık Enjeksiyon Bölgesi</ThemedText>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {['Karın (Abdomen)', 'Uyluk (Thigh)', 'Kol (Arm)', 'Bugün Değil'].map((site) => {
                      const apiVal = site === 'Karın (Abdomen)' ? 'Abdomen' : site === 'Uyluk (Thigh)' ? 'Thigh' : site === 'Kol (Arm)' ? 'Arm' : 'None';
                      const isSel = glp1InjectionSite === apiVal;
                      return (
                        <TouchableOpacity
                          key={site}
                          style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E1EFE4' }, isSel ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                          onPress={() => setGlp1InjectionSite(apiVal)}
                        >
                          <ThemedText style={[isSel ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 10 }]}>{site}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <ThemedText style={[styles.logSubLabel, { marginTop: 12 }]}>Belirtiler ve Notlar</ThemedText>
                  <View style={styles.symptomsRow}>
                    {['Halsizlik', 'Baş Ağrısı', 'İştahsızlık', 'Ağız Kuruluğu'].map((sym) => {
                      const selected = selectedSideEffects.includes(sym);
                      return (
                        <TouchableOpacity
                          key={sym}
                          style={[
                            styles.symptomChip,
                            selected ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.backgroundSelected, backgroundColor: theme.background }
                          ]}
                          onPress={() => {
                            if (selected) {
                              setSelectedSideEffects(selectedSideEffects.filter(s => s !== sym));
                            } else {
                              setSelectedSideEffects([...selectedSideEffects, sym]);
                            }
                          }}
                        >
                          <ThemedText style={[styles.symptomChipText, selected ? { color: '#FFFFFF' } : { color: theme.text }]}>{sym}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Kategori Özel Takip: Lipödem */}
              {userInfo?.category === 'LIPEDEMA' && (
                <View style={styles.logCategoryCard}>
                  <ThemedText style={styles.logSubLabel}>🦵 Bacak Ağrısı / Hassasiyet Genel ({painLevel}/5)</ThemedText>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[styles.ratingBtn, painLevel === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                        onPress={() => setPainLevel(num)}
                      >
                        <ThemedText style={[styles.ratingText, painLevel === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }]}>{num}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ThemedText style={[styles.logSubLabel, { marginTop: 10 }]}>🦵 Klinik Ağrı Skalası (VAS: {lipedemaPainLevelVas || 0}/10)</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[{ padding: 6, borderRadius: 6, minWidth: 28, alignItems: 'center' }, lipedemaPainLevelVas === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                        onPress={() => setLipedemaPainLevelVas(num)}
                      >
                        <ThemedText style={[lipedemaPainLevelVas === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 11 }]}>{num}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ThemedText style={[styles.logSubLabel, { marginTop: 12 }]}>Anti-Ödem Beslenme Uyumu</ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    <TouchableOpacity 
                      style={[{ flex: 1, minWidth: '45%', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', marginVertical: 3 }, glutenFree ? { backgroundColor: theme.backgroundSelected } : { backgroundColor: 'rgba(211, 47, 47, 0.15)' }]}
                      onPress={() => setGlutenFree(!glutenFree)}
                    >
                      <ThemedText style={{ color: theme.text, fontSize: 12 }}>{glutenFree ? '✓ Glütensiz' : '✗ Glütenli'}</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[{ flex: 1, minWidth: '45%', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', marginVertical: 3 }, sugarFree ? { backgroundColor: theme.backgroundSelected } : { backgroundColor: 'rgba(211, 47, 47, 0.15)' }]}
                      onPress={() => setSugarFree(!sugarFree)}
                    >
                      <ThemedText style={{ color: theme.text, fontSize: 12 }}>{sugarFree ? '✓ Şekersiz' : '✗ Şekerli'}</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[{ flex: 1, minWidth: '45%', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', marginVertical: 3 }, dairyFree ? { backgroundColor: theme.backgroundSelected } : { backgroundColor: 'rgba(211, 47, 47, 0.15)' }]}
                      onPress={() => setDairyFree(!dairyFree)}
                    >
                      <ThemedText style={{ color: theme.text, fontSize: 12 }}>{dairyFree ? '✓ Sütsüz' : '✗ Sütlü'}</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[{ flex: 1, minWidth: '45%', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', marginVertical: 3 }, processedFoodFree ? { backgroundColor: theme.backgroundSelected } : { backgroundColor: 'rgba(211, 47, 47, 0.15)' }]}
                      onPress={() => setProcessedFoodFree(!processedFoodFree)}
                    >
                      <ThemedText style={{ color: theme.text, fontSize: 12 }}>{processedFoodFree ? '✓ İşlenmiş Gıdasız' : '✗ İşlenmiş Gıdalı'}</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[{ flex: 1, minWidth: '45%', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', marginVertical: 3 }, alcoholFree ? { backgroundColor: theme.backgroundSelected } : { backgroundColor: 'rgba(211, 47, 47, 0.15)' }]}
                      onPress={() => setAlcoholFree(!alcoholFree)}
                    >
                      <ThemedText style={{ color: theme.text, fontSize: 12 }}>{alcoholFree ? '✓ Alkolsüz' : '✗ Alkol Tüketildi'}</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Kategori Özel Takip: Hormonal Denge */}
              {userInfo?.category === 'HORMONAL_BALANCE' && (
                <View style={styles.logCategoryCard}>
                  <ThemedText style={styles.logSubLabel}>🧬 Döngü Durumu (Regl Fazı)</ThemedText>
                  <View style={styles.categorySelectRow}>
                    {['Menstrüasyon', 'Foliküler Faz', 'Ovülasyon', 'Luteal Faz'].map((phase) => (
                      <TouchableOpacity
                        key={phase}
                        style={[
                          styles.categorySelectBtn,
                          { borderColor: theme.primary, marginBottom: 6 },
                          hormonalPhase === phase ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }
                        ]}
                        onPress={() => setHormonalPhase(phase)}
                      >
                        <ThemedText style={[
                          styles.categorySelectBtnText,
                          hormonalPhase === phase ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.primary }
                        ]}>
                          {phase}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.logSubLabel, { fontSize: 11 }]}>🩸 Döngü Günü (1-35)</ThemedText>
                      <TextInput
                        style={{ height: 38, borderWidth: 1, borderColor: '#E1EFE4', borderRadius: 8, paddingHorizontal: 10, color: theme.text, backgroundColor: theme.background, fontSize: 13 }}
                        placeholder="Örn: 14"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={cycleDay}
                        onChangeText={setCycleDay}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.logSubLabel, { fontSize: 11 }]}>🍭 Açlık Şekeri (mg/dL)</ThemedText>
                      <TextInput
                        style={{ height: 38, borderWidth: 1, borderColor: '#E1EFE4', borderRadius: 8, paddingHorizontal: 10, color: theme.text, backgroundColor: theme.background, fontSize: 13 }}
                        placeholder="Örn: 90"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={fastingBloodGlucose}
                        onChangeText={setFastingBloodGlucose}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.logSubLabel, { fontSize: 11 }]}>🧬 İnsülin (uIU/mL)</ThemedText>
                      <TextInput
                        style={{ height: 38, borderWidth: 1, borderColor: '#E1EFE4', borderRadius: 8, paddingHorizontal: 10, color: theme.text, backgroundColor: theme.background, fontSize: 13 }}
                        placeholder="Örn: 8.5"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={insulinLevel}
                        onChangeText={setInsulinLevel}
                      />
                    </View>
                  </View>

                  <ThemedText style={[styles.logSubLabel, { marginTop: 12 }]}>🍩 İnsülin / Tatlı Krizi Şiddeti ({insulinCraving || 0}/5)</ThemedText>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[styles.ratingBtn, insulinCraving === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                        onPress={() => setInsulinCraving(num)}
                      >
                        <ThemedText style={[styles.ratingText, insulinCraving === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }]}>{num}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.saveLogBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveDailyLog}
              >
                <ThemedText style={styles.saveLogBtnText}>Bugünkü Durumu Kaydet</ThemedText>
              </TouchableOpacity>

            </View>

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
            {userInfo?.dietitian ? (
              <View style={[styles.dietitianCreditsCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.creditsMainRow}>
                  {userInfo.dietitian.profilePictureUrl ? (
                    <Image 
                      source={{ uri: userInfo.dietitian.profilePictureUrl }} 
                      style={styles.creditsPhoto} 
                    />
                  ) : (
                    <ThemedText style={styles.creditsEmoji}>👩‍⚕️</ThemedText>
                  )}
                  <View style={styles.creditsTextContainer}>
                    <ThemedText style={styles.creditsLabel}>Diyetisyeniniz</ThemedText>
                    <ThemedText style={styles.creditsName}>{userInfo.dietitian.name}</ThemedText>
                    <ThemedText style={styles.creditsLocation}>{userInfo.dietitian.notes || "İzmir / Alsancak Kliniği"}</ThemedText>
                  </View>
                </View>

                {/* Sosyal Medya Butonları */}
                {(userInfo.dietitian.instagramUrl || userInfo.dietitian.linkedinUrl || userInfo.dietitian.youtubeUrl) ? (
                  <View style={styles.socialRow}>
                    {userInfo.dietitian.instagramUrl ? (
                      <TouchableOpacity
                        style={styles.socialIconContainer}
                        onPress={() => Linking.openURL(userInfo.dietitian.instagramUrl)}
                      >
                        <View style={[styles.socialIconBg, styles.instagramBg]}>
                          <Text style={styles.socialIconText}>📸</Text>
                        </View>
                        <Text style={styles.socialLabelText}>Instagram</Text>
                      </TouchableOpacity>
                    ) : null}

                    {userInfo.dietitian.linkedinUrl ? (
                      <TouchableOpacity
                        style={styles.socialIconContainer}
                        onPress={() => Linking.openURL(userInfo.dietitian.linkedinUrl)}
                      >
                        <View style={[styles.socialIconBg, styles.linkedinBg]}>
                          <Text style={styles.socialIconText}>💼</Text>
                        </View>
                        <Text style={styles.socialLabelText}>LinkedIn</Text>
                      </TouchableOpacity>
                    ) : null}

                    {userInfo.dietitian.youtubeUrl ? (
                      <TouchableOpacity
                        style={styles.socialIconContainer}
                        onPress={() => Linking.openURL(userInfo.dietitian.youtubeUrl)}
                      >
                        <View style={[styles.socialIconBg, styles.youtubeBg]}>
                          <Text style={styles.socialIconText}>🎥</Text>
                        </View>
                        <Text style={styles.socialLabelText}>YouTube</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                {/* Diyetisyen Değiştir & Sohbet Butonları */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity 
                    style={[styles.findDietitianCardBtn, { borderColor: theme.primary, borderWidth: 1, flex: 1 }]}
                    onPress={() => {
                      loadDietDataForFinder();
                      setIsFindDietitianModalVisible(true);
                    }}
                  >
                    <Text style={[styles.findDietitianCardBtnText, { color: theme.primary, fontWeight: 'bold', textAlign: 'center' }]}>🔄 Diyetisyeni Değiştir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.findDietitianCardBtn, { backgroundColor: theme.primary, flex: 1 }]}
                    onPress={() => {
                      setChatWithUser(userInfo.dietitian);
                      setIsChatModalVisible(true);
                    }}
                  >
                    <Text style={[styles.findDietitianCardBtnText, { color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center' }]}>💬 Sohbet Et</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.noDietitianCard, { backgroundColor: theme.backgroundElement }]}>
                <Text style={styles.noDietitianTitle}>👩‍⚕️ Diyetisyeniniz Bulunmuyor</Text>
                <Text style={styles.noDietitianDesc}>Diyet programı alabilmek ve randevu planlayabilmek için sistemdeki diyetisyenlerden birine çalışma talebi göndermelisiniz.</Text>
                <TouchableOpacity 
                  style={[styles.primaryActionBtn, { backgroundColor: theme.primary, width: '100%', marginTop: 8 }]}
                  onPress={() => {
                    loadDietDataForFinder();
                    setIsFindDietitianModalVisible(true);
                  }}
                >
                  <Text style={[styles.primaryActionBtnText, { color: '#FFFFFF' }]}>🔍 Diyetisyen Bul & İstek Gönder</Text>
                </TouchableOpacity>
              </View>
            )}

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
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                value={appDate}
                onChangeText={setAppDate}
              />

              <ThemedText style={styles.inputLabel}>Randevu Saati (HH:MM)</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Örn: 14:30"
                placeholderTextColor={theme.textSecondary}
                value={appTime}
                onChangeText={setAppTime}
              />

              <ThemedText style={styles.inputLabel}>Diyetisyeninize Not</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
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
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                placeholder="Örn: Ayşe Yılmaz"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <ThemedText style={styles.inputLabel}>E-posta Adresi</ThemedText>
              <TextInput 
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
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
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
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
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
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
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
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
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                    placeholder="Pazartesi"
                    placeholderTextColor={theme.textSecondary}
                    value={glp1InjectionDay}
                    onChangeText={setGlp1InjectionDay}
                  />
                  <ThemedText style={styles.inputLabel}>İlaç Dozu (mg)</ThemedText>
                  <TextInput 
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
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
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                    placeholder="Luteal Faz / Genel Takip"
                    placeholderTextColor={theme.textSecondary}
                    value={hormoneTargetCycle}
                    onChangeText={setHormoneTargetCycle}
                  />
                </View>
              )}

              <ThemedText style={styles.inputLabel}>Klinik / Diyetisyen Notları</ThemedText>
              <TextInput 
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
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

      {/* BİLDİRİM MODALI */}
      <Modal
        visible={isNotifModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsNotifModalVisible(false)}
      >
        <View style={styles.notifModalOverlay}>
          <View style={[styles.notifModalContent, { backgroundColor: theme.background }]}>
            <View style={styles.notifModalHeader}>
              <ThemedText type="subtitle" style={styles.notifModalTitle}>🔔 Bildirimler</ThemedText>
              <TouchableOpacity style={[styles.notifCloseBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => setIsNotifModalVisible(false)}>
                <Text style={[styles.notifCloseBtnText, { color: theme.textSecondary }]}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {notifications.length > 0 && (
              <TouchableOpacity style={styles.notifMarkAllBtn} onPress={handleMarkAllAsRead}>
                <Text style={styles.notifMarkAllText}>Hepsini Okundu İşaretle</Text>
              </TouchableOpacity>
            )}

            <ScrollView contentContainerStyle={styles.notifList}>
              {notifications.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Text style={styles.notifEmptyText}>Henüz bir bildiriminiz bulunmuyor.</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <TouchableOpacity
                    key={notif.id}
                    style={[
                      styles.notifCard,
                      { backgroundColor: theme.backgroundElement },
                      !notif.read && styles.notifUnreadBorder
                    ]}
                    onPress={() => handleMarkAsRead(notif.id)}
                  >
                    <View style={styles.notifHeaderRow}>
                      <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]}>
                        {notif.title}
                      </Text>
                      {!notif.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <Text style={styles.notifDate}>
                      {new Date(notif.createdAt).toLocaleDateString('tr-TR')} {new Date(notif.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DİYETİSYEN BAŞVURU RED DETAY MODALI */}
      <Modal
        visible={isRejectModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsRejectModalVisible(false)}
      >
        <View style={styles.notifModalOverlay}>
          <View style={[styles.notifModalContent, { backgroundColor: theme.background, maxHeight: 320 }]}>
            <View style={styles.notifModalHeader}>
              <ThemedText type="subtitle" style={styles.notifModalTitle}>❌ Başvuru Red Nedeni</ThemedText>
              <TouchableOpacity style={[styles.notifCloseBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => setIsRejectModalVisible(false)}>
                <Text style={[styles.notifCloseBtnText, { color: theme.textSecondary }]}>İptal</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                  height: 100,
                  padding: 10,
                  borderRadius: 8,
                  textAlignVertical: 'top',
                  backgroundColor: theme.backgroundElement
                }}
                placeholder="Lütfen red gerekçesini yazınız..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={4}
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#D32F2F', marginTop: 12, height: 44 }]}
                onPress={handleRejectApplication}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Başvuruyu Reddet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DİYETİSYEN PROFİL DÜZENLEME MODALI */}
      <Modal
        visible={isEditProfileModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">⚙️ Diyetisyen Profilini Düzenle</ThemedText>
              <TouchableOpacity style={styles.notifCloseBtn} onPress={() => setIsEditProfileModalVisible(false)}>
                <Text style={styles.notifCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Ad Soyad *</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Örn: Şüheda Terat"
                  placeholderTextColor={theme.textSecondary}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Klinik / Adres / Biyografi</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Örn: İzmir / Alsancak Kliniği"
                  placeholderTextColor={theme.textSecondary}
                  value={editNotes}
                  onChangeText={setEditNotes}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Instagram Profil Linki</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="https://instagram.com/kullaniciadi"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={editInstagram}
                  onChangeText={setEditInstagram}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>LinkedIn Profil Linki</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="https://linkedin.com/in/kullaniciadi"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={editLinkedin}
                  onChangeText={setEditLinkedin}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>YouTube Profil Linki</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="https://youtube.com/@kanaladi"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={editYoutube}
                  onChangeText={setEditYoutube}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Profil Fotoğrafı Linki</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="https://example.com/resim.jpg"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={editProfilePicture}
                  onChangeText={setEditProfilePicture}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setIsEditProfileModalVisible(false)}
                disabled={isSavingProfile}
              >
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DANIŞAN PROFİL DÜZENLEME MODALI */}
      <Modal
        visible={isClientEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsClientEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">⚙️ Profilimi Düzenle</ThemedText>
              <TouchableOpacity style={styles.notifCloseBtn} onPress={() => setIsClientEditModalVisible(false)}>
                <Text style={styles.notifCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Ad Soyad *</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Adınız Soyadınız"
                  placeholderTextColor={theme.textSecondary}
                  value={clientEditName}
                  onChangeText={setClientEditName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Boy (cm) *</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Örn: 165"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={clientEditHeight}
                  onChangeText={setClientEditHeight}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Mevcut Kilo (kg) *</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Örn: 75.5"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={clientEditCurrentWeight}
                  onChangeText={setClientEditCurrentWeight}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Hedef Kilo (kg) *</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                  placeholder="Örn: 65.0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={clientEditTargetWeight}
                  onChangeText={setClientEditTargetWeight}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Takip Programı Kategorisi *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 }}>
                  {[
                    { id: 'WEIGHT_MANAGEMENT', label: 'Kilo' },
                    { id: 'GLP_1', label: 'GLP-1' },
                    { id: 'LIPEDEMA', label: 'Lipödem' },
                    { id: 'HORMONAL_BALANCE', label: 'Hormon' }
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={{
                        width: '47%',
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.primary,
                        alignItems: 'center',
                        backgroundColor: clientEditCategory === item.id ? theme.primary : 'transparent'
                      }}
                      onPress={() => setClientEditCategory(item.id as any)}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: clientEditCategory === item.id ? '#FFFFFF' : theme.primary
                      }}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {clientEditCategory === 'GLP_1' && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEEEEE' }}>
                  <Text style={[styles.modalLabel, { color: theme.primary, fontWeight: 'bold' }]}>💉 GLP-1 Takip Detayları</Text>
                  
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>Enjeksiyon Günü</Text>
                    <TextInput
                      style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                      placeholder="Pazartesi"
                      placeholderTextColor={theme.textSecondary}
                      value={clientEditGlp1Day}
                      onChangeText={setClientEditGlp1Day}
                    />
                  </View>

                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>Dozaj</Text>
                    <TextInput
                      style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                      placeholder="0.25 mg"
                      placeholderTextColor={theme.textSecondary}
                      value={clientEditGlp1Dosage}
                      onChangeText={setClientEditGlp1Dosage}
                    />
                  </View>
                </View>
              )}

              {clientEditCategory === 'LIPEDEMA' && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEEEEE' }}>
                  <Text style={[styles.modalLabel, { color: theme.primary, fontWeight: 'bold' }]}>🦵 Lipödem Takip Detayları</Text>
                  
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>Lipödem Evresi (1-2-3-4)</Text>
                    <TextInput
                      style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                      placeholder="Örn: 2"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      value={clientEditLipedemaStage}
                      onChangeText={setClientEditLipedemaStage}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 }}>
                    <Text style={styles.modalLabel}>Anti-inflamatuar Diyet</Text>
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: clientEditAntiInflammatory ? theme.primary : '#B0BEC5'
                      }}
                      onPress={() => setClientEditAntiInflammatory(!clientEditAntiInflammatory)}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 }}>
                        {clientEditAntiInflammatory ? "UYUMLU" : "UYUMSUZ"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {clientEditCategory === 'HORMONAL_BALANCE' && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEEEEE' }}>
                  <Text style={[styles.modalLabel, { color: theme.primary, fontWeight: 'bold' }]}>🧬 Hormonal Denge Detayları</Text>
                  
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>Hedef Döngü / Faz</Text>
                    <TextInput
                      style={[styles.modalInput, { borderColor: theme.backgroundSelected, color: theme.text }]}
                      placeholder="Foliküler Faz"
                      placeholderTextColor={theme.textSecondary}
                      value={clientEditHormoneCycle}
                      onChangeText={setClientEditHormoneCycle}
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setIsClientEditModalVisible(false)}
                disabled={isSavingClientProfile}
              >
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleSaveClientProfile}
                disabled={isSavingClientProfile}
              >
                {isSavingClientProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DİYETİSYEN BUL VE İSTEK GÖNDER MODALI */}
      <Modal
        visible={isFindDietitianModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFindDietitianModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">🔍 Diyetisyen Bul & İstek Gönder</ThemedText>
              <TouchableOpacity style={styles.notifCloseBtn} onPress={() => setIsFindDietitianModalVisible(false)}>
                <Text style={styles.notifCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {isLoadingDietitians ? (
              <ActivityIndicator color={theme.primary} size="large" style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {dietitians.length === 0 ? (
                  <Text style={styles.noItemsText}>Sistemde henüz kayıtlı diyetisyen bulunmuyor.</Text>
                ) : (
                  dietitians.map((dietitian) => {
                    const isMyDietitian = userInfo?.dietitian?.id === dietitian.id;
                    const request = connectionRequests.find(r => r.dietitian.id === dietitian.id && r.status === 'PENDING');
                    const isPending = !!request;

                    return (
                      <View key={dietitian.id} style={[styles.dietitianListCard, { backgroundColor: theme.backgroundElement }]}>
                        <View style={styles.dietitianListHeader}>
                          {dietitian.profilePictureUrl ? (
                            <Image 
                              source={{ uri: dietitian.profilePictureUrl }} 
                              style={styles.dietitianListPhoto} 
                            />
                          ) : (
                            <View style={[styles.dietitianListPhoto, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0E0E0' }]}>
                              <Text style={{ fontSize: 20 }}>👩‍⚕️</Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dietitianListName}>{dietitian.name}</Text>
                            <Text style={styles.dietitianListNotes}>{dietitian.notes || "Diyetisyen"}</Text>
                          </View>
                        </View>

                        {/* Sosyal Medya İkonları */}
                        {(dietitian.instagramUrl || dietitian.linkedinUrl || dietitian.youtubeUrl) ? (
                          <View style={[styles.socialRow, { borderTopWidth: 0, paddingTop: 4, paddingBottom: 8 }]}>
                            {dietitian.instagramUrl ? (
                              <TouchableOpacity onPress={() => Linking.openURL(dietitian.instagramUrl)} style={styles.socialIconContainer}>
                                <View style={[styles.socialIconBg, styles.instagramBg, { width: 24, height: 24, borderRadius: 12 }]}>
                                  <Text style={[styles.socialIconText, { fontSize: 11 }]}>📸</Text>
                                </View>
                              </TouchableOpacity>
                            ) : null}
                            {dietitian.linkedinUrl ? (
                              <TouchableOpacity onPress={() => Linking.openURL(dietitian.linkedinUrl)} style={styles.socialIconContainer}>
                                <View style={[styles.socialIconBg, styles.linkedinBg, { width: 24, height: 24, borderRadius: 12 }]}>
                                  <Text style={[styles.socialIconText, { fontSize: 11 }]}>💼</Text>
                                </View>
                              </TouchableOpacity>
                            ) : null}
                            {dietitian.youtubeUrl ? (
                              <TouchableOpacity onPress={() => Linking.openURL(dietitian.youtubeUrl)} style={styles.socialIconContainer}>
                                <View style={[styles.socialIconBg, styles.youtubeBg, { width: 24, height: 24, borderRadius: 12 }]}>
                                  <Text style={[styles.socialIconText, { fontSize: 11 }]}>🎥</Text>
                                </View>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        ) : null}

                        <View style={{ marginTop: 8 }}>
                          {isMyDietitian ? (
                            <View style={[styles.statusBanner, { backgroundColor: '#E8F5E9' }]}>
                              <Text style={{ color: '#2E7D32', fontWeight: 'bold', fontSize: 12 }}>✔️ ŞU ANKİ DİYETİSYENİNİZ</Text>
                            </View>
                          ) : isPending ? (
                            <View style={[styles.statusBanner, { backgroundColor: '#FFF3E0' }]}>
                              <Text style={{ color: '#EF6C00', fontWeight: 'bold', fontSize: 12 }}>⏳ TALEP GÖNDERİLDİ (BEKLEMEDE)</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.primaryActionBtn, { backgroundColor: theme.primary, height: 36, marginTop: 4 }]}
                              onPress={() => handleSendConnectionRequest(dietitian.id)}
                            >
                              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>➕ Çalışma Talebi Gönder</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
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
              <TouchableOpacity style={styles.notifCloseBtn} onPress={() => {
                setIsChatModalVisible(false);
                setChatWithUser(null);
                setChatMessages([]);
              }}>
                <Text style={styles.notifCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ flex: 1, padding: 12 }} 
              contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
              ref={(ref) => ref?.scrollToEnd({ animated: true })}
            >
              {chatMessages.length === 0 ? (
                <Text style={styles.noItemsText}>Sohbet geçmişi bulunmuyor. İlk mesajı siz yazın!</Text>
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

      {/* DİYETİSYEN TOPLU DUYURU MODALI */}
      <Modal
        visible={isBroadcastModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsBroadcastModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: 320 }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">📢 Toplu Duyuru Gönder</ThemedText>
              <TouchableOpacity style={styles.notifCloseBtn} onPress={() => setIsBroadcastModalVisible(false)}>
                <Text style={styles.notifCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary }}>Bu mesaj, size bağlı olan TÜM danışanlarınıza toplu bildirim ve duyuru olarak iletilecektir.</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                  height: 100,
                  padding: 10,
                  borderRadius: 8,
                  textAlignVertical: 'top',
                  backgroundColor: theme.backgroundElement
                }}
                placeholder="Duyuru içeriğini buraya yazınız..."
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={4}
                value={broadcastText}
                onChangeText={setBroadcastText}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#FF9800', marginTop: 12, height: 44 }]}
                onPress={handleSendBroadcast}
                disabled={isSendingBroadcast}
              >
                {isSendingBroadcast ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>📢 Tüm Danışanlara Duyur</Text>
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
  editProfileSummaryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C5DFCC',
  },
  editProfileSummaryBtnText: {
    fontSize: 11,
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
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
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
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: 'rgba(46, 125, 50, 0.04)',
    borderBottomWidth: 1,
    borderBottomColor: '#E1EFE4',
  },
  macroCol: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: 'bold',
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
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  creditsMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  creditsEmoji: {
    fontSize: 32,
  },
  creditsTextContainer: {
    flex: 1,
  },
  creditsLabel: {
    fontSize: 11,
    color: '#81A588',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  creditsName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditsLocation: {
    fontSize: 13,
    color: '#546E5A',
  },
  creditsPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
  },

  // Günlük Takip Kartı
  dailyLogCard: {
    padding: Spacing.four,
    borderRadius: 18,
    gap: Spacing.three,
  },
  logSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logSubLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  logSubDesc: {
    fontSize: 11,
    color: '#546E5A',
  },
  waterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  waterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  waterText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  logCategoryCard: {
    gap: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#C5DFCC',
    paddingTop: Spacing.two,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.half,
  },
  ratingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C5DFCC',
  },
  ratingText: {
    fontSize: 15,
  },
  symptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  symptomChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  symptomChipText: {
    fontSize: 12,
  },
  complianceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.half,
  },
  complianceCard: {
    flex: 1,
    padding: Spacing.two,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  complianceText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  saveLogBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  saveLogBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
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
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    padding: Spacing.three,
    borderRadius: 10,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: 'transparent',
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
  // Notification Styles
  notifBellBtn: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    position: 'relative',
    marginRight: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBellIcon: {
    fontSize: 22,
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notifModalContent: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  notifModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  notifModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  notifCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  notifCloseBtnText: {
    fontWeight: 'bold',
    color: '#D32F2F',
    fontSize: 13,
  },
  notifMarkAllBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.three,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  notifMarkAllText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  notifList: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  notifEmpty: {
    paddingVertical: Spacing.eight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifEmptyText: {
    fontSize: 14,
    color: '#666',
  },
  notifCard: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    position: 'relative',
  },
  notifUnreadBorder: {
    borderColor: '#A5D6A7',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
    marginLeft: 8,
  },
  notifMessage: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 8,
  },
  notifDate: {
    fontSize: 11,
    color: '#999999',
    textAlign: 'right',
  },
  secondaryActionBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  secondaryActionBtnText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#E1EFE4',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  socialIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  instagramBg: {
    backgroundColor: '#E1306C',
  },
  linkedinBg: {
    backgroundColor: '#0077B5',
  },
  youtubeBg: {
    backgroundColor: '#FF0000',
  },
  socialIconText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  socialLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#546E5A',
  },
  // Diyetisyen Bulma ve Çalışma Talebi Styles
  noDietitianCard: {
    padding: Spacing.four,
    borderRadius: 18,
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    borderWidth: 1.5,
    borderColor: '#C5DFCC',
    borderStyle: 'dashed',
  },
  noDietitianTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  noDietitianDesc: {
    fontSize: 13,
    color: '#546E5A',
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 4,
  },
  findDietitianCardBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findDietitianCardBtnText: {
    fontSize: 14,
  },
  dietitianListCard: {
    padding: Spacing.three,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1EFE4',
  },
  dietitianListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dietitianListPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  dietitianListName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C3A24',
  },
  dietitianListNotes: {
    fontSize: 12,
    color: '#546E5A',
  },
  statusBanner: {
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Diyetisyen Çalışma Talepleri Paneli Styles
  requestsPanel: {
    padding: Spacing.four,
    borderRadius: 18,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  requestsPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  requestsPanelSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  requestCard: {
    width: 180,
    padding: 12,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#C5DFCC',
  },
  requestClientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C3A24',
  },
  requestClientMeta: {
    fontSize: 11,
    color: '#546E5A',
  },
  requestClientCategory: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  requestActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  requestBtn: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveRequestBtn: {
    backgroundColor: '#2E7D32',
  },
  rejectRequestBtn: {
    backgroundColor: '#D32F2F',
  },
  requestBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Chat Styles
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
});
