# Repository policy instructions

Read the parent [quality instructions](../AGENTS.md) before you change a policy package.

- Put reusable rule execution logic in `rules-engine/`. Keep repository-specific checks in `code-health/`.
- Keep path-based diagnostics, baselines, and CI commands aligned with package moves.
- Run the owning package tests, lint, and typecheck after a policy change.
