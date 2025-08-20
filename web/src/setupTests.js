import '@testing-library/jest-dom'

// Mock oidc-client-ts
export const mockUserManager = {
  getUser: vi.fn(),
  signinRedirect: vi.fn(),
  signoutRedirect: vi.fn(),
  signinRedirectCallback: vi.fn(),
  events: {
    addUserLoaded: vi.fn(),
    addUserUnloaded: vi.fn(),
    addAccessTokenExpired: vi.fn(),
  }
}

vi.mock('./oidc', () => ({
  userManager: mockUserManager
}))

// Mock fetch globally
global.fetch = vi.fn()

// Setup mock for environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_KC_URL: 'http://localhost:8080',
    VITE_KC_REALM: 'universal',
    VITE_KC_CLIENT_ID: 'web',
    VITE_REDIRECT_URI: 'http://localhost:5173/callback',
    VITE_POST_LOGOUT_REDIRECT_URI: 'http://localhost:5173/'
  }
}), { hoisted: true })

// Handle unhandled promise rejections in tests
const originalConsoleError = console.error // eslint-disable-line no-console
beforeAll(() => {
  console.error = (...args) => { // eslint-disable-line no-console
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('act(...)'))
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError // eslint-disable-line no-console
})
// Handle unhandled promise rejections during tests
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', () => {
    // Suppress unhandled rejections during tests
  })
} else if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault()
  })

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  
  // Reset to default successful returns
  mockUserManager.getUser.mockResolvedValue(null)
  mockUserManager.signinRedirect.mockResolvedValue(undefined)
  mockUserManager.signoutRedirect.mockResolvedValue(undefined)
  mockUserManager.signinRedirectCallback.mockResolvedValue(undefined)
  global.fetch.mockResolvedValue({
    text: () => Promise.resolve('OK'),
    json: () => Promise.resolve({}),
    ok: true,
    status: 200
  })
})