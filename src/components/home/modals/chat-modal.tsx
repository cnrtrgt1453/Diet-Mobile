import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
  styles: any;
  homeData: any;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  theme,
  styles,
  homeData
}) => {
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [visible, homeData.chatMessages]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background, height: '90%' }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">💬 {homeData.chatWithUser?.name || "Sohbet"}</ThemedText>
            <TouchableOpacity style={styles.notifCloseBtn} onPress={onClose}>
              <Text style={styles.notifCloseBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={{ flex: 1, padding: 12 }} 
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            ref={scrollViewRef}
          >
            {homeData.chatMessages.length === 0 ? (
              <Text style={styles.noItemsText}>Sohbet geçmişi bulunmuyor. İlk mesajı siz yazın!</Text>
            ) : (
              homeData.chatMessages.map((msg: any) => {
                const isMe = msg.sender.id === homeData.userInfo?.id;
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
              value={homeData.typedMessage}
              onChangeText={homeData.setTypedMessage}
            />
            <TouchableOpacity 
              style={[styles.chatSendBtn, { backgroundColor: theme.primary }]}
              onPress={homeData.handleSendChatMessage}
              disabled={homeData.isSendingMessage}
            >
              {homeData.isSendingMessage ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.chatSendBtnText}>Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
