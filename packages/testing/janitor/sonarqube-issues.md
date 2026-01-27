# SonarQube Issues - @n8n/playwright-janitor

Generated: $(date +%Y-%m-%d)

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 23 |
| MAJOR | 19 |
| MINOR | 85 |
| **Total** | **127** |

## Critical Issues (23)

### Cognitive Complexity (S3776) - 16 issues

Functions exceeding max complexity of 15:

| File | Line | Complexity | Function |
|------|------|------------|----------|
| `src/core/tcr-executor.ts` | 62 | 57 | Main run logic |
| `src/rules/dead-code.rule.ts` | 138 | 45 | Analysis function |
| `src/reporter.ts` | 26 | 32 | Report formatting |
| `src/cli.ts` | 85 | 31 | CLI handler |
| `src/rules/scope-lockdown.rule.ts` | 69 | 24 | Rule analysis |
| `src/cli.ts` | 339 | 23 | TCR command |
| `src/core/tcr-executor.ts` | 329 | 21 | Method handling |
| `src/core/tcr-executor.ts` | 496 | 21 | Formatting |
| `src/core/tcr-executor.ts` | 250 | 21 | Test execution |
| `src/rules/dead-code.rule.ts` | 51 | 21 | Usage detection |
| `src/rules/deduplication.rule.ts` | 44 | 20 | Duplicate detection |
| `src/cli.ts` | 464 | 20 | Impact command |
| `src/rules/selector-purity.rule.ts` | 40 | 19 | Selector analysis |
| `src/core/tcr-executor.ts` | 413 | 19 | Git operations |
| `src/core/inventory-analyzer.ts` | 379 | 16 | Inventory building |
| `src/utils/ast-helpers.ts` | 121 | 16 | AST traversal |

### Missing localeCompare (S2871) - 6 issues

Sort functions need proper string comparison:

| File | Line |
|------|------|
| `src/core/tcr-executor.ts` | 466 |
| `src/core/inventory-analyzer.ts` | 311 |
| `src/core/inventory-analyzer.ts` | 266 |
| `src/core/method-usage-analyzer.ts` | 75 |
| `src/core/impact-analyzer.ts` | 74 |
| `src/core/impact-analyzer.ts` | 78 |

### Other Critical (1 issue)

| File | Line | Rule | Message |
|------|------|------|---------|
| `src/types.ts` | 28 | S4335 | Remove empty type intersection |

## Major Issues (19)

Mostly:
- Unnecessary type assertions (S4325)
- Type predicates that could be simplified (S4325)
- Unsafe member access patterns

## Minor Issues (85)

Mostly:
- Prefer `node:*` imports over bare imports (S7772)
- Prefer `Number.parseInt` over `parseInt` (S7773)
- Use `RegExp.exec()` instead of `String.match()` (S6594)
- Re-export style preferences (S7763)

---

See `sonarqube-issues.json` for full machine-readable list.
