import React,{useEffect,useState} from 'react'
import {httpsCallable} from 'firebase/functions'
import {functions} from './firebase'
import {LockKeyhole,Plus,Search,Eye,EyeOff,Copy,Trash2,Save} from 'lucide-react'

export default function VaultPage({user,role}) {
 const canShared=role==='Admin'||role==='Centric super admin'
 const [scope,setScope]=useState(canShared?'shared':'personal'),[entries,setEntries]=useState([]),[search,setSearch]=useState(''),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revealed,setRevealed]=useState({})
 const blank={title:'',category:'Application',username:'',password:'',host:'',port:'',notes:'',setup:''}
 const call=async(name,data)=>httpsCallable(functions,name)(data)
 const load=async()=>{setBusy(true);setError('');try{const r=await call('listVaultEntries',{scope});setEntries(r.data.entries||[])}catch(e){setError(e.message||'Unable to load vault.')}finally{setBusy(false)}}
 useEffect(()=>{load()},[scope])
 const save=async e=>{e.preventDefault();setBusy(true);try{await call('saveVaultEntry',{...editing,scope});setEditing(null);await load()}catch(e){setError(e.message||'Unable to save entry.')}finally{setBusy(false)}}
 const del=async id=>{if(!confirm('Delete this credential entry?'))return;try{await call('deleteVaultEntry',{scope,id});await load()}catch(e){setError(e.message||'Unable to delete entry.')}}
 const filtered=entries.filter(x=>`${x.title} ${x.category} ${x.host} ${x.username}`.toLowerCase().includes(search.toLowerCase()))
 const copy=async value=>{await navigator.clipboard.writeText(value||'')}
 return <section className="content-section">
  <div className="section-heading"><div><p className="eyebrow">SECURE CREDENTIALS</p><h1>Clients Tools Access</h1><p>Encrypted credentials and connection notes.</p></div><button className="button-primary" onClick={()=>setEditing({...blank})}><Plus size={16}/> New credential</button></div>
  <div className="vault-tabs"><button className={scope==='shared'?'active':''} disabled={!canShared} onClick={()=>setScope('shared')}>Shared client vault</button><button className={scope==='personal'?'active':''} onClick={()=>setScope('personal')}>My personal vault</button></div>
  {scope==='shared'&&!canShared&&<p>Shared credentials are restricted to Admins and Super Admins.</p>}
  {error&&<p className="auth-alert error">{error}</p>}
  <label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search credentials…"/></label>
  {busy&&<p>Loading encrypted vault…</p>}
  <div className="vault-list">{filtered.map(x=><article className="vault-entry" key={x.id}>
   <div className="vault-entry-head"><div><strong>{x.title}</strong><small>{x.category} · {x.host||'No host recorded'}{x.port?`:${x.port}`:''}</small></div><button className="icon-button" onClick={()=>setEditing({...x})}>Edit</button></div>
   <p>Username: {x.username||'—'} <button className="icon-button" onClick={()=>copy(x.username)} aria-label="Copy username"><Copy size={14}/></button></p>
   <p>Password: {revealed[x.id]?x.password:'••••••••••••'} <button className="icon-button" onClick={()=>setRevealed(v=>({...v,[x.id]:!v[x.id]}))} aria-label="Reveal password">{revealed[x.id]?<EyeOff size={14}/>:<Eye size={14}/>}</button><button className="icon-button" onClick={()=>copy(x.password)} aria-label="Copy password"><Copy size={14}/></button></p>
   {x.notes&&<p>{x.notes}</p>}{x.setup&&<details><summary>Setup instructions</summary><p>{x.setup}</p></details>}
   <button className="text-button" onClick={()=>del(x.id)}><Trash2 size={14}/> Delete</button>
  </article>)}</div>
  {!busy&&!filtered.length&&<p>No entries found in this vault.</p>}
  {editing&&<div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="modal-heading"><div><h2>{editing.id?'Edit credential':'New credential'}</h2><p>Secret fields are encrypted by the server before storage.</p></div><button type="button" className="icon-button" onClick={()=>setEditing(null)}>×</button></div>
   {['title','category','username','password','host','port','notes','setup'].map(k=><label key={k}>{({title:'Title',category:'Category',username:'Username',password:'Password',host:'Host / IP address',port:'Port',notes:'Comments',setup:'Setup instructions'})[k]}{k==='notes'||k==='setup'?<textarea value={editing[k]||''} onChange={e=>setEditing(v=>({...v,[k]:e.target.value}))}/>:<input type={k==='password'?'password':'text'} required={k==='title'||k==='password'} value={editing[k]||''} onChange={e=>setEditing(v=>({...v,[k]:e.target.value}))}/>}</label>)}
   <button className="button-primary" disabled={busy}><Save size={15}/> Save encrypted entry</button>
  </form></div>}
 </section>
}
