import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface ClientDashboardProps {
  theme: any;
  styles: any;
  homeData: any;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  theme,
  styles,
  homeData
}) => {
  const { userInfo, store } = homeData;

  const translateCategory = (cat: string) => {
    switch (cat) {
      case 'GLP_1': return 'GLP-1 Destekli';
      case 'LIPEDEMA': return 'Lipödem Diyeti';
      case 'HORMONAL_BALANCE': return 'Hormonal Denge';
      default: return 'Kilo Yönetimi';
    }
  };

  const calculateBMI = (w: number, h: number) => {
    if (!w || !h) return null;
    return (w / ((h / 100) * (h / 100))).toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: "Zayıf", color: "#FF9800" };
    if (bmi < 25) return { text: "Normal", color: "#4CAF50" };
    if (bmi < 30) return { text: "Fazla Kilolu", color: "#FF9800" };
    return { text: "Obez", color: "#F44336" };
  };

  const getCorrelationMeaning = (r: number | null | undefined) => {
    if (r === null || r === undefined) return { text: 'Yetersiz veri', color: theme.textSecondary, bg: theme.backgroundSelected };
    if (r >= 0.5) return { text: 'Güçlü Pozitif İlişki (Çok Etkili)', color: '#2E7D32', bg: '#E8F5E9' };
    if (r >= 0.1) return { text: 'Orta/Zayıf Pozitif İlişki (Etkili)', color: '#F57C00', bg: '#FFF3E0' };
    if (r <= -0.5) return { text: 'Güçlü Negatif İlişki', color: '#C62828', bg: '#FFEBEE' };
    if (r <= -0.1) return { text: 'Zayıf Negatif İlişki', color: '#D32F2F', bg: '#FFEBEE' };
    return { text: 'Nötr / İlişki Yok', color: theme.textSecondary, bg: theme.backgroundSelected };
  };

  return (
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
              onPress={homeData.openClientEditProfile}
            >
              <ThemedText style={[styles.editProfileSummaryBtnText, { color: theme.primary }]}>✏️ Düzenle</ThemedText>
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
      
      {store.todayDiet ? (
        <View style={[styles.dietCard, { borderColor: theme.primary, backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.dietCardHeader, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.dietCardTitle}>🥗 {store.todayDiet.title || "Günlük Menü"}</ThemedText>
            <ThemedText style={styles.dietCardCal}>{store.todayDiet.targetCalories} kcal</ThemedText>
          </View>

          {(store.todayDiet.targetProteinGrams || store.todayDiet.targetCarbsGrams || store.todayDiet.targetFatGrams) ? (
            <View style={styles.macrosRow}>
              {store.todayDiet.targetProteinGrams && (
                <View style={styles.macroCol}>
                  <ThemedText style={styles.macroLabel}>Protein</ThemedText>
                  <ThemedText style={[styles.macroValue, { color: '#E57373' }]}>{store.todayDiet.targetProteinGrams}g</ThemedText>
                </View>
              )}
              {store.todayDiet.targetCarbsGrams && (
                <View style={styles.macroCol}>
                  <ThemedText style={styles.macroLabel}>Karbonhidrat</ThemedText>
                  <ThemedText style={[styles.macroValue, { color: '#81C784' }]}>{store.todayDiet.targetCarbsGrams}g</ThemedText>
                </View>
              )}
              {store.todayDiet.targetFatGrams && (
                <View style={styles.macroCol}>
                  <ThemedText style={styles.macroLabel}>Yağ</ThemedText>
                  <ThemedText style={[styles.macroValue, { color: '#FFD54F' }]}>{store.todayDiet.targetFatGrams}g</ThemedText>
                </View>
              )}
            </View>
          ) : null}
          
          <View style={styles.mealRow}>
            <ThemedText style={styles.mealLabel}>🍳 Kahvaltı</ThemedText>
            <ThemedText style={styles.mealValue}>{store.todayDiet.breakfast || "Planlanmadı"}</ThemedText>
          </View>

          <View style={styles.mealRow}>
            <ThemedText style={styles.mealLabel}>🍲 Öğle Yemeği</ThemedText>
            <ThemedText style={styles.mealValue}>{store.todayDiet.lunch || "Planlanmadı"}</ThemedText>
          </View>

          <View style={styles.mealRow}>
            <ThemedText style={styles.mealLabel}>🥗 Akşam Yemeği</ThemedText>
            <ThemedText style={styles.mealValue}>{store.todayDiet.dinner || "Planlanmadı"}</ThemedText>
          </View>

          {store.todayDiet.snacks && (
            <View style={styles.mealRow}>
              <ThemedText style={styles.mealLabel}>☕ Ara Öğün</ThemedText>
              <ThemedText style={styles.mealValue}>{store.todayDiet.snacks}</ThemedText>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.dietToggleBtn, { backgroundColor: store.todayDiet.completed ? '#4CAF50' : theme.primary }]}
            onPress={homeData.handleToggleDiet}
          >
            <ThemedText style={styles.dietToggleBtnText}>
              {store.todayDiet.completed ? "✓ Bugünü Başarıyla Tamamladım!" : "Bugün Diyetime Uydum"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.noDietCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.noDietText}>📭 Diyetisyeniniz henüz bugün için bir diyet planı atamadı.</ThemedText>
        </View>
      )}

      {/* Günlük Takip Kartı */}
      <ThemedText style={styles.sectionTitle}>📝 Günlük Takip Kaydınız (Şüheda Terat Klinik)</ThemedText>
      <View style={[styles.dailyLogCard, { backgroundColor: theme.backgroundElement }]}>
        
        {/* Su Girişi */}
        <View style={styles.logSubRow}>
          <View>
            <Text style={[styles.logSubRowTitle, { color: theme.text }]}>💧 Günlük Su Tüketimi</Text>
            <Text style={{ fontSize: 11, color: theme.textSecondary }}>Hedef: 2500 - 3000 ml</Text>
          </View>
          <View style={styles.waterControls}>
            <TouchableOpacity style={[styles.waterBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => homeData.setWaterIntake(Math.max(0, homeData.waterIntake - 250))}>
              <ThemedText style={styles.waterBtnText}>-</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.waterValueText}>{homeData.waterIntake} ml</ThemedText>
            <TouchableOpacity style={[styles.waterBtn, { backgroundColor: theme.backgroundSelected }]} onPress={() => homeData.setWaterIntake(homeData.waterIntake + 250)}>
              <ThemedText style={styles.waterBtnText}>+</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kategori Özel Takip: GLP-1 */}
        {userInfo?.category === 'GLP_1' && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <Text style={[styles.logSubRowTitle, { color: theme.text }]}>💉 GLP-1 Genel Yan Etki Düzeyi ({homeData.sideEffectLevel}/5)</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.ratingBtn, homeData.sideEffectLevel === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                  onPress={() => homeData.setSideEffectLevel(num)}
                >
                  <ThemedText style={[styles.ratingText, homeData.sideEffectLevel === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }]}>{num}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.logSubRowTitle, { color: theme.text, marginTop: 4 }]}>🤢 Bulantı Şiddeti ({homeData.glp1Nausea || 0}/10)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[{ padding: 6, borderRadius: 6, minWidth: 28, alignItems: 'center' }, homeData.glp1Nausea === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                  onPress={() => homeData.setGlp1Nausea(num)}
                >
                  <ThemedText style={[homeData.glp1Nausea === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 11 }]}>{num}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.logSubRowTitle, { color: theme.text, marginTop: 4 }]}>💊 Kabızlık Şiddeti ({homeData.glp1Constipation || 0}/10)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[{ padding: 6, borderRadius: 6, minWidth: 28, alignItems: 'center' }, homeData.glp1Constipation === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                  onPress={() => homeData.setGlp1Constipation(num)}
                >
                  <ThemedText style={[homeData.glp1Constipation === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 11 }]}>{num}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.logSubRowTitle, { color: theme.text, marginTop: 4 }]}>⚡ İshal Şiddeti ({homeData.glp1Diarrhea || 0}/10)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[{ padding: 6, borderRadius: 6, minWidth: 28, alignItems: 'center' }, homeData.glp1Diarrhea === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                  onPress={() => homeData.setGlp1Diarrhea(num)}
                >
                  <ThemedText style={[homeData.glp1Diarrhea === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 11 }]}>{num}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={[styles.logSubRowTitle, { color: theme.text }]}>🤮 Kusma Yaşandı mı?</Text>
              <TouchableOpacity
                style={[{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }, homeData.glp1Vomiting ? { backgroundColor: 'rgba(211, 47, 47, 0.15)' } : { backgroundColor: theme.backgroundSelected }]}
                onPress={() => homeData.setGlp1Vomiting(!homeData.glp1Vomiting)}
              >
                <ThemedText style={{ color: homeData.glp1Vomiting ? '#D32F2F' : theme.text, fontSize: 13, fontWeight: '600' }}>
                  {homeData.glp1Vomiting ? 'Evet, Kusma Oldu' : 'Hayır, Olmadı'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <Text style={[styles.logSubRowTitle, { color: theme.text, marginTop: 4 }]}>📍 Haftalık Enjeksiyon Bölgesi</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['Karın (Abdomen)', 'Uyluk (Thigh)', 'Kol (Arm)', 'Bugün Değil'].map((site) => {
                const apiVal = site === 'Karın (Abdomen)' ? 'Abdomen' : site === 'Uyluk (Thigh)' ? 'Thigh' : site === 'Kol (Arm)' ? 'Arm' : 'None';
                const isSel = homeData.glp1InjectionSite === apiVal;
                return (
                  <TouchableOpacity
                    key={site}
                    style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E1EFE4' }, isSel ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                    onPress={() => homeData.setGlp1InjectionSite(apiVal)}
                  >
                    <ThemedText style={[isSel ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 10 }]}>{site}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.logSubRowTitle, { color: theme.text, marginTop: 4 }]}>Belirtiler ve Notlar</Text>
            <View style={styles.symptomsRow}>
              {['Halsizlik', 'Baş Ağrısı', 'İştahsızlık', 'Ağız Kuruluğu'].map((sym) => {
                const selected = homeData.selectedSideEffects.includes(sym);
                return (
                  <TouchableOpacity
                    key={sym}
                    style={[
                      styles.symptomChip,
                      selected ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.backgroundSelected, backgroundColor: theme.background }
                    ]}
                    onPress={() => {
                      if (selected) {
                        homeData.setSelectedSideEffects(homeData.selectedSideEffects.filter((s: string) => s !== sym));
                      } else {
                        homeData.setSelectedSideEffects([...homeData.selectedSideEffects, sym]);
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
          <View style={{ gap: 12, marginTop: 8 }}>
            <Text style={[styles.logSubRowTitle, { color: theme.text }]}>🦵 Bacak Ağrısı / Hassasiyet Genel ({homeData.painLevel}/5)</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.ratingBtn, homeData.painLevel === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                  onPress={() => homeData.setPainLevel(num)}
                >
                  <ThemedText style={[styles.ratingText, homeData.painLevel === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }]}>{num}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.logSubRowTitle, { color: theme.text, marginTop: 4 }]}>🦵 Klinik Ağrı Skalası (VAS: {homeData.lipedemaPainLevelVas || 0}/10)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[{ padding: 6, borderRadius: 6, minWidth: 28, alignItems: 'center' }, homeData.lipedemaPainLevelVas === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                  onPress={() => homeData.setLipedemaPainLevelVas(num)}
                >
                  <ThemedText style={[homeData.lipedemaPainLevelVas === num ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 11 }]}>{num}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.logSubRowTitle, { color: theme.text, marginTop: 4 }]}>🥗 Beslenme Planı Uyum Raporları</Text>
            <View style={styles.complianceRow}>
              <TouchableOpacity
                style={[styles.complianceCard, { backgroundColor: homeData.glutenFree ? 'rgba(76, 175, 80, 0.1)' : '#FFEBEE', borderColor: homeData.glutenFree ? theme.primary : '#D32F2F' }]}
                onPress={() => homeData.setGlutenFree(!homeData.glutenFree)}
              >
                <Text style={{ fontSize: 16 }}>🌾</Text>
                <Text style={[styles.complianceText, { color: homeData.glutenFree ? theme.primary : '#D32F2F' }]}>{homeData.glutenFree ? 'Glütensiz' : 'Glüten Aldım'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.complianceCard, { backgroundColor: homeData.sugarFree ? 'rgba(76, 175, 80, 0.1)' : '#FFEBEE', borderColor: homeData.sugarFree ? theme.primary : '#D32F2F' }]}
                onPress={() => homeData.setSugarFree(!homeData.sugarFree)}
              >
                <Text style={{ fontSize: 16 }}>🍬</Text>
                <Text style={[styles.complianceText, { color: homeData.sugarFree ? theme.primary : '#D32F2F' }]}>{homeData.sugarFree ? 'Şekersiz Uyum' : 'Şeker Aldım'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.complianceRow}>
              <TouchableOpacity
                style={[styles.complianceCard, { backgroundColor: homeData.dairyFree ? 'rgba(76, 175, 80, 0.1)' : '#FFEBEE', borderColor: homeData.dairyFree ? theme.primary : '#D32F2F' }]}
                onPress={() => homeData.setDairyFree(!homeData.dairyFree)}
              >
                <Text style={{ fontSize: 16 }}>🥛</Text>
                <Text style={[styles.complianceText, { color: homeData.dairyFree ? theme.primary : '#D32F2F' }]}>{homeData.dairyFree ? 'Süt Ürünsüz' : 'Süt Ürünü'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.complianceCard, { backgroundColor: homeData.processedFoodFree ? 'rgba(76, 175, 80, 0.1)' : '#FFEBEE', borderColor: homeData.processedFoodFree ? theme.primary : '#D32F2F' }]}
                onPress={() => homeData.setProcessedFoodFree(!homeData.processedFoodFree)}
              >
                <Text style={{ fontSize: 16 }}>🍔</Text>
                <Text style={[styles.complianceText, { color: homeData.processedFoodFree ? theme.primary : '#D32F2F' }]}>{homeData.processedFoodFree ? 'Doğal Gıda' : 'İşlenmiş Gıda'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.complianceRow}>
              <TouchableOpacity
                style={[styles.complianceCard, { backgroundColor: homeData.alcoholFree ? 'rgba(76, 175, 80, 0.1)' : '#FFEBEE', borderColor: homeData.alcoholFree ? theme.primary : '#D32F2F', flex: 0.5 }]}
                onPress={() => homeData.setAlcoholFree(!homeData.alcoholFree)}
              >
                <Text style={{ fontSize: 16 }}>🍺</Text>
                <Text style={[styles.complianceText, { color: homeData.alcoholFree ? theme.primary : '#D32F2F' }]}>{homeData.alcoholFree ? 'Alkolsüz Uyum' : 'Alkol Aldım'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Kategori Özel Takip: Hormonal Denge */}
        {userInfo?.category === 'HORMONAL_BALANCE' && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <Text style={[styles.logSubRowTitle, { color: theme.text }]}>🧬 Mevcut Döngü Fazınız</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['Foliküler Faz', 'Menstrüasyon', 'Ovülasyon', 'Luteal Faz'].map((phase) => {
                const isSel = homeData.hormonalPhase === phase;
                return (
                  <TouchableOpacity
                    key={phase}
                    style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E1EFE4' }, isSel ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                    onPress={() => homeData.setHormonalPhase(phase)}
                  >
                    <ThemedText style={[isSel ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: theme.text }, { fontSize: 10 }]}>{phase}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Açlık Şekeri (mg/dL)</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]}
                  placeholder="örn: 95"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={homeData.fastingBloodGlucose}
                  onChangeText={homeData.setFastingBloodGlucose}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>İnsülin Seviyesi</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]}
                  placeholder="örn: 12"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={homeData.insulinLevel}
                  onChangeText={homeData.setInsulinLevel}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Regl Döngü Günü</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: theme.backgroundSelected, color: theme.text, backgroundColor: theme.background }]}
                  placeholder="örn: 14"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={homeData.cycleDay}
                  onChangeText={homeData.setCycleDay}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Tatlı Krizi Şiddeti ({homeData.insulinCraving}/5)</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[styles.ratingBtn, { width: 24, height: 24 }, homeData.insulinCraving === num ? { backgroundColor: theme.primary } : { backgroundColor: theme.background }]}
                      onPress={() => homeData.setInsulinCraving(num)}
                    >
                      <ThemedText style={{ color: homeData.insulinCraving === num ? '#FFFFFF' : theme.text, fontSize: 11, fontWeight: 'bold' }}>{num}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.saveLogBtn, { backgroundColor: theme.primary }]}
          onPress={homeData.handleSaveDailyLog}
        >
          <Text style={styles.saveLogBtnText}>💾 Bugünkü Kaydı Kaydet</Text>
        </TouchableOpacity>
      </View>

      {/* Diyetisyen İletişim & Randevu Kartı */}
      {userInfo?.dietitian ? (
        <View style={[styles.dietitianCreditsCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.creditsMainRow}>
            {userInfo.dietitian.profilePictureUrl ? (
              <View style={styles.creditsPhoto}>
                {/* As Image component exists */}
              </View>
            ) : (
              <Text style={styles.creditsEmoji}>👩‍⚕️</Text>
            )}
            <View style={styles.creditsTextContainer}>
              <Text style={styles.creditsLabel}>Klinik Diyetisyeniniz</Text>
              <Text style={[styles.creditsName, { color: theme.text }]}>{userInfo.dietitian.name}</Text>
              <Text style={styles.creditsLocation}>{userInfo.dietitian.notes || "İzmir Kliniği"}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              style={[{ flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: theme.primary }]}
              onPress={() => {
                homeData.setChatWithUser(userInfo.dietitian);
                homeData.setIsChatModalVisible(true);
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>💬 Diyetisyenle Sohbet Et</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[{ flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.primary }]}
              onPress={() => {
                homeData.setIsAppModalVisible(true);
                homeData.fetchAvailableSlots(homeData.appDate);
              }}
            >
              <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13 }}>📅 Randevu Al</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.noDietitianCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={styles.noDietitianTitle}>⚠️ Diyetisyeniniz Bulunmuyor</Text>
          <Text style={styles.noDietitianDesc}>
            Programlarınızı başlatmak, diyet listesi almak ve klinik takibe girmek için sistemdeki aktif uzman hekimlerimizden birine çalışma talebi göndermelisiniz.
          </Text>
          <TouchableOpacity 
            style={[styles.primaryActionBtn, { backgroundColor: theme.primary, width: '100%' }]}
            onPress={() => {
              homeData.setIsFindDietitianModalVisible(true);
              homeData.loadDietDataForFinder();
            }}
          >
            <Text style={styles.primaryActionBtnText}>🔍 Diyetisyen Bul & Çalışmaya Başla</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Randevularım (Danışan) */}
      <ThemedText style={styles.sectionTitle}>📅 Seans Randevularım</ThemedText>
      {store.myAppointments.length > 0 ? (
        store.myAppointments.map((app: any) => {
          const badge = translateAppStatus(app.status);
          return (
            <View key={app.id} style={[styles.appClientCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.appClientText}>
                <Text style={[styles.appClientDateTime, { color: theme.text }]}>🗓 {app.appointmentDate} | ⏰ {app.appointmentTime}</Text>
                {app.note ? <Text style={styles.appClientNote}>Not: "{app.note}"</Text> : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
              </View>
            </View>
          );
        })
      ) : (
        <View style={[styles.noItemsCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={styles.noItemsText}>Kayıtlı aktif randevunuz bulunmamaktadır.</Text>
        </View>
      )}

      {/* Tahminleme & Korelasyon Analitiği */}
      {store.predictionData && (
        <>
          <ThemedText style={styles.sectionTitle}>🔮 Klinik Tahminleme Raporu</ThemedText>
          <View style={[styles.analyticsCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }}>
              Geçmiş kilo kayıp trendlerinize göre hedef kilonuza ulaşacağınız tahmini tarih hesaplanmıştır:
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={[styles.predictionDateText, { color: theme.primary }]}>🎯 Tahmini Tarih: {store.predictionData.targetAchievedDate}</Text>
              <View style={{ backgroundColor: theme.backgroundSelected, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={[styles.predictionDaysText, { color: theme.text, fontWeight: 'bold' }]}>{store.predictionData.daysRemaining} gün kaldı</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {store.correlationData && (
        <>
          <ThemedText style={styles.sectionTitle}>📈 Alışkanlık - Kilo Korelasyon Analizi</ThemedText>
          <View style={[styles.analyticsCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18, marginBottom: 8 }}>
              Günlük takip formlarındaki alışkanlıklar ile kilo kayıp hızınız arasındaki klinik korelasyon analizleri:
            </Text>
            {Object.entries(store.correlationData).map(([key, val]: [string, any]) => {
              let label = key;
              if (key === 'waterIntakeCorrelation') label = '💧 Su Tüketimi';
              if (key === 'physicalActivityCorrelation') label = '🏃 Fiziksel Aktivite';
              if (key === 'glutenFreeCorrelation') label = '🌾 Glütensiz Beslenme';
              if (key === 'sugarFreeCorrelation') label = '🍬 Şekersiz Beslenme';

              const meaning = getCorrelationMeaning(val);

              return (
                <View key={key} style={styles.correlationRow}>
                  <Text style={[styles.correlationFactor, { color: theme.text }]}>{label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.correlationCoefficient, { color: val !== null ? theme.primary : theme.textSecondary }]}>
                      {val !== null ? `r = ${val.toFixed(2)}` : 'Yetersiz Veri'}
                    </Text>
                    <View style={[styles.correlationMeaningBadge, { backgroundColor: meaning.bg }]}>
                      <Text style={[styles.correlationMeaningText, { color: meaning.color }]}>{meaning.text}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

const translateAppStatus = (status: string) => {
  switch (status) {
    case 'APPROVED': return { text: 'Onaylandı', color: '#2E7D32', bg: '#E8F5E9' };
    case 'REJECTED': return { text: 'Reddedildi', color: '#C62828', bg: '#FFEBEE' };
    default: return { text: 'Onay Bekliyor', color: '#EF6C00', bg: '#FFF3E0' };
  }
};
