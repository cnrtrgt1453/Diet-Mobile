import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface ClinicAnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
  styles: any;
  homeData: any;
}

export const ClinicAnalyticsModal: React.FC<ClinicAnalyticsModalProps> = ({
  visible,
  onClose,
  theme,
  styles,
  homeData
}) => {
  const cohortsData = homeData.store.cohortsData;
  const complianceData = homeData.store.complianceData;
  const weightLossRates = homeData.store.weightLossRates;

  const translateCategory = (cat: string) => {
    switch (cat) {
      case 'GLP_1': return 'GLP-1 Destekli';
      case 'LIPEDEMA': return 'Lipödem Diyeti';
      case 'HORMONAL_BALANCE': return 'Hormonal Denge';
      default: return 'Kilo Yönetimi';
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '90%', height: '90%' }]}>
          
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">📊 Klinik Analitiği Raporları</ThemedText>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <ThemedText style={styles.modalCloseBtnText}>Kapat</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingBottom: 50 }}>
            
            {/* 1. Kohort Analizi Kartı */}
            <View style={{ backgroundColor: theme.backgroundElement, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.backgroundSelected }}>
              <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: theme.primary, marginBottom: 12 }}>👥 Kohort Analizi (Aylık Kilo Kaybı)</ThemedText>
              {cohortsData.length > 0 ? (
                <View style={{ gap: 8 }}>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.textSecondary, flex: 1 }}>Kohort Ayı</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.textSecondary, width: 65, textAlign: 'right' }}>Başl. Kilo</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.textSecondary, width: 65, textAlign: 'right' }}>Güncel Kilo</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.textSecondary, width: 65, textAlign: 'right' }}>Ort. Kayıp</Text>
                  </View>
                  {/* Rows */}
                  {cohortsData.map((c: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text, flex: 1 }}>{c.cohortMonth}</Text>
                      <Text style={{ fontSize: 12, color: theme.text, width: 65, textAlign: 'right' }}>{c.averageInitialWeight.toFixed(1)} kg</Text>
                      <Text style={{ fontSize: 12, color: theme.text, width: 65, textAlign: 'right' }}>{c.averageCurrentWeight.toFixed(1)} kg</Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2E7D32', width: 65, textAlign: 'right' }}>-{c.averageWeightLoss.toFixed(1)} kg</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' }}>Analiz için yeterli kohort verisi yok.</Text>
              )}
            </View>

            {/* 2. Kategori Bazlı Uyum Oranları Kartı */}
            <View style={{ backgroundColor: theme.backgroundElement, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.backgroundSelected }}>
              <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: theme.primary, marginBottom: 12 }}>🎯 Kategori Bazlı Uyum Oranları</ThemedText>
              {complianceData.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {complianceData.map((item: any, idx: number) => {
                    const complianceVal = item.averageCompliancePercentage || 0;
                    const barColor = complianceVal >= 80 ? '#2E7D32' : complianceVal >= 50 ? '#F9A825' : '#C62828';
                    return (
                      <View key={idx}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>
                            {translateCategory(item.category)} ({item.clientCount} Danışan)
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: barColor }}>
                            %{complianceVal.toFixed(0)} Uyum
                          </Text>
                        </View>
                        <View style={{ height: 8, width: '100%', backgroundColor: theme.backgroundSelected, borderRadius: 4, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, complianceVal))}%`, backgroundColor: barColor, borderRadius: 4 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' }}>Uyum verileri yüklenemedi.</Text>
              )}
            </View>

            {/* 3. Haftalık Kilo Kaybı Hızları Kartı */}
            <View style={{ backgroundColor: theme.backgroundElement, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.backgroundSelected }}>
              <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: theme.primary, marginBottom: 12 }}>⚡ Haftalık Kilo Verme Hızları</ThemedText>
              {weightLossRates.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {weightLossRates.map((rate: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: idx < weightLossRates.length - 1 ? 0.5 : 0, borderBottomColor: theme.backgroundSelected }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>{rate.clientName}</Text>
                        <Text style={{ fontSize: 11, color: theme.textSecondary }}>Kategori: {translateCategory(rate.category)}</Text>
                      </View>
                      <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2E7D32' }}>
                          {rate.weeklyLossRate.toFixed(2)} kg/hafta
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' }}>Kilo verme hızı ölçümü yok.</Text>
              )}
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
