import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { userManager } from './oidc'

function Home() {
  const [user, setUser] = useState(null)
  useEffect(() => { userManager.getUser().then(setUser) }, [])

  const callApi = async () => {
    const u = await userManager.getUser()
    const res = await fetch('http://localhost:5000/hello', {
      headers: { Authorization: `Bearer ${u?.access_token}` }
    })
    alert(await res.text())
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Universal SSO Demo</h1>
      {user ? (
        <>
          <p>Welcome {user.profile?.preferred_username}</p>
          <button onClick={() => userManager.signoutRedirect()}>Logout</button>
          <button onClick={callApi}>Call Protected API</button>
        </>
      ) : (
        <button onClick={() => userManager.signinRedirect()}>Login</button>
      )}
    </div>
  )
}

function Callback() {
  const navigate = useNavigate()
  useEffect(() => {
    userManager.signinRedirectCallback().then(() => navigate('/'))
  }, [navigate])
  return <div>Finishing login…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </BrowserRouter>
  )
}
