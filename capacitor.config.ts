import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spendtrack.app',
  appName: 'SpendTrack',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
      webClientId: '9705130213-7md8p9sa6bu4ba4mnhp0eeha8pd5oco2.apps.googleusercontent.com',
    },
  },
};

export default config;
