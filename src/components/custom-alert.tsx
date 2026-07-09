import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  type,
  onClose,
}) => {
  const isSuccess = type === 'success';
  const headerBg = isSuccess ? '#2E7D32' : '#C62828'; // Green for success, Red for error
  const buttonBg = isSuccess ? '#2E7D32' : '#C62828';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          {/* Header Band */}
          <View style={[styles.header, { backgroundColor: headerBg }]}>
            <Text style={styles.title}>{title}</Text>
          </View>
          
          {/* Body Content */}
          <View style={styles.body}>
            <Text style={styles.message}>{message}</Text>
          </View>
          
          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: buttonBg }]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  message: {
    color: '#333333',
    fontSize: 15,
    fontWeight: 'bold', // Bold text requested by user
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  button: {
    width: '60%',
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
