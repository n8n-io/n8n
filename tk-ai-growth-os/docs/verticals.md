# Industry Verticals — configuration, not code

A vertical is a **data pack**, never a fork of workflows. All industry behavior is expressed in `config/verticals/<slug>.json`, loaded at runtime by `TK-CORE-001__config-loader` and merged under per-tenant overrides.

## Why config-driven

- 11 industries × ~30 workflows would be ~330 workflows to maintain if forked per industry. Config-driven keeps it at ~30.
- New industry = new JSON file + prompt variables. Ship in hours, not weeks.
- White-label agencies can even define custom verticals without touching the platform.

## Vertical config shape

See `config/verticals/_template.json` for the authoritative schema. Sections:

| Section | Drives | Example |
|---|---|---|
| `identity` | Naming, terminology | "guest" vs "patient" vs "client" |
| `prompts` | Variables injected into agent prompt templates | tone, service vocabulary, upsell rules |
| `booking` | Appointment logic | slot length, deposit required, staff assignment mode |
| `modules` | Which optional modules are on | `wedding`, `funeral`, `delivery`, `rebooking` |
| `intents` | Channel routing table | which intents exist and where they route |
| `kpis` | Dashboard KPI set | florist sees "Delivery On-Time %", dental sees "Chair Utilization" |
| `calendars` | Seasonal/holiday logic | florist holiday calendar (Valentine's, Mother's Day) |
| `compliance` | Regional/industry constraints | dental/med-spa consent language, quiet hours |

## Shipped verticals

| Slug | Notes |
|---|---|
| `nail-salon` | Rebooking cadence, service menu, technician assignment |
| `hair-salon` | Stylist matching, color/treatment logic, product recommendation |
| `flower-shop` | Occasion detection, delivery logic, holiday calendar, wedding/funeral/birthday/anniversary modules |

Planned: `facial-spa`, `eyelash-studio`, `med-spa`, `dental`, `realtor`, `hvac`, `restaurant`, `home-services` — each is a copy of `_template.json` filled in.

## Runtime resolution

```
request → edge auth resolves company_id
        → TK-CORE-001 loads companies.settings
        → joins vertical_configs on companies.vertical_slug
        → merge: platform defaults ⊕ vertical config ⊕ tenant overrides
        → ctx object passed to every downstream node/agent
```

Workflows branch on `ctx.modules.*` and `ctx.intents.*` — e.g. the receptionist router only offers occasion detection when `ctx.modules.occasion_detection === true`. **Never** branch on the vertical slug itself (`if slug === 'flower-shop'` is a bug); branch on capability flags so custom verticals compose freely.
