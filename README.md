# Centric Nexus

**Centric Nexus** is a web-based project and collaboration workspace concept built around a unified view of projects, tasks, ownership, deadlines, discussions and change history.

The product direction is based on the supplied *Hybrid app tasks - DeepSeek* design document. It describes a unified object model where a task, issue, board card, database row and timeline item are different views of the same work item.

## Included in this starter

- Responsive client-facing dashboard with portfolio progress, overdue/on-track indicators and task drill-down.
- Project list and project detail views.
- Task status, priority, assignee, start/due dates and progress.
- Admin workspace with create-project and add-task interactions.
- Workspace role selector demo: Client (view only), Project editor, Admin and Centric Super Admin.
- Project membership / permission controls in the admin view.
- Task activity history and threaded-style comments panel.
- Notification drawer with reminders, task updates and completion notices.
- Search and status filtering.
- Centric Nexus branding using the supplied logo.

## Run locally

Requirements: Node.js 24.12+ for the current locked Firebase SDK dependency tree. Use the Node.js version required by `package-lock.json`.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

To verify a production build:

```bash
npm run build
npm run preview
```

## Important implementation notes

This is a **front-end prototype** using in-memory sample data. Changes are interactive during the current browser session but are not persisted to a server and are not shared between users. Authentication, server-side authorization, database persistence, file uploads, email/push delivery, audit-log immutability, and third-party integrations are not yet implemented.

Do not use this prototype to protect real client information. Before production, implement and test server-enforced tenant isolation and role-based access control; hiding a button in the UI is not a security boundary.

## Recommended production architecture

- **Web:** React + TypeScript, Vite or Next.js, accessible design system.
- **API:** FastAPI or NestJS with REST/GraphQL and WebSocket events.
- **Database:** PostgreSQL for workspaces, projects, work items, memberships, comments, notifications and append-only audit events.
- **Authentication:** OIDC/OAuth, MFA, invitation flow, session management.
- **Files:** S3-compatible object storage with signed URLs and version metadata.
- **Realtime / jobs:** WebSockets plus a queue for notifications, reminders, integrations and automation.
- **Authorization:** server-side workspace/project/object permissions; roles such as Client Viewer, Project Editor, Admin and Centric Super Admin; explicit audit events for permission changes.
- **Delivery:** CI checks, migrations, backups, error monitoring, rate limiting and security testing.

## Suggested build phases

1. Foundation: authentication, workspace tenancy, projects, universal work items, membership roles, client dashboards.
2. Transparency: immutable task history, comments, notifications, reminders and file attachments.
3. Planning: list/board/calendar/timeline/Gantt views, dependencies, milestones and workload.
4. Integrations: GitHub, Figma, Slack/Teams, Google Workspace/Microsoft 365, webhooks.
5. Intelligence: portfolio forecasting, automations, global search and grounded AI assistance.

## Suggested repository name

`centric-nexus`

## License

No license has been selected. Choose one before publishing the repository publicly.
# centric-nexus


## Firebase authentication and deployment

The sign-in screen supports email/password registration and sign-in, Google sign-in, password reset, session restoration, and sign-out. Before testing, enable Email/Password and Google in Firebase Console → Authentication → Sign-in method and add the final site domain under Authorized domains.

Authentication does not grant workspace membership or administrator access. The current workspace screens remain a prototype using local sample data. Read [`FIREBASE_DEPLOYMENT.md`](./FIREBASE_DEPLOYMENT.md) for initial-owner setup, rules deployment, and the remaining production authorization requirements.
