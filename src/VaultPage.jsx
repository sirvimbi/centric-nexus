import React,{useEffect,useState} from 'react'
import {httpsCallable} from 'firebase/functions'
import {functions} from './firebase'
import {LockKeyhole,Plus,Search,Eye,EyeOff,Copy,Trash2,Save,Database, X} from 'lucide-react'

const DEMO_CREDENTIALS = [
 {id:'demo-arcon',title:'Arcon',category:'Remote access / infrastructure',username:'demo_arcon_user',password:'DEMO-ONLY-NOT-A-SECRET',host:'192.0.2.10',port:'443',notes:'SENSITISATION DEMO ONLY. Fictional record; no live service exists at this address.',setup:'Example remote-access record. Replace with approved connection details only in a controlled production workflow.'},
 {id:'demo-centric-vm',title:'Centric VM',category:'Virtual machine',username:'demo_vm_user',password:'DEMO-ONLY-NOT-A-SECRET',host:'vm.centric-demo.invalid',port:'22',notes:'SENSITISATION DEMO ONLY. Fictional hostname using the reserved .invalid domain.',setup:'Example VM connection. Hostname and account are non-functional placeholders.'},
 {id:'demo-kevian',title:'Kevian',category:'Client application',username:'demo_kevia_user',password:'DEMO-ONLY-NOT-A-SECRET',host:'198.51.100.21',port:'443',notes:'SENSITISATION DEMO ONLY. Documentation-only IP address; not a customer endpoint.',setup:'Example application access record for training.'},
 {id:'demo-mart-networks',title:'Mart Networks',category:'Network management',username:'demo_network_user',password:'DEMO-ONLY-NOT-A-SECRET',host:'network-demo.invalid',port:'8443',notes:'SENSITISATION DEMO ONLY. No real network or VPN details are included.',setup:'Illustrates where an administrator would store approved network console instructions.'},
 {id:'demo-muthokinju',title:'Muthokinju',category:'Client application',username:'demo_muthokinju_user',password:'DEMO-ONLY-NOT-A-SECRET',host:'203.0.113.31',port:'443',notes:'SENSITISATION DEMO ONLY. Uses a TEST-NET documentation address.',setup:'Fictional sample entry. Do not use to attempt a connection.'},
 {id:'demo-my-vm',title:'My VM',category:'Virtual machine',username:'demo_operator',password:'DEMO-ONLY-NOT-A-SECRET',host:'my-vm-demo.invalid',port:'3389',notes:'SENSITISATION DEMO ONLY. Non-functional RDP example.',setup:'Example remote desktop entry. The hostname is intentionally invalid.'},
 {id:'demo-roslyn-academy',title:'Roslyn Academy',category:'Client application',username:'demo_roslyn_user',password:'DEMO-ONLY-NOT-A-SECRET',host:'portal-roslyn-demo.invalid',port:'443',notes:'SENSITISATION DEMO ONLY. Fictional portal record; no real school systems are referenced.',setup:'Training example for storing client portal access notes.'},
 {id:'demo-scan-global',title:'Scan Global',category:'Remote access / infrastructure',username:'demo_scan_user',password:'DEMO-ONLY-NOT-A-SECRET',host:'192.0.2.44',port:'443',notes:'SENSITISATION DEMO ONLY. Documentation-only IP; no VPN keys, tokens or certificates.',setup:'Example infrastructure access record.'},
 {id:'demo-skol',title:'Skol',category:'Client application',username:'demo_skol_user',password:'DEMO-ONLY-NOT-A-SECRET',host:'skol-demo.invalid',port:'443',notes:'SENSITISATION DEMO ONLY. Fictional hostname using .invalid.',setup:'Example client application entry.'},
 {id:'demo-vps',title:'VPS',category:'Virtual private server',username:'demo_vps_admin',password:'DEMO-ONLY-NOT-A-SECRET',host:'198.51.100.55',port:'22',notes:'SENSITISATION DEMO ONLY. Reserved documentation IP; no real VPS is provisioned.',setup:'Example SSH record. Never use these placeholders for a live connection.'}
]

export default function VaultPage({user,role}) {
 const isSuperAdmin=role==='Centric super admin'
 const canShared=isSuperAdmin||role==='Admin'
 const [scope,setScope]=useState(canShared?'shared':'personal'),[entries,setEntries]=useState([]),[search,setSearch]=useState(''),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[demoBusy,setDemoBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revealed,setRevealed]=useState({})
 const blank={title:'',category:'Application',username:'',password:'',host:'',port:'',notes:'',setup:''}
 const call=async(name,data)=>httpsCallable(functions,name)(data)
 const load=async()=>{setBusy(true);setError('');try{const r=await call('listVaultEntries',{scope});setEntries(r.data.entries||[])}catch(e){setError(e.message||'Unable to load vault.')}finally{setBusy(false)}}
 useEffect(()=>{load()},[scope])
 const save=async e=>{e.preventDefault();setBusy(true);setError('');try{await call('saveVaultEntry',{...editing,scope});setEditing(null);await load()}catch(e){setError(e.message||'Unable to save entry.')}finally{setBusy(false)}}
 const del=async id=>{if(!confirm('Delete this credential entry?'))return;setBusy(true);try{await call('deleteVaultEntry',{scope,id});await load()}catch(e){setError(e.message||'Unable to delete entry.')}finally{setBusy(false)}}
 const loadDemo=async()=>{
  if(!isSuperAdmin||scope!=='shared')return
  const ok=confirm('Load 10 fictional sensitisation records into the SHARED client vault? These records contain non-functional placeholders only. Existing demo records with the same IDs will be updated. No personal vault entries will be changed.')
  if(!ok)return
  setDemoBusy(true);setError('');setNotice('')
  try{
   for(const entry of DEMO_CREDENTIALS) await call('saveVaultEntry',{...entry,scope:'shared'})
   setNotice('10 fictional demo records loaded into the Shared client vault.')
   await load()
  }catch(e){setError(e.message||'Unable to load demo records.')}
  finally{setDemoBusy(false)}
 }
 const parseCsv=(source)=>{
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<source.length;i++){const ch=source[i],next=source[i+1];if(ch==='\"'&&quoted&&next==='\"'){value+='\"';i++}else if(ch==='\"'){quoted=!quoted}else if(ch===','&&!quoted){row.push(value);value=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value=''}else value+=ch}
  row.push(value);if(row.some(x=>x.trim()))rows.push(row);if(quoted)throw new Error('CSV has an unclosed quoted field.');
  const headers=(rows.shift()||[]).map(x=>x.trim().toLowerCase());
  const required=['title','category','username','password','host','port','notes'];
  if(!required.every(x=>headers.includes(x)))throw new Error('CSV headers must be: '+required.join(', '));
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()]))).filter(x=>x.title);
 };
 const importCsv=async file=>{
  if(!isSuperAdmin||scope!=='shared'||!file)return;
  if(file.size>1048576){setError('CSV must be 1 MB or smaller.');return}
  try{const items=parseCsv(await file.text());if(!items.length)throw new Error('No credential rows found.');if(items.length>100)throw new Error('Import is limited to 100 records.');
   if(!confirm('Import '+items.length+' records into the Shared Client Vault? Each record is encrypted by the server.'))return;
   setDemoBusy(true);setError('');let count=0;
   for(const item of items){await call('saveVaultEntry',{...item,scope:'shared'});count++}
   setNotice('Imported '+count+' records into the Shared Client Vault.');await load();
  }catch(e){setError(e.message||'CSV import failed.')}finally{setDemoBusy(false)}
 };
 const filtered=entries.filter(x=>`${x.title} ${x.category} ${x.host} ${x.username}`.toLowerCase().includes(search.toLowerCase()))
 const copy=async value=>{try{await navigator.clipboard.writeText(value||'')}catch(e){setError('Clipboard access was unavailable. Please copy the value manually.')}}
 const fields=[['title','Title','text'],['category','Category','text'],['username','Username','text'],['password','Password','password'],['host','Host / IP address','text'],['port','Port','text'],['notes','Comments','textarea'],['setup','Setup instructions','textarea']]
 return <section className="content-section">
  <div className="section-heading"><div><p className="eyebrow">SECURE CREDENTIALS</p><h1>Clients Tools Access</h1><p>Encrypted credentials and connection notes.</p></div><div className="vault-heading-actions">{isSuperAdmin&&scope==='shared'&&<label className="button-secondary vault-upload-label"><Database size={15}/>{demoBusy?'Importing CSV…':'Import credentials CSV'}<input type="file" accept=".csv,text/csv" disabled={demoBusy||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';importCsv(file)}}/></label>}<button className="button-primary" onClick={()=>setEditing({...blank})}><Plus size={16}/> New credential</button></div></div>
  <div className="vault-tabs"><button className={scope==='shared'?'active':''} disabled={!canShared} onClick={()=>setScope('shared')}>Shared client vault</button><button className={scope==='personal'?'active':''} onClick={()=>setScope('personal')}>My personal vault</button></div>
  {scope==='shared'&&!canShared&&<p>Shared credentials are restricted to Admins and Super Admins.</p>}
  {error&&<p className="auth-alert error" role="alert">{error}</p>}{notice&&<p className="vault-notice" role="status">{notice}</p>}
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
  {editing&&<div className="vault-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}><form className="vault-modal" role="dialog" aria-modal="true" aria-labelledby="vault-modal-title" onSubmit={save}>
   <div className="vault-modal-header"><div><h2 id="vault-modal-title">{editing.id?'Edit credential':'New credential'}</h2><p>Secret fields are encrypted by the server before storage.</p></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={()=>setEditing(null)}><X size={18}/></button></div>
   <div className="vault-modal-body">{fields.map(([key,label,type])=><label className="vault-field" key={key}>{label}{type==='textarea'?<textarea rows={key==='setup'?5:3} value={editing[key]||''} onChange={e=>setEditing(v=>({...v,[key]:e.target.value}))}/>:<input type={type} required={key==='title'||key==='password'} autoComplete="off" value={editing[key]||''} onChange={e=>setEditing(v=>({...v,[key]:e.target.value}))}/>}</label>)}</div>
   <div className="vault-modal-footer"><span><LockKeyhole size={13}/> Encrypted before storage</span><div><button type="button" className="button-secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="button-primary" disabled={busy}><Save size={15}/> {busy?'Saving…':'Save encrypted entry'}</button></div></div>
  </form></div>}
 </section>
}
