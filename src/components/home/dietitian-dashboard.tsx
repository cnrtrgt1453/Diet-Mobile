import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface DietitianDashboardProps {
  theme: any;
  styles: any;
  homeData: any;
}

export const DietitianDashboard: React.FC<DietitianDashboardProps> = ({
  theme,
  styles,
  homeData
}) => {
  const { userInfo, isAdmin, store } = homeData;
  const stats = store.stats;
  const connectionRequests = store.connectionRequests;
  const applications = store.applications;
  const pendingAppointments = store.pendingAppointments;
  const approvedAppointments = store.approvedAppointments;

  const translateCategory = (cat: string) => {
    switch (cat) {
      case 'GLP_1': return 'GLP-1 Destekli';
      case 'LIPEDEMA': return 'Lipödem Diyeti';
      case 'HORMONAL_BALANCE': return 'Hormonal Denge';
      default: return 'Kilo Yönetimi';
    }
  };

  return (
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
        onPress={() => homeData.setIsAddModalVisible(true)}
      >
        <ThemedText style={styles.primaryActionBtnText}>➕ Yeni Danışan Kaydı Ekle</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.primaryActionBtn, { backgroundColor: theme.primary, marginTop: 10 }]}
        onPress={() => homeData.setIsSlotModalVisible(true)}
      >
        <ThemedText style={styles.primaryActionBtnText}>➕ Çalışma Saati Slotu Ekle</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.primaryActionBtn, { backgroundColor: '#43A047', marginTop: 10 }]}
        onPress={() => homeData.setIsClinicAnalyticsModalVisible(true)}
      >
        <ThemedText style={styles.primaryActionBtnText}>📊 Klinik Analitiği Detayları</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.primaryActionBtn, { backgroundColor: '#FF9800', marginTop: 10 }]}
        onPress={() => homeData.setIsBroadcastModalVisible(true)}
      >
        <ThemedText style={styles.primaryActionBtnText}>📢 Toplu Duyuru Gönder</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.secondaryActionBtn, { borderColor: theme.primary, borderWidth: 1 }]}
        onPress={homeData.openDietitianEditProfile}
      >
        <ThemedText style={[styles.secondaryActionBtnText, { color: theme.primary }]}>⚙️ Diyetisyen Profilini Düzenle</ThemedText>
      </TouchableOpacity>

      {/* Danışan Çalışma Talepleri Paneli */}
      {connectionRequests.length > 0 && (
        <View style={[styles.requestsPanel, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.requestsPanelTitle}>👥 Danışan Çalışma Talepleri ({connectionRequests.length})</ThemedText>
          <Text style={styles.requestsPanelSubtitle}>Sizinle çalışmak isteyen yeni danışan talepleri:</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 8, flexDirection: 'row' }}>
            {connectionRequests.map((req: any) => (
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
                    onPress={() => homeData.handleApproveConnectionRequest(req.id)}
                  >
                    <Text style={styles.requestBtnText}>Kabul Et</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.requestBtn, styles.rejectRequestBtn]}
                    onPress={() => homeData.handleRejectConnectionRequest(req.id)}
                  >
                    <Text style={styles.requestBtnText}>Reddet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Diyetisyen Başvuruları Paneli (Admin Only) */}
      {isAdmin && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two }}>
            <ThemedText style={styles.sectionTitle}>📋 Diyetisyen Başvuruları ({applications.length})</ThemedText>
            {applications.length > 0 && (
              <TouchableOpacity
                style={[styles.smallAppBtn, { backgroundColor: theme.primary }]}
                onPress={() => homeData.setIsAddModalVisible(false) /* or some trigger to review them in a full modal */}
              >
                <Text style={styles.smallAppBtnText}>Hepsini Yönet</Text>
              </TouchableOpacity>
            )}
          </View>
          {applications.length > 0 ? (
            applications.map((app: any) => (
              <View key={app.id} style={[styles.appRequestCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.appCardHeader}>
                  <ThemedText style={styles.appClientName}>{app.fullName}</ThemedText>
                  <ThemedText style={styles.appApprovedTime}>{app.email}</ThemedText>
                </View>
                <ThemedText style={styles.appDateTime}>🎓 Okul: <ThemedText style={styles.boldText}>{app.university}</ThemedText> | Deneyim: <ThemedText style={styles.boldText}>{app.experienceYears} Yıl</ThemedText></ThemedText>
                <ThemedText style={styles.appDateTime}>📜 Diploma No: <ThemedText style={styles.boldText}>{app.diplomaNumber}</ThemedText></ThemedText>
                {app.documentUrl ? <ThemedText style={styles.appNote}>Belge/Link: {app.documentUrl}</ThemedText> : null}
                {app.note ? <ThemedText style={styles.appNote}>Ön Yazı: "{app.note}"</ThemedText> : null}
                
                <View style={{ marginVertical: 6 }}>
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                    Başvuru Durumu: <ThemedText style={{ fontWeight: 'bold', color: app.status === 'PENDING' ? '#EF6C00' : '#512DA8' }}>{app.status === 'PENDING' ? '⏳ Onay Bekliyor' : '🔎 İnceleme Sürecinde'}</ThemedText>
                  </ThemedText>
                </View>

                <View style={styles.appActionRow}>
                  {app.status === 'PENDING' ? (
                    <TouchableOpacity 
                      style={[styles.appBtn, { backgroundColor: theme.primary, flex: 1, paddingVertical: 10 }]}
                      onPress={() => homeData.handleStartReviewApplication(app.id)}
                    >
                      <ThemedText style={[styles.appApproveText, { textAlign: 'center' }]}>🔎 Başvuruyu İncelemeye Al</ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity 
                        style={[styles.appBtn, styles.appRejectBtn]}
                        onPress={() => {
                          homeData.setSelectedApplication(app);
                          homeData.setIsRejectModalVisible(true);
                        }}
                      >
                        <ThemedText style={styles.appRejectText}>Reddet</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.appBtn, { backgroundColor: theme.primary }]}
                        onPress={() => homeData.handleApproveApplication(app.id)}
                      >
                        <ThemedText style={styles.appApproveText}>Onayla</ThemedText>
                      </TouchableOpacity>
                    </>
                  )}
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
        pendingAppointments.map((app: any) => (
          <View key={app.id} style={[styles.appRequestCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.appCardHeader}>
              <Text style={[styles.appClientName, { color: theme.text }]}>{app.client.name}</Text>
              <View style={[styles.miniBadge, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText style={styles.miniBadgeText}>{translateCategory(app.client.category)}</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.appDateTime}>🗓 Tarih: <ThemedText style={styles.boldText}>{app.appointmentDate}</ThemedText> | Saat: <ThemedText style={styles.boldText}>{app.appointmentTime}</ThemedText></ThemedText>
            {app.note ? <ThemedText style={styles.appNote}>Not: "{app.note}"</ThemedText> : null}
            
            <View style={styles.appActionRow}>
              <TouchableOpacity 
                style={[styles.appBtn, styles.appRejectBtn]}
                onPress={() => homeData.handleUpdateAppointment(app.id, 'REJECTED')}
              >
                <ThemedText style={styles.appRejectText}>Reddet</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.appBtn, { backgroundColor: theme.primary }]}
                onPress={() => homeData.handleUpdateAppointment(app.id, 'APPROVED')}
              >
                <ThemeText style={styles.appApproveText}>Onayla</ThemeText>
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
        approvedAppointments.map((app: any) => (
          <View key={app.id} style={[styles.appApprovedCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.appCardHeader}>
              <Text style={[styles.appClientName, { color: theme.text }]}>{app.client.name}</Text>
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
  );
};

const Spacing = {
  two: 8,
};
const ThemeText = ThemedText;
