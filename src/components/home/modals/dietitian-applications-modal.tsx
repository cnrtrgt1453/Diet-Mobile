import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface DietitianApplicationsModalProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
  styles: any;
  homeData: any;
}

export const DietitianApplicationsModal: React.FC<DietitianApplicationsModalProps> = ({
  visible,
  onClose,
  theme,
  styles,
  homeData
}) => {
  const applications = homeData.store.applications;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background, height: '80%' }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">🧑‍⚕️ Diyetisyen Başvuruları</ThemedText>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {applications.length === 0 ? (
              <Text style={[styles.noItemsText, { textAlign: 'center', marginVertical: 30 }]}>Aktif/Bekleyen başvuru bulunmamaktadır.</Text>
            ) : (
              applications.map((app: any) => {
                const getStatusText = (status: string) => {
                  if (status === 'PENDING') return 'Bekliyor';
                  if (status === 'UNDER_REVIEW') return 'İnceleniyor';
                  return status;
                };

                return (
                  <View key={app.id} style={[styles.applicationCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                    <View style={styles.applicationHeader}>
                      <Text style={[styles.applicantName, { color: theme.text }]}>{app.fullName}</Text>
                      <View style={[styles.appStatusBadge, { backgroundColor: app.status === 'UNDER_REVIEW' ? '#FFF3E0' : '#E8F5E9' }]}>
                        <Text style={[styles.appStatusBadgeText, { color: app.status === 'UNDER_REVIEW' ? '#EF6C00' : '#2E7D32' }]}>
                          {getStatusText(app.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.applicantDetails, { color: theme.textSecondary }]}>📧 E-posta: {app.email}</Text>
                    <Text style={[styles.applicantDetails, { color: theme.textSecondary }]}>🎓 Üniversite: {app.university}</Text>
                    <Text style={[styles.applicantDetails, { color: theme.textSecondary }]}>📜 Diploma No: {app.diplomaNumber}</Text>
                    <Text style={[styles.applicantDetails, { color: theme.textSecondary }]}>💼 Deneyim: {app.experienceYears} Yıl</Text>
                    {app.note && <Text style={[styles.applicantDetails, { color: theme.textSecondary, fontStyle: 'italic' }]}>📝 Not: "{app.note}"</Text>}

                    <View style={styles.applicationActionRow}>
                      {app.status === 'PENDING' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                          onPress={() => homeData.handleStartReviewApplication(app.id)}
                        >
                          <Text style={styles.actionBtnText}>🔍 İncelemeyi Başlat</Text>
                        </TouchableOpacity>
                      )}
                      {app.status === 'UNDER_REVIEW' && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                            onPress={() => homeData.handleApproveApplication(app.id)}
                          >
                            <Text style={styles.actionBtnText}>✔️ Onayla</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#D32F2F' }]}
                            onPress={() => {
                              homeData.setSelectedApplication(app);
                              homeData.setIsRejectModalVisible(true);
                            }}
                          >
                            <Text style={styles.actionBtnText}>❌ Reddet</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>

      {/* Red Gerekçesi Modalı */}
      <Modal
        visible={homeData.isRejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => homeData.setIsRejectModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, marginHorizontal: 20, borderRadius: 16, padding: 20 }]}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 12 }}>Başvuruyu Reddet</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>Lütfen adaya iletilecek gerekçeyi giriniz:</Text>
            <TextInput
              style={[styles.textInput, { height: 80, textAlignVertical: 'top', borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Gerekçe giriniz..."
              placeholderTextColor={theme.textSecondary}
              multiline
              value={homeData.rejectionReason}
              onChangeText={homeData.setRejectionReason}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, height: 40, backgroundColor: theme.backgroundSelected, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  homeData.setIsRejectModalVisible(false);
                  homeData.setRejectionReason('');
                  homeData.setSelectedApplication(null);
                }}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, height: 40, backgroundColor: '#D32F2F', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                onPress={homeData.handleRejectApplication}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Reddet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
