import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { mockUserManager } from './setupTests'

// Mock the BrowserRouter in App component to use MemoryRouter instead
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }) => children,
  }
})

// Helper function to render App with router
const renderWithRouter = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  )
}

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockClear()
    global.alert = vi.fn()
  })

  describe('Home Component - Unauthenticated State', () => {
    it('renders login button when user is not authenticated', async () => {
      mockUserManager.getUser.mockResolvedValue(null)
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Universal SSO Demo')).toBeInTheDocument()
        expect(screen.getByText('Login')).toBeInTheDocument()
        expect(screen.queryByText('Logout')).not.toBeInTheDocument()
      })
    })

    it('calls userManager.signinRedirect when Login button is clicked', async () => {
      mockUserManager.getUser.mockResolvedValue(null)
      const user = userEvent.setup()
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Login'))
      
      expect(mockUserManager.signinRedirect).toHaveBeenCalledTimes(1)
    })
  })

  describe('Home Component - Authenticated State', () => {
    const mockUser = {
      profile: {
        preferred_username: 'testuser'
      },
      access_token: 'mock-access-token'
    }

    it('renders welcome message and buttons when user is authenticated', async () => {
      mockUserManager.getUser.mockResolvedValue(mockUser)
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Universal SSO Demo')).toBeInTheDocument()
        expect(screen.getByText('Welcome testuser')).toBeInTheDocument()
        expect(screen.getByText('Logout')).toBeInTheDocument()
        expect(screen.getByText('Call Protected API')).toBeInTheDocument()
        expect(screen.queryByText('Login')).not.toBeInTheDocument()
      })
    })

    it('calls userManager.signoutRedirect when Logout button is clicked', async () => {
      mockUserManager.getUser.mockResolvedValue(mockUser)
      const user = userEvent.setup()
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Logout'))
      
      expect(mockUserManager.signoutRedirect).toHaveBeenCalledTimes(1)
    })

    it('makes API call with correct headers when Call Protected API is clicked', async () => {
      mockUserManager.getUser.mockResolvedValue(mockUser)
      global.fetch.mockResolvedValue({
        text: () => Promise.resolve('Hello, testuser. Your token is valid.')
      })
      const user = userEvent.setup()
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Call Protected API')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Call Protected API'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/hello', {
          headers: { Authorization: 'Bearer mock-access-token' }
        })
        expect(global.alert).toHaveBeenCalledWith('Hello, testuser. Your token is valid.')
      })
    })

    it('handles API call errors gracefully', async () => {
      mockUserManager.getUser.mockResolvedValue(mockUser)
      global.fetch.mockRejectedValue(new Error('Network error'))
      const user = userEvent.setup()
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Call Protected API')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Call Protected API'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('handles missing user token gracefully during API call', async () => {
      const userWithoutToken = {
        profile: {
          preferred_username: 'testuser'
        }
        // Missing access_token
      }
      mockUserManager.getUser.mockResolvedValue(userWithoutToken)
      global.fetch.mockResolvedValue({
        text: () => Promise.resolve('Unauthorized')
      })
      const user = userEvent.setup()
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Call Protected API')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Call Protected API'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:5000/hello', {
          headers: { Authorization: 'Bearer undefined' }
        })
      })
    })
  })

  describe('Callback Component', () => {
    it('renders finishing login message', async () => {
      mockUserManager.signinRedirectCallback.mockResolvedValue({})
      
      renderWithRouter(['/callback'])
      
      expect(screen.getByText('Finishing login…')).toBeInTheDocument()
    })

    it('calls signinRedirectCallback and navigates to home', async () => {
      mockUserManager.signinRedirectCallback.mockResolvedValue({})
      
      renderWithRouter(['/callback'])
      
      await waitFor(() => {
        expect(mockUserManager.signinRedirectCallback).toHaveBeenCalledTimes(1)
      })
    })

    it('handles signinRedirectCallback errors', async () => {
      mockUserManager.signinRedirectCallback.mockRejectedValue(new Error('Callback error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderWithRouter(['/callback'])
      
      expect(screen.getByText('Finishing login…')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(mockUserManager.signinRedirectCallback).toHaveBeenCalledTimes(1)
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('Routing', () => {
    it('renders Home component for root path', () => {
      mockUserManager.getUser.mockResolvedValue(null)
      
      renderWithRouter(['/'])
      
      expect(screen.getByText('Universal SSO Demo')).toBeInTheDocument()
    })

    it('renders Callback component for /callback path', () => {
      mockUserManager.signinRedirectCallback.mockResolvedValue({})
      
      renderWithRouter(['/callback'])
      
      expect(screen.getByText('Finishing login…')).toBeInTheDocument()
    })
  })

  describe('User State Management', () => {
    it('updates user state when getUser resolves', async () => {
      const mockUser = {
        profile: {
          preferred_username: 'newuser'
        },
        access_token: 'new-token'
      }
      mockUserManager.getUser.mockResolvedValue(mockUser)
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Welcome newuser')).toBeInTheDocument()
      })
    })

    it('handles getUser promise rejection', async () => {
      mockUserManager.getUser.mockRejectedValue(new Error('User fetch error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Universal SSO Demo')).toBeInTheDocument()
        expect(screen.queryByText('Welcome')).not.toBeInTheDocument()
      })
      
      consoleSpy.mockRestore()
    })
  })
})