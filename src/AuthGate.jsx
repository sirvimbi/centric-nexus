import React, { useState } from 'react'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from './firebase'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import './auth.css'

export default function AuthGate() {
  const [mode,setMode]=useState('signin'), [email,setEmail]=useState(''), [password,setPassword]=useState('')
  const [show,setShow]=useState(false), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [error,setError]=useState('')
  const run=async fn=>{setBusy(true);setError('');setMessage('');try{await fn()}catch(e){setError(e?.code==='auth/invalid-credential'?'Email or password is incorrect.':e?.code==='auth/too-many-requests'?'Too many attempts. Please wait and try again.':'Unable to complete the request. Check your details and try again.')}finally{setBusy(false)}}
  const submit=e=>{e.preventDefault();return run(()=>mode==='reset'?sendPasswordResetEmail(auth,email.trim()):signInWithEmailAndPassword(auth,email.trim(),password))}
  return <main className="auth-screen"><section className="auth-card">
    <div className="auth-brand"><img src="/logo.png" alt="Centric Nexus"/><div><strong>centric <span>nexus</span></strong><small>PROJECT WORKSPACE</small></div></div>
    <div className="auth-lock"><LockKeyhole size={19}/></div><p className="auth-eyebrow">SECURE WORKSPACE ACCESS</p>
    <h1>{mode==='reset'?'Reset your password':'Welcome back'}</h1><p className="auth-subtitle">{mode==='reset'?'Request a password reset link.':'Sign in with an account created by your workspace administrator.'}</p>
    <form onSubmit={submit}>
      <label>Email address<div className="auth-input-icon"><Mail size={16}/><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@company.com"/></div></label>
      {mode==='signin'&&<label>Password<div className="auth-input-icon"><LockKeyhole size={16}/><input type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Your password"/><button type="button" className="password-toggle" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>}
      {error&&<p className="auth-alert error" role="alert">{error}</p>}{message&&<p className="auth-alert success" role="status">{message}</p>}
      <button type="submit" className="auth-submit" disabled={busy}>{busy?'Please wait…':mode==='reset'?'Send reset link':'Sign in'} <ArrowRight size={16}/></button>
    </form>
    <p className="auth-switch">{mode==='reset'?'Remember your password?':'Forgot your password?'} <button type="button" onClick={()=>{setMode(mode==='reset'?'signin':'reset');setError('');setMessage('')}}>{mode==='reset'?'Sign in':'Reset password'}</button></p>
    <p className="auth-security">Accounts are created and managed by a Super Admin. Public registration is disabled.</p>
  </section><footer className="auth-footer">© 2026 Centric Nexus · Secure project collaboration</footer></main>
}
