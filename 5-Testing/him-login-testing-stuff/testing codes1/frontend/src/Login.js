import React, { useState } from 'react'


export default function Login({ onLogin }){
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [msg, setMsg] = useState(null)


async function submit(e){
e.preventDefault()
setMsg(null)
try{
const form = new URLSearchParams({ email, password })
const res = await fetch('http://localhost:8000/login', {
method: 'POST',
body: form,
credentials: 'include', // important to receive httpOnly cookie
headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
})
const data = await res.json()
if(!res.ok) throw new Error(data.detail || 'Login failed')
onLogin(data.access_token)
}catch(err){
setMsg(err.message)
}
}


return (
<form onSubmit={submit} style={{ maxWidth: 400 }}>
<div>
<label>Email</label>
<input value={email} onChange={e=>setEmail(e.target.value)} />
</div>
<div>
<label>Password</label>
<input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
</div>
<button type="submit">Login</button>
{msg && <div style={{ color: 'red' }}>{msg}</div>}
</form>
)
}