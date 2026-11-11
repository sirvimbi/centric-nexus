import React,{useEffect,useState} from 'react'
import {httpsCallable} from 'firebase/functions'
import {functions} from './firebase'
import {LockKeyhole,Plus,Search,Eye,EyeOff,Copy,Trash2,Save,Database,X,ArrowLeft,Server,KeyRound,ShieldCheck,Globe,RefreshCw,CheckCircle2,AlertCircle} from 'lucide-react'

export default function VaultPage({user,role}) {
 const isSuperAdmin=role==='Centric super admin'
 const canShared=isSuperAdmin||role==='Admin'
 const [scope,setScope]=useState(canShared?'shared':'personal')
 const [entries,setEntries]=useState([])
 const [search,setSearch]=useState('')
 const [editing,setEditing]=useState(null)
 const [selected,setSelected]=useState(null)
 const [busy,setBusy]=useState(false)
 const [importBusy,setImportBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [revealed,setRevealed]=useState({})
 const [toast,setToast]=useState(null)
 const [audit,setAudit]=useState([])
 const [auditBusy,setAuditBusy]=useState(false)
 const [undoItem,setUndoItem]=useState(null)
 const [undoSeconds,setUndoSeconds]=useState(0)
 const [categories,setCategories]=useState([])
 const [categoryDraft,setCategoryDraft]=useState('')
 const blank={title:'',category:'Application',username:'',password:'',host:'',port:'',notes:'',setup:''}
 const call=async(name,data)=>httpsCallable(functions,name)(data)
 const refreshEntries=async({silent=false}={})=>{
  if(!silent)setBusy(true)
  setError('')
  try{const r=await call('listVaultEntries',{scope});const fresh=r.data.entries||[];setEntries(fresh);if(selected){const current=fresh.find(x=>x.id===selected.id);setSelected(current||null)}return fresh}
  catch(e){setError(e.message||'Unable to load vault entries.');throw e}
  finally{if(!silent)setBusy(false)}
 }
 useEffect(()=>{setSelected(null);setRevealed({});refreshEntries();call('listVaultCategories',{}).then(r=>setCategories(r.data.categories||[])).catch(()=>{}) },[scope])
 useEffect(()=>{if(!selected){setAudit([]);return}setAuditBusy(true);call('listVaultAudit',{scope,entryId:selected.id}).then(r=>setAudit(r.data.history||[])).catch(()=>setAudit([])).finally(()=>setAuditBusy(false))},[selected?.id,scope])
 useEffect(()=>{if(!undoItem)return;const timer=window.setInterval(()=>setUndoSeconds(v=>{if(v<=1){window.clearInterval(timer);setUndoItem(null);return 0}return v-1}),1000);return()=>window.clearInterval(timer)},[undoItem?.id])
 const showToast=(message,type='success')=>{setToast({message,type});window.clearTimeout(showToast.timer);showToast.timer=window.setTimeout(()=>setToast(null),2600)}
 const save=async e=>{
  e.preventDefault();setBusy(true);setError('')
  try{const result=await call('saveVaultEntry',{...editing,scope});setEditing(null);await refreshEntries({silent:true});if(selected?.id===result.data.id)setSelected(v=>({...v,...editing}));showToast('Credential saved securely')}
  catch(e){setError(e.message||'Unable to save entry.')}finally{setBusy(false)}
 }
 const del=async id=>{
  if(!confirm('Delete this credential? You will have 10 seconds to undo.'))return
  const item=entries.find(x=>x.id===id)||selected
  setBusy(true);setError('')
  try{await call('deleteVaultEntry',{scope,id});setSelected(null);await refreshEntries({silent:true});setUndoItem({id,scope,title:item?.title||'Credential'});setUndoSeconds(10);showToast('Credential deleted — you can undo for 10 seconds')}
  catch(e){setError(e.message||'Unable to delete entry.')}finally{setBusy(false)}
 }
 const undoDelete=async()=>{if(!undoItem)return;try{await call('restoreVaultEntry',{scope:undoItem.scope,id:undoItem.id});setUndoItem(null);setUndoSeconds(0);await refreshEntries({silent:true});showToast('Credential restored')}catch(e){setError(e.message||'Unable to restore credential.');setUndoItem(null)}}
 const saveCategory=async()=>{const name=categoryDraft.trim();if(!name)return;try{const r=await call('saveVaultCategory',{name});setCategories(v=>[...v.filter(x=>x.id!==r.data.id),r.data].sort((a,b)=>a.name.localeCompare(b.name)));setCategoryDraft('');showToast('Category added')}catch(e){setError(e.message||'Unable to save category.')}}
 const renameCategory=async item=>{const name=window.prompt('Edit category name',item.name);if(!name||!name.trim())return;try{const r=await call('saveVaultCategory',{id:item.id,name:name.trim()});setCategories(v=>v.map(x=>x.id===item.id?r.data:x).sort((a,b)=>a.name.localeCompare(b.name)));showToast('Category updated')}catch(e){setError(e.message||'Unable to update category.')}}
 const removeCategory=async item=>{if(!window.confirm('Delete category '+item.name+'?'))return;try{await call('deleteVaultCategory',{id:item.id});setCategories(v=>v.filter(x=>x.id!==item.id));showToast('Category deleted')}catch(e){setError(e.message||'Unable to delete category.')}}
 const parseCsv=source=>{
  const rows=[];let row=[],value='',quoted=false
  for(let i=0;i<source.length;i++){const ch=source[i],next=source[i+1];if(ch==='"'&&quoted&&next==='"'){value+='"';i++}else if(ch==='"'){quoted=!quoted}else if(ch===','&&!quoted){row.push(value);value=''}else if((ch==='\\n'||ch==='\\r')&&!quoted){if(ch==='\\r'&&next==='\\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value=''}else value+=ch}
  row.push(value);if(row.some(x=>x.trim()))rows.push(row);if(quoted)throw new Error('CSV has an unclosed quoted field.')
  const headers=(rows.shift()||[]).map(x=>x.trim().toLowerCase())
  const required=['title','category','username','password','host','port','notes']
  if(!required.every(x=>headers.includes(x)))throw new Error('CSV headers must be: '+required.join(', '))
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()]))).filter(x=>x.title)
 }
 const importCsv=async file=>{
  if(!isSuperAdmin||scope!=='shared'||!file)return
  if(file.size>1048576){setError('CSV must be 1 MB or smaller.');return}
  setImportBusy(true);setError('');setNotice('')
  try{
   const items=parseCsv(await file.text())
   if(!items.length)throw new Error('No credential rows found.')
   if(items.length>100)throw new Error('Import is limited to 100 records.')
   if(!confirm('Import '+items.length+' records into the Shared Client Vault? Existing entries with matching titles are not automatically overwritten.'))return
   let count=0
   for(const item of items){await call('saveVaultEntry',{...item,scope:'shared'});count++}
   await refreshEntries({silent:true})
   setNotice('Successfully imported '+count+' credentials. The list has been refreshed.')
   showToast(count+' credentials imported')
  }catch(e){setError(e.message||'CSV import failed.')}finally{setImportBusy(false)}
 }
 const copy=async(value,label)=>{
  try{await navigator.clipboard.writeText(value||'');showToast(label+' copied to clipboard')}
  catch(e){setError('Clipboard access was unavailable. Please check browser permissions.');showToast('Copy failed — clipboard permission denied','error')}
 }
 const filtered=entries.filter(x=>`${x.title} ${x.category} ${x.host} ${x.username}`.toLowerCase().includes(search.toLowerCase()))
 const fields=[['title','Title','text'],['category','Category','select'],['username','Username','text'],['password','Password','password'],['host','Host / IP address','text'],['port','Port','text'],['notes','Comments','textarea'],['setup','Setup instructions','textarea']]
 const Field=({label,value,secret=false})=>{
  const [show,setShow]=useState(false)
  return <div className="vault-detail-field"><div className="vault-detail-label">{label}</div><div className="vault-detail-value">{secret&&!show?'••••••••••••':(value||'—')}<div className="vault-field-actions">{secret&&<button className="vault-mini-action" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={15}/>:<Eye size={15}/>}</button>}<button className="vault-mini-action" onClick={()=>copy(value,label)} aria-label={'Copy '+label}><Copy size={14}/></button></div></div></div>
 }
 return <section className="content-section vault-page">
  <div className="section-heading"><div><p className="eyebrow">SECURE CREDENTIALS</p><h1>Clients Tools Access</h1><p>Encrypted credentials and connection notes.</p></div><div className="vault-heading-actions">{isSuperAdmin&&scope==='shared'&&<label className="button-secondary vault-upload-label"><Database size={15}/>{importBusy?'Importing CSV…':'Import credentials CSV'}<input type="file" accept=".csv,text/csv" disabled={importBusy||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';importCsv(file)}}/></label>}<button className="button-primary" onClick={()=>setEditing({...blank})}><Plus size={16}/> New credential</button></div></div>
  <div className="vault-tabs"><button className={scope==='shared'?'active':''} disabled={!canShared} onClick={()=>setScope('shared')}>Shared client vault</button><button className={scope==='personal'?'active':''} onClick={()=>setScope('personal')}>My personal vault</button><button className="vault-refresh" onClick={()=>refreshEntries()} disabled={busy}><RefreshCw size={14}/> Refresh</button></div>
  {error&&<p className="auth-alert error" role="alert">{error}</p>}{notice&&<p className="vault-notice" role="status"><CheckCircle2 size={15}/>{notice}</p>}
  <label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search credentials…"/></label>
  {busy&&<p className="vault-loading">Loading encrypted vault…</p>}
  <div className="vault-list">{filtered.map((x,i)=><article className={'vault-entry vault-card vault-tone-'+(i%5)} key={x.id}>
   <div className="vault-card-top"><span className="vault-card-icon"><Server size={18}/></span><span className="vault-card-lock"><LockKeyhole size={13}/> ENCRYPTED</span></div>
   <div className="vault-entry-head"><div><strong>{x.title}</strong><small>{x.category||'Credential'}</small></div></div>
   <p className="vault-card-summary">Securely stored access details</p>
   <div className="vault-card-bottom"><span><ShieldCheck size={14}/> Secure entry</span><button className="vault-open-button" onClick={()=>setSelected(x)}>View credentials <ArrowLeft size={14}/></button></div>
  </article>)}</div>
  {!busy&&!filtered.length&&<div className="vault-empty"><LockKeyhole size={28}/><strong>No credentials found</strong><p>Try another search or add a new credential to this vault.</p></div>}
  {selected&&<div className="vault-detail-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="vault-detail-page" role="dialog" aria-modal="true" aria-labelledby="vault-detail-title">
   <header className="vault-detail-header"><button className="vault-back-button" onClick={()=>setSelected(null)}><ArrowLeft size={17}/> Back to credentials</button><span><LockKeyhole size={14}/> SECURE VAULT</span></header>
   <div className="vault-detail-content"><div className="vault-detail-hero"><div className="vault-detail-hero-icon"><Server size={24}/></div><p className="eyebrow">CREDENTIAL RECORD</p><h2 id="vault-detail-title">{selected.title}</h2><span>{selected.category||'Credential'}</span></div>
    <div className="vault-detail-section"><div className="vault-detail-section-title"><KeyRound size={17}/><div><strong>Access details</strong><small>Reveal or copy individual fields</small></div></div><div className="vault-detail-grid"><Field label="Username" value={selected.username}/><Field label="Password" value={selected.password} secret/><Field label="Host / IP address" value={selected.host}/><Field label="Port" value={selected.port}/></div></div>
    {selected.notes&&<div className="vault-detail-section"><div className="vault-detail-section-title"><AlertCircle size={17}/><div><strong>Notes</strong><small>Additional context</small></div></div><p className="vault-detail-notes">{selected.notes}</p></div>}
    {selected.setup&&<div className="vault-detail-section"><div className="vault-detail-section-title"><ShieldCheck size={17}/><div><strong>Setup instructions</strong><small>Connection guidance</small></div></div><p className="vault-detail-notes">{selected.setup}</p></div>}
    <div className="vault-detail-section vault-audit-section"><div className="vault-detail-section-title"><AlertCircle size={17}/><div><strong>Change history</strong><small>Who created or changed this credential, and when</small></div></div>{auditBusy?<p className="vault-audit-empty">Loading change history…</p>:audit.length?<div className="vault-audit-list">{audit.map(item=><div className="vault-audit-item" key={item.id}><div><strong>{item.action==='created'?'Credential created':item.action==='deleted'?'Credential deleted':item.action==='restored'?'Credential restored':'Credential updated'}</strong><p>{item.action==='updated'&&item.changedFields?.length?'Changed: '+item.changedFields.map(k=>({title:'Credential name',category:'Category',username:'Username',password:'Password',host:'Host / IP address',port:'Port',notes:'Notes',setup:'Setup instructions'}[k]||k)).join(', '):item.action==='created'?'Initial credential record saved':item.action==='deleted'?'Moved to recently deleted':'Credential restored to the vault'}</p><small>{item.who||'Unknown user'} · {item.createdAt?new Date(item.createdAt).toLocaleString():'Time unavailable'}</small></div></div>)}</div>:<p className="vault-audit-empty">No history is available for this credential yet.</p>}</div>
    <div className="vault-detail-actions"><button className="button-secondary" onClick={()=>{setEditing({...selected});setSelected(null)}}><Save size={15}/> Edit credential</button><button className="vault-delete-button" onClick={()=>del(selected.id)}><Trash2 size={15}/> Delete credential</button></div>
   </div>
  </section></div>}
  {editing&&<div className="vault-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null)}}><form className="vault-modal" role="dialog" aria-modal="true" aria-labelledby="vault-modal-title" onSubmit={save}>
   <div className="vault-modal-header"><div><h2 id="vault-modal-title">{editing.id?'Edit credential':'New credential'}</h2><p>Secret fields are encrypted by the server before storage.</p></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={()=>setEditing(null)}><X size={18}/></button></div>
   <div className="vault-modal-body">{fields.map(([key,label,type])=><label className="vault-field" key={key}>{label}{type==='textarea'?<textarea rows={key==='setup'?5:3} value={editing[key]||''} onChange={e=>setEditing(v=>({...v,[key]:e.target.value}))}/>:type==='select'?<select required value={editing.category||''} onChange={e=>setEditing(v=>({...v,category:e.target.value}))}>{!categories.some(x=>x.name===editing.category)&&editing.category&&<option value={editing.category}>{editing.category} (existing)</option>}{categories.map(x=><option key={x.id} value={x.name}>{x.name}</option>)}</select>:<input type={type} required={key==='title'||key==='password'} autoComplete="off" value={editing[key]||''} onChange={e=>setEditing(v=>({...v,[key]:e.target.value}))}/>}</label>)}{isSuperAdmin&&<div className="vault-category-admin"><strong>Manage categories</strong><p>These options are available to everyone using the credential vault.</p><div className="vault-category-add"><input value={categoryDraft} onChange={e=>setCategoryDraft(e.target.value)} placeholder="New category name"/><button type="button" className="button-secondary" onClick={saveCategory} disabled={!categoryDraft.trim()}>Add</button></div><div className="vault-category-chips">{categories.map(item=><span key={item.id}>{item.name}<button type="button" onClick={()=>renameCategory(item)}>Edit</button><button type="button" onClick={()=>removeCategory(item)}>×</button></span>)}</div></div>}</div>
   <div className="vault-modal-footer"><span><LockKeyhole size={13}/> Encrypted before storage</span><div><button type="button" className="button-secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="button-primary" disabled={busy}><Save size={15}/> {busy?'Saving…':'Save encrypted entry'}</button></div></div>
  </form></div>}
  {toast&&<div className={'vault-toast '+(toast.type==='error'?'is-error':'')} role="status"><CheckCircle2 size={17}/><span>{toast.message}</span><button onClick={()=>setToast(null)} aria-label="Dismiss notification"><X size={15}/></button></div>}
  {undoItem&&<div className="vault-undo-toast" role="status"><span><strong>{undoItem.title}</strong> deleted · Undo available for {undoSeconds}s</span><button onClick={undoDelete}>Undo</button><button aria-label="Dismiss undo" onClick={()=>setUndoItem(null)}><X size={14}/></button></div>}
 </section>
}
