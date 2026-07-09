# TypeScript 6 → 7 migration benchmarks

Generated 2026-07-09T08:18:07.078Z from `scripts/typescript-migration/results/`.

| Package | typecheck Δ | build Δ |
| --- | --- | --- |
| `@n8n/codemirror-lang` | -36.3% | -31.4% |
| `@n8n/codemirror-lang-html` | — | -17.0% |
| `@n8n/codemirror-lang-sql` | -42.7% | -39.2% |

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

