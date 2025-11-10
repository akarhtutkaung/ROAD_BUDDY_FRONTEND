import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthStore';
import { tripAPI, locationAPI, emergencyAPI, placesAPI, Trip as ApiTrip, CreateTripRequest, JoinTripRequest } from '@/services/api';
import LocationService from '@/services/locationService';
import StatusService, { StatusType } from '@/services/statusService';
import WebSocketService from '@/services/websocketService';

export interface TripMember {
  userId: string;
  name: string;
  phoneNumber: string;
  color: string;
  carInfo?: {
    color?: string;
    make?: string;
    model?: string;
    licensePlate?: string;
  };
  joinedAt?: Date;
  role: 'admin' | 'member';
  isActive: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: Date;
  battery?: number;
  isMoving: boolean;
}

export interface TripStop {
  stopId: string;
  placeName: string;
  location: { latitude: number; longitude: number };
  votes: { userId: string; vote: 'yes' | 'no' }[];
  arrivals: { userId: string; arrivedAt: Date }[];
  ready: { userId: string; readyAt: Date }[];
  status: 'suggested' | 'agreed' | 'active' | 'completed';
}

export interface Trip {
  id: string;
  groupCode: string;
  name: string;
  adminId: string;
  destination?: {
    name?: string;
    latitude: number;
    longitude: number;
  };
  members: TripMember[];
  currentStop?: TripStop;
  status: 'active' | 'completed';
  createdAt: string;
  expiresAt: string;
}

interface TripState {
  currentTrip: Trip | null;
  memberLocations: { [userId: string]: Location };
  isLoading: boolean;
  error: string | null;
}

type TripAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TRIP'; payload: Trip | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_MEMBER_LOCATION'; payload: { userId: string; location: Location } }
  | { type: 'ADD_MEMBER'; payload: TripMember }
  | { type: 'REMOVE_MEMBER'; payload: string }
  | { type: 'UPDATE_TRIP_STOP'; payload: TripStop | undefined };

interface TripContextType extends TripState {
  createTrip: (name: string, destination?: { name: string; latitude: number; longitude: number }) => Promise<Trip>;
  joinTrip: (tripCode: string) => Promise<Trip>;
  leaveTrip: (tripId: string) => Promise<void>;
  updateLocation: (location: Location) => void;
  suggestStop: (stop: Omit<TripStop, 'stopId' | 'votes' | 'arrivals' | 'ready'>) => void;
  voteOnStop: (stopId: string, vote: 'yes' | 'no') => void;
  markArrived: (stopId: string) => void;
  markReady: (stopId: string) => void;
  setUserStatus: (status: StatusType, message?: string) => void;
  getUserStatus: (userId: string) => any;
  openTrip: (tripId: string) => Promise<Trip>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

const tripReducer = (state: TripState, action: TripAction): TripState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_TRIP':
      return { ...state, currentTrip: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'UPDATE_MEMBER_LOCATION':
      return {
        ...state,
        memberLocations: {
          ...state.memberLocations,
          [action.payload.userId]: action.payload.location,
        },
      };
    case 'ADD_MEMBER':
      if (!state.currentTrip) return state;
      return {
        ...state,
        currentTrip: {
          ...state.currentTrip,
          members: [...state.currentTrip.members, action.payload],
        },
      };
    case 'REMOVE_MEMBER':
      if (!state.currentTrip) return state;
      return {
        ...state,
        currentTrip: {
          ...state.currentTrip,
          members: state.currentTrip.members.filter(m => m.userId !== action.payload),
        },
      };
    case 'UPDATE_TRIP_STOP':
      if (!state.currentTrip) return state;
      return {
        ...state,
        currentTrip: {
          ...state.currentTrip,
          currentStop: action.payload,
        },
      };
    default:
      return state;
  }
};

const initialState: TripState = {
  currentTrip: null,
  memberLocations: {},
  isLoading: false,
  error: null,
};

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tripReducer, initialState);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Load user's current trip from storage or API
      loadCurrentTrip();
    } else {
      dispatch({ type: 'SET_TRIP', payload: null });
    }
  }, [user]);

  const loadCurrentTrip = async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Try to load current trip from API
      const response = await tripAPI.getUserTrips();

      if (response.success && response.data && response.data.length > 0) {
        // Load the first active trip as current trip
        const activeTrip = response.data.find(trip => trip.status === 'active');
        if (activeTrip) {
          dispatch({ type: 'SET_TRIP', payload: activeTrip });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        // No active trips found
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error: any) {
      console.error('Error loading trip:', error);
      // Don't set error state for 401 errors (user not authenticated for trips)
      if (error.response?.status !== 401) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load trip' });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const createTrip = async (name: string, destination?: { name: string; latitude: number; longitude: number }): Promise<Trip> => {
    if (!user) throw new Error('User not authenticated');

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await tripAPI.createTrip({
        name,
        destination,
      });

      if (response.success && response.data) {
        dispatch({ type: 'SET_TRIP', payload: response.data });
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to create trip');
      }
    } catch (error: any) {
      console.error('Error creating trip:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to create trip' });
      throw error;
    }
  };

  const joinTrip = async (tripCode: string): Promise<Trip> => {
    if (!user) throw new Error('User not authenticated');

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await tripAPI.joinTrip({ groupCode: tripCode });

      if (response.success && response.data) {
        dispatch({ type: 'SET_TRIP', payload: response.data });
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to join trip');
      }
    } catch (error: any) {
      console.error('Error joining trip:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to join trip' });
      throw error;
    }
  };

  const leaveTrip = async (tripId: string): Promise<void> => {
    try {
      const response = await tripAPI.leaveTrip(tripId);
      if (response?.success) {
        dispatch({ type: 'SET_TRIP', payload: null });
        return;
      } else {
        throw new Error(response.error?.message || 'Failed to leave trip');
      }
    } catch (error: any) {
      console.error('Error leaving trip:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to leave trip' });
      throw error;
    }
  };

  const updateLocation = async (location: Location) => {
    if (!user || !state.currentTrip) return;

    try {
      // Send location to API
      await locationAPI.updateLocation({
        tripId: state.currentTrip.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        battery: location.battery,
      });

      // Update local state
      dispatch({ type: 'UPDATE_MEMBER_LOCATION', payload: { userId: user.id, location } });
    } catch (error) {
      console.error('Error updating location:', error);
      // Still update local state even if API call fails
      dispatch({ type: 'UPDATE_MEMBER_LOCATION', payload: { userId: user.id, location } });
    }
  };

  const suggestStop = async (stop: Omit<TripStop, 'stopId' | 'votes' | 'arrivals' | 'ready'>) => {
    if (!state.currentTrip || !user) return;

    try {
      // TODO: Send stop suggestion to server via API
      // For now, update local state
      const newStop: TripStop = {
        ...stop,
        stopId: `stop_${Date.now()}`,
        votes: [],
        arrivals: [],
        ready: [],
      };

      dispatch({ type: 'UPDATE_TRIP_STOP', payload: newStop });
      console.log('Stop suggested:', newStop);
    } catch (error) {
      console.error('Error suggesting stop:', error);
    }
  };

  const voteOnStop = (stopId: string, vote: 'yes' | 'no') => {
    if (!user || !state.currentTrip) return;

    // TODO: Send vote to server
    console.log(`Voting ${vote} on stop ${stopId}`);
  };

  const markArrived = (stopId: string) => {
    if (!user || !state.currentTrip) return;

    // TODO: Send arrival to server
    console.log(`Marked arrived at stop ${stopId}`);
  };

  const markReady = (stopId: string) => {
    if (!user || !state.currentTrip) return;

    // TODO: Send ready status to server
    console.log(`Marked ready at stop ${stopId}`);
  };

  const setUserStatus = (status: StatusType, message?: string) => {
    if (!user || !state.currentTrip) return;

    try {
      const statusService = StatusService.getInstance();
      const statusUpdate = statusService.setUserStatus(user.id, state.currentTrip.id, status, message);
      console.log('User status set:', statusUpdate);
    } catch (error) {
      console.error('Error setting user status:', error);
    }
  };

  const getUserStatus = (userId: string) => {
    try {
      const statusService = StatusService.getInstance();
      return statusService.getUserStatus(userId);
    } catch (error) {
      console.error('Error getting user status:', error);
      return null;
    }
  };

  // Try to set a specific trip as current by id
  const openTrip = async (tripId: string): Promise<Trip> => {
    if (!user) throw new Error('User not authenticated');
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // If you have a dedicated endpoint, prefer it:
      // const resp = await tripAPI.getTripById(tripId);

      // Otherwise re-use getUserTrips and pick the one we want:
      const resp = await tripAPI.getUserTrips();
      if (resp?.success && Array.isArray(resp.data)) {
        const trip = resp.data.find((t: Trip) => t.id === tripId);
        if (!trip) throw new Error('Trip not found or you are not a member');

        dispatch({ type: 'SET_TRIP', payload: trip });
        return trip;
      }
      throw new Error(resp?.error?.message || 'Failed to load trips');
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to open trip' });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };


  const value: TripContextType = {
    ...state,
    createTrip,
    joinTrip,
    leaveTrip,
    updateLocation,
    suggestStop,
    voteOnStop,
    markArrived,
    markReady,
    setUserStatus,
    getUserStatus,
    openTrip,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};

export const useTrip = () => {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};
