import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootStackParamList } from '@/types/navigation';
import { AuthProvider } from '@/stores/AuthStore';
import { TripProvider } from '@/stores/TripStore';
import { setNavigationRef } from '@/services/api';

// Import screens
import WelcomeScreen from '@/screens/WelcomeScreen';
import LoginScreen from '@/screens/LoginScreen';
import ProfileSetupScreen from '@/screens/ProfileSetupScreen';
import HomeScreen from '@/screens/HomeScreen';
import NewTripScreen from '@/screens/NewTripScreen';
import JoinTripScreen from '@/screens/JoinTripScreen';
import TripMapScreen from '@/screens/TripMapScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TripProvider>
          <NavigationContainer
            ref={(navigator) => setNavigationRef(navigator)}
          >
            <Stack.Navigator
              initialRouteName="Welcome"
              screenOptions={{
                headerShown: false,
                gestureEnabled: false,
              }}
            >
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="NewTrip" component={NewTripScreen} />
              <Stack.Screen name="JoinTrip" component={JoinTripScreen} />
              <Stack.Screen name="TripMap" component={TripMapScreen} />
            </Stack.Navigator>
            <StatusBar style="auto" />
          </NavigationContainer>
        </TripProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
