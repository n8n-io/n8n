/**
 * Single source of truth for the "single-instance-sensitive" libraries whose runtime
 * identity must not be duplicated across packages. A second physical copy (a distinct
 * Node module identity) silently breaks `instanceof`, module singletons, and cross-package
 * schema composition — and only surfaces in production / `npm install` graphs, not local
 * pnpm dev. Consumed by the `single-instance-libs` rule and the `verify-closure` /
 * `verify-npm-install` CLI subcommands.
 */

/** Libraries a single process must resolve to exactly one physical copy of. */
export const CURATED_LIBS = ['zod', 'form-data', '@langchain/core', 'reflect-metadata'];

/**
 * Curated libs enforced pin-only (must use `catalog:`) but NOT subject to the
 * peerDependency rule this iteration.
 */
const PIN_ONLY_LIBS = ['reflect-metadata'];

/**
 * Host / standalone packages that provide their own runtime instance — the end-user CLI
 * (`n8n`), the task runner, and standalone tools like `@n8n/computer-use`. They keep curated
 * libs as real `dependencies` and are exempt from the peerDependency rule.
 */
export const HOST_PACKAGES = ['n8n', '@n8n/task-runner', '@n8n/computer-use'];

/**
 * Frontend packages that bundle their dependencies (Vite), so runtime-identity duplication
 * does not apply. Repo-relative path prefixes, matched against package locations.
 */
export const FRONTEND_PATH_PREFIXES = ['packages/frontend/'];

/** Curated libs subject to the peer rule (pin-only libs are exempt). */
export const PEER_LIBS = CURATED_LIBS.filter((lib) => !PIN_ONLY_LIBS.includes(lib));
