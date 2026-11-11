# Centric Nexus security implementation notes

## Security model

- Public account registration and Google sign-in have been removed from the client.
- Firebase Authentication email/password is the only interactive sign-in method.
- Account creation, role changes, disabling accounts and role feature grants are callable Cloud Functions requiring the `superAdmin` custom claim.
- Super Admin authority is established only by the trusted bootstrap script, never from an email address or client-side state.
- Existing accounts are disabled by the one-time bootstrap process, except the replacement Super Admin.
- The Super Admin must change the temporary bootstrap password at first sign-in.
- Firestore/Storage rules use signed custom claims plus active workspace membership. Realtime Database rules are closed.
- Vault documents deny all direct client reads/writes. Callable Functions authorize scope/owner, encrypt using AES-256-GCM, and write ciphertext only. Personal vault callable access is owner-only, including against Admins. Shared vault callable access is Admin/Super Admin only.
- Vault encryption key is held as a Firebase Functions secret (`VAULT_MASTER_KEY`), not in the repository or browser.

## Important implementation boundary

The existing project/task workspace is still a browser-local prototype in `src/main.jsx` (localStorage demo data). These changes do not migrate project/task data, comments, discussions, timelines or activity into Firestore. Do not describe the entire workspace as production-ready until that data layer and its queries are migrated and tested. The security rules are intentionally restrictive and will deny reads/writes unless the caller has matching role feature grants.

## One-time Super Admin bootstrap

Run from `functions/` with a secured Firebase Admin service-account credential for project `centric-nexus`. Use the initial temporary password already supplied by the workspace owner; do not put it in a file or shell history.

```bash
cd functions
npm install
export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/centric-nexus-admin-service-account.json"
read -s BOOTSTRAP_ADMIN_PASSWORD
export BOOTSTRAP_ADMIN_PASSWORD
npm run bootstrap
unset BOOTSTRAP_ADMIN_PASSWORD
```

The bootstrap creates or updates `bryan.kiptoo@centricsage.com`, disables every other existing Firebase Auth account, marks their workspace membership disabled, assigns the Super Admin custom claim and makes this user the workspace owner. Store the service-account key securely and remove it from the machine after the operation. This operation is deliberately destructive to existing account access; confirm the project ID before running it.

## Vault key and Functions deployment

Generate a 32-byte key and store it as a Functions secret. Keep a secure offline backup; losing it makes vault ciphertext unrecoverable.

```bash
openssl rand -base64 32
firebase functions:secrets:set VAULT_MASTER_KEY
firebase deploy --only firestore:rules,database,storage,functions
```

Paste the generated key into the secret prompt, not into source files. Use a supported Firebase/Google Cloud billing plan and enable required APIs before deploying Functions.

## Role feature grants

After bootstrap, sign in as Super Admin, open Team & access and set feature grants for each existing role. Newly created users inherit their role's feature grants. After role/feature changes, affected users should refresh their ID token by signing out and back in.

## Credentials register

The credentials register is confidential source material. Do not add plaintext credentials to Git, frontend assets, Firestore metadata, logs, issue trackers or chat. Use the Clients Tools Access vault UI to create the ten environment entries; the server encrypts the sensitive fields before storage. Preserve original wording and add a verification note to entries where the register flags a typo, conflicting VPN password, or uncertain character. The current code package does not contain plaintext credentials or an imported seed file.

Rotate any credentials that have been shared beyond their intended authorized audience.

## Verification checklist before production

1. Test Functions and rules in Firebase Emulator Suite.
2. Confirm the bootstrap process disables existing accounts and that the new Super Admin must change password.
3. Verify non-admin cannot call shared-vault Functions; Admin can; personal entries cannot be read by any other UID, including Admin.
4. Verify direct Firestore reads/writes to vault paths are denied.
5. Verify role feature grants hide UI navigation and deny direct Firestore/Storage access.
6. Migrate project/task data away from localStorage and implement server-side authorization for every write.
7. Add automated tests, deploy to staging, perform security review, then deploy production.
