import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { mockUserManager } from './setupTests'

// Helper function to render ProtectedRoute with router
const renderWithRouter = (initialEntries = ['/protected']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    </MemoryRouter>
  )
}

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading message while checking user authentication', () => {
      // Make getUser hang to simulate loading state
      mockUserManager.getUser.mockImplementation(() => new Promise(() => {}))
      
      renderWithRouter()
      
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  describe('Authenticated User', () => {
    it('renders children when user is authenticated and not expired', async () => {
      const mockUser = {
        profile: {
          preferred_username: 'testuser'
        },
        access_token: 'valid-token',
        expired: false
      }
      mockUserManager.getUser.mockResolvedValue(mockUser)
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
      
      expect(mockUserManager.signinRedirect).not.toHaveBeenCalled()
    })

    it('renders children when user exists but expired property is undefined', async () => {
      const mockUser = {
        profile: {
          preferred_username: 'testuser'
        },
        access_token: 'valid-token'
        // expired property is undefined
      }
      mockUserManager.getUser.mockResolvedValue(mockUser)
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
      
      expect(mockUserManager.signinRedirect).not.toHaveBeenCalled()
    })
  })

  describe('Unauthenticated User', () => {
    it('redirects to sign in when user is null', async () => {
      mockUserManager.getUser.mockResolvedValue(null)
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalledTimes(1)
      })
      
      // Should still show loading since redirect is async
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('redirects to sign in when user token is expired', async () => {
      const expiredUser = {
        profile: {
          preferred_username: 'testuser'
        },
        access_token: 'expired-token',
        expired: true
      }
      mockUserManager.getUser.mockResolvedValue(expiredUser)
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalledTimes(1)
      })
      
      // Should still show loading since redirect is async
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles getUser promise rejection gracefully', async () => {
      mockUserManager.getUser.mockRejectedValue(new Error('User fetch error'))
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Loading…')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('handles signinRedirect promise rejection gracefully', async () => {
      mockUserManager.getUser.mockResolvedValue(null)
      mockUserManager.signinRedirect.mockRejectedValue(new Error('Redirect error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalledTimes(1)
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('State Updates', () => {
    it('updates state correctly when user changes from null to authenticated', async () => {
      // Start with authenticated user
      const mockUser = {
        profile: { preferred_username: 'testuser' },
        access_token: 'valid-token',
        expired: false
      }
      mockUserManager.getUser.mockResolvedValue(mockUser)
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
      
      expect(mockUserManager.signinRedirect).not.toHaveBeenCalled()
    })

    it('maintains loading state during signin redirect process', async () => {
      mockUserManager.getUser.mockResolvedValue(null)
      // Never resolves to simulate loading state
      mockUserManager.signinRedirect.mockImplementation(() => new Promise(() => {}))
      
      renderWithRouter()
      
      await waitFor(() => {
        expect(mockUserManager.signinRedirect).toHaveBeenCalledTimes(1)
      })
      
      // Should remain in loading state
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  describe('Multiple Children', () => {
    it('renders multiple children when authenticated', async () => {
      const mockUser = {
        profile: { preferred_username: 'testuser' },
        access_token: 'valid-token',
        expired: false
      }
      mockUserManager.getUser.mockResolvedValue(mockUser)
      
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <div>First Child</div>
            <div>Second Child</div>
            <span>Third Child</span>
          </ProtectedRoute>
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('First Child')).toBeInTheDocument()
        expect(screen.getByText('Second Child')).toBeInTheDocument()
        expect(screen.getByText('Third Child')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Integration', () => {
    it('navigates to home when user exists but component determines redirect', async () => {
      const mockUser = {
        profile: { preferred_username: 'testuser' },
        access_token: 'valid-token',
        expired: false
      }
      mockUserManager.getUser.mockResolvedValue(mockUser)
      
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <div>
            <div data-testid="current-path">/protected</div>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </div>
        </MemoryRouter>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })
  })
})