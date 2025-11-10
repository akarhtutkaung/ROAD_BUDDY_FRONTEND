import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Location as LocationType } from '@/stores/TripStore';
import { locationAPI } from './api';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const BACKGROUND_FETCH_TASK = 'background-fetch-task';

interface BackgroundLocationData {
  locations: Location.LocationObject[];
}

export class BackgroundLocationService {
  private static instance: BackgroundLocationService;
  private isBackgroundTracking: boolean = false;
  private currentTripId: string | null = null;
  private lastLocationUpdate: Date = new Date();
  private locationUpdateInterval: number = 30000; // 30 seconds default

  static getInstance(): BackgroundLocationService {
    if (!BackgroundLocationService.instance) {
      BackgroundLocationService.instance = new BackgroundLocationService();
    }
    return BackgroundLocationService.instance;
  }

  async initializeBackgroundTracking(tripId: string): Promise<void> {
    try {
      this.currentTripId = tripId;
      this.isBackgroundTracking = true;

      // Register background location task
      TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: { data: BackgroundLocationData; error: any }) => {
        if (error) {
          console.error('Background location task error:', error);
          return;
        }

        if (data && this.isBackgroundTracking && this.currentTripId) {
          await this.handleBackgroundLocationUpdate(data);
        }
      });

      // Register background fetch task for periodic updates
      TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
        if (this.isBackgroundTracking && this.currentTripId) {
          await this.performBackgroundSync();
        }
        return BackgroundFetch.BackgroundFetchResult.NewData;
      });

      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: this.locationUpdateInterval,
        distanceInterval: 100, // Update every 100 meters
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Road Buddy Active',
          notificationBody: 'Tracking your location for the trip',
          notificationColor: '#007AFF',
        },
      });

      // Register background fetch for periodic sync
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60, // 15 minutes minimum
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background location tracking initialized for trip:', tripId);
    } catch (error) {
      console.error('Error initializing background tracking:', error);
      throw error;
    }
  }

  async stopBackgroundTracking(): Promise<void> {
    try {
      this.isBackgroundTracking = false;
      this.currentTripId = null;

      // Stop location updates
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

      // Unregister background fetch
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);

      console.log('Background location tracking stopped');
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  }

  private async handleBackgroundLocationUpdate(data: BackgroundLocationData): Promise<void> {
    try {
      if (!data.locations || data.locations.length === 0) return;

      const location = data.locations[0];
      const now = new Date();

      // Throttle updates to save battery
      const timeSinceLastUpdate = now.getTime() - this.lastLocationUpdate.getTime();
      if (timeSinceLastUpdate < this.locationUpdateInterval) {
        return;
      }

      // Convert to our location format
      const locationData: LocationType = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        timestamp: new Date(location.timestamp),
        isMoving: (location.coords.speed || 0) > 1, // Moving if speed > 1 m/s
      };

      // Send to API if we have a trip ID
      if (this.currentTripId) {
        await locationAPI.updateLocation({
          tripId: this.currentTripId,
          ...locationData,
        });
      }

      this.lastLocationUpdate = now;
    } catch (error) {
      console.error('Error handling background location update:', error);
    }
  }

  private async performBackgroundSync(): Promise<void> {
    try {
      // Perform any necessary background sync operations
      console.log('Performing background sync...');

      // Could include:
      // - Syncing offline location data
      // - Checking for trip updates
      // - Updating emergency status
      // - Refreshing places data

    } catch (error) {
      console.error('Error in background sync:', error);
    }
  }

  // Adaptive location accuracy based on speed and battery
  updateLocationAccuracy(speed: number, batteryLevel?: number): void {
    let accuracy = Location.Accuracy.Balanced;
    let interval = 30000; // 30 seconds

    if (speed > 25) { // High speed (> 55 mph)
      accuracy = Location.Accuracy.High;
      interval = 10000; // 10 seconds
    } else if (speed > 10) { // Medium speed (22-55 mph)
      accuracy = Location.Accuracy.Balanced;
      interval = 20000; // 20 seconds
    } else if (speed > 2) { // Low speed (4-22 mph)
      accuracy = Location.Accuracy.Low;
      interval = 30000; // 30 seconds
    } else { // Stopped
      accuracy = Location.Accuracy.Lowest;
      interval = 60000; // 60 seconds
    }

    // Reduce accuracy if battery is low
    if (batteryLevel && batteryLevel < 20) {
      accuracy = Location.Accuracy.Lowest;
      interval = Math.max(interval, 120000); // At least 2 minutes
    }

    this.locationUpdateInterval = interval;
    console.log(`Updated location accuracy: ${accuracy}, interval: ${interval}ms`);
  }

  // Check if background tracking is active
  isBackgroundTrackingActive(): boolean {
    return this.isBackgroundTracking;
  }

  // Get current trip ID
  getCurrentTripId(): string | null {
    return this.currentTripId;
  }

  // Handle app coming back to foreground
  async handleAppForeground(): Promise<void> {
    if (this.isBackgroundTracking && this.currentTripId) {
      console.log('App back to foreground, resuming location tracking');

      // Restart location updates with current settings
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // More frequent in foreground
          distanceInterval: 10,
          showsBackgroundLocationIndicator: true,
        });
      } catch (error) {
        console.error('Error resuming location tracking:', error);
      }
    }
  }

  // Handle app going to background
  async handleAppBackground(): Promise<void> {
    if (this.isBackgroundTracking && this.currentTripId) {
      console.log('App going to background, optimizing location tracking');

      // Switch to battery-optimized settings
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: this.locationUpdateInterval,
          distanceInterval: 100,
          showsBackgroundLocationIndicator: true,
        });
      } catch (error) {
        console.error('Error optimizing location tracking:', error);
      }
    }
  }

  // Get battery optimization tips
  getBatteryOptimizationTips(): string[] {
    return [
      'Location tracking automatically adjusts accuracy based on speed',
      'Updates are less frequent when stopped to save battery',
      'High accuracy only used when moving fast',
      'Background tracking uses balanced accuracy for efficiency',
      'App switches to low power mode when battery is below 20%',
    ];
  }

  // Estimate battery usage
  estimateBatteryUsage(hours: number): { percentage: number; description: string } {
    // Rough estimation based on location accuracy and update frequency
    const baseConsumption = 5; // 5% per hour baseline
    const highAccuracyMultiplier = 2;
    const backgroundMultiplier = 1.5;

    let estimatedUsage = baseConsumption * hours;

    if (this.locationUpdateInterval < 15000) { // High frequency
      estimatedUsage *= highAccuracyMultiplier;
    }

    if (this.isBackgroundTracking) {
      estimatedUsage *= backgroundMultiplier;
    }

    return {
      percentage: Math.min(estimatedUsage, 100),
      description: `Estimated battery usage: ${estimatedUsage.toFixed(1)}% over ${hours} hours`,
    };
  }
}

export default BackgroundLocationService;
