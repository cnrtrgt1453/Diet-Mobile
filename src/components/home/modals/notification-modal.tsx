import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
  styles: any;
  homeData: any;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  theme,
  styles,
  homeData
}) => {
  const notifications = homeData.store.notifications;
  const unreadCount = homeData.store.unreadCount;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background, height: '80%' }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemedText type="subtitle">🔔 Bildirimler</ThemedText>
              {unreadCount > 0 && (
                <View style={[styles.notifBadge, { position: 'relative', top: 0, right: 0 }]}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={homeData.handleMarkAllAsRead}>
                  <Text style={[styles.notifHeaderAction, { color: theme.primary }]}>Hepsini Oku</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.notifCloseBtn} onPress={onClose}>
                <Text style={styles.notifCloseBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <Text style={[styles.noItemsText, { textAlign: 'center', marginVertical: 30 }]}>Henüz bildiriminiz bulunmuyor.</Text>
            ) : (
              notifications.map((notif: any) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: notif.isRead ? theme.backgroundElement : theme.backgroundSelected,
                      borderColor: theme.backgroundSelected,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => {
                    if (!notif.isRead) {
                      homeData.handleMarkAsRead(notif.id);
                    }
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.notifTitle, { color: theme.text }]}>
                      {notif.isRead ? '✉️' : '📩'} {notif.title}
                    </Text>
                    {!notif.isRead && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
                    )}
                  </View>
                  <Text style={[styles.notifMessage, { color: theme.textSecondary }]}>{notif.message}</Text>
                  <Text style={[styles.notifTime, { color: theme.textSecondary }]}>
                    {new Date(notif.createdAt).toLocaleDateString('tr-TR')} {new Date(notif.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
