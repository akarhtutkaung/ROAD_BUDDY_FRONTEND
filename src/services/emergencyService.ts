import { emergencyAPI } from './api';
import { Location as LocationType } from '@/stores/TripStore';
import PhoneService from './phoneService';

export interface EmergencyAlert {
  id: string;
  tripId: string;
  userId: string;
  location: LocationType;
  message?: string;
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  isPrimary: boolean;
}

export class EmergencyService {
  private static instance: EmergencyService;
  private emergencyTimeout: NodeJS.Timeout | null = null;

  static getInstance(): EmergencyService {
    if (!EmergencyService.instance) {
      EmergencyService.instance = new EmergencyService();
    }
    return EmergencyService.instance;
  }

  // Send emergency alert to all trip members
  async sendEmergencyAlert(
    tripId: string,
    location: LocationType,
    message?: string
  ): Promise<EmergencyAlert | null> {
    try {
      const response = await emergencyAPI.sendAlert({
        tripId,
        location,
        message,
      });

      if (response.success && response.data) {
        console.log('Emergency alert sent successfully');
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to send emergency alert');
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      return null;
    }
  }

  // Get active emergencies for current user's trips
  async getActiveEmergencies(): Promise<EmergencyAlert[]> {
    try {
      const response = await emergencyAPI.getActiveEmergencies();

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to get emergencies');
      }
    } catch (error) {
      console.error('Error getting active emergencies:', error);
      return [];
    }
  }

  // Resolve an emergency alert
  async resolveEmergency(emergencyId: string): Promise<boolean> {
    try {
      const response = await emergencyAPI.resolveEmergency(emergencyId);

      if (response.success) {
        console.log('Emergency resolved successfully');
        return true;
      } else {
        throw new Error(response.error?.message || 'Failed to resolve emergency');
      }
    } catch (error) {
      console.error('Error resolving emergency:', error);
      return false;
    }
  }

  // Emergency call with priority handling
  async makeEmergencyCall(phoneNumber: string, contactName?: string): Promise<boolean> {
    try {
      const phoneService = PhoneService.getInstance();

      // For emergency calls, try direct dial first
      const success = await phoneService.makeEmergencyCall(phoneNumber);

      if (success) {
        console.log(`Emergency call made to ${contactName || phoneNumber}`);
      }

      return success;
    } catch (error) {
      console.error('Error making emergency call:', error);
      return false;
    }
  }

  // Auto-emergency detection based on sudden stops
  startEmergencyDetection(tripId: string, onEmergencyDetected?: (location: LocationType) => void) {
    // This would monitor location updates for sudden stops
    // For now, it's a placeholder for the auto-detection logic
    console.log('Emergency detection started for trip:', tripId);

    // Example: Monitor for sudden stops longer than expected
    // This would integrate with the location service
  }

  stopEmergencyDetection() {
    if (this.emergencyTimeout) {
      clearTimeout(this.emergencyTimeout);
      this.emergencyTimeout = null;
    }
    console.log('Emergency detection stopped');
  }

  // Get emergency contacts (would integrate with device contacts)
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    // This would typically integrate with react-native-contacts
    // For now, return mock emergency contacts
    return [
      {
        id: 'contact_1',
        name: 'Emergency Services',
        phoneNumber: '911',
        relationship: 'Emergency',
        isPrimary: true,
      },
      {
        id: 'contact_2',
        name: 'Roadside Assistance',
        phoneNumber: '+18002224355', // AAA example
        relationship: 'Service',
        isPrimary: false,
      },
    ];
  }

  // Quick emergency response - call all trip members
  async callAllTripMembers(tripMembers: Array<{ name: string; phoneNumber: string }>): Promise<void> {
    for (const member of tripMembers) {
      try {
        const phoneService = PhoneService.getInstance();
        await phoneService.makeEmergencyCall(member.phoneNumber);

        // Wait 2 seconds between calls to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to call ${member.name}:`, error);
      }
    }
  }

  // Format emergency message for notifications
  formatEmergencyMessage(emergency: EmergencyAlert, reporterName: string): string {
    const location = emergency.location;
    const baseMessage = `🚨 EMERGENCY ALERT\n\n${reporterName} needs help!`;

    if (emergency.message) {
      return `${baseMessage}\n\nMessage: ${emergency.message}`;
    }

    return baseMessage;
  }

  // Check if user should be prompted for emergency (sudden long stop)
  shouldPromptForEmergency(
    currentLocation: LocationType,
    previousLocation: LocationType,
    stopDurationMinutes: number = 15
  ): boolean {
    // Check if user has been stopped for a long time
    const timeDiff = (currentLocation.timestamp.getTime() - previousLocation.timestamp.getTime()) / (1000 * 60);
    const isStillStopped = !currentLocation.isMoving && !previousLocation.isMoving;

    return isStillStopped && timeDiff >= stopDurationMinutes;
  }

  // Emergency countdown for hold-to-activate
  startEmergencyCountdown(
    duration: number = 2000, // 2 seconds
    onComplete: () => void,
    onCancel?: () => void
  ): () => void {
    this.emergencyTimeout = setTimeout(() => {
      onComplete();
      this.emergencyTimeout = null;
    }, duration);

    // Return cancel function
    return () => {
      if (this.emergencyTimeout) {
        clearTimeout(this.emergencyTimeout);
        this.emergencyTimeout = null;
        if (onCancel) onCancel();
      }
    };
  }
}

export default EmergencyService;
