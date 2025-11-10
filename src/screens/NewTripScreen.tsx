import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';
import { useTrip } from '@/stores/TripStore';
import PlacesService from '@/services/placesService';
import * as Clipboard from 'expo-clipboard';

type NewTripScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NewTrip'>;

const NewTripScreen: React.FC = () => {
  const navigation = useNavigation<NewTripScreenNavigationProp>();
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const { createTrip } = useTrip();
  const placesService = PlacesService.getInstance();

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleCreateTrip = async () => {
    if (!tripName.trim()) {
      Alert.alert('Error', 'Please enter a trip name');
      return;
    }

    setIsLoading(true);
    try {
      let destinationData;
      if (destination.trim()) {
        setIsSearchingLocation(true);
        try {
          // Use Google Places API to find the destination coordinates
          // For now, we'll use a mock implementation since we don't have a current location
          // In a real implementation, you would use the user's current location as the origin
          const mockCurrentLocation = {
            latitude: 40.7128, // NYC as mock current location
            longitude: -74.0060,
            accuracy: 10,
            speed: 0,
            heading: 0,
            timestamp: new Date(),
            isMoving: false,
          };

          // Search for places matching the destination
          const places = await placesService.searchNearbyPlaces(
            mockCurrentLocation,
            'all',
            50000 // 50km radius
          );

          // Find the best match for the destination
          const destinationMatch = places.find(place =>
            place.name.toLowerCase().includes(destination.toLowerCase()) ||
            destination.toLowerCase().includes(place.name.toLowerCase())
          );

          if (destinationMatch) {
            destinationData = {
              name: destinationMatch.name,
              latitude: destinationMatch.location.latitude,
              longitude: destinationMatch.location.longitude,
            };
          } else {
            // If no match found, create destination with mock coordinates
            // In a real implementation, you might want to use Google Geocoding API
            destinationData = {
              name: destination.trim(),
              latitude: 36.1699, // Grand Canyon coordinates as example
              longitude: -112.1393,
            };
          }
        } catch (error) {
          console.error('Error searching for destination:', error);
          // Fallback to mock coordinates if Places API fails
          destinationData = {
            name: destination.trim(),
            latitude: 36.1699, // Grand Canyon coordinates as example
            longitude: -112.1393,
          };
        } finally {
          setIsSearchingLocation(false);
        }
      }

      const newTrip = await createTrip(tripName.trim(), destinationData);

      Alert.alert(
        'Trip Created!',
        `Your trip code is: ${newTrip.groupCode}\n\nShare this code with your friends so they can join.`,
        [
          {
            text: 'Copy Code',
            onPress: async () => {
              try {
                await Clipboard.setStringAsync(newTrip.groupCode);
                Alert.alert('Copied!', 'Trip code copied to clipboard');
                navigation.navigate('TripMap', { tripId: newTrip.id });
              } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                Alert.alert('Error', 'Failed to copy code to clipboard');
              }
            },
          },
          {
            text: 'Start Trip',
            onPress: () => {
              navigation.navigate('TripMap', { tripId: newTrip.id });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create New Trip</Text>
          <Text style={styles.subtitle}>
            Set up your trip and get a code to share with friends
          </Text>
        </View>

        {/* Trip Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Trip Name</Text>
            <TextInput
              style={styles.input}
              value={tripName}
              onChangeText={setTripName}
              placeholder="e.g., Road Trip to Grand Canyon"
              autoCapitalize="words"
            />
            <Text style={styles.helperText}>
              Give your trip a memorable name
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Destination (Optional)</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g., Grand Canyon, AZ"
              autoCapitalize="words"
            />
            <Text style={styles.helperText}>
              Set a destination to get turn-by-turn navigation
            </Text>
          </View>

          {/* Trip Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Trip Preview</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Trip Name:</Text>
              <Text style={styles.previewValue}>
                {tripName || 'Untitled Trip'}
              </Text>
            </View>
            {destination ? (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Destination:</Text>
                <Text style={styles.previewValue}>{destination}</Text>
              </View>
            ) : null}
            <Text style={styles.previewNote}>
              A unique 6-character code will be generated for your trip
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.createButton, (!tripName.trim() || isLoading) && styles.disabledButton]}
            onPress={handleCreateTrip}
            disabled={!tripName.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Trip</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  previewNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewTripScreen;
