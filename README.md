# Road Buddy Frontend

A React Native mobile application for road trip tracking and coordination.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (macOS) or Android Emulator/Device

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   ```

   Edit `.env` with your actual configuration:
   ```env
   API_BASE_URL=http://your-backend-url:3001/api
   WEBSOCKET_URL=http://your-backend-url:3001
   AUTH0_DOMAIN=your-auth0-domain.auth0.com
   AUTH0_CLIENT_ID=your-auth0-client-id
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/emulator:**
   - **iOS:** `npm run ios`
   - **Android:** `npm run android`
   - **Web:** `npm run web`

## 📱 Features

- **Real-time Location Tracking** - Track trip members' locations in real-time
- **Trip Management** - Create and join trips with unique codes
- **Navigation Integration** - Turn-by-turn directions with Google Maps
- **Emergency Alerts** - Send emergency notifications to trip members
- **Stop Coordination** - Suggest and vote on rest stops
- **Click-to-Call** - One-tap calling to trip members
- **Background Location** - Continue tracking when app is closed

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── ProfileSetupScreen.tsx
│   ├── HomeScreen.tsx
│   ├── NewTripScreen.tsx
│   ├── JoinTripScreen.tsx
│   └── TripMapScreen.tsx
├── stores/             # State management (Zustand)
│   ├── AuthStore.tsx
│   └── TripStore.tsx
├── services/           # API and external services
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── navigation.ts
└── config/             # Configuration
    └── environment.ts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | Backend API base URL | Yes |
| `WEBSOCKET_URL` | WebSocket server URL | Yes |
| `AUTH0_DOMAIN` | Auth0 domain for authentication | Yes |
| `AUTH0_CLIENT_ID` | Auth0 client ID | Yes |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | Yes |

### App Configuration (app.json)

The `app.json` file contains Expo configuration including permissions, build settings, and extra configuration that gets passed to the app.

## 🔐 Authentication

The app uses Auth0 for authentication with support for:
- Email/Password login
- Google Sign-In
- Apple Sign-In

## 🌐 API Integration

The app integrates with the Road Buddy backend API for:
- User management
- Trip coordination
- Location tracking
- Emergency alerts
- Navigation services

## 📍 Location Services

The app uses Expo Location for:
- Foreground location tracking
- Background location tracking
- Geofencing for stop detection
- Location accuracy optimization

## 🗺️ Google Maps Integration

Google Maps is integrated for:
- Map display
- Turn-by-turn navigation
- Places search
- Traffic information

## 🚨 Permissions

The app requires the following permissions:
- **Location** (foreground and background)
- **Camera** (for profile pictures)
- **Photo Library** (for profile pictures)
- **Microphone** (for voice messages)
- **Phone** (for click-to-call functionality)
- **Notifications** (for alerts and updates)

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

## 📦 Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## 🔄 Development Workflow

1. **Start backend server** on port 3001
2. **Configure environment variables** in `.env`
3. **Start Expo development server** with `npm start`
4. **Test on device/emulator** using Expo Go app or simulators

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler not starting:**
   ```bash
   npx expo start --clear
   ```

2. **Environment variables not loading:**
   - Restart Metro bundler after updating `.env`
   - Check that `.env` is in project root

3. **API connection issues:**
   - Verify backend server is running
   - Check `API_BASE_URL` in `.env`
   - Ensure backend allows CORS from Expo

## 📚 Documentation

- [API Documentation](../../ROAD_BUDDY_BACKEND/API_DOCUMENTATION.md)
- [Backend Setup](../../ROAD_BUDDY_BACKEND/README.md)
- [Expo Documentation](https://docs.expo.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
