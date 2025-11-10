import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';
import { useTrip, TripMember } from '@/stores/TripStore';
import { useAuth } from '@/stores/AuthStore';
import LocationService from '@/services/locationService';
import BackgroundLocationService from '@/services/backgroundLocationService';
import MapViewComponent from '@/components/MapView';
import StopSuggestionModal from '@/components/StopSuggestionModal';
import PhoneService from '@/services/phoneService';
import EmergencyModal from '@/components/EmergencyModal';
import QuickStatusModal from '@/components/QuickStatusModal';
import StatusService, { StatusType } from '@/services/statusService';
import { tripAPI, emergencyAPI } from '@/services/api';
import WebSocketService from '@/services/websocketService';
import BackButton from '../components/Buttons/BackButton';
import { useLayoutEffect } from 'react';

const { width, height } = Dimensions.get('window');

type TripMapScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TripMap'>;

const TripMapScreen: React.FC = () => {
  const navigation = useNavigation<TripMapScreenNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'TripMap'>>();
  const { tripId } = route.params;
  const { currentTrip, memberLocations, leaveTrip, setUserStatus, getUserStatus, openTrip } = useTrip();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <BackButton fallbackRoute="Home" />,
      headerTitle: '',    
      headerShown: true,
    });
  }, [navigation]);

  useEffect(() => {
    const initializeTrip = async () => {
      try {
        setIsLoading(true);

        // Load trip data from API if not already loaded
        if (!currentTrip || currentTrip.id !== tripId) {
          try {
            openTrip(tripId).catch(err => {
              console.error('Error', err?.message ?? 'Failed to load trip');
              navigation.goBack();
            });
            const response = await tripAPI.getUserTrips();
            if (response.success && response.data) {
              // Find the specific trip by ID
              const trip = response.data.find(t => t.id === tripId);
              if (trip) {
                console.log('Trip loaded from API:', trip.name);
              } else {
                throw new Error('Trip not found');
              }
            } else {
              throw new Error('Trip not found');
            }
          } catch (apiError) {
            console.error('Failed to load trip from API:', apiError);
            Alert.alert('Error', 'Failed to load trip data from server');
            return;
          }
        }

        // Initialize WebSocket connection for real-time updates
        if (currentTrip) {
          try {
            const websocketService = WebSocketService.getInstance();
            await websocketService.connect(currentTrip.id);
            console.log('WebSocket connected for trip:', currentTrip.id);
          } catch (wsError) {
            console.warn('Failed to connect WebSocket:', wsError);
            // Continue without WebSocket - location tracking will still work
          }
        }

        // Start location tracking with enhanced error handling
        if (currentTrip) {
          const startLocationTracking = async () => {
            try {
              // Try background location service first (more accurate)
              if (Platform.OS === 'ios') {
                const backgroundLocationService = BackgroundLocationService.getInstance();
                await backgroundLocationService.initializeBackgroundTracking(currentTrip.id);
                console.log('Background location tracking started for trip:', currentTrip.id);
                return;
              }

              // Fallback to foreground location service
              const locationService = LocationService.getInstance();
              await locationService.startLocationTracking(currentTrip.id);
              console.log('Foreground location tracking started for trip:', currentTrip.id);

            } catch (locationError: any) {
              console.warn('Location tracking failed:', locationError);

              // Show user-friendly error message
              if (locationError?.message?.includes('permission')) {
                Alert.alert(
                  'Location Permission Required',
                  'Please enable location permissions in settings to share your location with trip members.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: openLocationSettings }
                  ]
                );
              } else {
                Alert.alert(
                  'Location Error',
                  'Unable to start location tracking. Some features may not work properly.',
                  [{ text: 'OK' }]
                );
              }
            }
          };

          await startLocationTracking();
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing trip:', error);
        Alert.alert('Error', 'Failed to initialize trip. Please try again.');
        setIsLoading(false);
      }
    };

    initializeTrip();

    // Enhanced cleanup when leaving screen
    return () => {
      try {
        // Stop location tracking
        const locationService = LocationService.getInstance();
        if (locationService.isCurrentlyTracking()) {
          locationService.stopLocationTracking();
        }

        // Disconnect WebSocket
        const websocketService = WebSocketService.getInstance();
        websocketService.disconnect();

      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [tripId, currentTrip]);

  const handleLeaveTrip = async () => {
    Alert.alert(
      'Leave Trip',
      'Are you sure you want to leave this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await leaveTrip(tripId);
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  const handleCallMember = async (member: TripMember) => {
    try {
      const phoneService = PhoneService.getInstance();
      const formatted = phoneService.formatPhoneNumber(member.phoneNumber);

      Alert.alert(
        'Call Member',
        `Call ${member.name}?\n\n${formatted.formatted}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Call',
            onPress: async () => {
              const success = await phoneService.makeCall(member.phoneNumber);
              if (success) {
                console.log(`Calling ${member.name} at ${member.phoneNumber}`);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error initiating call:', error);
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleNeedStop = () => {
    setShowStopModal(true);
  };

  const handleStopSuggested = async (stopData: any) => {
    try {
      if (!currentTrip || !user) return;

      // Send stop suggestion to server (using generic API call for now)
      // In a real implementation, this would use a specific stop suggestion endpoint
      console.log('Stop suggestion sent to server:', {
        tripId: currentTrip.id,
        stopData,
        suggestedBy: user.name,
      });

      // Notify other members via WebSocket
      try {
        const websocketService = WebSocketService.getInstance();
        await websocketService.suggestStop({
          tripId: currentTrip.id,
          stopData,
          suggestedBy: user.name,
          timestamp: new Date(),
        });
        console.log('Stop suggestion sent via WebSocket');
      } catch (wsError) {
        console.warn('WebSocket notification failed:', wsError);
      }

      Alert.alert(
        'Stop Suggested',
        `Your stop suggestion has been shared with ${currentTrip.members.length - 1} trip members.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error suggesting stop:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to suggest stop. Please try again.'
      );
    }
  };

  const handleEmergency = () => {
    setShowEmergencyModal(true);
  };

  const handleEmergencySent = async (emergency: any) => {
    try {
      if (!currentTrip || !user) return;

      // Send emergency to server
      const response = await emergencyAPI.sendAlert({
        tripId: currentTrip.id,
        message: emergency.message || 'Emergency reported',
        location: emergency.location,
      });

      if (response.success) {
        // Notify all trip members via WebSocket
        try {
          const websocketService = WebSocketService.getInstance();
          await websocketService.sendEmergency({
            tripId: currentTrip.id,
            userId: user.id,
            message: emergency.message || 'Emergency reported',
            location: emergency.location,
            status: 'active',
            createdAt: new Date().toISOString(),
            id: `emergency_${Date.now()}`, // Generate unique ID
          });
          console.log('Emergency notification sent to all members');
        } catch (wsError) {
          console.warn('Emergency WebSocket notification failed:', wsError);
        }

        Alert.alert(
          'Emergency Sent',
          'Emergency reported successfully. All trip members have been notified.',
          [
            { text: 'Call Emergency Services', onPress: async () => {
              try {
                const phoneService = PhoneService.getInstance();
                const emergencyNumber = Platform.OS === 'ios' ? '911' : '911'; // US emergency number
                const success = await phoneService.makeCall(emergencyNumber);
                if (success) {
                  console.log('Calling emergency services');
                } else {
                  // Fallback: try to open phone app with emergency number
                  const url = `tel:${emergencyNumber}`;
                  const supported = await Linking.canOpenURL(url);
                  if (supported) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert(
                      'Emergency',
                      'Please call emergency services directly at 911',
                      [{ text: 'OK' }]
                    );
                  }
                }
              } catch (error) {
                console.error('Error calling emergency services:', error);
                Alert.alert(
                  'Emergency',
                  'Unable to call emergency services. Please dial 911 directly.',
                  [{ text: 'OK' }]
                );
              }
            }},
            { text: 'OK' }
          ]
        );
      } else {
        throw new Error(response.error?.message || 'Failed to report emergency');
      }
    } catch (error: any) {
      console.error('Error sending emergency:', error);
      Alert.alert(
        'Emergency Failed',
        'Failed to send emergency report. Please try again or call emergency services directly.'
      );
    }
  };

  const handleStatusUpdate = () => {
    setShowStatusModal(true);
  };

  const handleStatusSet = async (status: StatusType, message?: string) => {
    try {
      if (!user || !currentTrip) return;

      // Update user status using the status service
      const statusService = StatusService.getInstance();
      const statusUpdate = statusService.setUserStatus(user.id, currentTrip.id, status, message);

      // Update the trip store with the new status
      setUserStatus(status, message);

      // Notify other members via WebSocket with enhanced notification
      try {
        const websocketService = WebSocketService.getInstance();
        await websocketService.updateStatus(statusUpdate);
        console.log('Status update notification sent to members');
      } catch (wsError) {
        console.warn('Status WebSocket notification failed:', wsError);
      }

      // Show success feedback
      Alert.alert(
        'Status Updated',
        `Your status has been updated to: ${status}${message ? ` - ${message}` : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert(
        'Status Update Failed',
        'Failed to update your status. Please try again.'
      );
    }
  };

  const handleLocationPress = useCallback((location: any) => {
    try {
      // Find which member this location belongs to
      const memberId = Object.keys(memberLocations).find(
        id => JSON.stringify(memberLocations[id]) === JSON.stringify(location)
      );

      if (memberId) {
        const member = currentTrip?.members.find(m => m.userId === memberId);
        if (member) {
          Alert.alert(
            `${member.name}'s Location`,
            `Speed: ${location.speed > 0 ? Math.round(location.speed) + ' mph' : 'Stopped'}\n` +
            `Status: ${location.isMoving ? 'Moving' : 'Stopped'}\n` +
            `Last Updated: ${new Date(location.timestamp).toLocaleTimeString()}`,
            [
              { text: 'Center Map', onPress: () => {
                // TODO: Center map on this location
                console.log('Center map on member location:', location);
              }},
              { text: 'Call Member', onPress: () => {
                handleCallMember(member);
              }},
              { text: 'Close' }
            ]
          );
        }
      } else {
        // Location pressed but no matching member found
        Alert.alert(
          'Location Info',
          `Coordinates: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}\n` +
          `Speed: ${location.speed > 0 ? Math.round(location.speed) + ' mph' : 'Stopped'}`,
          [{ text: 'Center Map', onPress: () => {
            console.log('Center map on location:', location);
          }}]
        );
      }
    } catch (error) {
      console.error('Error handling location press:', error);
    }
  }, [memberLocations, currentTrip]);

  const openLocationSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert(
        'Settings',
        'Unable to open device settings. Please enable location permissions manually.'
      );
    }
  };

  const renderMemberCard = (member: TripMember) => {
    const location = memberLocations[member.userId];
    const isCurrentUser = member.userId === user?.id;

    return (
      <TouchableOpacity
        key={member.userId}
        style={[
          styles.memberCard,
          isCurrentUser && styles.currentUserCard,
        ]}
        onPress={() => !isCurrentUser && handleCallMember(member)}
      >
        <View style={styles.memberHeader}>
          <View style={styles.memberInfo}>
            <View style={[styles.memberDot, { backgroundColor: member.color }]} />
            <View>
              <Text style={styles.memberName}>
                {member.name} {isCurrentUser && '(You)'}
              </Text>
              <Text style={styles.memberCar}>
                {member.carInfo ? `${member.carInfo.color} ${member.carInfo.make} ${member.carInfo.model}` : 'No vehicle info'}
              </Text>
            </View>
          </View>
          {!isCurrentUser && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallMember(member)}
            >
              <Text style={styles.callButtonText}>📞</Text>
            </TouchableOpacity>
          )}
        </View>

        {location && (
          <View style={styles.memberStatus}>
            <Text style={styles.memberSpeed}>
              {location.speed > 0 ? `${Math.round(location.speed)} mph` : 'Stopped'}
            </Text>
            <Text style={styles.memberDistance}>
              {location.isMoving ? 'Moving' : 'Stopped'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </SafeAreaView>
    );
  }

  if (!currentTrip) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Trip not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.tripName}>{currentTrip.name}</Text>
          <Text style={styles.tripInfo}>
            {currentTrip.members.length} members • Code: {currentTrip.groupCode}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLeaveTrip} style={styles.leaveButton}>
          <Text style={styles.leaveButtonText}>Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Google Maps Integration */}
      <MapViewComponent
        style={styles.mapContainer}
        showUserLocation={true}
        showMemberLocations={true}
        showRoute={!!currentTrip.destination}
        onLocationPress={handleLocationPress}
      />

      {/* Member Cards */}
      <View style={styles.memberCards}>
        {currentTrip.members.map(renderMemberCard)}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleStatusUpdate}>
          <Text style={styles.actionButtonEmoji}>📝</Text>
          <Text style={styles.actionButtonText}>Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleNeedStop}>
          <Text style={styles.actionButtonEmoji}>🚽</Text>
          <Text style={styles.actionButtonText}>Need Stop</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleEmergency}>
          <Text style={styles.actionButtonEmoji}>⚠️</Text>
          <Text style={styles.actionButtonText}>Emergency</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Area */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />
        <Text style={styles.bottomSheetTitle}>Trip Members</Text>
        <Text style={styles.bottomSheetSubtitle}>
          Swipe up for more options
        </Text>
      </View>

      {/* Stop Suggestion Modal */}
      <StopSuggestionModal
        visible={showStopModal}
        onClose={() => setShowStopModal(false)}
        onStopSuggested={handleStopSuggested}
      />

      {/* Emergency Modal */}
      {/* <EmergencyModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onEmergencySent={handleEmergencySent}
      /> */}

      {/* Status Modal */}
      <QuickStatusModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onStatusSet={handleStatusSet}
        currentUserName={user?.name || 'You'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tripName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tripInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  leaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  leaveButtonText: {
    color: '#666',
    fontSize: 14,
  },
  mapContainer: {
    flex: 1,
  },
  memberCards: {
    position: 'absolute',
    right: 16,
    top: 100,
    width: 200,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserCard: {
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberCar: {
    fontSize: 12,
    color: '#666',
  },
  callButton: {
    padding: 4,
  },
  callButtonText: {
    fontSize: 16,
  },
  memberStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberSpeed: {
    fontSize: 12,
    color: '#666',
  },
  memberDistance: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bottomSheetSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default TripMapScreen;
