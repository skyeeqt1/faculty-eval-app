import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.facultyeval.app',
  appName: 'faculty-eval-ui',
  webDir: 'out', // <--- MAKE SURE THIS SAYS 'out'
  bundledWebRuntime: false
};

export default config;