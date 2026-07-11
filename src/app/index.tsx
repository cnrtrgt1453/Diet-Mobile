import React from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, View, Text, TextInput, ActivityIndicator, Modal, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHomeData } from '@/hooks/use-home-data';
import { getHomeStyles } from '@/styles/home-styles';

// Modular Components
import { ClientDashboard } from '@/components/home/client-dashboard';
import { DietitianDashboard } from '@/components/home/dietitian-dashboard';

// Modular Modals
import { ProfileEditModal } from '@/components/home/modals/profile-edit-modal';
import { AppointmentModal } from '@/components/home/modals/appointment-modal';
import { NotificationModal } from '@/components/home/modals/notification-modal';
import { ChatModal } from '@/components/home/modals/chat-modal';
import { DietitianApplicationsModal } from '@/components/home/modals/dietitian-applications-modal';
import { ClinicAnalyticsModal } from '@/components/home/modals/clinic-analytics-modal';

export default function HomeScreen() {
  const theme = useTheme();
  const styles = getHomeStyles(theme);
  const homeData = useHomeData();

  const {
    userInfo,
    logout,
    refreshing,
    onRefresh,
    isDietitian,
    isAdmin,
    store,

    // Modals Visibility
    isNotifModalVisible, setIsNotifModalVisible,
    isAppModalVisible, setIsAppModalVisible,
    isSlotModalVisible, setIsSlotModalVisible,
    isClinicAnalyticsModalVisible, setIsClinicAnalyticsModalVisible,
    isEditProfileModalVisible, setIsEditProfileModalVisible,
    isClientEditModalVisible, setIsClientEditModalVisible,

    // Chat
    isChatModalVisible, setIsChatModalVisible,

    // Broadcast
    isBroadcastModalVisible, setIsBroadcastModalVisible,
    broadcastText, setBroadcastText,
    isSendingBroadcast,
    handleSendBroadcast,

    // Add Client States
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

    // Finder States
    isFindDietitianModalVisible, setIsFindDietitianModalVisible,
    isLoadingDietitians,
    loadDietDataForFinder,
    handleSendConnectionRequest,
  } = homeData;

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Bildirim Zili */}
            <TouchableOpacity 
              style={[styles.notifBellBtn, { backgroundColor: theme.backgroundElement }]} 
              onPress={() => setIsNotifModalVisible(true)}
            >
              <Text style={styles.notifBellIcon}>🔔</Text>
              {store.unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{store.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.logoutBtn, { borderColor: theme.textSecondary }]} onPress={logout}>
              <ThemedText style={[styles.logoutText, { color: theme.textSecondary }]}>Çıkış</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {isDietitian ? (
          <DietitianDashboard
            theme={theme}
            styles={styles}
            homeData={homeData}
          />
        ) : (
          <ClientDashboard
            theme={theme}
            styles={styles}
            homeData={homeData}
          />
        )}

      </SafeAreaView>

      {/* ========================================================
         MODALLARIN ORKESTRASYONU (SOLID / SRP UYUMU)
         ======================================================== */}

      {/* PROFIL DUZENLEME MODALI */}
      <ProfileEditModal
        isDietitian={isDietitian}
        visible={isDietitian ? isEditProfileModalVisible : isClientEditModalVisible}
        onClose={() => isDietitian ? setIsEditProfileModalVisible(false) : setIsClientEditModalVisible(false)}
        theme={theme}
        styles={styles}
        homeData={homeData}
      />

      {/* RANDEVU MODALI */}
      <AppointmentModal
        isDietitian={isDietitian}
        visible={isDietitian ? isSlotModalVisible : isAppModalVisible}
        onClose={() => isDietitian ? setIsSlotModalVisible(false) : setIsAppModalVisible(false)}
        theme={theme}
        styles={styles}
        homeData={homeData}
      />

      {/* BILDIRIM MODALI */}
      <NotificationModal
        visible={isNotifModalVisible}
        onClose={() => setIsNotifModalVisible(false)}
        theme={theme}
        styles={styles}
        homeData={homeData}
      />

      {/* SOHBET (CHAT) MODALI */}
      <ChatModal
        visible={isChatModalVisible}
        onClose={() => {
          setIsChatModalVisible(false);
          homeData.setChatWithUser(null);
        }}
        theme={theme}
        styles={styles}
        homeData={homeData}
      />

      {/* KLINIK ANALITIK MODALI */}
      <ClinicAnalyticsModal
        visible={isClinicAnalyticsModalVisible}
        onClose={() => setIsClinicAnalyticsModalVisible(false)}
        theme={theme}
        styles={styles}
        homeData={homeData}
      />

      {/* DIETISYEN BASVURULARI MODALI (ADMIN YALNIZCA) */}
      {isAdmin && (
        <DietitianApplicationsModal
          visible={false /* Application review is integrated directly or can be opened optionally */}
          onClose={() => {}}
          theme={theme}
          styles={styles}
          homeData={homeData}
        />
      )}

      {/* DIyetisyen bulma & talep listesi modalı (Danışan) */}
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
                {store.dietitians.length === 0 ? (
                  <Text style={styles.noItemsText}>Sistemde henüz kayıtlı diyetisyen bulunmuyor.</Text>
                ) : (
                  store.dietitians.map((dietitian: any) => {
                    const isMyDietitian = userInfo?.dietitian?.id === dietitian.id;
                    const request = store.connectionRequests.find((r: any) => r.dietitian.id === dietitian.id && r.status === 'PENDING');
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

      {/* DİYETİSYEN YENİ DANIŞAN EKLEME MODALI */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '85%' }]}>
            
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">➕ Yeni Danışan Kaydı</ThemedText>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsAddModalVisible(false)}>
                <ThemedText style={styles.modalCloseBtnText}>Kapat</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalForm}>
                <ThemedText style={styles.inputLabel}>Ad Soyad *</ThemedText>
                <TextInput 
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                  placeholder="Kullanıcı Adı Soyadı"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={setName}
                />

                <ThemedText style={styles.inputLabel}>E-posta Adresi *</ThemedText>
                <TextInput 
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                  placeholder="name@example.com"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel}>Boy (cm)</ThemedText>
                    <TextInput 
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                      placeholder="170"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      value={height}
                      onChangeText={setHeight}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel}>Kilo (kg)</ThemedText>
                    <TextInput 
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                      placeholder="70"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      value={currentWeight}
                      onChangeText={setCurrentWeight}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.inputLabel}>Hedef Kilo</ThemedText>
                    <TextInput 
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]} 
                      placeholder="60"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      value={targetWeight}
                      onChangeText={setTargetWeight}
                    />
                  </View>
                </View>

                <ThemedText style={styles.inputLabel}>Klinik Kategori</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 }}>
                  {(['WEIGHT_MANAGEMENT', 'GLP_1', 'LIPEDEMA', 'HORMONAL_BALANCE'] as const).map((catOption) => (
                    <TouchableOpacity
                      key={catOption}
                      style={[
                        styles.symptomChip,
                        { borderColor: theme.primary },
                        category === catOption ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundElement }
                      ]}
                      onPress={() => setCategory(catOption)}
                    >
                      <ThemedText style={[
                        styles.symptomChipText,
                        category === catOption ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.primary }
                      ]}>
                        {catOption === 'GLP_1' ? 'GLP-1' : catOption === 'LIPEDEMA' ? 'Lipödem' : catOption === 'HORMONAL_BALANCE' ? 'Hormon' : 'Kilo'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Kategoriye Özel Alanlar */}
                {category === 'GLP_1' && (
                  <View style={{ backgroundColor: theme.backgroundElement, padding: 12, borderRadius: 10, gap: 12 }}>
                    <ThemedText style={styles.inputLabel}>Enjeksiyon Günü</ThemedText>
                    <TextInput 
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]} 
                      placeholder="Pazartesi"
                      placeholderTextColor={theme.textSecondary}
                      value={glp1InjectionDay}
                      onChangeText={setGlp1InjectionDay}
                    />
                    <ThemedText style={styles.inputLabel}>İlaç Dozu (mg)</ThemedText>
                    <TextInput 
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]} 
                      placeholder="0.5 mg"
                      placeholderTextColor={theme.textSecondary}
                      value={glp1Dosage}
                      onChangeText={setGlp1Dosage}
                    />
                  </View>
                )}

                {category === 'LIPEDEMA' && (
                  <View style={{ backgroundColor: theme.backgroundElement, padding: 12, borderRadius: 10, gap: 12 }}>
                    <ThemedText style={styles.inputLabel}>Lipödem Evresi (1-2-3)</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {['1', '2', '3'].map((stage) => (
                        <TouchableOpacity
                          key={stage}
                          style={[
                            styles.symptomChip,
                            { borderColor: theme.primary, flex: 1, alignItems: 'center' },
                            lipedemaStage === stage ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }
                          ]}
                          onPress={() => setLipedemaStage(stage)}
                        >
                          <ThemedText style={[
                            styles.symptomChipText,
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
                  <View style={{ backgroundColor: theme.backgroundElement, padding: 12, borderRadius: 10, gap: 12 }}>
                    <ThemedText style={styles.inputLabel}>Hedef Döngü Fazı (PCOS, Tiroid Takip)</ThemedText>
                    <TextInput 
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]} 
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
