import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spendtrack.app',
  appName: 'SpendTrack',
  webDir: 'dist',
  server: {
    url: 'https://spendtrack-m-1106.web.app',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['*']
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#6366F1"
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
      webClientId: '9705130213-7md8p9sa6bu4ba4mnhp0eeha8pd5oco2.apps.googleusercontent.com',
    } as any,
  },
};

export default config;
