import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Location as LocationType } from '@/stores/TripStore';
import { locationAPI } from './api';

const LOCATION_TASK_NAME = 'background-location-task';

interface LocationTaskData {
  locations: Location.LocationObject[];
}

export class LocationService {
  private static instance: LocationService;
  private watchId: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
        console.warn('Location permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async startLocationTracking(tripId: string): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permissions required for trip tracking');
      }

      this.isTracking = true;

      // Start foreground tracking
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or every 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location, tripId);
        }
      );

      // Start background tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds in background
        distanceInterval: 50, // Or every 50 meters
        foregroundService: {
          notificationTitle: 'Road Buddy Active',
          notificationBody: 'Tracking your location for the trip',
          notificationColor: '#007AFF',
        },
      });

      console.log('Location tracking started for trip:', tripId);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  async stopLocationTracking(): Promise<void> {
    try {
      this.isTracking = false;

      // Stop foreground tracking
      if (this.watchId !== null) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        this.watchId = null;
      }

      // Stop background tracking
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  private async handleLocationUpdate(
    location: Location.LocationObject,
    tripId: string
  ): Promise<void> {
    try {
      // Convert Expo location to our Location type
      const locationData: LocationType = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        timestamp: new Date(location.timestamp),
        battery: await this.getBatteryLevel(),
        isMoving: (location.coords.speed || 0) > 2, // Moving if speed > 2 m/s
      };

      // Send to API
      await locationAPI.updateLocation({
        tripId,
        ...locationData,
      });

      // Update local state
      // Note: We'll need to access the trip store here
      // This would typically be done through a callback or event

    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    // Battery level monitoring not available in this Expo SDK version
    // This would need to be implemented differently or removed
    return undefined;
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  async getCurrentLocation(): Promise<LocationType | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        timestamp: new Date(location.timestamp),
        battery: await this.getBatteryLevel(),
        isMoving: (location.coords.speed || 0) > 2,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }
}

// Background location task definition
// Ensure TaskManager is defined (it might mock in some dev environments)
if (TaskManager && TaskManager.defineTask) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('Background location task error:', error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      // Process locations using the singleton instance logic
      // Note: In background, we might want to store locally or send to API directly
      // For now, we'll try to use the service instance if initialized, or just log
      console.log('Received background locations:', locations.length);

      // In a real app, you would efficiently batch these or wake up the app to send
    }
  });
}

export default LocationService;
