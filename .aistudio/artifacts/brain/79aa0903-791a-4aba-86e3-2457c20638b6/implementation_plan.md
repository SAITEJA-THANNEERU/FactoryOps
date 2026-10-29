# FactoryOps — Role-Based Operations Dashboard Redesign

Reorganize and enhance **FactoryOps — Multi-Factory Operations & Maintenance Platform** into a professional, role-based industrial operations platform with interactive, Power BI-style dashboards across five distinct enterprise roles, preserving the existing architecture, data models, and operational capabilities.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during the requirements clarification interview:
> - **Testing & Evaluation**: A prominent, one-click Demo Role Switcher is integrated directly into the application header and login screen to allow immediate switching between all 5 roles with realistic credentials.
> - **Dashboard Visual Architecture**: Unified Power BI-style analytics grid with a top interactive filter bar (date range, machine, production line, shift, severity/priority), dynamic metric calculations, and click-to-drilldown detail modals.
> - **Navigation Strategy**: On sign-in, each user is directed to their tailored role dashboard (`/dashboard`), with the navigation bar dynamically surfacing the exact operational modules relevant to that role while preserving existing deep-dive pages.

- **Confirmed Decision 1**: Implement the exact 5 primary roles: Super Admin (reserved placeholder), Admin, Manager / Supervisor, Technician, and Production Planner.
- **Confirmed Decision 2**: Super Admin dashboard remains a clean, empty placeholder for future development, while preserving its route and tenant-inspection foundation.
- **Confirmed Decision 3**: The remaining four roles receive specialized KPI cards, Recharts visualizations, interactive operational tables, and action workflows grounded in the actual dataset.

---

## 1. Overview & Core Concept

- **What It Does**: FactoryOps transforms raw plant telemetry, production shifts, machine diagnostics, maintenance logs, and incident reports into role-optimized command consoles.
- **Target Personas**:
  1. **Super Admin**: Multi-tenant platform administrator (reserved placeholder view).
  2. **Admin**: Plant Director / General Manager monitoring holistic factory health, aggregate OEE, machine availability, and regulatory compliance.
  3. **Manager / Supervisor**: Floor Operations Lead driving daily shift targets, resolving floor bottlenecks, tracking real-time line achievement, and mitigating downtime.
  4. **Technician**: Maintenance Specialist executing assigned work orders, monitoring machine vibration/temperature telemetry, and updating repair statuses.
  5. **Production Planner**: Industrial Engineering / Planning Specialist optimizing target vs. actual yield, tracking production shortfalls, analyzing scrap/defects, and evaluating line capacity.
- **Key Value**: Delivers role-tailored operational visibility and cross-filtering without data fabrication, keeping factory-level isolation and authentication secure.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Authentication & Fast Switching**:
   - Users can authenticate via standard PBKDF2-hashed credentials or select any of the 5 roles from the one-click demo drawer.
   - Upon authentication, users are redirected to their designated role view on `/dashboard`.

2. **Power BI-Style Operational Exploration**:
   - **Top Filter Strip**: Dynamic multi-select controls for Date Range (Last 7 Days, Last 14 Days, Today), Machine, Production Line (Line 1/2/3), Shift (Morning, Afternoon, Night), Status, and Priority.
   - **Cross-Calculated KPI Strip**: Tabular figures (`tabular-nums`) with clear units (units, %, hours, °C, mm/s).
   - **Interactive Visualizations**: Planned vs. actual grouped bars, achievement percentage area/line curves, defect distributions, downtime bar breakdowns, and machine health telemetry.
   - **Drill-Down Detail Modals**: Clicking any machine card or table row opens the full `MachineDetailModal`, `CreateIncidentModal`, or `CreateWorkOrderModal` with live state persistence.

3. **Technician Execution Flow**:
   - Immediate visibility into "My Assigned Work Orders" and "Machines Requiring Attention".
   - Direct inline action buttons to transition work order statuses (`Pending` → `In Progress` → `Completed`) and inspect maintenance manuals/SOPs.

### Visual Identity & Theme

- **Design System Posture**: Utilitarian industrial precision adhering to the Universal Frontend Design Constitution and SaaS/Dashboard domain guidelines.
- **Palette**:
  - Dominant Canvas (60%): Clean slate-50 (`#F8FAFC`) background with pure white (`#FFFFFF`) structural surfaces.
  - Structural Surfaces (30%): Hairline slate-200 (`#E2E8F0`) borders, slate-700 body typography, slate-900 headers.
  - Semantic Accent Budget (10%):
    - Emerald (`#059669` / `#10B981`): Operational, nominal yield, completed work orders.
    - Amber (`#D97706`): Warning machines, pending tasks, shift targets at risk.
    - Crimson (`#DC2626`): High/critical incidents, equipment offline, overdue tasks.
    - Indigo / Blue (`#4F46E5` / `#2563EB`): Planned vs. actual targets, technician assignments.
- **Typographic Discipline**:
  - Headings: Crisp sans font with tight letter spacing (`tracking-tight`).
  - Metrics & Telemetry: Monospace tabular numerals (`font-mono tabular-nums`) to prevent layout shift.
  - Zero-Pill Rule: Unboxed metadata with typographic dot separators (`·`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Role Dashboard Routing vs Separate Applications**
  - *Chosen Approach*: Maintain a single, cohesive `/dashboard` component that dynamically selects the role-specific view (`AdminDashboardView`, `ManagerDashboardView`, `TechnicianDashboardView`, `PlannerDashboardView`, `SuperAdminReservedView`).
  - *Why*: Eliminates code fragmentation, ensures shared filter contexts, and preserves existing deep-dive pages (`/production`, `/machines`, `/incidents`, `/work-orders`, `/sops`, `/quality`) without duplicate routes.
  - *Alternatives Considered*: Creating 5 separate URLs (e.g. `/admin-dashboard`, `/technician-dashboard`). Passed over because it breaks bookmarking, complicates role transitions, and splits global filter states.

- **Decision 2: Safe Mathematical Aggregations for Production Planning**
  - *Chosen Approach*:
    - Achievement %: `(actual / planned) * 100` (safe division, capped at 100% or displayed with overflow indicator when over-producing).
    - Production Shortfall: `Math.max(0, planned - actual)`. Surpluses are computed separately to prevent negative shortfalls from distorting production loss metrics.
  - *Why*: Direct compliance with industrial manufacturing accounting standards.

- **Decision 3: Empty State for Super Admin**
  - *Chosen Approach*: Keep the existing Super Admin route, header, and layout intact, but render a clean, professional "Platform Management Console — Reserved for Future Expansion" placeholder without mock data or fabricated operational metrics.
  - *Why*: Strictly fulfills Role 1 specification without removing underlying tenant inspection architecture.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FactoryOps Client (React 19)                    │
├────────────────────────────────────────────────────────────────────────┤
│  AuthContext (User Session & Role)  │  FilterContext (Date, Shift, Line)│
│  DataContext (Machines, Production, Maintenance, Incidents, WorkOrders)│
├────────────────────────────────────────────────────────────────────────┤
│                                Header                                  │
│   [Brand: FactoryOps] ── [Plant Context] ── [Quick Role Switcher] ── [Me]│
├────────────────────────────────────────────────────────────────────────┤
│                                Navbar                                  │
│  Role-Filtered Tabs: Overview · Operations · Machines · WOs · SOPs...   │
├────────────────────────────────────────────────────────────────────────┤
│                             /dashboard                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Global Filter Strip (Date Range, Line, Machine, Shift, Priority) │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │ Switch (user.role)                                               │  │
│  │  ├── 'SUPER_ADMIN'         -> SuperAdminReservedView             │  │
│  │  ├── 'ADMIN'               -> AdminDashboardView                 │  │
│  │  ├── 'MANAGER_SUPERVISOR'  -> ManagerDashboardView               │  │
│  │  ├── 'TECHNICIAN'          -> TechnicianDashboardView            │  │
│  │  └── 'PRODUCTION_PLANNER'  -> ProductionPlannerDashboardView     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Interactive Modals: MachineDetailModal · IncidentModal · WorkOrderModal│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ JSON API (Bearer Auth)
┌────────────────────────────────────▼───────────────────────────────────┐
│                      Express Full-Stack Server (server.ts)             │
│  ├── /api/auth/*       (PBKDF2 authentication, role tokens)             │
│  ├── /api/factories/*  (Tenant isolation enforcement)                  │
│  ├── /api/machines/*   (Telemetry, health scores, lines)               │
│  ├── /api/production/* (Shift records, targets, actuals, defects)      │
│  ├── /api/incidents/*  (Severity, status, machine associations)        │
│  └── /api/work-orders/*(Assignments, statuses, PATCH lifecycle)        │
│                                                                        │
│                In-Memory Seed Store (server/db.ts)                     │
│  5 Factories · Seed Accounts for All 5 Roles · 14-Day Production Data   │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Implementation Plan

1. **Role Model Normalization (`src/types/index.ts` & `server/db.ts`)**:
   - Update `UserRole` union: `'SUPER_ADMIN' | 'ADMIN' | 'MANAGER_SUPERVISOR' | 'TECHNICIAN' | 'PRODUCTION_PLANNER'`.
   - Seed representative users for each role in demo factories (Apex Precision, Nova Systems, Vertex Auto) with standard test credentials.
   - Support backwards-compatibility for existing accounts.

2. **Role-Aware Navigation & Header (`src/components/Navbar.tsx` & `src/components/Header.tsx`)**:
   - Configure dynamic navigation item arrays matching the prompt's suggested role schemas.
   - Embed a sleek, non-intrusive Quick Role Switcher dropdown/pill in the Header, enabling instant role testing without tedious manual logouts.
   - Update login screen with one-click cards for all 5 roles.

3. **Power BI-Style Visualizations & Views (`src/components/dashboard/`)**:
   - `AdminDashboardView.tsx`: High-level operational command center with 7 KPI cards, Planned vs. Actual chart, Machine Status breakdown, Defect trends, Severity groupings, Work Order statuses, Machine Health list, and Recent Activity tables.
   - `ManagerDashboardView.tsx`: Floor operations center with 8 KPI cards, Planned vs. Actual comparison, Production Achievement Trendline, Machine Performance bars, Defect Breakdown, Shift Comparison, Downtime Analysis, and Machines Requiring Attention table.
   - `TechnicianDashboardView.tsx`: Maintenance work console with 6 KPI cards (Assigned, High-Priority, In-Progress, Overdue, Completed, Attention Required), Work Orders by Status/Priority, Maintenance Activity chart, Machine Telemetry cards (temp/vibration/health score), My Assigned Tasks table, and inline status update actions.
   - `ProductionPlannerDashboardView.tsx`: Planning & yield intelligence center with 8 KPI cards (Planned, Actual, Shortfall, Achievement %, Defects, OEE, Downtime, Impacting WOs), Clustered Planned vs. Actual bars, Achievement % curve, Shift-wise distribution, Machine Shortfall identification, and Work Order Impact matrix.
   - `SuperAdminReservedView.tsx`: Elegant, clean placeholder card indicating reservation for future expansion, maintaining route integrity.

4. **Interactive Filters & Data Grounding (`src/contexts/FilterContext.tsx`)**:
   - Expand filter state to include date ranges (Today, 7D, 14D), shift selection, line selection, status, and severity.
   - Ensure all calculations derive directly from actual in-memory production, machine, maintenance, and incident records without fabrication.

5. **Verification & Testing**:
   - Verify `compile_applet` and `lint_applet` with zero TypeScript errors.
   - Verify API response contracts on port 3000.
   - Verify seamless role transitions via the quick switcher.
