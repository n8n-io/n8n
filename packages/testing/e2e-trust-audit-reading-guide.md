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
| 1 | `packages/testing/product-feature-inventory.md` | Product-level feature inventory derived from routes, modules, controllers, runtime packages, CLI commands, API contracts, and node registries. | No |
| 2 | `packages/testing/e2e-journey-map.md` | Actor- and outcome-oriented journey map with source anchors and success signals. | No |
| 3 | `packages/testing/e2e-journey-prioritization.md` | P0/P1/P2/P3 ranking, browser-fit recommendation, and target coverage layer for each journey. | No |
| 4 | `packages/testing/e2e-target-suite-plan.md` | Trust criteria, suite layers, assertion rules, isolation rules, diagnostics, ownership, and browser E2E exclusions. | No |
| 5 | `packages/testing/e2e-coverage-matrix.md` | First comparison between the source-backed journey model and the existing Playwright suite. | Yes |
| 6 | `packages/testing/e2e-trust-implementation-backlog.md` | Concrete implementation slices for metadata, smoke coverage, deterministic setup, repairs, and lower-layer migration. | Yes |
| 7 | `packages/testing/e2e-planning-artifact-review.md` | Final audit review showing the artifacts are consistent and ready for team handoff. | Yes |

## How To Review

Start with `product-feature-inventory.md` only if you want to validate completeness of the product surface. It is intentionally broad and not the right starting point for implementation.

Use `e2e-journey-map.md` to challenge whether journeys are real product outcomes. Each concrete journey should have an actor, goal, preconditions, primary path, variants, success signal, and source anchors.

Use `e2e-journey-prioritization.md` to debate priority and layer placement. This is where the team should challenge whether a journey belongs in smoke E2E, critical-path E2E, enterprise E2E, API contract tests, runtime integration tests, or manual/exploratory coverage.

Use `e2e-target-suite-plan.md` as the quality bar. A current or future test should not be called trusted unless it satisfies the criteria for durable assertions, isolation, controlled integrations, diagnostics, and layer fit.

Use `e2e-coverage-matrix.md` to understand where the existing Playwright suite is strong, weak, missing, or sitting in the wrong layer. This is the first artifact that uses current test coverage as evidence.

Use `e2e-trust-implementation-backlog.md` to start work. The first implementation slice is journey metadata and reporting, followed by the trusted smoke suite and deterministic setup patterns.

Use `e2e-planning-artifact-review.md` as the handoff summary. It records the checks run against the artifact set and the remaining caveat that implementation has not started.

## Main Decisions Captured

- Build confidence from product journeys, not from the shape of the existing E2E suite.
- Keep the browser smoke suite small and mapped to 11 high-value journeys.
- Treat browser E2E as one layer, not the owner of API, runtime, protocol, expression, node, CLI, scheduler, or large matrix behavior.
- Count AI coverage as trusted only when it uses replay-backed or stubbed deterministic boundaries.
- Require journey metadata before broad rewrites so progress can be measured by journey ID.
- Do not delete existing tests until replacement or lower-layer coverage is merged and linked to the same journey.

## Recommended Team Discussion

- Confirm the 11 smoke journeys are the right first trusted browser signal.
- Assign owners for browser E2E, public API contract coverage, runtime/node integration coverage, and enterprise E2E.
- Decide which enterprise environments can be supported in CI versus scheduled or manual validation.
- Review the D09 AI boundaries and keep live-provider behavior out of trusted CI unless replay or stubbing is in place.
- Start implementation with Slice 0 from `e2e-trust-implementation-backlog.md`.
