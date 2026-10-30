# Life Saviour

Care coordination platform for clinic staff who manage patient follow-ups across clinics, laboratories, and pharmacies. Built for the applied AI / agentic AI hackathon track.

## The problem

A patient's care usually spans several providers. A lab result never reaches the clinician, a follow-up appointment is missed, a prescription is never collected. Nobody owns the gap, so it stays invisible until the patient comes back sicker.

Life Saviour makes every gap visible and every handoff owned.

## What it does

- **Today queue** for staff: overdue, due today, waiting on patient, and escalated tasks in one screen, each with a one-click done, snooze, or escalate.
- **Patient timeline**: every care plan step and task for one patient in date order, with missed steps highlighted and explained in plain language.
- **Consent gate**: a patient whose consent is missing or expired gets a warning banner and blocked outreach actions.
- **Escalation with SLA**: an overdue task that passes its SLA hours becomes an escalation with a breach time.
- **Audit log**: every status and consent change recorded with actor, action, and reason, visible to admins only.

## Screens

| Route | Purpose |
| --- | --- |
| Today | Staff task queue grouped by urgency |
| Patient Timeline | Single patient journey with missed steps |
| Consent | Consent records, scope, validity, status |
| Audit Log | Filterable change history, admin only |

## Data model

`Patient`, `CarePlan`, `CareTask`, `Consent`, `Escalation`, `AuditLog`, `Provider`, plus the platform `User`.

## Backend functions

`syncCareTasks`, `draftOutreach`, and supporting AI helpers for drafting patient messages and summarising reports.

## Stack

React + Vite + Tailwind, running on the Base44 platform for auth, database, and backend functions.

## Run locally

```bash
npm install
npm install -g base44@latest
base44 login   # one-time per machine
base44 link    # one-time per clone
base44 dev
```

Open the frontend URL that `base44 dev` prints (typically `http://localhost:5173`).

## Live app

https://life-saviour-sync.base44.app
