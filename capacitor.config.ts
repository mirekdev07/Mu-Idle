import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.muidle.adventure',
  appName: 'MU Idle Adventure',
  webDir: 'out',
  server: {
    url: 'https://mu-idle-nextjs.vercel.app',
    cleartext: true
  },
  android: {
    // Fullscreen mode - hide status bar and navigation bar
    backgroundColor: '#111827',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#111827',
    },
  },
};

export default config;
