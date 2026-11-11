import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "node:crypto";

initializeApp();
const db = getFirestore();
const auth = getAuth();
const vaultKey = defineSecret("VAULT_MASTER_KEY");
const REGION = "africa-south1";
const WORKSPACE = "centric";
// Restrict callable endpoints to the deployed web app origins. Firebase callable
// handlers process OPTIONS preflight requests when CORS is configured here.
const CALLABLE_CORS = ["https://centric-nexus.web.app", "https://centric-nexus.firebaseapp.com"];

function actor(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  return request.auth;
}
function requireSuper(request) {
  const a = actor(request);
  if (a.token.superAdmin !== true) throw new HttpsError("permission-denied", "Super Admin access required.");
  return a;
}
function requireVaultAccess(request, scope, ownerUid) {
  const a = actor(request);
  if (scope === "personal") {
    if (a.uid !== ownerUid) throw new HttpsError("permission-denied", "Personal entries are private to their owner.");
  } else if (a.token.superAdmin !== true && a.token.role !== "Admin") {
    throw new HttpsError("permission-denied", "Shared vault access is restricted to Admins and Super Admins.");
  }
  return a;
}
function encrypt(value) {
  const key = Buffer.from(vaultKey.value(), "base64");
  if (key.length !== 32) throw new HttpsError("internal", "Vault encryption key is not configured correctly.");
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { v: 1, alg: "A256GCM", iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}
function decrypt(blob) {
  const key = Buffer.from(vaultKey.value(), "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(blob.ciphertext, "base64")), decipher.final()]).toString("utf8"));
}
function cleanString(v, max=5000) {
  if (typeof v !== "string" || v.length > max) throw new HttpsError("invalid-argument", "Invalid entry field.");
  return v;
}

export const createWorkspaceUser = onCall({ region: REGION, cors: CALLABLE_CORS }, async request => {
  const admin = requireSuper(request);
  const { email, password, displayName, role } = request.data || {};
  if (!["Client viewer","Project editor","Admin"].includes(role)) throw new HttpsError("invalid-argument","Unsupported role.");
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 6) throw new HttpsError("invalid-argument","Provide a valid email and a temporary password of at least 6 characters.");
  const user = await auth.createUser({ email: email.trim().toLowerCase(), password, displayName: cleanString(displayName || "",100), disabled: false });
  const grantDoc = await db.doc(`workspaces/${WORKSPACE}/roleFeatures/${encodeURIComponent(role)}`).get();
  const features = grantDoc.exists ? grantDoc.data().features : {};
  await auth.setCustomUserClaims(user.uid, { role, superAdmin: false, mustChangePassword: true, features });
  await db.doc(`workspaces/${WORKSPACE}/members/${user.uid}`).set({ uid:user.uid,email:user.email,displayName:user.displayName||"",role,status:"active",createdAt:FieldValue.serverTimestamp() });
  await db.doc(`users/${user.uid}`).set({ uid:user.uid,email:user.email,displayName:user.displayName||"",role,status:"active",mustChangePassword:true,createdAt:FieldValue.serverTimestamp() });
  await db.doc(`workspaces/${WORKSPACE}/activity/${crypto.randomUUID()}`).set({ actorUid:admin.uid,action:"user.created",entityType:"user",entityId:user.uid,summary:"Created workspace account",createdAt:FieldValue.serverTimestamp() });
  return { uid:user.uid,email:user.email };
});

export const updateWorkspaceUser = onCall({ region: REGION, cors: CALLABLE_CORS }, async request => {
  const admin = requireSuper(request);
  const { uid, role, disabled, password, displayName, features } = request.data || {};
  if (typeof uid !== "string") throw new HttpsError("invalid-argument","User id required.");
  const target = await auth.getUser(uid);
  if (uid === admin.uid && role && role !== "Centric super admin") throw new HttpsError("failed-precondition","Cannot demote the active Super Admin.");
  const claims = { ...(target.customClaims || {}) };
  if (role !== undefined) {
    if (!["Client viewer","Project editor","Admin"].includes(role)) throw new HttpsError("invalid-argument","Unsupported role.");
    claims.role = role;
    const roleGrant = await db.doc(`workspaces/${WORKSPACE}/roleFeatures/${encodeURIComponent(role)}`).get();
    claims.features = roleGrant.exists ? roleGrant.data().features : {};
    await db.doc(`workspaces/${WORKSPACE}/members/${uid}`).set({uid,email:target.email,displayName:displayName ?? target.displayName ?? "",role,status:disabled ? "disabled":"active",updatedAt:FieldValue.serverTimestamp()},{merge:true});
  }
  if (features !== undefined) {
    if (!claims.superAdmin) throw new HttpsError("failed-precondition","Feature grants are managed on role claims by Super Admin.");
    claims.features = Object.fromEntries(["Overview","Projects","My tasks","Timeline","Discussions","Team & access","Activity log","Settings","Clients Tools Access"].map(k=>[k,features[k]===true]));
  }
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 6) throw new HttpsError("invalid-argument","Password must be at least 6 characters.");
    await auth.updateUser(uid,{password});
    claims.mustChangePassword = true;
  }
  if (displayName !== undefined) {
    await auth.updateUser(uid,{displayName:cleanString(displayName,100)});
    await db.doc(`users/${uid}`).set({displayName,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  }
  await auth.setCustomUserClaims(uid,claims);
  if (disabled !== undefined) {
    await auth.updateUser(uid,{disabled:disabled===true});
    await db.doc(`workspaces/${WORKSPACE}/members/${uid}`).set({status:disabled?"disabled":"active",updatedAt:FieldValue.serverTimestamp()},{merge:true});
  }
  return {ok:true};
});

export const changeOwnPassword = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
  const a=actor(request), {password}=request.data||{};
  if(typeof password!=="string"||password.length<6) throw new HttpsError("invalid-argument","Password must be at least 6 characters.");
  await auth.updateUser(a.uid,{password});
  const u=await auth.getUser(a.uid), claims={...(u.customClaims||{}),mustChangePassword:false};
  await auth.setCustomUserClaims(a.uid,claims);
  return {ok:true};
});

export const saveVaultEntry = onCall({region:REGION,cors:CALLABLE_CORS,secrets:[vaultKey]},async request=>{
  const a=actor(request), d=request.data||{};
  const scope=d.scope, ownerUid=scope==="personal"?a.uid:"shared";
  requireVaultAccess(request,scope,ownerUid);
  if(!["personal","shared"].includes(scope)) throw new HttpsError("invalid-argument","Invalid vault scope.");
  const id=typeof d.id==="string"&&/^[a-zA-Z0-9_-]{1,100}$/.test(d.id)?d.id:crypto.randomUUID();
  const data={title:cleanString(d.title,160),clientName:cleanString(d.clientName||"",160),category:cleanString(d.category,80),username:cleanString(d.username||"",500),password:cleanString(d.password||"",4000),host:cleanString(d.host||"",500),port:cleanString(d.port||"",30),notes:cleanString(d.notes||"",10000),setup:cleanString(d.setup||"",12000)};
  const ref=db.doc(`vault/${scope==="shared"?"shared":"personal_"+a.uid}/entries/${id}`);
  const old=await ref.get();
  if(old.exists && old.data().createdBy!==a.uid && a.token.superAdmin!==true && a.token.role!=="Admin") throw new HttpsError("permission-denied","Cannot edit this entry.");
  const previous=old.exists?decrypt(old.data().encrypted):null;
  const changedFields=old.exists?Object.keys(data).filter(key=>String(previous?.[key]??"")!==String(data[key]??"")):Object.keys(data).filter(key=>String(data[key]??"")!=="");
  await ref.set({scope,ownerUid,encrypted:encrypt(data),title:data.title,category:data.category,host:data.host,createdBy:old.exists?old.data().createdBy:a.uid,createdAt:old.exists?old.data().createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  if(!old.exists || changedFields.length) await db.collection("vaultAudit").add({scope,entryId:id,actorUid:a.uid,action:old.exists?"updated":"created",changedFields,createdAt:FieldValue.serverTimestamp()});
  return {id};
});

export const listVaultEntries = onCall({region:REGION,cors:CALLABLE_CORS,secrets:[vaultKey]},async request=>{
  const a=actor(request),scope=request.data?.scope;
  const ownerUid=scope==="personal"?a.uid:"shared"; requireVaultAccess(request,scope,ownerUid);
  if(!["personal","shared"].includes(scope)) throw new HttpsError("invalid-argument","Invalid vault scope.");
  const snap=await db.collection(`vault/${scope==="shared"?"shared":"personal_"+a.uid}/entries`).get();
  const active=snap.docs.filter(doc=>!doc.data().deletedAt);
  const auditSnap=await db.collection("vaultAudit").where("scope","==",scope).get();
  const latestByEntry=new Map();
  auditSnap.docs.forEach(doc=>{
    const event=doc.data(),current=latestByEntry.get(event.entryId);
    const millis=event.createdAt?.toMillis?.()||0;
    if(!current||millis>(current.createdAt?.toMillis?.()||0)) latestByEntry.set(event.entryId,event);
  });
  const actorIds=[...new Set([...latestByEntry.values()].map(event=>event.actorUid).filter(Boolean))];
  const actorNames=new Map();
  await Promise.all(actorIds.map(async uid=>{try{const u=await auth.getUser(uid);actorNames.set(uid,u.displayName||u.email||"Workspace user")}catch{actorNames.set(uid,"Former or unavailable user")}}));
  return {entries:active.map(doc=>{
    const data=doc.data(),event=latestByEntry.get(doc.id);
    const changed=event?.action==="updated"&&event.changedFields?.length
      ?"Changed "+event.changedFields.map(k=>({title:"credential name",category:"category",username:"username",password:"password",host:"host",port:"port",notes:"notes",setup:"setup instructions",clientName:"client account"}[k]||k)).join(", ")
      :event?.action==="created"?"Credential created":event?.action==="deleted"?"Credential deleted":event?.action==="restored"?"Credential restored":"Credential saved";
    const date=event?.createdAt?.toDate?.();
    const summary=event?(changed+" · "+(actorNames.get(event.actorUid)||"Workspace user")+(date?" · "+date.toLocaleDateString("en-GB"):"")):"No change log recorded yet";
    return {id:doc.id,...data,...decrypt(data.encrypted),encrypted:undefined,lastChange:{summary}};
  })};
});

export const deleteVaultEntry = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
  const a=actor(request),{scope,id}=request.data||{},ownerUid=scope==="personal"?a.uid:"shared";
  requireVaultAccess(request,scope,ownerUid);
  if(!["personal","shared"].includes(scope)||typeof id!=="string") throw new HttpsError("invalid-argument","Invalid vault entry.");
  const ref=db.doc(`vault/${scope==="shared"?"shared":"personal_"+a.uid}/entries/${id}`);
  const snap=await ref.get(); if(!snap.exists) return {ok:true};
  await ref.set({deletedAt:FieldValue.serverTimestamp(),deletedBy:a.uid},{merge:true});
  await db.collection("vaultAudit").add({scope,entryId:id,actorUid:a.uid,action:"deleted",changedFields:[],createdAt:FieldValue.serverTimestamp()});
  return {ok:true};
});

export const restoreVaultEntry = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
  const a=actor(request),{scope,id}=request.data||{},ownerUid=scope==="personal"?a.uid:"shared";
  requireVaultAccess(request,scope,ownerUid);
  if(!["personal","shared"].includes(scope)||typeof id!=="string") throw new HttpsError("invalid-argument","Invalid vault entry.");
  const ref=db.doc(`vault/${scope==="shared"?"shared":"personal_"+a.uid}/entries/${id}`);
  const snap=await ref.get();
  if(!snap.exists||!snap.data().deletedAt) throw new HttpsError("not-found","Deleted credential is no longer available to restore.");
  await ref.update({deletedAt:FieldValue.delete(),deletedBy:FieldValue.delete(),updatedAt:FieldValue.serverTimestamp()});
  await db.collection("vaultAudit").add({scope,entryId:id,actorUid:a.uid,action:"restored",changedFields:[],createdAt:FieldValue.serverTimestamp()});
  return {ok:true};
});

export const listWorkspaceUsers = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
 requireSuper(request);
 const snap=await db.collection(`workspaces/${WORKSPACE}/members`).get();
 return {users:await Promise.all(snap.docs.map(async d=>{const u=await auth.getUser(d.id);return {uid:u.uid,email:u.email||"",displayName:u.displayName||"",role:d.data().role,status:d.data().status||"active",disabled:u.disabled};}))};
});

export const setRoleFeatureGrants = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
 requireSuper(request);
 const {role,features}=request.data||{};
 if(!["Client viewer","Project editor","Admin"].includes(role)||!features||typeof features!=="object") throw new HttpsError("invalid-argument","Invalid role or feature grants.");
 const allowed=["Overview","Projects","My tasks","Timeline","Discussions","Team & access","Activity log","Settings","Clients Tools Access"];
 const grants=Object.fromEntries(allowed.map(k=>[k,features[k]===true]));
 await db.doc(`workspaces/${WORKSPACE}/roleFeatures/${encodeURIComponent(role)}`).set({role,features:grants,updatedAt:FieldValue.serverTimestamp(),updatedBy:request.auth.uid});
 const members=await db.collection(`workspaces/${WORKSPACE}/members`).where("role","==",role).get();
 for(const member of members.docs){
  const u=await auth.getUser(member.id),claims={...(u.customClaims||{}),role,features:grants};
  await auth.setCustomUserClaims(member.id,claims);
 }
 return {updated:members.size};
});

export const deleteWorkspaceUser = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
 const admin=requireSuper(request),uid=request.data?.uid;
 if(typeof uid!=="string"||uid===admin.uid) throw new HttpsError("invalid-argument","A different user id is required.");
 await auth.deleteUser(uid);
 await db.doc(`workspaces/${WORKSPACE}/members/${uid}`).delete();
 await db.doc(`users/${uid}`).delete();
 await db.collection(`workspaces/${WORKSPACE}/activity`).add({actorUid:admin.uid,action:"user.deleted",entityType:"user",entityId:uid,summary:"Deleted workspace account",createdAt:FieldValue.serverTimestamp()});
 return {ok:true};
});


// Credential audit history: field names only are recorded; secret values are never copied into the audit log.
export const listVaultAudit = onCall({region:REGION,cors:CALLABLE_CORS,secrets:[vaultKey]},async request=>{
 const a=actor(request),{scope,entryId}=request.data||{},ownerUid=scope==="personal"?a.uid:"shared";
 requireVaultAccess(request,scope,ownerUid);
 if(!["personal","shared"].includes(scope)||typeof entryId!=="string") throw new HttpsError("invalid-argument","Invalid audit request.");
 // Query by scope only to avoid a composite-index requirement; filter the selected entry locally.
 const snap=await db.collection("vaultAudit").where("scope","==",scope).get();
 const events=snap.docs.map(doc=>({id:doc.id,...doc.data()})).filter(item=>item.entryId===entryId);
 const entryRef=db.doc("vault/"+(scope==="shared"?"shared":"personal_"+a.uid)+"/entries/"+entryId);
 const entry=await entryRef.get();
 if(entry.exists&&!events.some(x=>x.action==="created")){const d=entry.data();events.push({id:"created-"+entryId,actorUid:d.createdBy,action:"created",changedFields:Object.keys(decrypt(d.encrypted)).filter(k=>k!=="password"),createdAt:d.createdAt});}
 events.sort((x,y)=>(y.createdAt?.toMillis?.()||0)-(x.createdAt?.toMillis?.()||0));
 return {history:await Promise.all(events.slice(0,100).map(async item=>{
  let who="Former or unavailable user";
  try{const u=await auth.getUser(item.actorUid);who=u.displayName||u.email||"Workspace user"}catch{}
  return {id:item.id,action:item.action,changedFields:item.changedFields||[],who,createdAt:item.createdAt?.toDate?.().toISOString()||null};
 }))};
});
// Categories are centrally managed and can only be changed by the Super Admin.
export const listVaultCategories = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
 actor(request);
 const snap=await db.collection("vaultCategories").get();
 const defaults=[
  {id:"application",name:"Application"},{id:"database",name:"Database"},{id:"server",name:"Server"},
  {id:"virtual-machine",name:"Virtual machine"},{id:"network",name:"Network"},{id:"vpn",name:"VPN"},
  {id:"email",name:"Email"},{id:"cloud",name:"Cloud service"},{id:"domain",name:"Domain / hosting"},{id:"other",name:"Other"}
 ];
 const byId=new Map(defaults.map(x=>[x.id,x]));
 snap.docs.forEach(doc=>{const d=doc.data();if(d.deleted===true)byId.delete(doc.id);else if(d.name)byId.set(doc.id,{id:doc.id,name:d.name})});
 return {categories:[...byId.values()].sort((a,b)=>a.name.localeCompare(b.name))};
});
export const saveVaultCategory = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
 const a=requireSuper(request),{id,name}=request.data||{};
 if(typeof name!=="string"||!name.trim()||name.trim().length>60) throw new HttpsError("invalid-argument","Category name must be 1–60 characters.");
 const categoryId=typeof id==="string"&&/^[a-z0-9_-]{1,80}$/.test(id)?id:name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
 await db.doc("vaultCategories/"+categoryId).set({name:name.trim(),deleted:false,updatedBy:a.uid,updatedAt:FieldValue.serverTimestamp()},{merge:true});
 return {id:categoryId,name:name.trim()};
});
export const deleteVaultCategory = onCall({region:REGION,cors:CALLABLE_CORS},async request=>{
 requireSuper(request);const id=request.data?.id;
 if(typeof id!=="string"||!id) throw new HttpsError("invalid-argument","Category id required.");
 await db.doc("vaultCategories/"+id).set({deleted:true,updatedBy:request.auth.uid,updatedAt:FieldValue.serverTimestamp()},{merge:true});return {ok:true};
});
