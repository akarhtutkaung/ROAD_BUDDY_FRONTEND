import { placesAPI } from './api';
import { Location as LocationType } from '@/stores/TripStore';

export interface Place {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
  types: string[];
  rating?: number;
  priceLevel?: number;
  vicinity?: string;
  distance?: number;
  duration?: number;
}

export interface PlaceCategory {
  id: string;
  name: string;
  icon: string;
  types: string[];
}

export class PlacesService {
  private static instance: PlacesService;

  static getInstance(): PlacesService {
    if (!PlacesService.instance) {
      PlacesService.instance = new PlacesService();
    }
    return PlacesService.instance;
  }

  // Predefined categories for road trip stops
  getStopCategories(): PlaceCategory[] {
    return [
      {
        id: 'gas_station',
        name: 'Gas Stations',
        icon: '⛽',
        types: ['gas_station'],
      },
      {
        id: 'restaurant',
        name: 'Restaurants',
        icon: '🍔',
        types: ['restaurant', 'food'],
      },
      {
        id: 'rest_stop',
        name: 'Rest Areas',
        icon: '🚽',
        types: ['rest_stop', 'point_of_interest'],
      },
      {
        id: 'coffee',
        name: 'Coffee Shops',
        icon: '☕',
        types: ['cafe'],
      },
      {
        id: 'lodging',
        name: 'Hotels',
        icon: '🏨',
        types: ['lodging'],
      },
      {
        id: 'all',
        name: 'All Stops',
        icon: '📍',
        types: ['gas_station', 'restaurant', 'rest_stop', 'cafe', 'lodging'],
      },
    ];
  }

  async searchNearbyPlaces(
    location: LocationType,
    category: string = 'all',
    radius: number = 10000
  ): Promise<Place[]> {
    try {
      const categories = this.getStopCategories();
      const selectedCategory = categories.find(cat => cat.id === category) || categories.find(cat => cat.id === 'all')!;

      const response = await placesAPI.searchNearby({
        latitude: location.latitude,
        longitude: location.longitude,
        radius,
        type: selectedCategory.types.join(','),
      });

      if (response.success && response.data) {
        // Transform API response to our Place format
        const places: Place[] = response.data.places?.map((place: any, index: number) => ({
          id: place.id || `place_${index}`,
          name: place.name,
          location: place.location,
          types: place.types || [],
          rating: place.rating,
          priceLevel: place.priceLevel,
          vicinity: place.vicinity,
          distance: this.calculateDistance(location, place.location),
          duration: this.estimateDuration(location, place.location),
        })) || [];

        return places;
      } else {
        throw new Error(response.error?.message || 'Failed to search places');
      }
    } catch (error) {
      console.error('Error searching nearby places:', error);
      throw error;
    }
  }

  async searchPlacesAlongRoute(
    origin: LocationType,
    destination: LocationType,
    types: string[] = ['gas_station', 'restaurant']
  ): Promise<Place[]> {
    try {
      const response = await placesAPI.getAlongRoute({
        origin,
        destination,
        types: types.join(','),
      });

      if (response.success && response.data) {
        // Transform API response to our Place format
        const places: Place[] = response.data.places?.map((place: any, index: number) => ({
          id: place.id || `route_place_${index}`,
          name: place.name,
          location: place.location,
          types: place.types || [],
          rating: place.rating,
          priceLevel: place.priceLevel,
          vicinity: place.vicinity,
          distance: this.calculateDistance(origin, place.location),
          duration: this.estimateDuration(origin, place.location),
        })) || [];

        return places;
      } else {
        throw new Error(response.error?.message || 'Failed to search places along route');
      }
    } catch (error) {
      console.error('Error searching places along route:', error);
      throw error;
    }
  }

  async getPlaceDetails(placeId: string): Promise<Place | null> {
    try {
      const response = await placesAPI.getPlaceDetails(placeId);

      if (response.success && response.data) {
        return {
          id: response.data.id,
          name: response.data.name,
          location: response.data.location,
          types: response.data.types || [],
          rating: response.data.rating,
          priceLevel: response.data.priceLevel,
          vicinity: response.data.vicinity,
        };
      } else {
        throw new Error(response.error?.message || 'Failed to get place details');
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  private calculateDistance(from: LocationType, to: LocationType): number {
    // Haversine formula for calculating distance between two points
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) * Math.cos(this.toRadians(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in miles
  }

  private estimateDuration(from: LocationType, to: LocationType): number {
    const distance = this.calculateDistance(from, to);
    // Assume average speed of 60 mph for estimation
    return (distance / 60) * 60; // Duration in minutes
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get places within next X miles along current route
  async getPlacesWithinRange(
    currentLocation: LocationType,
    maxDistance: number = 50
  ): Promise<Place[]> {
    try {
      return await this.searchNearbyPlaces(currentLocation, 'all', maxDistance * 1609); // Convert miles to meters
    } catch (error) {
      console.error('Error getting places within range:', error);
      return [];
    }
  }

  // Find optimal rest stops based on multiple criteria
  async findOptimalRestStops(
    currentLocation: LocationType,
    preferences: {
      maxDistance?: number;
      categories?: string[];
      minRating?: number;
    } = {}
  ): Promise<Place[]> {
    try {
      const {
        maxDistance = 100,
        categories = ['gas_station', 'restaurant', 'rest_stop'],
        minRating = 3.0,
      } = preferences;

      const places = await this.searchNearbyPlaces(
        currentLocation,
        'all',
        maxDistance * 1609 // Convert miles to meters
      );

      // Filter and rank places based on criteria
      const filteredPlaces = places
        .filter(place => {
          // Filter by distance
          if (place.distance && place.distance > maxDistance) return false;

          // Filter by rating
          if (place.rating && place.rating < minRating) return false;

          // Filter by categories
          if (categories.length > 0) {
            const hasMatchingCategory = place.types.some(type =>
              categories.some(cat => type.includes(cat))
            );
            if (!hasMatchingCategory) return false;
          }

          return true;
        })
        .sort((a, b) => {
          // Sort by rating (highest first), then by distance (closest first)
          if (a.rating && b.rating && a.rating !== b.rating) {
            return b.rating - a.rating;
          }
          if (a.distance && b.distance) {
            return a.distance - b.distance;
          }
          return 0;
        })
        .slice(0, 10); // Return top 10 results

      return filteredPlaces;
    } catch (error) {
      console.error('Error finding optimal rest stops:', error);
      return [];
    }
  }
}

export default PlacesService;
