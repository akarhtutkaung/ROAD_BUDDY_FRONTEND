import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTrip } from '@/stores/TripStore';
import { useAuth } from '@/stores/AuthStore';
import EmergencyService, { EmergencyContact } from '@/services/emergencyService';
import LocationService from '@/services/locationService';
import PhoneService from '@/services/phoneService';

interface EmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  onEmergencySent?: (emergency: any) => void;
}

const EmergencyModal: React.FC<EmergencyModalProps> = ({
  visible,
  onClose,
  onEmergencySent,
}) => {
  const { currentTrip } = useTrip();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showContacts, setShowContacts] = useState(false);

  const emergencyService = EmergencyService.getInstance();

  useEffect(() => {
    if (visible) {
      loadEmergencyContacts();
    }
  }, [visible]);

  const loadEmergencyContacts = async () => {
    try {
      const contacts = await emergencyService.getEmergencyContacts();
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
    }
  };

  const handleSendEmergency = async () => {
    if (!currentTrip || !user) return;

    setIsSending(true);
    try {
      // Get current location
      const locationService = LocationService.getInstance();
      const currentLocation = await locationService.getCurrentLocation();

      if (!currentLocation) {
        Alert.alert('Error', 'Unable to get current location for emergency alert');
        return;
      }

      // Send emergency alert
      const emergency = await emergencyService.sendEmergencyAlert(
        currentTrip.id,
        currentLocation,
        message.trim() || undefined
      );

      if (emergency) {
        // Call all trip members for immediate response
        const tripMembers = currentTrip.members
          .filter(member => member.userId !== user.id)
          .map(member => ({
            name: member.name,
            phoneNumber: member.phoneNumber,
          }));

        await emergencyService.callAllTripMembers(tripMembers);

        if (onEmergencySent) {
          onEmergencySent(emergency);
        }

        Alert.alert(
          'Emergency Alert Sent!',
          'All trip members have been notified and called. Help is on the way.',
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                setMessage('');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error sending emergency:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCallEmergencyContact = async (contact: EmergencyContact) => {
    try {
      const phoneService = PhoneService.getInstance();
      const success = await phoneService.makeEmergencyCall(contact.phoneNumber);

      if (success) {
        Alert.alert('Calling', `Calling ${contact.name}...`);
      }
    } catch (error) {
      console.error('Error calling emergency contact:', error);
      Alert.alert('Error', 'Unable to make emergency call');
    }
  };

  const renderEmergencyContact = (contact: EmergencyContact) => (
    <TouchableOpacity
      key={contact.id}
      style={[
        styles.contactItem,
        contact.isPrimary && styles.primaryContact,
      ]}
      onPress={() => handleCallEmergencyContact(contact)}
    >
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, contact.isPrimary && styles.primaryContactText]}>
          {contact.name}
        </Text>
        <Text style={styles.contactRelationship}>
          {contact.relationship}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.callButton, contact.isPrimary && styles.primaryCallButton]}
        onPress={() => handleCallEmergencyContact(contact)}
      >
        <Text style={[styles.callButtonText, contact.isPrimary && styles.primaryCallButtonText]}>
          📞 Call
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => setShowContacts(!showContacts)}
      >
        <Text style={styles.quickActionIcon}>📞</Text>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>Emergency Contacts</Text>
          <Text style={styles.quickActionSubtitle}>
            Call emergency services or roadside assistance
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickActionButton, styles.dangerButton]}
        onPress={handleSendEmergency}
        disabled={isSending}
      >
        {isSending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.quickActionIcon}>🚨</Text>
        )}
        <View style={styles.quickActionContent}>
          <Text style={[styles.quickActionTitle, styles.dangerText]}>
            {isSending ? 'Sending Alert...' : 'Alert Trip Members'}
          </Text>
          <Text style={[styles.quickActionSubtitle, styles.dangerText]}>
            {isSending
              ? 'Notifying all members...'
              : 'Send emergency alert and call all trip members'
            }
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderEmergencyMessage = () => (
    <View style={styles.messageSection}>
      <Text style={styles.sectionTitle}>Emergency Message (Optional)</Text>
      <TextInput
        style={styles.messageInput}
        value={message}
        onChangeText={setMessage}
        placeholder="Describe your emergency situation..."
        multiline
        numberOfLines={3}
        maxLength={200}
      />
      <Text style={styles.messageHelper}>
        Provide details to help your trip members assist you better
      </Text>
    </View>
  );

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
          <Text style={styles.headerTitle}>🚨 Emergency</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Emergency Warning */}
          <View style={styles.warningSection}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>Emergency Assistance</Text>
            <Text style={styles.warningText}>
              Use this feature only for real emergencies. This will notify all trip members
              and attempt to call them immediately.
            </Text>
          </View>

          {/* Emergency Message Input */}
          {renderEmergencyMessage()}

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Emergency Contacts */}
          {showContacts && (
            <View style={styles.contactsSection}>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
              {emergencyContacts.map(renderEmergencyContact)}
            </View>
          )}

          {/* Safety Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>Safety Tips</Text>
            <Text style={styles.tipItem}>• Stay calm and speak clearly when calling</Text>
            <Text style={styles.tipItem}>• Provide your exact location if possible</Text>
            <Text style={styles.tipItem}>• Stay with your vehicle if safe to do so</Text>
            <Text style={styles.tipItem}>• Keep emergency contacts updated</Text>
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
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
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
  warningSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningIcon: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },
  messageHelper: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  quickActions: {
    marginTop: 24,
  },
  quickActionButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  quickActionIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 30,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  dangerText: {
    color: '#fff',
  },
  contactsSection: {
    marginTop: 24,
  },
  contactItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  primaryContact: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  primaryContactText: {
    color: '#856404',
  },
  contactRelationship: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  primaryCallButton: {
    backgroundColor: '#856404',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryCallButtonText: {
    color: '#fff',
  },
  tipsSection: {
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: '#f8f9fa',
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

export default EmergencyModal;
