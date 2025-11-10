// This file is deprecated - using custom authentication instead of Auth0
// All authentication is now handled through our custom backend API

// Legacy social login functions (kept for reference but not used)
export const auth0Login = async () => {
  throw new Error('Auth0 login is deprecated. Use custom authentication instead.');
};

export const googleLogin = async () => {
  throw new Error('Google OAuth is deprecated. Use custom authentication instead.');
};

export const appleLogin = async () => {
  throw new Error('Apple Sign In is deprecated. Use custom authentication instead.');
};

// Helper function to decode JWT token (kept for potential future use)
const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

export { decodeJWT };
