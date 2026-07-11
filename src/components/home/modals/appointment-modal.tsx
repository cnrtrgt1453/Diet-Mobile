import React from 'react';
import { Modal, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface AppointmentModalProps {
  isDietitian: boolean;
  visible: boolean;
  onClose: () => void;
  theme: any;
  styles: any;
  homeData: any;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isDietitian,
  visible,
  onClose,
  theme,
  styles,
  homeData
}) => {
  if (isDietitian) {
    // Dietitian: Create available work slots
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: 400 }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">📅 Çalışma Saati Slotu Ekle</ThemedText>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                <Text style={styles.modalCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Tarih *</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  value={homeData.slotDate}
                  onChangeText={homeData.setSlotDate}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Başlangıç Saati *</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                    placeholder="örn: 09:00"
                    placeholderTextColor={theme.textSecondary}
                    value={homeData.slotStartTime}
                    onChangeText={homeData.setSlotStartTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Bitiş Saati *</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                    placeholder="örn: 10:00"
                    placeholderTextColor={theme.textSecondary}
                    value={homeData.slotEndTime}
                    onChangeText={homeData.setSlotEndTime}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
                onPress={homeData.handleAddSlot}
              >
                <Text style={styles.primaryActionBtnText}>➕ Çalışma Slotu Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Client: Book appointment slot
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">📅 Randevu Al</ThemedText>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Tarih Seçin *</Text>
              <TextInput
                style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                value={homeData.appDate}
                onChangeText={(text) => {
                  homeData.setAppDate(text);
                  homeData.fetchAvailableSlots(text);
                }}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Mevcut Boş Saatler *</Text>
              {homeData.availableSlots.length === 0 ? (
                <Text style={{ fontSize: 13, color: '#FF9800', fontStyle: 'italic', marginVertical: 8 }}>
                  Diyetisyeninizin seçtiğiniz tarihte boş çalışma saati bulunmamaktadır.
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
                  {homeData.availableSlots.map((slot: any) => {
                    const isSelected = homeData.selectedSlotId === slot.id;
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          styles.symptomChip,
                          {
                            borderColor: theme.backgroundSelected,
                            backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                          }
                        ]}
                        onPress={() => homeData.setSelectedSlotId(slot.id)}
                      >
                        <Text style={[styles.symptomChipText, { color: isSelected ? '#FFFFFF' : theme.text, fontWeight: 'bold' }]}>
                          ⏰ {slot.startTime} - {slot.endTime}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Randevu Notu (Şikayetiniz / İsteğiniz)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="Randevu notunuzu buraya yazabilirsiniz..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                value={homeData.appNote}
                onChangeText={homeData.setAppNote}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
              onPress={homeData.handleRequestAppointment}
              disabled={!homeData.selectedSlotId}
            >
              <Text style={styles.primaryActionBtnText}>📅 Randevuyu Rezerve Et</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
