import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/config/environment';

// Navigation service for programmatic navigation
let navigationRef: any = null;

export const setNavigationRef = (ref: any) => {
  navigationRef = ref;
};

export const navigateToLogin = () => {
  if (navigationRef) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }
};

// API Configuration
const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token && token !== 'null' && token !== 'undefined') {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error getting token:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data || {};

          if (accessToken && newRefreshToken) {
            // Store new tokens
            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', newRefreshToken);

            // Retry original request with new token
            error.config.headers.Authorization = `Bearer ${accessToken}`;
            return axios(error.config);
          } else {
            throw new Error('Invalid refresh token response');
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        navigateToLogin();
      }
    }
    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
}

// Authentication API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    name: string;
    phoneNumber: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  profilePicture?: string;
  carInfo?: {
    color?: string;
    make?: string;
    model?: string;
    licensePlate?: string;
  };
  settings: {
    notificationsEnabled: boolean;
    voiceGuidance: boolean;
    units: 'metric' | 'imperial';
  };
  createdAt: string;
  lastActive: string;
  auth0Id?: string; // For backward compatibility
}

// Trip API
export interface CreateTripRequest {
  name: string;
  destination?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
}

export interface JoinTripRequest {
  groupCode: string;
}

export interface Trip {
  id: string;
  groupCode: string;
  name: string;
  adminId: string;
  destination?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  members: Array<{
    userId: string;
    name: string;
    phoneNumber: string;
    color: string;
    carInfo?: any;
    role: 'admin' | 'member';
    isActive: boolean;
    joinedAt?: Date;
  }>;
  currentStop?: any;
  status: 'active' | 'completed';
  createdAt: string;
  expiresAt: string;
}

// Location API
export interface UpdateLocationRequest {
  tripId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  battery?: number;
}

export interface LocationData {
  id: string;
  userId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  battery?: number;
  timestamp: string;
  isMoving: boolean;
}

// Emergency API
export interface EmergencyAlertRequest {
  tripId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  message?: string;
}

// Places API
export interface NearbyPlacesRequest {
  latitude: number;
  longitude: number;
  radius?: number;
  type?: string;
}

// API Functions
export const authAPI = {
  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<ApiResponse<any>> => {
    const response = await api.post('/auth/register', data);
    console.log('Register response:', response.data);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  googleLogin: async (token: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/google', { token });
    return response.data;
  },

  appleLogin: async (token: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/apple', { token });
    return response.data;
  },
};

export const userAPI = {
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.patch('/users/me', data);
    return response.data;
  },

  updateCarInfo: async (carInfo: {
    color?: string;
    make?: string;
    model?: string;
    licensePlate?: string;
  }): Promise<ApiResponse<User>> => {
    const response = await api.patch('/users/me/car-info', carInfo);
    return response.data;
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/users/me/stats');
    return response.data;
  },
};

export const tripAPI = {
  createTrip: async (data: CreateTripRequest): Promise<ApiResponse<Trip>> => {
    const response = await api.post('/trips', data);
    return response.data;
  },

  joinTrip: async (data: JoinTripRequest): Promise<ApiResponse<Trip>> => {
    const response = await api.post('/trips/join', data);
    return response.data;
  },

  getUserTrips: async (): Promise<ApiResponse<Trip[]>> => {
    const response = await api.get('/trips');
    return response.data;
  },

  getTripDetails: async (tripId: string): Promise<ApiResponse<Trip>> => {
    const response = await api.get(`/trips/${tripId}`);
    return response.data;
  },

  updateTrip: async (tripId: string, data: Partial<CreateTripRequest>): Promise<ApiResponse<Trip>> => {
    const response = await api.patch(`/trips/${tripId}`, data);
    return response.data;
  },

  leaveTrip: async (tripId: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/trips/${tripId}/leave`);
    return response.data;
  },

  removeMember: async (tripId: string, memberId: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/trips/${tripId}/members/${memberId}`);
    return response.data;
  },

  endTrip: async (tripId: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/trips/${tripId}/end`);
    return response.data;
  },
};

export const locationAPI = {
  updateLocation: async (data: UpdateLocationRequest): Promise<ApiResponse<LocationData>> => {
    const response = await api.post('/locations/update', data);
    return response.data;
  },

  getTripLocations: async (tripId: string, params?: { limit?: number; since?: string }): Promise<ApiResponse<LocationData[]>> => {
    const response = await api.get(`/locations/trip/${tripId}`, { params });
    return response.data;
  },

  getUserLocations: async (userId: string, tripId: string, params?: { limit?: number }): Promise<ApiResponse<LocationData[]>> => {
    const response = await api.get(`/locations/user/${userId}/trip/${tripId}`, { params });
    return response.data;
  },

  getLatestLocation: async (userId: string, tripId: string): Promise<ApiResponse<LocationData>> => {
    const response = await api.get(`/locations/user/${userId}/trip/${tripId}/latest`);
    return response.data;
  },
};

export const emergencyAPI = {
  sendAlert: async (data: EmergencyAlertRequest): Promise<ApiResponse<any>> => {
    const response = await api.post('/emergency/alert', data);
    return response.data;
  },

  getTripEmergencies: async (tripId: string, params?: { status?: string }): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/emergency/trip/${tripId}`, { params });
    return response.data;
  },

  resolveEmergency: async (emergencyId: string): Promise<ApiResponse<any>> => {
    const response = await api.patch(`/emergency/${emergencyId}/resolve`);
    return response.data;
  },

  getActiveEmergencies: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/emergency/active');
    return response.data;
  },

  getEmergencyDetails: async (emergencyId: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/emergency/${emergencyId}`);
    return response.data;
  },
};

export const navigationAPI = {
  getRoute: async (data: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    waypoints?: Array<{ latitude: number; longitude: number; name?: string }>;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/navigation/route', data);
    return response.data;
  },

  getTraffic: async (params: { latitude: number; longitude: number; radius?: number }): Promise<ApiResponse<any>> => {
    const response = await api.get('/navigation/traffic', { params });
    return response.data;
  },

  getAlternatives: async (data: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/navigation/alternatives', data);
    return response.data;
  },
};

export const placesAPI = {
  searchNearby: async (params: {
    latitude: number;
    longitude: number;
    radius?: number;
    type?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/places/nearby', { params });
    return response.data;
  },

  searchByText: async (params: {
    query: string;
    latitude?: number;
    longitude?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/places/search', { params });
    return response.data;
  },

  getPlaceDetails: async (placeId: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/places/${placeId}`);
    return response.data;
  },

  getAlongRoute: async (data: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    types?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/places/along-route', data);
    return response.data;
  },
};

export const stopsAPI = {
  suggestStop: async (tripId: string, data: { place: { name: string; location: any }; urgency?: string }): Promise<ApiResponse<any>> => {
    const response = await api.post(`/trips/${tripId}/stops/suggest`, data);
    return response.data;
  },

  voteStop: async (tripId: string, data: { stopId: string; vote: 'yes' | 'no' }): Promise<ApiResponse<any>> => {
    const response = await api.post(`/trips/${tripId}/stops/vote`, data);
    return response.data;
  },

  markReady: async (tripId: string, data: { stopId: string }): Promise<ApiResponse<any>> => {
    const response = await api.post(`/trips/${tripId}/stops/ready`, data);
    return response.data;
  },
};

export default api;
