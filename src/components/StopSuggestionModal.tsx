import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTrip } from '@/stores/TripStore';
import { useAuth } from '@/stores/AuthStore';
import PlacesService, { Place, PlaceCategory } from '@/services/placesService';
import LocationService from '@/services/locationService';

interface StopSuggestionModalProps {
  visible: boolean;
  onClose: () => void;
  onStopSuggested?: (stop: any) => void;
}

const StopSuggestionModal: React.FC<StopSuggestionModalProps> = ({
  visible,
  onClose,
  onStopSuggested,
}) => {
  const { currentTrip, suggestStop } = useTrip();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const placesService = PlacesService.getInstance();
  const categories = placesService.getStopCategories();

  useEffect(() => {
    if (visible && currentTrip) {
      loadNearbyPlaces();
    }
  }, [visible, selectedCategory, currentTrip]);

  const loadNearbyPlaces = async () => {
    if (!currentTrip) return;

    setIsLoading(true);
    try {
      const locationService = LocationService.getInstance();
      const currentLocation = await locationService.getCurrentLocation();

      if (currentLocation) {
        const nearbyPlaces = await placesService.searchNearbyPlaces(
          currentLocation,
          selectedCategory,
          50000 // 50km radius
        );
        setPlaces(nearbyPlaces);
      } else {
        Alert.alert('Error', 'Unable to get current location');
      }
    } catch (error) {
      console.error('Error loading nearby places:', error);
      Alert.alert('Error', 'Failed to load nearby places');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestStop = (place: Place) => {
    if (!currentTrip || !user) return;

    const stopData = {
      placeName: place.name,
      location: place.location,
      suggestedBy: user.id,
      category: selectedCategory,
      placeId: place.id,
    };

    // Add to local state
    suggestStop({
      placeName: place.name,
      location: place.location,
      status: 'suggested',
    });

    // Call parent callback
    if (onStopSuggested) {
      onStopSuggested(stopData);
    }

    Alert.alert(
      'Stop Suggested!',
      `"${place.name}" has been suggested to the group. Waiting for votes...`,
      [
        {
          text: 'OK',
          onPress: onClose,
        },
      ]
    );
  };

  const renderCategoryButton = (category: PlaceCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryButton,
        selectedCategory === category.id && styles.categoryButtonActive,
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text
        style={[
          styles.categoryText,
          selectedCategory === category.id && styles.categoryTextActive,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPlaceItem = ({ item: place }: { item: Place }) => (
    <TouchableOpacity
      style={styles.placeItem}
      onPress={() => handleSuggestStop(place)}
    >
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{place.name}</Text>
        {place.vicinity ? (
          <Text style={styles.placeVicinity}>{place.vicinity}</Text>
        ) : null}
        <View style={styles.placeDetails}>
          {typeof place.distance === 'number' ? (
            <Text style={styles.placeDistance}>
              📍 {place.distance.toFixed(1)} mi
            </Text>
          ) : null}
          {typeof place.rating === 'number' ? (
            <Text style={styles.placeRating}>
              ⭐ {place.rating.toFixed(1)}
            </Text>
          ) : null}
          {typeof place.duration === 'number' ? (
            <Text style={styles.placeDuration}>
              🚗 {Math.round(place.duration)} min
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={styles.suggestButton}
        onPress={() => handleSuggestStop(place)}
      >
        <Text style={styles.suggestButtonText}>Suggest</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Suggest a Stop</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Category Selection */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={categories}
            renderItem={({ item }) => renderCategoryButton(item)}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search for places..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Places List */}
        <View style={styles.placesContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Finding nearby places...</Text>
            </View>
          ) : (
            <FlatList
              data={places.filter(place =>
                place.name.toLowerCase().includes(searchText.toLowerCase())
              )}
              renderItem={renderPlaceItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No places found</Text>
                  <Text style={styles.emptySubtext}>
                    Try selecting a different category or adjusting your search
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  placesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  placeVicinity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  placeDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  placeDistance: {
    fontSize: 12,
    color: '#007AFF',
  },
  placeRating: {
    fontSize: 12,
    color: '#ff9500',
  },
  placeDuration: {
    fontSize: 12,
    color: '#666',
  },
  suggestButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  suggestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default StopSuggestionModal;
