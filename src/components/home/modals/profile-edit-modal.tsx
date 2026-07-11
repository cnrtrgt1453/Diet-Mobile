import React from 'react';
import { Modal, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface ProfileEditModalProps {
  isDietitian: boolean;
  visible: boolean;
  onClose: () => void;
  theme: any;
  styles: any;
  homeData: any;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isDietitian,
  visible,
  onClose,
  theme,
  styles,
  homeData
}) => {
  if (isDietitian) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">✏️ Profil Bilgilerini Düzenle</ThemedText>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                <Text style={styles.modalCloseBtnText}>İptal</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Ad Soyad *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="örn: Şüheda Terat"
                  placeholderTextColor={theme.textSecondary}
                  value={homeData.editName}
                  onChangeText={homeData.setEditName}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Klinik / Özgeçmiş Notu</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="örn: İzmir Alsancak Kliniği, GLP-1 ve Lipödem uzmanı..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={homeData.editNotes}
                  onChangeText={homeData.setEditNotes}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Instagram Profil Linki</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="https://instagram.com/kullaniciadi"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={homeData.editInstagram}
                  onChangeText={homeData.setEditInstagram}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Linkedin Profil Linki</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="https://linkedin.com/in/kullaniciadi"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={homeData.editLinkedin}
                  onChangeText={homeData.setEditLinkedin}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Youtube Kanal Linki</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="https://youtube.com/@kanaladi"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={homeData.editYoutube}
                  onChangeText={homeData.setEditYoutube}
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Profil Fotoğrafı Linki</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="https://example.com/resim.jpg"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={homeData.editProfilePicture}
                  onChangeText={homeData.setEditProfilePicture}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[{ flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: theme.backgroundSelected }]}
                onPress={onClose}
                disabled={homeData.isSavingProfile}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[{ flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: theme.primary }]}
                onPress={homeData.handleSaveProfile}
                disabled={homeData.isSavingProfile}
              >
                {homeData.isSavingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Client edit profile modal
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '90%' }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">✏️ Profil Bilgilerini Düzenle</ThemedText>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Ad Soyad *</Text>
              <TextInput
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Ad Soyad"
                placeholderTextColor={theme.textSecondary}
                value={homeData.clientEditName}
                onChangeText={homeData.setClientEditName}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Boy (cm) *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="örn: 172"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={homeData.clientEditHeight}
                  onChangeText={homeData.setClientEditHeight}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Mevcut Kilo (kg) *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="örn: 78.5"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={homeData.clientEditCurrentWeight}
                  onChangeText={homeData.setClientEditCurrentWeight}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Hedef Kilo (kg) *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="örn: 68"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={homeData.clientEditTargetWeight}
                  onChangeText={homeData.setClientEditTargetWeight}
                />
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Klinik Program Türü</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {['WEIGHT_MANAGEMENT', 'GLP_1', 'LIPEDEMA', 'HORMONAL_BALANCE'].map((cat) => {
                  const isSelected = homeData.clientEditCategory === cat;
                  let label = 'Kilo Yönetimi';
                  if (cat === 'GLP_1') label = 'GLP-1 Takip';
                  if (cat === 'LIPEDEMA') label = 'Lipödem Diyeti';
                  if (cat === 'HORMONAL_BALANCE') label = 'Hormonal Denge';

                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.symptomChip,
                        {
                          borderColor: theme.backgroundSelected,
                          backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                        }
                      ]}
                      onPress={() => homeData.setClientEditCategory(cat)}
                    >
                      <Text style={[styles.symptomChipText, { color: isSelected ? '#FFFFFF' : theme.text, fontWeight: isSelected ? 'bold' : 'normal' }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {homeData.clientEditCategory === 'GLP_1' && (
              <View style={{ backgroundColor: theme.backgroundElement, padding: 12, borderRadius: 10, marginBottom: 12, gap: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.primary }}>💉 GLP-1 Takip Detayları</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Enjeksiyon Günü</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]}
                      placeholder="Pazartesi"
                      placeholderTextColor={theme.textSecondary}
                      value={homeData.clientEditGlp1Day}
                      onChangeText={homeData.setClientEditGlp1Day}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Dozaj</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]}
                      placeholder="0.25 mg"
                      placeholderTextColor={theme.textSecondary}
                      value={homeData.clientEditGlp1Dosage}
                      onChangeText={homeData.setClientEditGlp1Dosage}
                    />
                  </View>
                </View>
              </View>
            )}

            {homeData.clientEditCategory === 'LIPEDEMA' && (
              <View style={{ backgroundColor: theme.backgroundElement, padding: 12, borderRadius: 10, marginBottom: 12, gap: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.primary }}>🦵 Lipödem Takip Detayları</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Lipödem Evresi</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]}
                      placeholder="örn: 2"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      value={homeData.clientEditLipedemaStage}
                      onChangeText={homeData.setClientEditLipedemaStage}
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={styles.inputLabel}>Anti-inflamatuar Uyum</Text>
                    <TouchableOpacity
                      style={[
                        styles.symptomChip,
                        {
                          borderColor: theme.backgroundSelected,
                          backgroundColor: homeData.clientEditAntiInflammatory ? theme.primary : '#E0E0E0',
                          height: 48,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }
                      ]}
                      onPress={() => homeData.setClientEditAntiInflammatory(!homeData.clientEditAntiInflammatory)}
                    >
                      <Text style={{ color: homeData.clientEditAntiInflammatory ? '#FFFFFF' : '#666', fontWeight: 'bold', fontSize: 13 }}>
                        {homeData.clientEditAntiInflammatory ? '✅ Uyumlu' : '❌ Uyumsuz'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {homeData.clientEditCategory === 'HORMONAL_BALANCE' && (
              <View style={{ backgroundColor: theme.backgroundElement, padding: 12, borderRadius: 10, marginBottom: 12, gap: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.primary }}>🩸 Hormonal Denge Takip Detayları</Text>
                <View style={{ marginBottom: 4 }}>
                  <Text style={styles.inputLabel}>Hedef Döngü Fazı</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]}
                    placeholder="örn: Luteal Faz"
                    placeholderTextColor={theme.textSecondary}
                    value={homeData.clientEditHormoneCycle}
                    onChangeText={homeData.setClientEditHormoneCycle}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              style={[{ flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: theme.backgroundSelected }]}
              onPress={onClose}
              disabled={homeData.isSavingClientProfile}
            >
              <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>İptal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[{ flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: theme.primary }]}
              onPress={homeData.handleSaveClientProfile}
              disabled={homeData.isSavingClientProfile}
            >
              {homeData.isSavingClientProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
