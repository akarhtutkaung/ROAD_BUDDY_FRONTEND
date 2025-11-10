import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Environment configuration
export const ENV = {
  // API Configuration
  API_BASE_URL: Constants.expoConfig?.extra?.apiBaseUrl || Constants.manifest?.extra?.apiBaseUrl || 'http://localhost:3001/api',
  WEBSOCKET_URL: Constants.expoConfig?.extra?.websocketUrl || Constants.manifest?.extra?.websocketUrl || 'http://localhost:3001',

  // Auth0 Configuration
  AUTH0_DOMAIN: Constants.expoConfig?.extra?.auth0Domain || Constants.manifest?.extra?.auth0Domain || 'your-auth0-domain.auth0.com',
  AUTH0_CLIENT_ID: Constants.expoConfig?.extra?.auth0ClientId || Constants.manifest?.extra?.auth0ClientId || 'your-auth0-client-id',

  // OAuth Client IDs
  GOOGLE_CLIENT_ID: Constants.expoConfig?.extra?.googleClientId || Constants.manifest?.extra?.googleClientId || 'your-google-client-id',
  APPLE_SERVICE_ID: Constants.expoConfig?.extra?.appleServiceId || Constants.manifest?.extra?.appleServiceId || 'com.roadbuddy.service',

  // Google Services
  GOOGLE_MAPS_API_KEY: Constants.expoConfig?.extra?.googleMapsApiKey || Constants.manifest?.extra?.googleMapsApiKey || 'your-google-maps-api-key',

  // App Configuration
  IS_DEVELOPMENT: __DEV__,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',

  // Feature Flags
  ENABLE_BACKGROUND_LOCATION: Constants.expoConfig?.extra?.enableBackgroundLocation || Constants.manifest?.extra?.enableBackgroundLocation || true,
  ENABLE_NOTIFICATIONS: Constants.expoConfig?.extra?.enableNotifications || Constants.manifest?.extra?.enableNotifications || true,
  ENABLE_VOICE_GUIDANCE: Constants.expoConfig?.extra?.enableVoiceGuidance || Constants.manifest?.extra?.enableVoiceGuidance || true,
};

// Helper functions
export const getApiBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      // iOS simulator — can reach your Mac’s localhost
      return 'http://localhost:3001/api';
    } else if (Platform.OS === 'android') {
      // Android emulator — must use 10.0.2.2
      return 'http://10.0.2.2:3001/api';
    }
    // fallback for devices
    return 'http://10.0.0.215:3001/api'; // your Mac LAN IP
  }
  // Production
  return ENV.API_BASE_URL;
};

export const getWebSocketUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      return 'ws://localhost:3001';
    } else if (Platform.OS === 'android') {
      return 'ws://10.0.2.2:3001';
    }
    return 'ws://10.0.0.215:3001';
  }
  return ENV.WEBSOCKET_URL;
};

export const getAuth0Config = () => ({
  domain: ENV.AUTH0_DOMAIN,
  clientId: ENV.AUTH0_CLIENT_ID,
});

export const getGoogleMapsConfig = () => ({
  apiKey: ENV.GOOGLE_MAPS_API_KEY,
});

export const isFeatureEnabled = (feature: keyof typeof ENV): boolean => {
  return ENV[feature] === true;
};

export default ENV;
