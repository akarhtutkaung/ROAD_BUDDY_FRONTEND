import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import StatusService, { StatusType } from '@/services/statusService';

interface QuickStatusModalProps {
  visible: boolean;
  onClose: () => void;
  onStatusSet: (status: StatusType, message?: string) => void;
  currentUserName: string;
}

const QuickStatusModal: React.FC<QuickStatusModalProps> = ({
  visible,
  onClose,
  onStatusSet,
  currentUserName,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const statusService = StatusService.getInstance();
  const statusConfigs = statusService.getStatusConfigs();

  // Filter to show only commonly used statuses in the quick select
  const quickStatuses = statusConfigs.filter(config =>
    ['driving', 'rest_stop', 'food_stop', 'gas_stop', 'scenic_stop', 'waiting', 'custom'].includes(config.id)
  );

  const handleStatusSelect = (status: StatusType) => {
    if (status === 'custom') {
      setShowCustomInput(true);
      setSelectedStatus(status);
    } else {
      setSelectedStatus(status);
      setShowCustomInput(false);
    }
  };

  const handleSendStatus = () => {
    if (!selectedStatus) return;

    let finalMessage = '';
    if (selectedStatus === 'custom' && customMessage.trim()) {
      finalMessage = customMessage.trim();
    }

    onStatusSet(selectedStatus, finalMessage);
    onClose();

    // Reset state
    setSelectedStatus(null);
    setCustomMessage('');
    setShowCustomInput(false);
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setSelectedStatus(null);
    setCustomMessage('');
    setShowCustomInput(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Update Status</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Status Bubbles */}
          <Text style={styles.sectionTitle}>Quick Status</Text>
          <View style={styles.statusGrid}>
            {quickStatuses.map((config) => (
              <TouchableOpacity
                key={config.id}
                style={[
                  styles.statusBubble,
                  selectedStatus === config.id && styles.statusBubbleSelected,
                  { borderColor: config.color }
                ]}
                onPress={() => handleStatusSelect(config.id)}
              >
                <Text style={styles.statusEmoji}>{config.emoji}</Text>
                <Text style={[
                  styles.statusLabel,
                  selectedStatus === config.id && styles.statusLabelSelected
                ]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Message Input */}
          {showCustomInput && (
            <View style={styles.customInputContainer}>
              <Text style={styles.sectionTitle}>Custom Message</Text>
              <TextInput
                style={styles.customInput}
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder="Enter your custom status message..."
                multiline
                maxLength={100}
              />
              <Text style={styles.characterCount}>
                {customMessage.length}/100
              </Text>
            </View>
          )}

          {/* Preview */}
          {selectedStatus && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Preview</Text>
              <View style={styles.previewBubble}>
                <Text style={styles.previewText}>
                  {currentUserName} is now{' '}
                  <Text style={styles.previewStatus}>
                    {selectedStatus === 'custom' ? customMessage || 'Custom Status' : selectedStatus}
                  </Text>
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              !selectedStatus && styles.sendButtonDisabled
            ]}
            onPress={handleSendStatus}
            disabled={!selectedStatus}
          >
            <Text style={[
              styles.sendButtonText,
              !selectedStatus && styles.sendButtonTextDisabled
            ]}>
              Send Status Update
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusBubble: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  statusBubbleSelected: {
    backgroundColor: '#fff',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  statusLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  customInputContainer: {
    marginTop: 20,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  previewBubble: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  previewText: {
    fontSize: 14,
    color: '#fff',
  },
  previewStatus: {
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
});

export default QuickStatusModal;
