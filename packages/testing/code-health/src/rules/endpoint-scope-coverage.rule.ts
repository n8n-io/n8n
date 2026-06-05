import type { Violation } from '@n8n/rules-engine';
import {
	AstRule,
	classHasDecorator,
	getDecoratorByName,
	getDecoratorObjectFlag,
} from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import type { Project } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';

const CONTROLLER_DECORATORS = ['RestController', 'RootLevelController'];
const ROUTE_DECORATORS = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options'];
const SCOPE_DECORATORS = ['GlobalScope', 'ProjectScope'];
/** Route options that opt out of requiring an authenticated, scoped user. */
const PUBLIC_FLAGS = ['skipAuth', 'allowUnauthenticated', 'apiKeyAuth'];

/**
 * Flags authenticated controller routes with no `@GlobalScope`/`@ProjectScope`.
 * Baseline-gated: the existing (largely intentional) set is grandfathered, so
 * only newly-added unscoped routes fail.
 */
export class EndpointScopeCoverageRule extends AstRule<CodeHealthContext> {
	readonly id = 'endpoint-scope-coverage';
	readonly name = 'Endpoint Scope Coverage';
	readonly description =
		'Authenticated controller routes should declare an RBAC scope; new unscoped routes are flagged (existing ones grandfathered via baseline)';
	readonly severity = 'warning' as const;

	protected projectConfig(): AstProjectConfig {
		const packages = (this.getOptions().packages as string[]) ?? ['packages/cli'];
		return { packages };
	}

	analyze(context: CodeHealthContext): Violation[] {
		return this.projects(context).flatMap(({ project }) => this.analyzeProject(project));
	}

	/** Exposed for unit tests against an in-memory project. */
	analyzeProject(project: Project): Violation[] {
		const violations: Violation[] = [];

		for (const file of project.getSourceFiles()) {
			for (const cls of file.getClasses()) {
				if (!classHasDecorator(cls, CONTROLLER_DECORATORS)) continue;

				for (const method of cls.getMethods()) {
					const route = getDecoratorByName(method, ROUTE_DECORATORS);
					if (!route) continue;
					if (getDecoratorByName(method, SCOPE_DECORATORS)) continue;
					if (PUBLIC_FLAGS.some((flag) => getDecoratorObjectFlag(route, 1, flag))) continue;

					violations.push(
						this.nodeViolation(
							route,
							`Authenticated route ${cls.getName()}.${method.getName()} declares no @GlobalScope/@ProjectScope.`,
							'Add a scope decorator, or mark the route { skipAuth: true } / { allowUnauthenticated: true } if it is intentionally public.',
						),
					);
				}
			}
		}

		return violations;
	}
}
