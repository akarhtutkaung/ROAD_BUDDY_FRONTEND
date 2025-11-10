import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useTrip } from '@/stores/TripStore';
import { useAuth } from '@/stores/AuthStore';
import StatusService, { StatusType, StatusConfig } from '@/services/statusService';

interface StatusModalProps {
  visible: boolean;
  onClose: () => void;
  onStatusSet?: (status: StatusType, message?: string) => void;
}

const StatusModal: React.FC<StatusModalProps> = ({
  visible,
  onClose,
  onStatusSet,
}) => {
  const { currentTrip } = useTrip();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  const statusService = StatusService.getInstance();
  const statusConfigs = statusService.getStatusConfigs();

  const handleStatusSelect = (status: StatusType) => {
    setSelectedStatus(status);
    setCustomMessage('');

    // For most statuses, set immediately without custom message
    if (status !== 'custom') {
      handleSetStatus(status);
    }
  };

  const handleSetStatus = (status: StatusType, message?: string) => {
    if (!currentTrip || !user) return;

    try {
      const statusUpdate = statusService.setUserStatus(user.id, currentTrip.id, status, message);

      if (onStatusSet) {
        onStatusSet(status, message);
      }

      // Show confirmation
      const config = statusService.getStatusDisplayInfo(status);
      Alert.alert(
        'Status Updated',
        `${config?.emoji} ${config?.label}${message ? `: ${message}` : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              setSelectedStatus(null);
              setCustomMessage('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error setting status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleCustomStatusSubmit = () => {
    if (!customMessage.trim()) {
      Alert.alert('Error', 'Please enter a status message');
      return;
    }

    handleSetStatus('custom', customMessage.trim());
  };

  const renderStatusButton = (config: StatusConfig) => (
    <TouchableOpacity
      key={config.id}
      style={[
        styles.statusButton,
        { borderColor: config.color },
        selectedStatus === config.id && styles.statusButtonSelected,
      ]}
      onPress={() => handleStatusSelect(config.id)}
    >
      <Text style={styles.statusEmoji}>{config.emoji}</Text>
      <Text
        style={[
          styles.statusLabel,
          { color: config.color },
          selectedStatus === config.id && styles.statusLabelSelected,
        ]}
      >
        {config.label}
      </Text>
      {config.estimatedDuration && config.estimatedDuration > 0 && (
        <Text style={[styles.statusDuration, { color: config.color }]}>
          ~{config.estimatedDuration} min
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderCustomMessageInput = () => (
    <View style={styles.customMessageSection}>
      <Text style={styles.sectionTitle}>Custom Status</Text>
      <TextInput
        style={styles.messageInput}
        value={customMessage}
        onChangeText={setCustomMessage}
        placeholder="Enter your custom status..."
        multiline
        maxLength={100}
      />
      <TouchableOpacity
        style={styles.setCustomButton}
        onPress={handleCustomStatusSubmit}
      >
        <Text style={styles.setCustomButtonText}>Set Custom Status</Text>
      </TouchableOpacity>
    </View>
  );

  const groupedStatuses = statusConfigs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, StatusConfig[]>);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Update Status</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Status Updates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Updates</Text>
            <Text style={styles.sectionSubtitle}>
              Let your trip members know what you're up to
            </Text>

            <View style={styles.statusGrid}>
              {groupedStatuses.need?.map(renderStatusButton)}
            </View>
          </View>

          {/* Activities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activities</Text>
            <View style={styles.statusGrid}>
              {groupedStatuses.activity?.map(renderStatusButton)}
            </View>
          </View>

          {/* Issues */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issues</Text>
            <View style={styles.statusGrid}>
              {groupedStatuses.issue?.map(renderStatusButton)}
            </View>
          </View>

          {/* Positive Status */}
          <View style={styles.section}>
            <View style={styles.statusGrid}>
              {groupedStatuses.positive?.map(renderStatusButton)}
            </View>
          </View>

          {/* Custom Status */}
          {selectedStatus === 'custom' && renderCustomMessageInput()}

          {/* Status Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>Tips</Text>
            <Text style={styles.tipItem}>
              • Status updates help your trip members know what to expect
            </Text>
            <Text style={styles.tipItem}>
              • Use "Car trouble" for urgent situations - it highlights the call button
            </Text>
            <Text style={styles.tipItem}>
              • Status automatically clears after the estimated duration
            </Text>
            <Text style={styles.tipItem}>
              • Trip members can see your status on their member cards
            </Text>
          </View>
        </ScrollView>
      </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusButtonSelected: {
    backgroundColor: '#fff',
    borderColor: '#007AFF',
    transform: [{ scale: 1.02 }],
  },
  statusEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  statusDuration: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  customMessageSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  setCustomButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  setCustomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsSection: {
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 16,
  },
  tipItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default StatusModal;
