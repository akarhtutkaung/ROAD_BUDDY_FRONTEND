/**
 * Auth0 Setup Guide for Road Buddy App
 *
 * To complete the social login implementation, you need to:
 *
 * 1. Set up Auth0 Account:
 *    - Go to https://auth0.com and create an account
 *    - Create a new application (Single Page Application)
 *    - Configure the following settings in your Auth0 dashboard:
 *
 * 2. Auth0 Configuration:
 *    - Domain: your-tenant.auth0.com (replace 'your-tenant' with your actual tenant name)
 *    - Client ID: Get this from your Auth0 application settings
 *
 * 3. Google OAuth Setup:
 *    - Go to Google Cloud Console (https://console.cloud.google.com)
 *    - Create a new project or select existing one
 *    - Enable Google+ API
 *    - Go to "Credentials" and create "OAuth 2.0 Client IDs"
 *    - Set application type to "Web application"
 *    - Add authorized redirect URIs:
 *      - For iOS: com.roadbuddy://auth/google/callback
 *      - For Android: com.roadbuddy://auth/google/callback
 *    - Copy the Client ID to auth0.ts
 *
 * 4. Apple OAuth Setup (iOS only):
 *    - Go to Apple Developer Console
 *    - Create an App ID with "Sign In with Apple" capability
 *    - Create a Services ID for "Sign In with Apple"
 *    - Configure the Services ID with your domain and return URLs
 *    - Copy the Services ID to auth0.ts as clientId
 *
 * 5. Update auth0.ts with your credentials:
 *    - Replace 'YOUR_AUTH0_DOMAIN' with your actual Auth0 domain
 *    - Replace 'YOUR_AUTH0_CLIENT_ID' with your Auth0 client ID
 *    - Replace 'YOUR_GOOGLE_CLIENT_ID' with your Google OAuth client ID
 *    - Replace 'com.roadbuddy.service' with your Apple Services ID
 *
 * 6. iOS/Android Configuration:
 *    - For iOS: Add URL schemes in Info.plist
 *    - For Android: Add intent filters in AndroidManifest.xml
 *    - Update redirect URLs in auth0.ts to match your app's URL scheme
 *
 * 7. Environment Variables (optional):
 *    You can also set these as environment variables:
 *    - AUTH0_DOMAIN=your-tenant.auth0.com
 *    - AUTH0_CLIENT_ID=your-client-id
 *    - GOOGLE_CLIENT_ID=your-google-client-id
 *    - APPLE_SERVICE_ID=your-apple-service-id
 */

export const AUTH_SETUP_INSTRUCTIONS = `
🚀 Auth0 Social Login Setup Complete!

The social login implementation is ready. To activate it:

1. 📝 Update the credentials in src/config/auth0.ts
2. 🔧 Configure OAuth providers (Google, Apple) in their respective consoles
3. 🔗 Set up URL schemes in your native app configurations
4. ✅ Test the login flow

The implementation includes:
- ✅ Real OAuth authentication using react-native-app-auth
- ✅ JWT token decoding for user information
- ✅ Proper error handling and user feedback
- ✅ Loading states and disabled states during authentication
- ✅ Integration with existing AuthStore methods

For production use, make sure to:
- Secure your OAuth credentials
- Implement proper token refresh logic
- Add rate limiting and security measures
- Test thoroughly on both iOS and Android
`;
