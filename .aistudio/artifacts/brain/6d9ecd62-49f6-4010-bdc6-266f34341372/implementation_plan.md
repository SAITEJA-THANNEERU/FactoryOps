# Manager-Controlled Technician Assignment & Complete Supabase Database Integration

## Title & Summary
Implement an end-to-end Manager-Controlled Technician Incident Assignment and Resolution System coupled with full Supabase PostgreSQL database persistence across FactoryOps, transitioning all workflows, authentication, audit trails, and technician lifecycle states to Supabase.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following workflow and architecture decisions have been confirmed and incorporated:

- **Confirmed Decision 1 (Assignment Entry Points)**: The Manager/Supervisor can initiate technician assignments from both the **Incidents Management View** (row actions and detail view) and a **Manager Dashboard Quick-Dispatch Panel**.
- **Confirmed Decision 2 (AI Recommendations)**: AI technician recommendations are displayed as **Ranked Technician Cards** highlighting match score percentage, specialisation match, active workload, and experience, while keeping selection fully manual and manager-approved.
- **Confirmed Decision 3 (Rejection & Reassignment Handling)**: When a technician rejects a task or requests reassignment with a stated reason, the task and incident transition to `Pending Reassignment`, triggering high-priority manager notifications for re-dispatch.
- **Confirmed Decision 4 (Database Architecture)**: All application operations (Users, Machines, Incidents, Work Orders, Assignments, Audit Logs, Progress Updates, Verifications, Parts, SOPs) read and write to Supabase PostgreSQL through backend server-side client with the Service Role key, completely deprecating `persistent-store.json`.

---

## 1. Overview & Core Concept

### What It Does
1. **Manager-Controlled Repair Task Creation & Dispatch**: Gives Managers and Plant Admins full authority to review reported factory incidents, generate formal repair work order assignments, evaluate AI-scored technician recommendations or manually browse technician rosters, set repair constraints (priority, due date, estimated duration, instructions), and submit assignments.
2. **Technician Execution & Lifecycle Management**: Assigned technicians receive live actionable notification cards in their dashboard, review machine and fault diagnostics, accept or reject assignments with mandatory rationale, request reassignment, start repairs, record timestamped progress updates with parts used, and submit for verification.
3. **Manager Verification & Audit Closure**: Managers inspect completed work, review repair notes and replacement parts, approve/verify the resolution, or request rework.
4. **Complete Supabase PostgreSQL Persistence**: All entities, state transitions, audit logs, and operational telemetry are persisted directly in Supabase Cloud PostgreSQL via the Express backend server-role adapter, with zero reliance on local JSON files or transient memory.

### Target Audience & Personas
- **Plant Manager / Supervisor**: Dispatches repair tasks, reviews AI skill-matching suggestions, monitors repair progress in real time, and verifies completed work.
- **Maintenance / Industrial Technician**: Receives prioritized assignments matching their specialisation, logs repair steps, and submits resolutions.
- **Plant Admin / Super Admin**: Manages cross-factory technician profiles, machines, and security audit logs.
- **Production Planner**: Views incident downtime impact and maintenance schedules without assignment modification privileges.

### Key Value
Eliminates dispatch bottlenecks, aligns machine fault requirements with verified technician expertise, and ensures enterprise data integrity through immutable Supabase PostgreSQL audit logs.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[ Incident Occurs / Reported ]
            │
            ▼
[ Manager / Supervisor Dashboard / Incidents Table ]
            │
            ├─► Click "Assign Technician" / "Dispatch Repair Task"
            │
            ▼
[ Task Assignment Modal ]
  ├── 1. Incident & Machine Briefing (Telemetry, Severity, Root Cause)
  ├── 2. AI Skill Match Recommendations (Ranked by Match Score & Availability)
  ├── 3. Full Technician Directory (Manual override, Filter by Specialisation)
  ├── 4. Assignment Parameters (Priority, Due Date, Est. Hours, Manager Notes)
  └── 5. Action: "Confirm & Assign Repair Task"
            │
            ▼
[ Supabase Database: Work Order & Incident Updated to PENDING ACCEPTANCE ]
            │
            ▼
[ Technician Dashboard ]
  ├── Receives Actionable Assignment Card (Machine, Fault, Due Date)
  ├── Actions: "Accept Assignment" OR "Decline / Request Reassignment" (with Reason)
  │       │
  │       ├─► [Decline / Reassign] ──► Status: "Pending Reassignment" (Manager Alerted)
  │       │
  │       └─► [Accept] ──► Status: "Accepted"
  │                 │
  │                 ▼
  │         [Start Repair] ──► Status: "In Progress"
  │                 │
  │                 ▼
  │         [Progress Updates] (Log diagnosis, % complete, parts used)
  │                 │
  │                 ▼
  │         [Submit Resolution] (Final root cause, actions, replaced parts)
  │                 │
  │                 ▼
  │         Status: "Resolved – Pending Verification"
  │
  ▼
[ Manager Verification Modal ]
  ├── Review Repair Details, Parts Used, Downtime Impact
  └── Actions: "Verify & Close Incident" OR "Request Additional Work"
            │
            ▼
[ Final State: VERIFIED / CLOSED in Supabase ]
```

### Visual Identity & Theme
- **Aesthetic Direction**: High-density industrial SaaS dashboard following the `frontend-design` constitution. Clean typographic hierarchy, single-elevation cards with subtle 1px borders, zero unboxed pill capsules.
- **Color Tokens**:
  - Background: Neutral Slate (`bg-slate-50` / `dark:bg-slate-950`)
  - Primary Surface: Crisp white with border (`bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800`)
  - Status Hierarchy:
    - *Pending Acceptance / Pending Reassignment*: Amber/Orange subtle indicator
    - *In Progress*: Cyan/Sky blue subtle indicator
    - *Resolved / Pending Verification*: Purple/Indigo subtle indicator
    - *Verified / Closed*: Emerald green subtle indicator
    - *Rejected / Overdue*: Rose/Crimson subtle indicator
- **Typography & Data Grids**:
  - Tabular numerals (`tabular-nums font-mono`) for machine IDs, hours, parts costs, and timestamps.
  - Human editorial headers with natural casing (no code-comment prefixes like `// 01_CORE`).
- **Responsive Layout Integrity**:
  - Adaptive modal layouts with split panels (Incident Telemetry on left, Technician Selection & AI Roster on right).
  - Clean flex-wrap headers preserving user avatar, role badge, and actions without clipping or horizontal overflow.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Entry Points for Manager Assignment**
  - *Chosen Approach*: Managers can dispatch repair tasks directly from the Incidents table actions dropdown/button AND from the Manager Dashboard's "Active Incidents Requiring Dispatch" quick panel.
  - *Why*: Eliminates context switching; managers can dispatch immediately while triaging incidents or reviewing high-level factory health.

- **Decision 2: Ranked AI Cards with Full Manual Selection**
  - *Chosen Approach*: The AI analyzes incident machine type, failure category, and required skills, ranking technicians by composite match score (skills + availability + active workload). The manager can accept the top recommendation with 1 click or manually select any other technician.
  - *Why*: Balances intelligent assistance with manager accountability. AI advises, human decides.

- **Decision 3: Reassignment & Rejection State Machine**
  - *Chosen Approach*: Rejections and reassignment requests require a mandatory reason, set assignment status to `Pending Reassignment`, and surface a high-priority alert on the Manager Dashboard.
  - *Why*: Prevents orphaned incidents from falling through the cracks while giving technicians a legitimate avenue to decline tasks when lacking specific tooling or experiencing workload overload.

- **Decision 4: Supabase Database Migration & JSON Deprecation**
  - *Chosen Approach*: Map assignment and repair workflow records directly to Supabase PostgreSQL using existing relational tables (`work_orders`, `incidents`, `users`, `system_audit_logs`, `maintenance_records`, `spare_parts`) and provide an idempotent SQL migration script (`supabase-technician-assignment-migration.sql`) for dedicated extended tables (`technician_profiles`, `technician_incident_assignments`, `repair_progress_updates`, `incident_resolution_submissions`, `incident_verification_details`). All backend endpoints read and write exclusively to Supabase via `supabaseAdapter`.
  - *Why*: Satisfies the strict requirement to eliminate `persistent-store.json` and in-memory storage while keeping 100% data integrity and backward compatibility.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                     │
│  ┌───────────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │   Manager Dashboard   │  │ Incidents View  │  │ Technician View  │  │
│  │  - Dispatch Panel     │  │ - Assign Action │  │ - Action Cards   │  │
│  │  - Verification Queue │  │ - Status Filter │  │ - Lifecycle Ops  │  │
│  └───────────┬───────────┘  └────────┬────────┘  └────────┬─────────┘  │
└──────────────┼───────────────────────┼────────────────────┼────────────┘
               │                       │                    │
               ▼                       ▼                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   EXPRESS BACKEND (server.ts / Node.js)                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Authenticated & Role-Enforced Route Handlers                     │  │
│  │  - GET  /api/technicians                                         │  │
│  │  - GET  /api/technician-assignments                              │  │
│  │  - POST /api/technician-assignments/recommend                    │  │
│  │  - POST /api/technician-assignments                              │  │
│  │  - POST /api/technician-assignments/:id/accept                   │  │
│  │  - POST /api/technician-assignments/:id/reject                   │  │
│  │  - POST /api/technician-assignments/:id/request-reassignment     │  │
│  │  - POST /api/technician-assignments/:id/start-repair             │  │
│  │  - POST /api/technician-assignments/:id/progress-update          │  │
│  │  - POST /api/technician-assignments/:id/resolve                  │  │
│  │  - POST /api/technician-assignments/:id/verify                   │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
│                                      │                                 │
│                                      ▼                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Supabase Adapter (server/supabase.ts)                            │  │
│  │ (Authenticated with SUPABASE_SERVICE_ROLE_KEY - Superuser access)│  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│               SUPABASE CLOUD POSTGRESQL (fnkldnopljxbmsoofhzh)         │
│  ├── factories (5)                  ├── work_orders (130+)             │
│  ├── users (20+)                    ├── maintenance_records (210+)     │
│  ├── machines (25)                  ├── spare_parts (8)                │
│  ├── production_records (6480)      ├── system_audit_logs (Immutable)  │
│  └── incidents (109+)               └── technician_assignments (Synced)│
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Mapping Strategy
1. **Technicians**: Stored in `users` with `role = 'TECHNICIAN'`. Extended technician metadata (skills, specialisation, experience, active workload) is generated from real user records and Supabase work order history, with dedicated profile synchronization.
2. **Assignments**: Persisted in Supabase as linked `work_orders` and `incidents`. Every assignment creates or updates a `work_order` with `work_order_type = 'Corrective'`, `incident_id`, `technician_id`, `technician_name`, and priority, while atomically updating `incidents.status` and `incidents.technician_id`.
3. **Audit Trail**: Every workflow state transition (`ASSIGNED`, `ACCEPTED`, `REJECTED`, `IN_PROGRESS`, `PROGRESS_UPDATE`, `RESOLVED`, `VERIFIED`) writes a permanent row into `system_audit_logs` in Supabase with user ID, name, action type, entity ID, and detailed JSON payload.
4. **Local JSON Deprecation**: `server/data/persistent-store.json` read/write hooks will be retired and replaced with direct calls through `supabaseAdapter` in `server/supabase.ts`.

---

## 5. Execution Steps

1. **Supabase Schema & Migration File**:
   - Provide `supabase-technician-assignment-migration.sql` with clean DDL for dedicated tables, foreign keys, and indexes.
   - Update `server/supabase.ts` adapter to read/write technician profiles, assignments, progress updates, and verification records directly to Supabase tables and work_orders/incidents/system_audit_logs.
2. **Backend Server Integration (`server.ts` & `server/supabase.ts`)**:
   - Refactor all `/api/technicians` and `/api/technician-assignments/*` endpoints to persist directly to Supabase via `supabaseAdapter`.
   - Ensure strict role authorization:
     - `ADMIN` and `MANAGER_SUPERVISOR`: Can create assignments, recommend technicians, review reassignment requests, and verify repairs.
     - `TECHNICIAN`: Can only view their own assignments, accept/reject, request reassignment, post progress updates, and submit resolutions.
     - `PRODUCTION_PLANNER`: Read-only access to relevant work orders and incidents.
3. **Frontend Manager Assignment Interface**:
   - Implement "Assign Repair Task" modal accessible from Incidents table row actions and Manager Dashboard.
   - Display AI recommendation cards with match scores and technician workload.
   - Enable manual technician selection, task prioritization, due date picking, and estimated duration.
4. **Frontend Technician Dashboard & Lifecycle Execution**:
   - Ensure actionable incident assignment cards appear for logged-in technicians.
   - Add handlers for Accept, Reject with reason, Request Reassignment, Start Repair, Progress Updates (slider + notes + parts used), and Resolution Submission.
5. **Manager Verification Modal**:
   - Add verification modal for Managers to inspect completed repairs, parts used, and confirm closure in Supabase.
6. **Data Migration & Verification**:
   - Sync any existing assignments into Supabase tables and audit logs.
   - Test end-to-end flow from Manager creation -> Technician acceptance -> Repair progress -> Resolution -> Manager verification.
   - Verify all data persists across server restarts and browser reloads.
