import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.yourdomain.angryojisan',
  appName: 'Angry Ojisan',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
}

export default config