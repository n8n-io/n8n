# E2E Trust Audit Reading Guide

Status: Audit entry point. This guide describes how to read the audit artifacts, not how they were generated.
Date: 2026-05-19

## Purpose

These documents explain the E2E trust audit from product understanding through implementation handoff. Read them as a chain of evidence:

1. What product surface exists.
2. Which user journeys matter.
3. Which journeys should be protected first.
4. What a trusted suite should look like.
5. How current Playwright coverage compares.
6. What implementation work should happen next.
7. Whether the audit artifacts are internally consistent.

The generation plan is not part of the audit record. Use the files below instead.

## Reading Order

| Order | File | Read It For | Existing E2E Inspected? |
| ---: | --- | --- | --- |
| 1 | `packages/testing/01-product-feature-inventory.md` | Product-level feature inventory derived from routes, modules, controllers, runtime packages, CLI commands, API contracts, and node registries. | No |
| 2 | `packages/testing/02-e2e-journey-map.md` | Actor- and outcome-oriented journey map with source anchors and success signals. | No |
| 3 | `packages/testing/03-e2e-journey-prioritization.md` | P0/P1/P2/P3 ranking, browser-fit recommendation, and target coverage layer for each journey. | No |
| 4 | `packages/testing/04-e2e-target-suite-plan.md` | Trust criteria, suite layers, assertion rules, isolation rules, diagnostics, ownership, and browser E2E exclusions. | No |
| 5 | `packages/testing/05-e2e-coverage-matrix.md` | First comparison between the source-backed journey model and the existing Playwright suite. | Yes |
| 6 | `packages/testing/06-e2e-trust-implementation-backlog.md` | Concrete implementation slices for metadata, smoke coverage, deterministic setup, repairs, and lower-layer migration. | Yes |
| 7 | `packages/testing/07-e2e-planning-artifact-review.md` | Final audit review showing the artifacts are consistent and ready for team handoff. | Yes |

## Concentrated Summary

The audit is ready to share as a planning artifact. It does not claim the current E2E suite is trusted yet. It claims we now have a source-backed product model, a prioritized journey model, a target suite shape, a comparison against current Playwright coverage, and an implementation backlog to make trust measurable.

The core finding is that the current Playwright suite has useful breadth, but it does not yet provide a small, deterministic smoke signal. Most work should be about mapping tests to product journeys, tightening assertions, removing shared state and fixed waits, repairing skipped critical suites, and moving non-browser behavior to API/runtime/component layers.

## Key Numbers

| Area | Result |
| --- | ---: |
| Product feature areas inventoried | 29 |
| Concrete journeys mapped | 68 |
| P0 journeys | 11 |
| P1 journeys | 33 |
| P2 journeys | 19 |
| P3 journeys | 5 |
| Journeys currently covered and trusted | 3 |
| Journeys covered but low-trust | 15 |
| Journeys partially covered | 30 |
| Journeys missing | 8 |
| Journeys covered below browser E2E | 5 |
| Journeys not worth browser E2E | 7 |

## What The Audit Says

| Topic | Concentrated Takeaway |
| --- | --- |
| Source model | The product surface was mapped before looking at existing E2E tests. The first four documents are independent of current Playwright coverage. |
| Priority model | P0/P1 journeys should drive trust work. P2/P3 should not distract from the smoke and critical-path foundation. |
| Browser E2E role | Browser E2E should prove real user journeys where UI, routing, browser state, permissions, and persistence are part of the risk. |
| Lower-layer role | API keys, public API automation, MCP protocol, scheduler behavior, expression correctness, representative node execution, CLI behavior, and most engine semantics should be owned below browser E2E. |
| Current coverage | Existing tests cover many surfaces, but a lot of coverage is partial, UI-only, notification-heavy, skipped, serial, or dependent on shared mutable state. |
| Determinism | Trusted tests need controlled setup, isolated users/resources, durable state verification, no live external providers, and event-driven waits. |
| AI and external systems | AI, Chat Hub, MCP, OAuth, source control, and enterprise identity should only count as trusted when backed by replay, stubs, local protocol contracts, or explicit capability-gated environments. |
| Reporting | Trust needs to be visible in metadata and reports. A passing Playwright run is not enough unless it says which journeys and trust layers passed. |

## Smoke Suite Readiness

The proposed smoke suite has 11 journeys. Only one is currently trusted.

| Current State | Smoke Journeys |
| --- | --- |
| Trusted | D06-CJ06 Runtime webhooks |
| Low-trust | D04-CJ05 Publish and activation; D05-CJ01 Node discovery; D05-CJ03 Credential setup |
| Partial | D01-CJ02 Sign in/sign out/guarded routing; D02-CJ01 Navigate product areas and resource contexts; D04-CJ01 Workflow creation; D04-CJ04 Save and dirty state; D05-CJ02 Node configuration; D06-CJ01 Manual workflow execution |
| Missing | D01-CJ01 Owner setup |

The first trusted smoke suite should prove:

1. A fresh instance can be claimed.
2. A user can sign in, sign out, and return through guarded routing.
3. The authenticated shell and resource contexts work.
4. A workflow can be created, configured, saved, activated, and executed.
5. A builder can discover nodes, configure node parameters, create credentials, and attach them.
6. A webhook can trigger runtime execution and produce durable execution evidence.

## Highest-Value Gaps

1. There is no trusted smoke suite yet.
2. Owner setup is missing from Playwright coverage.
3. Core builder journeys need compact happy paths with persisted graph or API readback.
4. Several high-value suites are skipped or weak, including copy/paste, duplicate, settings, previous-node execution, source control, and AI workflow builder.
5. Collaboration and admin tests often prove visibility more than durable permission outcomes.
6. AI and Chat Hub tests need deterministic boundaries instead of exact live-model prose or fixed waits.
7. Source control should not count as trusted browser coverage until skipped source-control suites are repaired.

## Implementation Order

| Slice | Goal | Why It Comes Here |
| ---: | --- | --- |
| 0 | Add journey metadata and reporting. | Trust must become measurable before expanding or refactoring coverage. |
| 1 | Create or repair the 11-journey smoke suite. | This creates the first small, frequent, product-level signal. |
| 2 | Standardize deterministic setup, cleanup, and diagnostics. | Refactored tests need isolated resources, stable waits, and useful failure artifacts. |
| 3 | Repair the first P0/P1 browser gaps. | Once smoke exists, fix skipped or low-trust critical-path areas. |
| 4 | Move layer-mismatched coverage below browser E2E. | Runtime, API, protocol, expression, node, and CLI behavior should not depend on browser Playwright. |
