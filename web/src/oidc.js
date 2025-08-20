import { UserManager, WebStorageStateStore, Log } from 'oidc-client-ts'

const KC_URL = import.meta.env.VITE_KC_URL || 'http://localhost:8080'
const REALM = import.meta.env.VITE_KC_REALM || 'universal'
const CLIENT_ID = import.meta.env.VITE_KC_CLIENT_ID || 'web'
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/callback'
const POST_LOGOUT_REDIRECT_URI = import.meta.env.VITE_POST_LOGOUT_REDIRECT_URI || 'http://localhost:5173/'

Log.setLogger(console)
Log.setLevel(Log.NONE)

export const userManager = new UserManager({
  authority: `${KC_URL}/realms/${REALM}`,
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  post_logout_redirect_uri: POST_LOGOUT_REDIRECT_URI,
  response_type: 'code',
  scope: 'openid profile email',
  prompt: 'consent',
  loadUserInfo: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage })
})
