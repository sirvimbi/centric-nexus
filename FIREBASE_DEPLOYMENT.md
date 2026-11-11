# Centric Nexus — Firebase setup and deployment

Firebase project: `centric-nexus` (`centric-nexus.firebaseapp.com`). The web configuration in `src/firebase.js` is a browser configuration, not an Admin SDK credential.

## Included in this branch

- Email/password registration, sign-in, password-reset email, Google popup sign-in, session restoration and sign-out through Firebase Authentication.
- `firestore.rules`: workspace-scoped Firestore rules for profiles, workspaces, members, projects, tasks, comments, activity and notifications.
- `database.rules.json`: Realtime Database access controls for workspace records.
- `storage.rules`: workspace-scoped file rules (20 MiB maximum and restricted content types).
- `firebase.json`: connects the rules files and SPA hosting to Firebase CLI deployment.
- Favicon assets in `public/`.

**Important:** Authentication is now wired, but the main workspace UI still uses local sample data and a role-preview selector. It does not yet load/store projects, tasks, comments, memberships or notifications in Firebase. Sign-in alone does not make the application production-ready.

## A. Enable both sign-in methods in Firebase Console

1. Open https://console.firebase.google.com/project/centric-nexus/authentication/providers.
2. Enable **Email/Password** and save.
3. Enable **Google**, select the project's public-facing support email, and save.
4. Open Authentication → Settings → Authorized domains. Confirm `centric-nexus.firebaseapp.com` and `centric-nexus.web.app` are listed. Add any custom production domain used by the app.
5. Test both sign-in methods and password reset on localhost and the final hosting domain. Google popup sign-in must be tested in the browsers you support.

## B. Establish the initial workspace owner safely

Intended initial owner email supplied by the project owner: `kiptoo.bryan@gmail.com`.

1. The owner must first create/sign in to Centric Nexus using that email (Google or email/password). If email/password is used, the account's email should be verified before production access is granted.
2. In Firebase Console → Authentication → Users, locate the account and copy its **UID**. Verify the email and UID belong to the intended owner.
3. Use a trusted, authenticated Admin SDK bootstrap script or a carefully reviewed Firebase Console operation to create `/workspaces/{workspaceId}` with `ownerUid` set to that exact UID, and `name`, `createdAt`, `updatedAt`, and `settings` fields. Do not accept an arbitrary UID from the public client.
4. Test the owner can access only the intended workspace and that a second ordinary account cannot read it.
5. Do **not** grant `Centric super admin` based only on email, a UI dropdown, or client-side code. Cross-workspace privileges require trusted server-side logic/custom claims and a separately reviewed authorization policy. Current Firestore `validRole` intentionally excludes `Centric super admin` from ordinary membership writes.

The app does not currently create the workspace document or member records automatically. Do not invent a UID or use the email as a UID.

## C. Review and deploy database rules

Before deploying, review these rules against the final data schema and run emulator tests. Firestore and Realtime Database are different services; the rule files are separate.

Requirements:
- Node.js 18.18+ (Node 20 LTS recommended).
- Firebase CLI installed (`npm install --global firebase-tools`).
- A trusted operator signed in to the Firebase CLI account that has sufficient Firebase/GCP IAM permissions for project `centric-nexus`.

From the project directory:

```sh
npm install
firebase login
firebase use centric-nexus
firebase deploy --only firestore:rules,database,storage
npm run build
firebase deploy --only hosting
```

Run emulator-based rules tests before deploying to production. `firebase deploy --only firestore:rules,database,storage` publishes the three rules targets configured in `firebase.json`; hosting is a separate deployment.

## D. Required authorization and production work

- Implement Firebase-backed data access; replace the sample arrays/localStorage with authenticated Firestore or Realtime Database reads and writes.
- Remove the client-controlled role selector from production. Resolve roles from trusted workspace membership records and enforce every action with security rules (and trusted server functions for privileged operations).
- Implement real invitation/membership management. Email/password account creation alone is not an invitation or a membership grant.
- Implement workspace creation/owner bootstrap, project-scoped membership, user deactivation/removal, account recovery and verified-email policy.
- Add automated unit, integration and Firebase Emulator security-rule tests for viewer/editor/admin boundaries, cross-workspace isolation, owner protections, and delete/update validation.
- Configure App Check, authorized domains, backups, billing alerts, monitoring and least-privilege IAM before public production use.
- Review retention/privacy requirements and test upload rules against actual Firestore membership data before enabling file uploads.

## Security notes

- Never commit service-account JSON files, private keys, passwords or `.env` files containing secrets.
- Firebase web API keys are identifiers, not admin credentials; authorization depends on security rules and trusted backend operations.
- Do not deploy rules to a database with existing production data without reviewing compatibility and testing representative access paths.
