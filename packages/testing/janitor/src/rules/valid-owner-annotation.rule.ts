import { isSuppressed } from '@n8n/rules-engine';
import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import { Node, SyntaxKind } from 'ts-morph';
import type { ObjectLiteralExpression, Project, SourceFile } from 'ts-morph';

import { getConfig } from '../config.js';
import type { Violation } from '../types.js';

/**
 * Canonical team owners, mirroring the "Ownership v2" register
 * (Notion: Engineering Organization → Team Ownership). This is the single
 * source of truth for who can own a spec — update it here when ownership shifts.
 */
const CANONICAL_OWNERS = new Set([
	'Identity & Access',
	'Lifecycle & Governance',
	'Docs',
	'Catalysts',
	'NODES',
	'Payday',
	'Adore',
	'AI',
	'Cloud Growth',
	'Cloud Platform',
	'Cloud Experience',
	'Chat',
	'Agent',
	'instanceAI',
	'AI Trust',
	'Relay',
	'Enterprise Nodes & Partnerships',
]);

/**
 * Valid Owner Annotation Rule
 *
 * Every spec must declare the team that owns it via a Playwright `owner`
 * annotation, and the team must be one of {@link CANONICAL_OWNERS}. The owner
 * drives flaky/failure-triage routing, so a missing owner means failures go
 * nowhere and a misspelled one (e.g. `'Instance AI'` vs `'instanceAI'`) routes
 * to a team that doesn't exist.
 *
 * Owner is recognised in two shapes:
 * - the annotation literal: `{ type: 'owner', description: 'Catalysts' }`
 * - the `owner` config property of an owner-bearing helper call, e.g.
 *   `runMemoryBaseline({ name, owner: 'Catalysts' })`
 *
 * Violations:
 * - a spec with no owner declaration
 * - an owner whose value is not in CANONICAL_OWNERS
 *
 * A spec that legitimately has no team owner (e.g. a throwaway smoke probe) can
 * opt out of the validity check with a directive comment on the preceding line:
 *
 *   // janitor-disable-next-line valid-owner-annotation -- vendor smoke, no team
 */
export class ValidOwnerAnnotationRule extends AstRule<{ rootDir: string }> {
	readonly id = 'valid-owner-annotation';
	readonly name = 'Valid Owner Annotation';
	readonly description =
		'Every spec must declare a canonical team owner via a Playwright owner annotation';
	readonly severity = 'error' as const;

	/**
	 * Helpers that take an `owner` config property and emit the owner annotation
	 * internally. Scoping the bare-`owner` check to these avoids flagging
	 * unrelated literals that happen to carry an `owner` property.
	 */
	private static readonly OWNER_BEARING_CALLS = new Set(['runMemoryBaseline']);

	getTargetGlobs(): string[] {
		return getConfig().patterns.tests;
	}

	protected projectConfig(): AstProjectConfig {
		return { packages: ['.'], spec: { globs: this.getTargetGlobs() } };
	}

	analyze(context: { rootDir: string }): Violation[] {
		return this.projects(context).flatMap(({ project }) => this.analyzeProject(project));
	}

	analyzeProject(project: Project, files: SourceFile[] = project.getSourceFiles()): Violation[] {
		return files.flatMap((file) => {
			if (!file.getFilePath().endsWith('.spec.ts')) return [];
			return this.analyzeSpec(file);
		});
	}

	private analyzeSpec(file: SourceFile): Violation[] {
		const declarations = this.collectOwnerDeclarations(file);

		if (declarations.length === 0) {
			return [
				this.fileViolation(
					file,
					1,
					0,
					'Spec has no owner annotation',
					"Tag the suite with an owner, e.g. test.describe('…', { annotation: [{ type: 'owner', description: 'Catalysts' }] }, …)",
				),
			];
		}

		const lines = file.getFullText().split('\n');
		const violations: Violation[] = [];

		for (const declaration of declarations) {
			if (declaration.value !== undefined && CANONICAL_OWNERS.has(declaration.value)) continue;
			if (isSuppressed(this, lines, declaration.node)) continue;

			// A non-literal owner can't be statically validated, so it would be a way
			// to bypass the canonical check — require a string literal instead.
			const [message, suggestion] =
				declaration.value === undefined
					? ['Owner must be a string literal', 'Inline the team name so it can be validated']
					: [
							`Unknown owner "${declaration.value}"`,
							`Use a canonical team (one of: ${[...CANONICAL_OWNERS].join(', ')})`,
						];

			violations.push(this.nodeViolation(declaration.node, message, suggestion));
		}

		return violations;
	}

	/** Owner declarations in a spec: the annotation literal and the helper config prop. */
	private collectOwnerDeclarations(
		file: SourceFile,
	): Array<{ value: string | undefined; node: Node }> {
		const declarations: Array<{ value: string | undefined; node: Node }> = [];

		for (const obj of file.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)) {
			const type = this.stringProp(obj, 'type');
			if (type?.value !== 'owner') continue;
			const description = this.stringProp(obj, 'description');
			declarations.push({ value: description?.value, node: description?.node ?? obj });
		}

		for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			const callee = call.getExpression();
			if (
				!Node.isIdentifier(callee) ||
				!ValidOwnerAnnotationRule.OWNER_BEARING_CALLS.has(callee.getText())
			) {
				continue;
			}

			const [arg] = call.getArguments();
			if (!arg || !Node.isObjectLiteralExpression(arg)) continue;

			const ownerProp = this.stringProp(arg, 'owner');
			if (ownerProp) {
				declarations.push({ value: ownerProp.value, node: ownerProp.node });
			}
		}

		return declarations;
	}

	/**
	 * Read a string-valued property. Returns the literal text when the value is a
	 * string literal, an `undefined` value (with the property node) when present
	 * but dynamic, or nothing when the property is absent.
	 */
	private stringProp(
		obj: ObjectLiteralExpression,
		name: string,
	): { value: string | undefined; node: Node } | undefined {
		const prop = obj.getProperty(name);
		if (!prop || !Node.isPropertyAssignment(prop)) return undefined;

		const initializer = prop.getInitializer();
		const value =
			initializer && Node.isStringLiteral(initializer) ? initializer.getLiteralText() : undefined;
		return { value, node: initializer ?? prop };
	}
}
