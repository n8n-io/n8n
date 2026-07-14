# TypeScript 6 → 7 migration benchmarks

Generated 2026-07-14T09:31:26.831Z from `scripts/typescript-migration/results/`.

| Package | typecheck Δ | build Δ |
| --- | --- | --- |
| `@n8n/agents` | -71.1% | -67.0% |
| `@n8n/ai-node-sdk` | -53.1% | -54.3% |
| `@n8n/ai-utilities` | -66.9% | -63.2% |
| `@n8n/ai-workflow-builder` | -69.3% | -33.1% |
| `@n8n/api-types` | -64.6% | -66.6% |
| `@n8n/backend-common` | -57.0% | -54.5% |
| `@n8n/backend-network` | -57.0% | -54.9% |
| `@n8n/backend-test-utils` | -51.4% | -53.1% |
| `@n8n/codemirror-lang` | -36.3% | -31.4% |
| `@n8n/codemirror-lang-html` | — | -17.0% |
| `@n8n/codemirror-lang-sql` | -42.7% | -39.2% |
| `@n8n/instance-ai` | -70.0% | -40.3% |
| `@n8n/typeorm` | -37.9% | -68.7% |

```
=== @n8n/agents — median times (Δ vs "before") ===

typecheck:
  before               3.04s
  after                880ms  -2163ms (-71.1%)

build:
  before               2.30s
  after                757ms  -1539ms (-67.0%)
```

```
=== @n8n/ai-node-sdk — median times (Δ vs "before") ===

typecheck:
  before               1.12s
  after                526ms  -595ms (-53.1%)

build:
  before               1.21s
  after                552ms  -657ms (-54.3%)
```

```
=== @n8n/ai-utilities — median times (Δ vs "before") ===

typecheck:
  before               2.35s
  after                779ms  -1571ms (-66.9%)

build:
  before               4.55s
  after                1.67s  -2878ms (-63.2%)
```

```
=== @n8n/ai-workflow-builder — median times (Δ vs "before") ===

typecheck:
  before               3.87s
  after                1.19s  -2683ms (-69.3%)

build:
  before               3.25s
  after                2.17s  -1078ms (-33.1%)
```

```
=== @n8n/api-types — median times (Δ vs "before") ===

typecheck:
  before               2.55s
  after                903ms  -1651ms (-64.6%)

build:
  before               2.64s
  after                882ms  -1757ms (-66.6%)
```

```
=== @n8n/backend-common — median times (Δ vs "before") ===

typecheck:
  before               1.34s
  after                576ms  -765ms (-57.0%)

build:
  before               1.19s
  after                541ms  -649ms (-54.5%)
```

```
=== @n8n/backend-network — median times (Δ vs "before") ===

typecheck:
  before               1.52s
  after                656ms  -868ms (-57.0%)

build:
  before               1.28s
  after                576ms  -701ms (-54.9%)
```

```
=== @n8n/backend-test-utils — median times (Δ vs "before") ===

typecheck:
  before               1.54s
  after                748ms  -792ms (-51.4%)

build:
  before               1.60s
  after                751ms  -850ms (-53.1%)
```

```
=== @n8n/codemirror-lang — median times (Δ vs "before") ===

typecheck:
  before               699ms
  after                445ms  -254ms (-36.3%)

build:
  before               650ms
  after                446ms  -204ms (-31.4%)
```

```
=== @n8n/codemirror-lang-html — median times (Δ vs "before") ===

build:
  before               1.09s
  after                905ms  -186ms (-17.0%)
```

```
=== @n8n/codemirror-lang-sql — median times (Δ vs "before") ===

typecheck:
  before               785ms
  after                450ms  -335ms (-42.7%)

build:
  before               720ms
  after                438ms  -282ms (-39.2%)
```

```
=== @n8n/instance-ai — median times (Δ vs "before") ===

typecheck:
  before               3.36s
  after                1.01s  -2351ms (-70.0%)

build:
  before               3.21s
  after                1.91s  -1293ms (-40.3%)
```

```
=== @n8n/typeorm — median times (Δ vs "before") ===

typecheck:
  before               1.45s
  after                898ms  -547ms (-37.9%)

build:
  before               2.84s
  after                890ms  -1949ms (-68.7%)
```

