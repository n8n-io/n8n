import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import { collectRuntimeExternals } from '../utils/import-graph-scanner.js';

/** One DI-less (or otherwise constrained) subpath to keep pure. */
export interface SubpathSpec {
	/** Human-readable subpath name, used in messages. */
	name: string;
	/** Repo-relative path to the subpath's entry source file. */
	entry: string;
	/** Bare packages that must never be reachable at runtime from `entry`. */
	forbidden: string[];
	/**
	 * Optional exact allowlist of runtime externals. When set, any reachable
	 * bare specifier outside this list is flagged, locking the dependency
	 * surface, not just the forbidden set.
	 */
	allowedExternals?: string[];
}

/**
 * Guards constrained entry points (e.g. the DI-less `@n8n/backend-network/transport` subpath)
 * by walking their runtime import graph and asserting no forbidden package (DI, config, backend-common)
 * is reachable, so DI-less callers don't drag the full service into their bundle.
 */
export class SubpathPurityRule extends BaseRule<CodeHealthContext> {
	readonly id = 'subpath-purity';
	readonly name = 'Subpath Import Purity';
	readonly description =
		'Constrained entry points must not reach forbidden packages at runtime (keeps DI-less bundles free of DI/config/backend dependencies)';
	readonly severity = 'error' as const;

	analyze(context: CodeHealthContext): Violation[] {
		const subpaths = this.getSubpaths();
		return subpaths.flatMap((subpath) => this.analyzeSubpath(context.rootDir, subpath));
	}

	private getSubpaths(): SubpathSpec[] {
		const raw = this.getOptions().subpaths;
		return Array.isArray(raw) ? (raw as SubpathSpec[]) : [];
	}

	private analyzeSubpath(rootDir: string, subpath: SubpathSpec): Violation[] {
		const entry = path.resolve(rootDir, subpath.entry);

		if (!fs.existsSync(entry)) {
			return [
				this.createViolation(
					entry,
					1,
					1,
					`Subpath "${subpath.name}" entry not found at ${subpath.entry}.`,
					'Update the rule options to point at the current entry file, or remove the obsolete subpath spec.',
				),
			];
		}

		const externals = collectRuntimeExternals(entry);
		const violations: Violation[] = [];

		for (const forbidden of subpath.forbidden) {
			for (const ref of externals.values()) {
				const leaked = ref.specifier === forbidden || ref.specifier.startsWith(`${forbidden}/`);
				if (!leaked) continue;
				violations.push(
					this.createViolation(
						ref.file,
						ref.line,
						1,
						`"${subpath.name}" reaches forbidden runtime dependency "${ref.specifier}".`,
						`Keep ${forbidden} out of the runtime graph: import it as a type (\`import type\`), move the value behind a DI-aware entry point, or load it lazily so the DI-less subpath stays clean.`,
					),
				);
			}
		}

		if (subpath.allowedExternals) {
			const allowed = new Set(subpath.allowedExternals);
			for (const ref of externals.values()) {
				if (allowed.has(ref.specifier)) continue;
				// Forbidden specifiers are already reported above with a clearer message.
				const isForbidden = subpath.forbidden.some(
					(forbidden) => ref.specifier === forbidden || ref.specifier.startsWith(`${forbidden}/`),
				);
				if (!isForbidden) {
					violations.push(
						this.createViolation(
							ref.file,
							ref.line,
							1,
							`"${subpath.name}" pulls in unexpected runtime dependency "${ref.specifier}".`,
							`Allowed runtime externals are: ${subpath.allowedExternals.join(', ')}. Add this specifier to the allowlist only if it is genuinely safe for the DI-less subpath.`,
						),
					);
				}
			}
		}

		return violations;
	}
}
