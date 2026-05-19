# E2E Journey Prioritization

Status: Source-backed prioritization. Existing E2E tests have not been inspected.
Date: 2026-05-19

## Inputs

- `packages/testing/e2e-journey-map.md`
- `packages/testing/product-feature-inventory.md`

## Scope

This file ranks the concrete journey candidates from `packages/testing/e2e-journey-map.md`. It does not compare against, reference, or inspect existing E2E coverage.

Coverage recommendations describe the target testing shape for each journey, not the current test suite.

## Scoring

Criticality:
- P0: Must work for the product to be usable or secure.
- P1: Common product path or high business/user impact.
- P2: Important but not a top-line trust signal.
- P3: Specialized, admin-only, integration-specific, or better covered below E2E.

Confidence:
- High: Source-backed journey and recommendation are clear from stable product behavior.
- Medium: Source-backed journey is clear, but the best test layer depends on environment, licensing, or controlled external dependencies.
- Low: Source-backed journey needs follow-up product clarification before committing to a suite layer.

Recommended Coverage:
- Smoke E2E
- Critical-path E2E
- Extended E2E
- Enterprise E2E
- API contract
- Component/integration test
- Manual/exploratory

Risk Signals:
- Cross-package behavior
- Auth/permission boundary
- Persistence or migration
- Realtime/push behavior
- External callback/webhook
- Async execution
- AI nondeterminism
- Source-control or filesystem dependency
- Queue/worker dependency
- Cloud/self-host split

Browser E2E fit:
- Yes: Keep as a browser-level journey candidate.
- Partial: Cover a thin browser path, but push most permutations into API, component, integration, or runtime tests.
- No: Do not make this a browser E2E journey; cover it through API, integration, component, CLI, or exploratory testing.

## Proposed Smoke Suite Candidates

The first smoke suite should stay deliberately small. These candidates cover account access, navigation, workflow authoring, node configuration, saving, activation, manual execution, and the most important external runtime path.

| Journey | Reason |
| --- | --- |
| D01-CJ01 Owner setup | Fresh instances are unusable if first-run setup breaks. |
| D01-CJ02 Sign in, sign out, and guarded routing | Auth and route guards are baseline app access. |
| D02-CJ01 Navigate product areas and resource contexts | Confirms the authenticated shell, navigation, permissions, and resource context. |
| D04-CJ01 Workflow creation | Core builder path from empty canvas to persisted workflow. |
| D04-CJ04 Save and dirty state | Protects against lost work and write-lock/checksum failures. |
| D04-CJ05 Publish and activation | Confirms workflows can become runnable. |
| D05-CJ01 Node discovery | Confirms builders can find and add automation capabilities. |
| D05-CJ02 Node configuration | Confirms NDV parameter editing and validation are usable. |
| D05-CJ03 Credential setup | Confirms credential creation, selection, and assignment work. |
| D06-CJ01 Manual workflow execution | Confirms the authoring-to-runtime loop. |
| D06-CJ06 Runtime webhooks | Confirms published/test external execution reaches the runtime and caller. |

## Priority Summary

| Priority | Journey Count | Intended Treatment |
| --- | ---: | --- |
| P0 | 11 | Must be represented by smoke E2E or lower-level engine/API tests before the suite can be trusted. |
| P1 | 33 | Main regression surface for critical-path E2E, API contracts, or high-value integration coverage. |
| P2 | 19 | Extended, enterprise, or focused lower-level coverage once P0/P1 trust is established. |
| P3 | 5 | Specialized paths to cover with targeted integration, manual, or exploratory checks unless later evidence raises priority. |

## Journey Rankings

| Journey | Priority | Confidence | Recommended Coverage | Browser E2E Fit | Risk Signals |
| --- | --- | --- | --- | --- | --- |
| D01-CJ01 Owner setup | P0 | High | Smoke E2E | Yes | Auth/permission boundary; Persistence or migration; Cloud/self-host split |
| D01-CJ02 Sign in, sign out, and guarded routing | P0 | High | Smoke E2E | Yes | Auth/permission boundary; Cloud/self-host split |
| D01-CJ03 Password recovery and change | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; External callback/webhook; Persistence or migration |
| D01-CJ04 MFA login and recovery | P1 | High | Enterprise E2E | Yes | Auth/permission boundary; Persistence or migration; Cloud/self-host split |
| D01-CJ05 Enterprise login entry | P1 | Medium | Enterprise E2E | Partial | Auth/permission boundary; External callback/webhook; Cloud/self-host split |
| D02-CJ01 Navigate product areas and resource contexts | P1 | High | Smoke E2E | Yes | Auth/permission boundary; Cloud/self-host split |
| D02-CJ02 Create from global and scoped entry points | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; Persistence or migration |
| D03-CJ01 Workflow library management | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; Persistence or migration |
| D03-CJ02 Cross-resource organization | P1 | High | Extended E2E | Yes | Auth/permission boundary; Persistence or migration |
| D04-CJ01 Workflow creation | P0 | High | Smoke E2E | Yes | Cross-package behavior; Auth/permission boundary; Persistence or migration |
| D04-CJ02 Workflow import | P1 | High | Critical-path E2E | Yes | Cross-package behavior; Persistence or migration |
| D04-CJ03 Canvas editing | P1 | High | Critical-path E2E | Yes | Persistence or migration; Realtime/push behavior |
| D04-CJ04 Save and dirty state | P0 | High | Smoke E2E | Yes | Cross-package behavior; Auth/permission boundary; Persistence or migration; Realtime/push behavior |
| D04-CJ05 Publish and activation | P0 | High | Smoke E2E | Yes | Cross-package behavior; Auth/permission boundary; Persistence or migration; Async execution; External callback/webhook |
| D04-CJ06 Workflow history and versions | P2 | High | Extended E2E | Yes | Auth/permission boundary; Persistence or migration |
| D05-CJ01 Node discovery | P1 | High | Smoke E2E | Yes | Cross-package behavior |
| D05-CJ02 Node configuration | P0 | High | Smoke E2E | Yes | Cross-package behavior; Persistence or migration |
| D05-CJ03 Credential setup | P0 | High | Smoke E2E | Yes | Auth/permission boundary; Persistence or migration; External callback/webhook |
| D05-CJ04 OAuth credential callback | P1 | Medium | Critical-path E2E | Partial | Auth/permission boundary; External callback/webhook; Persistence or migration |
| D06-CJ01 Manual workflow execution | P0 | High | Smoke E2E | Yes | Cross-package behavior; Realtime/push behavior; Async execution; Persistence or migration |
| D06-CJ02 Node-level execution | P1 | High | Critical-path E2E | Yes | Cross-package behavior; Async execution; Persistence or migration |
| D06-CJ03 Run data inspection | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; Persistence or migration |
| D06-CJ04 Execution debugging | P1 | High | Critical-path E2E | Yes | Cross-package behavior; Auth/permission boundary; Persistence or migration |
| D06-CJ05 Execution list operations | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; Persistence or migration; Async execution |
| D06-CJ06 Runtime webhooks | P0 | High | Smoke E2E | Yes | Cross-package behavior; External callback/webhook; Async execution; Persistence or migration |
| D06-CJ07 Public forms | P1 | High | Critical-path E2E | Yes | External callback/webhook; Async execution; Persistence or migration |
| D06-CJ08 Wait and resume | P1 | Medium | Extended E2E | Partial | External callback/webhook; Async execution; Queue/worker dependency; Persistence or migration |
| D06-CJ09 Scheduled execution | P2 | Medium | Component/integration test | No | Async execution; Queue/worker dependency; Cloud/self-host split |
| D06-CJ10 Service-triggered execution | P2 | Medium | Component/integration test | No | External callback/webhook; Async execution; Queue/worker dependency |
| D06-CJ11 Error workflow handling | P1 | High | Component/integration test | No | Cross-package behavior; Async execution; Persistence or migration |
| D06-CJ12 Sub-workflow execution | P1 | High | Component/integration test | No | Cross-package behavior; Async execution; Persistence or migration |
| D06-CJ13 Binary data lifecycle | P1 | High | Extended E2E | Partial | Cross-package behavior; External callback/webhook; Persistence or migration; Cloud/self-host split |
| D06-CJ14 Expression evaluation | P0 | High | Component/integration test | No | Cross-package behavior; Persistence or migration |
| D06-CJ15 Representative node execution | P0 | High | Component/integration test | No | Cross-package behavior; External callback/webhook; Async execution |
| D07-CJ01 Template start | P1 | Medium | Critical-path E2E | Yes | Cross-package behavior; External callback/webhook; Persistence or migration |
| D08-CJ01 Data table CRUD and grid work | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; Persistence or migration |
| D08-CJ02 Data table CSV and workflow writes | P1 | High | Extended E2E | Partial | Cross-package behavior; Persistence or migration; Async execution |
| D08-CJ03 Variables | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; Persistence or migration |
| D09-CJ01 Instance AI threads | P2 | Medium | Extended E2E | Partial | Realtime/push behavior; AI nondeterminism; Auth/permission boundary |
| D09-CJ02 Instance AI approvals and gateway | P3 | Medium | Manual/exploratory | No | AI nondeterminism; Auth/permission boundary; External callback/webhook; Cloud/self-host split |
| D09-CJ03 AI workflow builder and Ask AI | P2 | Medium | Extended E2E | Partial | AI nondeterminism; Realtime/push behavior; Persistence or migration |
| D09-CJ04 Agent creation and publish | P2 | Medium | Extended E2E | Yes | Auth/permission boundary; Persistence or migration; AI nondeterminism |
| D09-CJ05 Agent chat and sessions | P2 | Medium | Extended E2E | Partial | AI nondeterminism; Realtime/push behavior; Async execution; Persistence or migration |
| D09-CJ06 Chat Hub model conversation | P2 | Medium | Extended E2E | Partial | AI nondeterminism; Realtime/push behavior; Auth/permission boundary |
| D09-CJ07 Chat Hub custom and workflow agents | P3 | Medium | Extended E2E | Partial | AI nondeterminism; Realtime/push behavior; Async execution |
| D09-CJ08 Public chat | P1 | Medium | Critical-path E2E | Yes | External callback/webhook; Async execution; Realtime/push behavior; AI nondeterminism |
| D09-CJ09 MCP settings and workflow availability | P2 | Medium | Enterprise E2E | Partial | Auth/permission boundary; Persistence or migration; Cloud/self-host split |
| D09-CJ10 MCP OAuth client and tool execution | P2 | Medium | API contract | No | Auth/permission boundary; External callback/webhook; Async execution |
| D09-CJ11 AI/LangChain workflow graph | P2 | Medium | Component/integration test | No | AI nondeterminism; Cross-package behavior; Async execution |
| D10-CJ01 Projects | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; Persistence or migration |
| D10-CJ02 Sharing | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; Persistence or migration |
| D10-CJ03 Folders | P2 | High | Extended E2E | Yes | Auth/permission boundary; Persistence or migration |
| D10-CJ04 Live collaboration | P1 | Medium | Extended E2E | Yes | Auth/permission boundary; Realtime/push behavior; Persistence or migration |
| D11-CJ01 Invitations | P1 | High | Critical-path E2E | Yes | Auth/permission boundary; External callback/webhook; Persistence or migration |
| D11-CJ02 User admin and offboarding | P1 | High | Enterprise E2E | Yes | Auth/permission boundary; Persistence or migration |
| D11-CJ03 Custom roles | P2 | Medium | Enterprise E2E | Yes | Auth/permission boundary; Persistence or migration |
| D11-CJ04 SSO | P2 | Medium | Enterprise E2E | Partial | Auth/permission boundary; External callback/webhook; Cloud/self-host split |
| D11-CJ05 LDAP | P3 | Medium | Manual/exploratory | No | Auth/permission boundary; External callback/webhook; Cloud/self-host split |
| D11-CJ06 API keys | P1 | High | API contract | No | Auth/permission boundary; Persistence or migration |
| D11-CJ07 Security settings | P1 | High | Enterprise E2E | Yes | Auth/permission boundary; Persistence or migration; Cloud/self-host split |
| D11-CJ08 Licensing | P2 | Medium | Manual/exploratory | No | Auth/permission boundary; External callback/webhook; Cloud/self-host split |
| D12-CJ01 Source control | P2 | Medium | Enterprise E2E | Partial | Source-control or filesystem dependency; Auth/permission boundary; Persistence or migration; Cloud/self-host split |
| D12-CJ02 External secrets | P2 | Medium | Enterprise E2E | Partial | Auth/permission boundary; External callback/webhook; Persistence or migration |
| D12-CJ03 Ops observability | P2 | Medium | Enterprise E2E | Partial | Queue/worker dependency; Realtime/push behavior; External callback/webhook; Cloud/self-host split |
| D12-CJ04 Insights dashboard and summaries | P2 | High | Extended E2E | Yes | Auth/permission boundary; Persistence or migration |
| D12-CJ05 Public API automation | P1 | High | API contract | No | Auth/permission boundary; Persistence or migration |
| D12-CJ06 Community nodes | P3 | Medium | Component/integration test | No | Source-control or filesystem dependency; External callback/webhook; Cloud/self-host split |
| D12-CJ07 CLI and self-hosted operations | P3 | Medium | Component/integration test | No | Source-control or filesystem dependency; Queue/worker dependency; Cloud/self-host split |

## Journeys Not Recommended As Browser E2E

These journeys should not become browser-level E2E tests unless later evidence shows a user-visible browser regression pattern. They are still important; the recommended layer is a better fit for determinism, speed, diagnostics, or environment control.

| Journey | Recommended Coverage | Rationale |
| --- | --- | --- |
| D06-CJ09 Scheduled execution | Component/integration test | Time, leader election, and scheduler behavior are more deterministic below the browser. |
| D06-CJ10 Service-triggered execution | Component/integration test | Trigger/poller behavior depends on service events and activation lifecycle, not browser interaction. |
| D06-CJ11 Error workflow handling | Component/integration test | Runtime lifecycle and payload semantics are the trust boundary. |
| D06-CJ12 Sub-workflow execution | Component/integration test | Parent/child execution semantics need precise engine assertions. |
| D06-CJ14 Expression evaluation | Component/integration test | Expression correctness has a large input matrix and should fail with focused diagnostics. |
| D06-CJ15 Representative node execution | Component/integration test | Node semantics should be validated per node family without browser overhead. |
| D09-CJ02 Instance AI approvals and gateway | Manual/exploratory | Local gateway and high-risk approval flows depend on environment and AI behavior. |
| D09-CJ10 MCP OAuth client and tool execution | API contract | OAuth/tool scope behavior is primarily an API and protocol contract. |
| D09-CJ11 AI/LangChain workflow graph | Component/integration test | Provider nondeterminism and node graph semantics need controlled stubs. |
| D11-CJ05 LDAP | Manual/exploratory | Directory infrastructure and environment differences make browser E2E fragile. |
| D11-CJ06 API keys | API contract | Scope enforcement matters at the API boundary more than in the settings screen. |
| D11-CJ08 Licensing | Manual/exploratory | External license state and plan variations are hard to make deterministic in frequent browser runs. |
| D12-CJ05 Public API automation | API contract | Resource automation trust should be asserted through API behavior and durable state. |
| D12-CJ06 Community nodes | Component/integration test | Package installation and loading depends on package source, filesystem, and policy controls. |
| D12-CJ07 CLI and self-hosted operations | Component/integration test | Process, command, import/export, and queue behavior should be covered at CLI/integration level. |

## Next Task Input

Task 4 should use this file to define the target suite model before existing E2E tests are inspected:

- Smoke E2E should begin with the 11 candidates listed above and remain small enough for frequent runs.
- Critical-path and enterprise E2E should focus on P1/P2 browser-fit journeys with high permission, persistence, or external-user risk.
- API contract and component/integration tests should own journeys marked `Browser E2E Fit` = `No`.
- AI-related browser journeys should use deterministic stubs or contracts instead of live provider behavior.
- Existing E2E coverage must still not be inspected until Task 5.
