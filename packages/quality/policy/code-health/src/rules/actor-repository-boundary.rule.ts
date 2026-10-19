import type { Violation } from '@n8n/rules-engine';
import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import * as path from 'node:path';
import type { Project } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';

const DB_PACKAGE = '@n8n/db';
const HUMAN_ONLY_REPOSITORY = 'UserRepository';

/**
 * Surfaces that only a human reaches: login, MFA, invites, SSO and LDAP sync,
 * member management, and the user-management CLI. A directory entry ends with
 * a slash and covers everything below it.
 */
const DEFAULT_ALLOWED_PATHS = [
	'packages/cli/src/auth/',
	'packages/cli/src/mfa/',
	'packages/cli/src/sso.ee/',
	'packages/cli/src/user-management/',
	'packages/cli/src/commands/ldap/',
	'packages/cli/src/commands/mfa/',
	'packages/cli/src/commands/user-management/',
	'packages/cli/src/modules/ldap.ee/',
	'packages/cli/src/modules/provisioning.ee/',
	'packages/cli/src/modules/sso-oidc/',
	'packages/cli/src/modules/sso-saml/',
	'packages/cli/src/controllers/auth.controller.ts',
	'packages/cli/src/controllers/change-email.controller.ts',
	'packages/cli/src/controllers/invitation.controller.ts',
	'packages/cli/src/controllers/me.controller.ts',
	'packages/cli/src/controllers/mfa.controller.ts',
	'packages/cli/src/controllers/password-reset.controller.ts',
	'packages/cli/src/controllers/users.controller.ts',
	'packages/cli/src/services/last-active-at.service.ts',
	'packages/cli/src/services/user.service.ts',
];

function stringArrayOption(value: unknown, fallback: string[]): string[] {
	return Array.isArray(value) && value.every((entry): entry is string => typeof entry === 'string')
		? value
		: fallback;
}

function isAllowed(relativePath: string, allowedPaths: string[]): boolean {
	return allowedPaths.some((allowed) =>
		allowed.endsWith('/') ? relativePath.startsWith(allowed) : relativePath === allowed,
	);
}

/**
 * Keeps `UserRepository` inside the surfaces that only a human reaches. A
 * service account lives in the same table, so a load through `UserRepository`
 * elsewhere silently drops the callers that are not human. Baseline-gated: the
 * files that inject it today are grandfathered, and only a new one fails.
 */
export class ActorRepositoryBoundaryRule extends AstRule<CodeHealthContext> {
	readonly id = 'actor-repository-boundary';
	readonly name = 'Actor Repository Boundary';
	readonly description =
		'UserRepository loads humans only. Outside a human-only surface, load callers through ActorRepository or take a Principal from the SecurityContext.';
	readonly severity = 'warning' as const;

	protected projectConfig(): AstProjectConfig {
		const packages = (this.getOptions().packages as string[]) ?? ['packages/cli'];
		return { packages };
	}

	analyze(context: CodeHealthContext): Violation[] {
		const allowedPaths = stringArrayOption(this.getOptions().allowedPaths, DEFAULT_ALLOWED_PATHS);
		return this.projects(context).flatMap(({ project }) =>
			this.analyzeProject(project, allowedPaths, context.rootDir),
		);
	}

	/** Exposed for unit tests against an in-memory project. */
	analyzeProject(
		project: Project,
		allowedPaths = DEFAULT_ALLOWED_PATHS,
		rootDir = '/',
	): Violation[] {
		const violations: Violation[] = [];

		for (const file of project.getSourceFiles()) {
			const relativePath = path.relative(rootDir, file.getFilePath()).split(path.sep).join('/');
			if (isAllowed(relativePath, allowedPaths)) continue;

			for (const declaration of file.getImportDeclarations()) {
				if (declaration.getModuleSpecifierValue() !== DB_PACKAGE) continue;
				const specifier = declaration
					.getNamedImports()
					.find((named) => named.getName() === HUMAN_ONLY_REPOSITORY);
				if (!specifier) continue;

				violations.push(
					this.nodeViolation(
						specifier,
						`${relativePath} imports ${HUMAN_ONLY_REPOSITORY} outside a human-only surface.`,
						'Load the caller through ActorRepository, or take the Principal from the SecurityContext. If this file is a human-only surface, add it to allowedPaths.',
					),
				);
			}
		}

		return violations;
	}
}
