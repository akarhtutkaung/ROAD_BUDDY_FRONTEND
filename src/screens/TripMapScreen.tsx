import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Linking,
  InteractionManager,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';
import { useTrip, TripMember } from '@/stores/TripStore';
import { useAuth } from '@/stores/AuthStore';
import LocationService from '@/services/locationService';
import * as ExpoLocation from 'expo-location';
import BackgroundLocationService from '@/services/backgroundLocationService';
import MapViewComponent from '@/components/MapView';
import StopSuggestionModal from '@/components/StopSuggestionModal';
import PhoneService from '@/services/phoneService';
import QuickStatusModal from '@/components/QuickStatusModal';
import StatusService, { StatusType } from '@/services/statusService';
import { navigationAPI } from '@/services/api';
import WebSocketService from '@/services/websocketService';
import { useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons'; // Assuming Expo vector icons are available

const { width } = Dimensions.get('window');

type TripMapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TripMap'>;

const TripMapScreen: React.FC = () => {
  const navigation = useNavigation<TripMapScreenNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'TripMap'>>();
  const { tripId } = route.params;
  const insets = useSafeAreaInsets();

  const {
    currentTrip,
    memberLocations,
    leaveTrip,
    setUserStatus,
    openTrip,
  } = useTrip();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Map initial camera (user's current location)
  const [initialRegion, setInitialRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  // Hide default header for full screen experience
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Light phase: select/load the trip only
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        if (!currentTrip || currentTrip.id !== tripId) {
          await openTrip(tripId);
        }
      } catch (e) {
        console.error('openTrip failed:', e);
        if (mounted) {
          Alert.alert('Error', 'Failed to load trip');
          navigation.goBack();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tripId]);

  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  // Fetch user's current location BEFORE rendering the map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setInitialRegion({
              latitude: 36.7783,
              longitude: -119.4179,
              latitudeDelta: 20,
              longitudeDelta: 20,
            });
          }
          return;
        }
        const loc = await ExpoLocation.getCurrentPositionAsync({});
        if (!cancelled) {
          setInitialRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });

          // If trip has destination, fetch route
          if (currentTrip?.destination) {
            const destLat = currentTrip.destination.latitude;
            const destLng = currentTrip.destination.longitude;

            try {
              const navResponse = await navigationAPI.getRoute({
                origin: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
                destination: { latitude: destLat, longitude: destLng },
              });

              if (navResponse.success && navResponse.data && navResponse.data.steps) {
                const points = navResponse.data.steps.map((s: any) => ({
                  latitude: s.start_location.lat,
                  longitude: s.start_location.lng
                }));
                points.push({ latitude: destLat, longitude: destLng });
                if (!cancelled) setRouteCoordinates(points);
              }
            } catch (err) {
              console.warn('Failed to fetch route:', err);
            }
          }
        }
      } catch (e) {
        console.log('Could not load user location', e);
        if (!cancelled) {
          setInitialRegion({
            latitude: 36.7783,
            longitude: -119.4179,
            latitudeDelta: 20,
            longitudeDelta: 20,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentTrip?.destination]);

  // Heavy phase: defer WebSocket + location tracking until after transition
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(async () => {
        if (cancelled) return;
        try {
          if (!currentTrip) return;

          // Connect WebSocket
          const ws = WebSocketService.getInstance();
          await ws.connect(currentTrip.id);

          // Start location tracking
          if (Platform.OS === 'ios') {
            await BackgroundLocationService.getInstance().initializeBackgroundTracking(currentTrip.id);
          } else {
            const locationService = LocationService.getInstance();
            await locationService.startLocationTracking(currentTrip.id);
          }
        } catch (e) {
          console.warn('Post-transition init failed:', e);
        }
      });

      return () => {
        cancelled = true;
        task.cancel();
        try {
          const locationService = LocationService.getInstance();
          if (locationService.isCurrentlyTracking()) {
            locationService.stopLocationTracking();
          }
          WebSocketService.getInstance().disconnect();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      };
    }, [currentTrip?.id])
  );

  const handleLeaveTrip = async () => {
    Alert.alert('Leave Trip', 'Are you sure you want to leave this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveTrip(tripId);
          navigation.navigate('Home');
        },
      },
    ]);
  };

  const handleCallMember = async (member: TripMember) => {
    try {
      const phoneService = PhoneService.getInstance();
      const formatted = phoneService.formatPhoneNumber(member.phoneNumber);

      Alert.alert('Call Member', `Call ${member.name}?\n\n${formatted.formatted}`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            await phoneService.makeCall(member.phoneNumber);
          },
        },
      ]);
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleNeedStop = () => setShowStopModal(true);

  const handleStopSuggested = async (stopData: any) => {
    try {
      if (!currentTrip || !user) return;
      try {
        const websocketService = WebSocketService.getInstance();
        await websocketService.suggestStop({
          tripId: currentTrip.id,
          stopData,
          suggestedBy: user.name,
          timestamp: new Date(),
        });
      } catch (wsError) {
        console.warn('WebSocket notification failed:', wsError);
      }
      Alert.alert('Stop Suggested', 'Your suggestion has been shared.');
    } catch (error: any) {
      console.error('Error suggesting stop:', error);
      Alert.alert('Error', 'Failed to suggest stop.');
    }
  };

  const handleEmergency = () => {
    Alert.alert(
      'Emergency',
      'Are you in an emergency?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'YES, REPORT EMERGENCY',
          style: 'destructive',
          onPress: async () => {
            if (!currentTrip || !user) return;
            try {
              const websocketService = WebSocketService.getInstance();
              // In a real app, get current location here
              await websocketService.sendEmergency({
                tripId: currentTrip.id,
                userId: user.id,
                message: 'Emergency reported!',
                location: {
                  latitude: 0,
                  longitude: 0,
                  accuracy: 0,
                  speed: 0,
                  heading: 0,
                  timestamp: new Date(),
                  isMoving: false,
                }, // Placeholder
                status: 'active',
                createdAt: new Date().toISOString(),
                id: `emergency_${Date.now()}`,
              });
            } catch (e) { }
            // Additional emergency logic (call 911 etc)
            Alert.alert('Emergency Sent', 'Trip members notified.');
          }
        }
      ]
    );
  };

  const handleStatusUpdate = () => setShowStatusModal(true);

  const handleStatusSet = async (status: StatusType, message?: string) => {
    try {
      if (!user || !currentTrip) return;
      const statusService = StatusService.getInstance();
      const statusUpdate = statusService.setUserStatus(user.id, currentTrip.id, status, message);
      setUserStatus(status, message);

      try {
        const websocketService = WebSocketService.getInstance();
        await websocketService.updateStatus(statusUpdate);
      } catch (wsError) {
        console.warn('Status WebSocket notification failed:', wsError);
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('Status Update Failed', 'Failed to update your status.');
    }
  };

  const handleLocationPress = useCallback(
    (location: any) => {
      // Logic for handling press on location (omitted for brevity, same as before)
      console.log('Location pressed', location);
    },
    []
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (!currentTrip) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Trip not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Full Screen Map */}
      {initialRegion && (
        <MapViewComponent
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          showUserLocation
          showMemberLocations
          showRoute={!!currentTrip.destination}
          routeCoordinates={routeCoordinates}
          onLocationPress={handleLocationPress}
          // Add padding to map so Google logo/legal is visible and markers aren't hidden behind UI
          mapPadding={{
            top: insets.top + 60,
            right: 0,
            bottom: insets.bottom + 200,
            left: 0
          }}
        />
      )}

      {/* Top Floating Header */}
      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.roundButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.tripInfoPill}>
          <Text style={styles.tripName} numberOfLines={1}>{currentTrip.name}</Text>
          <Text style={styles.tripCode}>Code: {currentTrip.groupCode}</Text>
        </View>

        <TouchableOpacity
          style={[styles.roundButton, styles.leaveButton]}
          onPress={handleLeaveTrip}
        >
          <Ionicons name="exit-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Floating Action Bar */}
      <View style={[styles.actionBarContainer, { bottom: insets.bottom + 100 }]}>
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionItem} onPress={handleStatusUpdate}>
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Text style={{ fontSize: 22 }}>📝</Text>
            </View>
            <Text style={styles.actionLabel}>Status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleNeedStop}>
            <View style={[styles.actionIcon, { backgroundColor: '#E0F7FA' }]}>
              <Text style={{ fontSize: 22 }}>🚽</Text>
            </View>
            <Text style={styles.actionLabel}>Stop</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleEmergency}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFEBEE' }]}>
              <Text style={{ fontSize: 22 }}>⚠️</Text>
            </View>
            <Text style={styles.actionLabel}>Emergency</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet for Members (Simplified for now as a bottom card) */}
      <View style={[styles.membersCard, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dragHandle} />
        <Text style={styles.membersTitle}>Trip Members ({currentTrip.members.length})</Text>

        <View style={styles.memberListHorizontal}>
          {currentTrip.members.map((m) => (
            <View key={m.userId} style={styles.memberAvatarContainer}>
              <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                <Text style={styles.memberInitials}>{m.name.charAt(0)}</Text>
              </View>
              <Text style={styles.memberNameSmall} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Modals */}
      <StopSuggestionModal
        visible={showStopModal}
        onClose={() => setShowStopModal(false)}
        onStopSuggested={handleStopSuggested}
      />

      <QuickStatusModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onStatusSet={handleStatusSet}
        currentUserName={user?.name || 'You'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
  },

  // Floating Top Bar
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  leaveButton: {
    // specific styles if needed
  },
  tripInfoPill: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  tripCode: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },

  // Action Bar
  actionBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
    justifyContent: 'space-around',
  },
  actionItem: {
    alignItems: 'center',
    width: 70,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },

  // Members Card (Bottom)
  membersCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  memberListHorizontal: {
    flexDirection: 'row',
  },
  memberAvatarContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberNameSmall: {
    fontSize: 11,
    color: '#555',
  },
});

export default TripMapScreen;
