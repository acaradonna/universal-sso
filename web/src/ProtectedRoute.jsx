import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { userManager } from './oidc'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    userManager.getUser().then(u => {
      if (!u || u.expired) {
        userManager.signinRedirect()
      } else {
        setUser(u)
        setLoading(false)
      }
    })
  }, [])

  if (loading) return <div>Loading…</div>
  if (!user) return <Navigate to="/" />
  return children
}
