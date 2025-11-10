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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';
import { useTrip } from '@/stores/TripStore';

type JoinTripScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JoinTrip'>;

interface Props {
  navigation: JoinTripScreenNavigationProp;
}

const JoinTripScreen: React.FC<Props> = ({ navigation }) => {
  const [tripCode, setTripCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { joinTrip } = useTrip();

  const handleJoinTrip = async () => {
    const code = tripCode.trim().toUpperCase();

    if (!code) {
      Alert.alert('Error', 'Please enter a trip code');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'Trip code must be 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const trip = await joinTrip(code);

      Alert.alert(
        'Joined Trip!',
        `Welcome to "${trip.name}"!\n\nYou can now see all trip members on the map.`,
        [
          {
            text: 'View Trip',
            onPress: () => {
              navigation.navigate('TripMap', { tripId: trip.id });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not find a trip with that code. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric characters and convert to uppercase
    const cleaned = text.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 6) {
      setTripCode(cleaned);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join a Trip</Text>
          <Text style={styles.subtitle}>
            Enter the 6-character code shared by your trip organizer
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Trip Code</Text>
          <TextInput
            style={styles.codeInput}
            value={tripCode}
            onChangeText={handleCodeChange}
            placeholder="Q4K7M2"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          <Text style={styles.helperText}>
            Codes are 6 characters long and case-insensitive
          </Text>
        </View>

        {/* Example */}
        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>Example</Text>
          <Text style={styles.exampleText}>
            If your friend shared: "Join my trip with code Q4K7M2"
          </Text>
          <View style={styles.exampleCode}>
            <Text style={styles.exampleCodeText}>Q4K7M2</Text>
          </View>
        </View>

        {/* Join Button */}
        <TouchableOpacity
          style={[styles.joinButton, (!tripCode.trim() || isLoading) && styles.disabledButton]}
          onPress={handleJoinTrip}
          disabled={!tripCode.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.joinButtonText}>Join Trip</Text>
          )}
        </TouchableOpacity>

        {/* Back to Home */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
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
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    color: '#007AFF',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  exampleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  exampleCode: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  exampleCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 1,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default JoinTripScreen;
