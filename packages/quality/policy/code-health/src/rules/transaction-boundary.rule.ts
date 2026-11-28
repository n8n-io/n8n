import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { Node, SyntaxKind } from 'ts-morph';
import type { PropertyAccessExpression, SourceFile } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';
import {
	isPersistenceAdapter,
	persistenceScopeFiles,
} from './typeorm-persistence-boundary.rule.js';

const MANAGER_CALLS = new Set(['createQueryBuilder', 'managerFor']);

/**
 * `this.manager` is TypeORM's manager only when the class declares it as an `EntityManager`.
 * Other classes have their own `manager` field (for example `License.manager`).
 */
function isOwnEntityManager(access: PropertyAccessExpression): boolean {
	const cls = access.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
	if (!cls) return false;
	const declarations = [
		cls.getProperty('manager'),
		...cls
			.getConstructors()
			.flatMap((ctor) => ctor.getParameters())
			.filter((parameter) => parameter.isParameterProperty() && parameter.getName() === 'manager'),
	];
	return declarations.some((declaration) =>
		/\bEntityManager\b/.test(declaration?.getTypeNode()?.getText() ?? ''),
	);
}

/** Each use of the manager in the file, as the node to report and the code that it shows. */
function managerUses(file: SourceFile): Array<{ node: Node; code: string }> {
	const uses: Array<{ node: Node; code: string }> = [];

	for (const access of file.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)) {
		const name = access.getName();
		const parent = access.getParent();
		const isManager =
			name === 'manager' &&
			(!Node.isThisExpression(access.getExpression()) || isOwnEntityManager(access));
		const isManagerCall =
			MANAGER_CALLS.has(name) && Node.isCallExpression(parent) && parent.getExpression() === access;
		if (isManager || isManagerCall) uses.push({ node: access, code: access.getText() });
	}

	// const { manager } = this.repository. Only a variable or a property is a source: a
	// call result such as `await this.getWorkspace()` can have its own `manager`.
	for (const element of file.getDescendantsOfKind(SyntaxKind.BindingElement)) {
		const property = element.getPropertyNameNode()?.getText() ?? element.getName();
		if (property !== 'manager') continue;
		const declaration = element.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
		const source = declaration?.getInitializer();
		if (!source || !(Node.isPropertyAccessExpression(source) || Node.isIdentifier(source))) {
			continue;
		}
		uses.push({ node: element, code: `{ manager } = ${source.getText()}` });
	}

	return uses;
}

/**
 * Business logic does not reach the TypeORM entity manager. It uses `TransactionRunner`
 * from `@n8n/db` and use-case repository methods instead.
 */
export class TransactionBoundaryRule extends BaseRule<CodeHealthContext> {
	readonly id = 'transaction-boundary';
	readonly name = 'Transaction Boundary';
	readonly description =
		'Business logic must not use `.manager`, `createQueryBuilder(...)` or `managerFor(...)`.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const violations: Violation[] = [];
		const files = await persistenceScopeFiles(context.rootDir, this.getOptions(), {
			includeDbPackage: false,
		});

		for (const { file } of files) {
			if (isPersistenceAdapter(file)) continue;

			// The baseline hash covers path, rule and message, not the line. A number for each
			// repeat of the same code in a file makes the baseline count every use, so a new
			// use fails CI. The message has no whitespace, so a reformat does not change it.
			const seen = new Map<string, number>();
			const uses = managerUses(file).sort((a, b) => a.node.getStart() - b.node.getStart());
			for (const { node, code } of uses) {
				const compact = code.replace(/\s+/g, '');
				const count = (seen.get(compact) ?? 0) + 1;
				seen.set(compact, count);
				const position = file.getLineAndColumnAtPos(node.getStart());
				violations.push(
					this.createViolation(
						file.getFilePath(),
						position.line,
						position.column,
						`Business logic uses \`${compact}\`${count > 1 ? ` (use ${count} in this file)` : ''}.`,
						'Inject TransactionRunner from @n8n/db and call txRunner.run(ctx, ...). Put the query in a use-case repository method.',
					),
				);
			}
		}

		return violations;
	}
}
