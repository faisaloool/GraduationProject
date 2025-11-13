import React, { useState } from 'react'

export default function Protected({ accessToken, onLogout }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  async function callProtected() {
    setErr(null)
    setLoading(true)
    setData(null)

    try {
      // Call the protected endpoint with the access token
      const res = await fetch('http://localhost:8000/protected', {
        headers: { 'Authorization': 'Bearer ' + accessToken },
        credentials: 'include', // include cookies for refresh if needed
      })

      if (res.status === 401) {
        // Access token expired or invalid — try refresh
        console.log('Access token expired. Attempting refresh...')
        const refreshRes = await fetch('http://localhost:8000/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        const refreshData = await refreshRes.json()

        if (refreshRes.ok) {
          // Retry protected call with new access token
          const res2 = await fetch('http://localhost:8000/protected', {
            headers: { 'Authorization': 'Bearer ' + refreshData.access_token },
            credentials: 'include',
          })
          const data2 = await res2.json()
          if (!res2.ok) throw new Error(data2.detail || 'Error after refresh')
          setData(data2.msg)
        } else {
          throw new Error(refreshData.detail || 'Refresh token expired. Please log in again.')
        }
      } else {
        const result = await res.json()
        if (!res.ok) throw new Error(result.detail || 'Failed to fetch protected data')
        setData(result.msg)
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      await fetch('http://localhost:8000/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      onLogout()
    }
  }

  return (
    <div style={{ maxWidth: 600, marginTop: 20 }}>
      <h3>Protected Page</h3>
      <div style={{ marginBottom: 10 }}>
        <button onClick={callProtected} disabled={loading}>
          {loading ? 'Loading...' : 'Call Protected API'}
        </button>
        <button
          onClick={logout}
          style={{ marginLeft: 10, background: '#e33', color: '#fff' }}
        >
          Logout
        </button>
      </div>

      {data && (
        <div style={{ marginTop: 10, color: 'green' }}>
          <strong>Server Response:</strong> {data}
        </div>
      )}
      {err && (
        <div style={{ marginTop: 10, color: 'red' }}>
          <strong>Error:</strong> {err}
        </div>
      )}
    </div>
  )
}
