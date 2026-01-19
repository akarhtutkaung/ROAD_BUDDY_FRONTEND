// import React, { useState, useEffect, useRef } from 'react';
// import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
// import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
// import { useTrip } from '@/stores/TripStore';
// import { useAuth } from '@/stores/AuthStore';
// import { Location as LocationType } from '@/stores/TripStore';
// import PhoneService from '@/services/phoneService';

// interface MapViewProps {
//   style?: any;
//   showUserLocation?: boolean;
//   showMemberLocations?: boolean;
//   showRoute?: boolean;
//   onLocationPress?: (location: LocationType) => void;
// }

// const MapViewComponent: React.FC<MapViewProps> = ({
//   style,
//   showUserLocation = true,
//   showMemberLocations = true,
//   showRoute = false,
//   onLocationPress,
// }) => {
//   const { currentTrip, memberLocations } = useTrip();
//   const { user } = useAuth();
//   const mapRef = useRef<MapView>(null);
//   const [isMapReady, setIsMapReady] = useState(false);
//   const [userLocation, setUserLocation] = useState<LocationType | null>(null);

//   useEffect(() => {
//     // Get user's current location for initial map position
//     const getInitialLocation = async () => {
//       try {
//         // This would typically use the LocationService
//         // For now, we'll use a default location
//         setUserLocation({
//           latitude: 40.7128,
//           longitude: -74.0060,
//           accuracy: 10,
//           speed: 0,
//           heading: 0,
//           timestamp: new Date(),
//           isMoving: false,
//         });
//       } catch (error) {
//         console.error('Error getting initial location:', error);
//       }
//     };

//     getInitialLocation();
//   }, []);

//   const handleMapReady = () => {
//     setIsMapReady(true);
//   };

//   const handleMarkerPress = async (memberId: string) => {
//     const member = currentTrip?.members.find(m => m.userId === memberId);
//     if (!member) return;

//     // Call the member
//     try {
//       const phoneService = PhoneService.getInstance();
//       const formatted = phoneService.formatPhoneNumber(member.phoneNumber);

//       Alert.alert(
//         'Call Member',
//         `Call ${member.name}?\n\n${formatted.formatted}`,
//         [
//           {
//             text: 'Cancel',
//             style: 'cancel',
//           },
//           {
//             text: 'Call',
//             onPress: async () => {
//               const success = await phoneService.makeCall(member.phoneNumber);
//               if (success) {
//                 console.log(`Calling ${member.name} at ${member.phoneNumber}`);
//               }
//             },
//           },
//         ]
//       );
//     } catch (error) {
//       console.error('Error calling member from map:', error);
//       Alert.alert('Error', 'Unable to make phone call');
//     }
//   };

//   const getMemberColor = (memberId: string): string => {
//     const member = currentTrip?.members.find(m => m.userId === memberId);
//     return member?.color || '#FF0000';
//   };

//   const renderMemberMarkers = () => {
//     if (!currentTrip || !showMemberLocations) return null;

//     return currentTrip.members.map(member => {
//       const location = memberLocations[member.userId];
//       if (!location) return null;

//       const isCurrentUser = member.userId === user?.id;

//       return (
//         <Marker
//           key={member.userId}
//           coordinate={{
//             latitude: location.latitude,
//             longitude: location.longitude,
//           }}
//           title={member.name}
//           description={
//             member.carInfo
//               ? `${member.carInfo.color} ${member.carInfo.make} ${member.carInfo.model}`
//               : 'Tap to call'
//           }
//           onPress={() => handleMarkerPress(member.userId)}
//           pinColor={isCurrentUser ? 'blue' : undefined}
//         >
//           <View style={[styles.markerContainer, { backgroundColor: getMemberColor(member.userId) }]}>
//             <Text style={styles.markerText}>
//               {isCurrentUser ? 'You' : member.name.charAt(0).toUpperCase()}
//             </Text>
//           </View>
//         </Marker>
//       );
//     });
//   };

//   const renderRoute = () => {
//     if (!showRoute || !currentTrip?.destination) return null;

//     // Mock route - in real implementation, this would come from Google Directions API
//     const mockRoute = [
//       { latitude: userLocation?.latitude || 40.7128, longitude: userLocation?.longitude || -74.0060 },
//       { latitude: currentTrip.destination.latitude, longitude: currentTrip.destination.longitude },
//     ];

//     return (
//       <Polyline
//         coordinates={mockRoute}
//         strokeColor="#007AFF"
//         strokeWidth={3}
//         lineDashPattern={[10, 5]}
//       />
//     );
//   };

//   if (!userLocation) {
//     return (
//       <View style={[styles.container, style]}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </View>
//     );
//   }

//   return (
//     <View style={[styles.container, style]}>
//       <MapView
//         ref={mapRef}
//         style={styles.map}
//         provider={PROVIDER_GOOGLE}
//         initialRegion={{
//           latitude: userLocation.latitude,
//           longitude: userLocation.longitude,
//           latitudeDelta: 0.0922,
//           longitudeDelta: 0.0421,
//         }}
//         showsUserLocation={showUserLocation}
//         showsMyLocationButton={true}
//         showsCompass={true}
//         onMapReady={handleMapReady}
//       >
//         {isMapReady && (
//           <>
//             {renderMemberMarkers()}
//             {renderRoute()}
//           </>
//         )}
//       </MapView>

//       {/* Map overlay for trip destination */}
//       {currentTrip?.destination && (
//         <View style={styles.destinationOverlay}>
//           <Text style={styles.destinationText}>
//             📍 {currentTrip.destination.name || 'Destination'}
//           </Text>
//         </View>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f0f8ff',
//   },
//   map: {
//     flex: 1,
//   },
//   markerContainer: {
//     width: 30,
//     height: 30,
//     borderRadius: 15,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   markerText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   destinationOverlay: {
//     position: 'absolute',
//     top: 16,
//     left: 16,
//     right: 16,
//     backgroundColor: 'rgba(255, 255, 255, 0.95)',
//     borderRadius: 8,
//     padding: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   destinationText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//   },
// });

// export default MapViewComponent;

// src/components/MapView.tsx
// src/components/MapView.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type MapViewProps as RNMapViewProps,
  type Region,
} from 'react-native-maps';
import * as ExpoLocation from 'expo-location';
import { useTrip } from '@/stores/TripStore';
import { useAuth } from '@/stores/AuthStore';
import { Location as LocationType } from '@/stores/TripStore';
import PhoneService from '@/services/phoneService';

type Props = RNMapViewProps & {
  showUserLocation?: boolean;
  showMemberLocations?: boolean;
  showRoute?: boolean;
  onLocationPress?: (location: LocationType) => void;
  initialRegion?: Region;
  routeCoordinates?: { latitude: number; longitude: number }[];
};

const isFiniteNumber = (v: number | undefined | null) =>
  typeof v === 'number' && Number.isFinite(v);

const isValidLatLng = (lat?: number, lng?: number) =>
  isFiniteNumber(lat) && isFiniteNumber(lng) &&
  (lat as number) >= -90 && (lat as number) <= 90 &&
  (lng as number) >= -180 && (lng as number) <= 180;

const MapViewComponent: React.FC<Props> = ({
  style,
  showUserLocation = true,
  showMemberLocations = true,
  showRoute = false,
  onLocationPress,
  initialRegion,
  routeCoordinates,
  ...rest
}) => {
  const { currentTrip, memberLocations } = useTrip();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // graceful fallback
          const fallback = initialRegion ?? {
            latitude: 37.7749,
            longitude: -122.4194,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          };
          if (!cancelled) {
            setUserLocation({
              latitude: fallback.latitude,
              longitude: fallback.longitude,
              accuracy: 10,
              speed: 0,
              heading: 0,
              timestamp: new Date(),
              isMoving: false,
            });
          }
          return;
        }
        const pos = await ExpoLocation.getCurrentPositionAsync({});
        if (!cancelled) {
          const { latitude, longitude, accuracy, speed, heading } = pos.coords;
          // validate before storing
          const lat = isFiniteNumber(latitude) ? latitude! : 37.7749;
          const lng = isFiniteNumber(longitude) ? longitude! : -122.4194;
          setUserLocation({
            latitude: lat,
            longitude: lng,
            accuracy: accuracy ?? 0,
            speed: speed ?? 0,
            heading: heading ?? 0,
            timestamp: new Date(pos.timestamp),
            isMoving: (speed ?? 0) > 1,
          });
        }
      } catch {
        const fallback = initialRegion ?? {
          latitude: 37.7749,
          longitude: -122.4194,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        if (!cancelled) {
          setUserLocation({
            latitude: fallback.latitude,
            longitude: fallback.longitude,
            accuracy: 10,
            speed: 0,
            heading: 0,
            timestamp: new Date(),
            isMoving: false,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [initialRegion]);

  const handleMapReady = () => setIsMapReady(true);

  const handleMarkerPress = async (memberId: string) => {
    const member = currentTrip?.members.find(m => m.userId === memberId);
    if (!member) return;
    try {
      const phoneService = PhoneService.getInstance();
      const formatted = phoneService.formatPhoneNumber(member.phoneNumber);
      Alert.alert(
        'Call Member',
        `Call ${member.name}?\n\n${formatted.formatted}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: async () => {
              const ok = await phoneService.makeCall(member.phoneNumber);
              if (ok) console.log(`Calling ${member.name} at ${member.phoneNumber}`);
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const getMemberColor = (memberId: string): string =>
    currentTrip?.members.find(m => m.userId === memberId)?.color || '#FF0000';

  // FILTER invalid member coordinates
  const memberMarkers = useMemo(() => {
    if (!currentTrip || !showMemberLocations) return null;

    return currentTrip.members.map(member => {
      const loc = memberLocations[member.userId];
      if (!loc || !isValidLatLng(loc.latitude, loc.longitude)) return null;

      const isCurrentUser = member.userId === user?.id;

      return (
        <Marker
          key={member.userId}
          coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
          title={member.name}
          description={
            member.carInfo
              ? `${member.carInfo.color} ${member.carInfo.make} ${member.carInfo.model}`
              : 'Tap to call'
          }
          onPress={() => handleMarkerPress(member.userId)}
          // reduce re-renders during camera animations
          tracksViewChanges={false}
        // optional: disable default pin press camera behavior
        // moveOnPress={false}
        >
          <View style={[styles.markerContainer, { backgroundColor: getMemberColor(member.userId) }]}>
            <Text style={styles.markerText}>
              {isCurrentUser ? 'You' : member.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </Marker>
      );
    });
  }, [currentTrip?.members, memberLocations, user?.id, showMemberLocations]);

  const routePolyline = useMemo(() => {
    if (!showRoute || !currentTrip?.destination) return null;

    // Use provided route coordinates if available
    if (routeCoordinates && routeCoordinates.length > 0) {
      return (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#007AFF"
          strokeWidth={4}
          zIndex={10}
        />
      );
    }

    const fromLat = userLocation?.latitude;
    const fromLng = userLocation?.longitude;
    const toLat = currentTrip.destination.latitude;
    const toLng = currentTrip.destination.longitude;

    if (!isValidLatLng(fromLat, fromLng) || !isValidLatLng(toLat, toLng)) return null;

    const dash = Platform.OS === 'android' ? undefined : [10, 5]; // avoid Android dashed crash
    return (
      <Polyline
        coordinates={[{ latitude: fromLat!, longitude: fromLng! }, { latitude: toLat, longitude: toLng }]}
        strokeColor="#007AFF"
        strokeWidth={3}
        lineDashPattern={dash}
      />
    );
  }, [showRoute, currentTrip?.destination, userLocation, routeCoordinates]);

  if (!userLocation) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const safeInitialRegion: Region = initialRegion ?? {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // clamp initial region just in case
  if (!isValidLatLng(safeInitialRegion.latitude, safeInitialRegion.longitude)) {
    safeInitialRegion.latitude = 37.7749;
    safeInitialRegion.longitude = -122.4194;
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={safeInitialRegion}
        showsUserLocation={!!showUserLocation}
        showsMyLocationButton
        showsCompass
        onMapReady={handleMapReady}
        // Avoid extreme zoom-outs that sometimes trigger platform bugs (Android only)
        {...(Platform.OS === 'android' ? { minZoomLevel: 3 } : {})}
        {...rest}
      >
        {isMapReady && (
          <>
            {memberMarkers}
            {routePolyline}
          </>
        )}
      </MapView>

      {currentTrip?.destination && (
        <View style={styles.destinationOverlay}>
          <Text style={styles.destinationText}>
            📍 {currentTrip.destination.name || 'Destination'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f8ff' },
  map: { flex: 1 },
  markerContainer: {
    width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25,
    shadowRadius: 3.84, elevation: 5,
  },
  markerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  destinationOverlay: {
    position: 'absolute', top: 16, left: 16, right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  destinationText: { fontSize: 14, fontWeight: '600', color: '#333' },
});

export default MapViewComponent;
