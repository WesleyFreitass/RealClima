import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.realclima.app',
  appName: 'RealClima',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.36:5173',
    cleartext: true
  }
};

export default config;
