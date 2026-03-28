declare module '@env' {
  // Supabase
  export const SUPABASE_URL: string
  export const SUPABASE_ANON_KEY: string

  // Giphy
  export const GIPHY_API_KEY: string

  // Firebase
  export const FIREBASE_API_KEY: string
  export const FIREBASE_AUTH_DOMAIN: string
  export const FIREBASE_PROJECT_ID: string
  export const FIREBASE_MESSAGING_SENDER_ID: string
  export const FIREBASE_APP_ID: string

  // WebRTC
  export const STUN_SERVER: string
  export const TURN_SERVER: string
  export const TURN_USERNAME: string
  export const TURN_PASSWORD: string

  // Storage
  export const SUPABASE_STORAGE_BUCKET: string

  // App settings
  export const DEFAULT_THEME: string
  export const MAX_MESSAGE_LENGTH: string
  export const MAX_UPLOAD_MB: string
  export const ENCRYPTION_ENABLED: string

  // TalkJS
  export const TALKJS_APP_ID: string
}