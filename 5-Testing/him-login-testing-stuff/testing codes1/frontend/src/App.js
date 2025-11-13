import React, { useState } from 'react'
import Login from './Login'
import Protected from './Protected'


export default function App(){
const [token, setToken] = useState(null)


return (
<div style={{ padding: 20 }}>
<h2>FastAPI + React JWT Demo</h2>
{!token ? (
<Login onLogin={(t)=> setToken(t)} />
) : (
<Protected accessToken={token} onLogout={()=> setToken(null)} />
)}
</div>
)
}