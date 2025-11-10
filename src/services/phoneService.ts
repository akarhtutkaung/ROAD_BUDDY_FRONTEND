import { Linking, Alert, Platform } from 'react-native';

export interface PhoneNumber {
  number: string;
  formatted: string;
  countryCode?: string;
}

export class PhoneService {
  private static instance: PhoneService;

  static getInstance(): PhoneService {
    if (!PhoneService.instance) {
      PhoneService.instance = new PhoneService();
    }
    return PhoneService.instance;
  }

  // Format phone number for display and dialing
  formatPhoneNumber(phoneNumber: string): PhoneNumber {
    // Remove all non-numeric characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    const withPlus = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;

    // Format for display: (XXX) XXX-XXXX
    const digits = withPlus.replace(/^\+/, '');
    let formatted = '';

    if (digits.length >= 10) {
      // US/Canada format
      formatted = `(${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
    } else {
      // International format
      formatted = withPlus;
    }

    return {
      number: withPlus,
      formatted,
      countryCode: withPlus.substring(0, withPlus.length - 10),
    };
  }

  // Make a phone call
  async makeCall(phoneNumber: string): Promise<boolean> {
    try {
      const formatted = this.formatPhoneNumber(phoneNumber);

      // Check if device supports phone calls
      const canOpen = await Linking.canOpenURL(`tel:${formatted.number}`);

      if (!canOpen) {
        Alert.alert(
          'Not Supported',
          'Phone calls are not supported on this device.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Attempt to open phone dialer
      const result = await Linking.openURL(`tel:${formatted.number}`);

      if (Platform.OS === 'ios') {
        // iOS might return false even if successful
        return result !== false;
      }

      return true;
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert(
        'Error',
        'Unable to make phone call. Please check your phone permissions.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  // Check if phone calls are supported
  async canMakeCalls(): Promise<boolean> {
    try {
      return await Linking.canOpenURL('tel:+1234567890');
    } catch (error) {
      console.error('Error checking phone support:', error);
      return false;
    }
  }

  // Get phone number from contact (if implemented)
  async getPhoneNumberFromContact(contactId: string): Promise<string | null> {
    // This would integrate with react-native-contacts if implemented
    // For now, return null
    console.log('Contact integration not implemented yet');
    return null;
  }

  // Validate phone number format
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation for E.164 format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[^\d+]/g, ''));
  }

  // Emergency call (direct dial without confirmation)
  async makeEmergencyCall(phoneNumber: string): Promise<boolean> {
    try {
      const formatted = this.formatPhoneNumber(phoneNumber);

      if (!this.isValidPhoneNumber(formatted.number)) {
        Alert.alert('Invalid Number', 'The phone number format is not valid.');
        return false;
      }

      // For emergency calls, we might want to auto-dial on iOS if possible
      const url = Platform.OS === 'ios' ? `tel:${formatted.number}` : `tel:${formatted.number}`;

      const result = await Linking.openURL(url);
      return result !== false;
    } catch (error) {
      console.error('Error making emergency call:', error);
      return false;
    }
  }

  // Show call confirmation dialog
  async confirmAndCall(phoneNumber: string, contactName?: string): Promise<boolean> {
    const formatted = this.formatPhoneNumber(phoneNumber);

    return new Promise((resolve) => {
      Alert.alert(
        'Call',
        `Call ${contactName || 'this number'}?\n\n${formatted.formatted}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Call',
            onPress: async () => {
              const success = await this.makeCall(phoneNumber);
              resolve(success);
            },
          },
        ]
      );
    });
  }

  // Quick call without confirmation (for trusted contacts)
  async quickCall(phoneNumber: string): Promise<boolean> {
    return await this.makeCall(phoneNumber);
  }
}

export default PhoneService;
