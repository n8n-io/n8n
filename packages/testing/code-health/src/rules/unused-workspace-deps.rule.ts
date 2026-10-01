import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';

import type { CodeHealthContext } from '../context.js';

/**
 * Skeleton only: the rule is registered so the CLI lists it and CI wires it up,
 * but it reports nothing yet. Detection lands in a later change, together with
 * the exclusions it must respect (config files outside `src`, type-only
 * imports, `scripts` entries, dynamic `import()`, peer dependencies,
 * build-order-only deps, CSS/asset imports, and path or string-literal
 * resolution).
 */
export class UnusedWorkspaceDepsRule extends BaseRule<CodeHealthContext> {
	readonly id = 'unused-workspace-deps';
	readonly name = 'Unused Workspace Deps';
	readonly description =
		'Detect dependencies declared in a package.json that no code in the package uses';
	readonly severity = 'warning' as const;

	analyze(_context: CodeHealthContext): Violation[] {
		return [];
	}
}
