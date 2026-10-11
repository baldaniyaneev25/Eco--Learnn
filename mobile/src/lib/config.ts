import Constants from 'expo-constants';

/**
 * Base URL of the EcoLearn web backend.
 *
 * - Set EXPO_PUBLIC_API_URL in mobile/.env (e.g. https://ecolearn.example.com) for real builds.
 * - In development, when it is not set, the app uses the same computer that runs
 *   `npx expo start` (port 3000), so a phone on the same Wi-Fi can reach `npm run dev`.
 */
function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081"
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();
