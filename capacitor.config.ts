import { existsSync } from 'node:fs';
import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Two ways to build the Android app:
 *
 * - Server mode (CAPACITOR_SERVER_URL set): the APK opens the real Next.js server over HTTPS.
 * - Demo mode (no URL): the APK bundles the offline demo from demo/dist (`npm run demo:build`).
 *   Everything runs on the device with simulated data: no server, no database, no internet.
 */
const capacitorServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const DEMO_WEB_DIR = 'demo/dist';

const baseConfig: CapacitorConfig = {
  appId: 'com.ecoverify.app',
  appName: 'EcoVerify',
  webDir: 'public',
  // Brand colour behind the WebView: no white flash between the native splash and the web splash.
  backgroundColor: '#278c98',
};

function serverConfig(url: string): CapacitorConfig {
  if (new URL(url).protocol !== 'https:') {
    throw new Error('CAPACITOR_SERVER_URL must use HTTPS');
  }
  return {
    ...baseConfig,
    server: {
      androidScheme: 'https',
      url,
      cleartext: false,
    },
  };
}

function demoConfig(): CapacitorConfig {
  if (!existsSync(`${DEMO_WEB_DIR}/index.html`)) {
    throw new Error(
      'CAPACITOR_SERVER_URL is not set, so the offline demo is bundled, but demo/dist is missing. ' +
        'Run "npm run demo:build" before "npx cap sync android" (or set CAPACITOR_SERVER_URL to build the server app).',
    );
  }
  return {
    ...baseConfig,
    webDir: DEMO_WEB_DIR,
    server: {
      // Serves the bundled files from https://localhost (secure context: camera, GPS and crypto work).
      androidScheme: 'https',
    },
  };
}

const config: CapacitorConfig = capacitorServerUrl ? serverConfig(capacitorServerUrl) : demoConfig();

export default config;
