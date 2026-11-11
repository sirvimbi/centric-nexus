// One-time trusted bootstrap. Run only in a secured admin environment.
// Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service-account file and
// BOOTSTRAP_ADMIN_PASSWORD via a secret manager/environment (never commit it).
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
const email="bryan.kiptoo@centricsage.com";
const password=process.env.BOOTSTRAP_ADMIN_PASSWORD;
if(!password || password.length<16) throw new Error("Set BOOTSTRAP_ADMIN_PASSWORD to a strong temporary password (16+ characters).");
initializeApp({credential:applicationDefault(),projectId:"centric-nexus"});
const auth=getAuth(),db=getFirestore();
let user;
try { user=await auth.getUserByEmail(email); }
catch(e){ if(e.code!=="auth/user-not-found") throw e; user=await auth.createUser({email,password,displayName:"Centric Nexus Super Admin",emailVerified:false}); }
// Disable every pre-existing account except the replacement Super Admin.
let pageToken;
do {
 const page=await auth.listUsers(1000,pageToken);
 for (const existing of page.users) {
  if (existing.uid!==user.uid) {
   await auth.updateUser(existing.uid,{disabled:true});
   await db.doc(`workspaces/centric/members/${existing.uid}`).set({status:"disabled",updatedAt:FieldValue.serverTimestamp()},{merge:true});
  }
 }
 pageToken=page.pageToken;
} while(pageToken);
await auth.updateUser(user.uid,{disabled:false,password});
await auth.setCustomUserClaims(user.uid,{role:"Centric super admin",superAdmin:true,mustChangePassword:true,features:{}});
await db.doc(`users/${user.uid}`).set({uid:user.uid,email,displayName:"Centric Nexus Super Admin",role:"Centric super admin",status:"active",mustChangePassword:true,createdAt:FieldValue.serverTimestamp()},{merge:true});
await db.doc(`workspaces/centric`).set({name:"Centric workspace",ownerUid:user.uid,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});
await db.doc(`workspaces/centric/members/${user.uid}`).set({uid:user.uid,email,displayName:"Centric Nexus Super Admin",role:"Centric super admin",status:"active",createdAt:FieldValue.serverTimestamp()},{merge:true});
console.log(`Bootstrapped Super Admin ${email} (${user.uid}). Require password change at first sign-in.`);
