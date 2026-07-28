# 13 — Dashboard Builder

> Inherits 00 + 01. Use for dashboard UI and KPIs.

```text
Build or extend the Dashboard module (DASH).

Rules:
- API-first: the dashboard is a pure client of tk/v1/* endpoints; if a view needs data no endpoint serves, design the endpoint first.
- Stack: Next.js + Supabase auth; users see only their company_tree (RLS enforced server-side, never client-side).
- Theming: all colors/logos/name from companies.branding with platform defaults (#2DC2C4 primary, #FF9501 accent, #0B2354 background); dark + light mode; a white-label tenant must be fully rebrandable with zero code changes.
- KPI cards are config-driven: the vertical's kpis[] array decides which cards render (florist sees delivery_on_time_rate, salon sees rebooking_rate). Adding a KPI = new aggregation in TK-RPT + new card component, available to all verticals.
- Views: Inbox (omnichannel threads), Calendar, Contacts, Campaigns, Reports, Settings.
- Responsive, accessible (WCAG AA), skeleton-loading states, empty states that teach the owner what the module does.
```
