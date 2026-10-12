# Expense Approval

A multi-level expense approval application built with **SAP CAP (Node.js)** and **SAPUI5**.
Employees submit expense requests with line items, managers approve or decline them level by level
along the reporting line, and finance reimburses approved requests.

## Features

- **Expense requests** with multiple line items (expense type, date, amount, justification)
- **Draft handling**: save a request as a draft, edit it, submit it later
- **Business rules enforced on the server**
  - Per-type maximum amounts (e.g. MEAL, TAXI, OFFICE); amounts above the cap require a justification
  - Expense dates must not be in the future (1-day tolerance)
  - Inactive expense types are rejected
  - Request numbers generated from a number range (`REQ-YYYY-NNNNNN`)
- **Multi-level approval** via a `CurrentApprover` pointer that moves up the manager chain
  (`Submitted` → `Inprogress` → `Approved`, or `Rejected` at any level)
- **Reimbursement** by finance with an accepted amount (never above the requested amount)
- **Role-based UI and authorization**: employee, manager, finance, admin
- **Master data maintenance** (expense types, employees, number ranges) for admins

## Roles

| Role     | Can do |
|----------|--------|
| employee | Create, edit, delete and submit own draft requests; read own requests |
| manager  | Approve or decline requests where they are the current approver; read requests of direct reports and requests they handled |
| finance  | Read approved and reimbursed requests; reimburse approved requests |
| admin    | Maintain master data only (no access to expense data) |

Authorization is enforced in CDS with `@restrict` (including on the composition children
`ExpenseItems` and `ExpenseApprovals`). Hiding buttons in the UI is only a convenience.

## Project structure

| Path | Content |
|------|---------|
| `db/schema.cds` | Domain model (requests, items, approvals, employees, expense types, number ranges) |
| `db/data/` | CSV seed data |
| `srv/expense-service.cds` / `.js` | Expense service: authorization, actions (submit, approve, decline, reimburse), validations |
| `srv/masterdata-service.cds` / `.js` | Admin service for master data |
| `srv/masterdata-annotations.cds` | UI annotations for the master data app |
| `app/expense-approval/` | SAPUI5 freestyle app (OData V4) |

## Getting started

```bash
npm install
npm start          # cds watch
```

Open the app at `http://localhost:4004/expenseapproval/index.html`.

### Test users (mocked authentication, local development only)

| User | Role |
|------|------|
| `employee@company.com` | employee |
| `employee2@company.com` | employee |
| `manager@company.com` | manager |
| `manager2@company.com` | manager |
| `manager3@company.com` | manager |
| `finance@company.com` | finance |
| `admin@company.com` | admin |

Password for all users: `123456`.
These credentials are for the mocked auth profile only and must never be used in production.

### Multi-level approval demo

Seed data contains reporting chains so you can walk through the flow:
`employee` submits → `manager` approves (request becomes `Inprogress`) → the manager's own manager
approves (request becomes `Approved`) → `finance` reimburses.

## Design notes

- **Approval chain via a pointer.** `CurrentApprover` is set on submit to the employee's manager and
  moved up one level on each approval. Declining ends the chain (`CurrentApprover` becomes `null`).
  Trade-off: if an employee's manager changes while a request is `Inprogress`, the pointer is not
  recalculated.
- **Child entities are exposed explicitly.** `ExpenseItems` is declared as its own projection so that
  a `@restrict` can be attached; auto-exposed composition children inherit roles but not the `where`
  condition of their parent.
- **Draft flow.** The UI keeps form state in JSON models and talks to the OData V4 draft API
  (`draftEdit` / `draftActivate`) when saving.

## Known limitations

- `ReceiptRequired` is not checked on the server (there is no attachment field yet)
- Currencies other than IDR are accepted
- A draft without items can be activated (submit still rejects it)
- Deleting an item of an own draft directly leaves `TotalAmount` stale until the next submit
- Approval and reimbursement are not protected against two simultaneous clicks
- No automated tests yet
- UI5 is loaded from a CDN

## Tech stack

SAP CAP (`@sap/cds` 9), Node.js, Express, SQLite (development), SAPUI5 1.143, OData V4.