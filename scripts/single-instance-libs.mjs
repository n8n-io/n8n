/**
 * Single source of truth for the "single-instance-sensitive" libraries whose
 * runtime identity must not be duplicated across packages. A second physical
 * copy (distinct realpath = distinct Node module identity) silently breaks
 * `instanceof`, singletons and cross-package schema composition, and only bites
 * in production / `npm install` graphs, not local dev.
 *
 * Both the syncpack manifest checks and the closure verifier read this file so
 * the two enforcement layers cannot drift.
 */

/** Libraries a single process must resolve to exactly one physical copy of. */
export const CURATED_LIBS = ['zod', 'form-data', '@langchain/core', 'reflect-metadata'];

/**
 * Curated libs enforced pin-only (must use `catalog:`), but NOT subject to the
 * dependencies-ban / peerDependency rule this iteration.
 */
export const PIN_ONLY_LIBS = ['reflect-metadata'];

/**
 * Host packages that legitimately provide the single shared runtime instance,
 * so they keep curated libs as real `dependencies` and are exempt from the
 * peer rule and the closure duplication check.
 */
export const HOST_PACKAGES = ['n8n', '@n8n/task-runner'];

/**
 * Frontend packages that bundle their dependencies (Vite), so runtime-identity
 * duplication does not apply. Path globs, matched against package locations.
 */
export const FRONTEND_GLOBS = ['packages/frontend/**'];
