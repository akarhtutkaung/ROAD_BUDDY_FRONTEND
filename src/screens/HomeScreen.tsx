import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';
import { useAuth } from '@/stores/AuthStore';
import { useTrip, Trip } from '@/stores/TripStore';
import { tripAPI } from '@/services/api';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

// ...imports unchanged

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, logout } = useAuth();
  const { currentTrip, createTrip, joinTrip, openTrip } = useTrip();
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleCreateTrip = () => navigation.navigate('NewTrip');
  const handleJoinTrip   = () => navigation.navigate('JoinTrip');
  // const handleViewTrip   = (trip: Trip) => navigation.navigate('TripMap', { tripId: trip.id });

  const handleViewTrip = async (trip: Trip) => {
    try {
      await openTrip(trip.id);      // set the selected trip as current
      navigation.navigate('TripMap', { tripId: trip.id });
    } catch (e) {
      console.error('Open trip failed', (e as any)?.message ?? 'Please try again');
    }
  };

  const handleLogout = async () => {
    try { await logout(); navigation.navigate('Login'); } catch (e) { console.error(e); }
  };

  const loadActiveTrips = async () => {
    if (!user) return;
    setTripsError(null);
    try {
      const resp = await tripAPI.getUserTrips();

      if (resp?.success && Array.isArray(resp.data)) {
        const userId = user.id; // your app uses string member IDs now
        const visible = resp.data.filter(t =>
          t.status === 'active' && t.members?.some(m => m.userId === userId && m.isActive)
        );
        setActiveTrips(visible);
      } else {
        setTripsError('Failed to load active trips');
      }
    } catch (e) {
      console.error('Error loading active trips:', e);
      setTripsError('Failed to load active trips');
    }
  };


  useEffect(() => {
    setIsLoadingTrips(true);
    loadActiveTrips().finally(() => setIsLoadingTrips(false));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadActiveTrips();
    }, [user?.id]) // re-run if the signed-in user changes
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveTrips();
    setRefreshing(false);
  };

  const renderActiveTripItem = ({ item }: { item: Trip }) => (
    <TouchableOpacity style={styles.currentTripCard} onPress={() => handleViewTrip(item)}>
      <View style={styles.tripHeader}>
        <Text style={styles.currentTripName}>{item.name}</Text>
        <View style={styles.tripStatus}>
          <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>
      <Text style={styles.tripCode}>Code: {item.groupCode}</Text>
      <Text style={styles.tripMembers}>{item.members.filter(m => m.isActive).length} members</Text>
      <Text style={styles.viewTripText}>Tap to view trip →</Text>
    </TouchableOpacity>
  );

  const StartNewTripHeader = (
    <>
      {/* Header (greeting / logout) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}!</Text>
          <Text style={styles.subtitle}>Ready for your next adventure?</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Buttons live in the list header so they scroll too */}
      <View style={styles.noTripSection}>
        <Text style={styles.sectionTitle}>Start a New Trip</Text>

        <TouchableOpacity style={styles.primaryActionButton} onPress={handleCreateTrip}>
          <Text style={styles.primaryActionIcon}>🚗</Text>
          <View style={styles.actionContent}>
            <Text style={styles.primaryActionTitle}>Create New Trip</Text>
            <Text style={styles.primaryActionSubtitle}>
              Set up a trip and share the code with friends
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryActionButton} onPress={handleJoinTrip}>
          <Text style={styles.secondaryActionIcon}>👥</Text>
          <View style={styles.actionContent}>
            <Text style={styles.secondaryActionTitle}>Join Existing Trip</Text>
            <Text style={styles.secondaryActionSubtitle}>
              Enter a trip code to join your friends
            </Text>
          </View>
        </TouchableOpacity>

        {/* Active Trips section title only if there are trips */}
        {activeTrips.length > 0 && (
          <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
            <Text style={styles.sectionTitle}>Active Trips</Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={activeTrips}
        renderItem={renderActiveTripItem}
        keyExtractor={(item) => item.id}

        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}

        ListHeaderComponent={
          <>
            {/* Header (greeting / logout) */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Hello, {user?.name}!</Text>
                <Text style={styles.subtitle}>Ready for your next adventure?</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* Start section */}
            <View style={{ paddingTop: 24 }}>
              <Text style={styles.sectionTitle}>Start a New Trip</Text>

              <TouchableOpacity style={styles.primaryActionButton} onPress={handleCreateTrip}>
                <Text style={styles.primaryActionIcon}>🚗</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.primaryActionTitle}>Create New Trip</Text>
                  <Text style={styles.primaryActionSubtitle}>
                    Set up a trip and share the code with friends
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryActionButton} onPress={handleJoinTrip}>
                <Text style={styles.secondaryActionIcon}>👥</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.secondaryActionTitle}>Join Existing Trip</Text>
                  <Text style={styles.secondaryActionSubtitle}>
                    Enter a trip code to join your friends
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Active Trips title if there are items */}
              {activeTrips.length > 0 && (
                <View style={{ paddingTop: 24 }}>
                  <Text style={styles.sectionTitle}>Active Trips</Text>
                </View>
              )}
            </View>
          </>
        }

        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}

        ListFooterComponent={<View style={{ height: 8 }} />}

        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
      
      {/* Recent Trips Section */}
      {/* <View style={styles.recentTripsSection}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>

        {isLoadingTrips ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading trips...</Text>
          </View>
        ) : tripsError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{tripsError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setIsLoadingTrips(true);
                setTripsError(null);
                // Reload trips logic would go here
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={recentTrips}
            renderItem={renderTripItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No recent trips</Text>
                <Text style={styles.emptyStateSubtext}>
                  Your trip history will appear here
                </Text>
              </View>
            }
          />
        )}
      </View> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logoutText: {
    color: '#666',
    fontSize: 14,
  },
  currentTripSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  currentTripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentTripName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tripStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  tripCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tripMembers: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  viewTripText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  noTripSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  primaryActionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryActionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  secondaryActionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryActionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  secondaryActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  secondaryActionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  recentTripsSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  tripItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;
