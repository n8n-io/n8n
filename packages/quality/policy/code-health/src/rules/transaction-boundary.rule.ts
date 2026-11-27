import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { Node, SyntaxKind } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';
import {
	isPersistenceAdapter,
	persistenceScopeFiles,
} from './typeorm-persistence-boundary.rule.js';

const MANAGER_CALLS = new Set(['createQueryBuilder', 'managerFor']);

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

			for (const access of file.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)) {
				const name = access.getName();
				// A class's own `manager` field is not TypeORM's manager (for example License.manager).
				const isManager = name === 'manager' && !Node.isThisExpression(access.getExpression());
				const parent = access.getParent();
				const isManagerCall =
					MANAGER_CALLS.has(name) &&
					Node.isCallExpression(parent) &&
					parent.getExpression() === access;
				if (!isManager && !isManagerCall) continue;

				const position = file.getLineAndColumnAtPos(access.getStart());
				violations.push(
					this.createViolation(
						file.getFilePath(),
						position.line,
						position.column,
						// No whitespace: the baseline hash covers the message, so a reformat must not change it.
						`Business logic uses \`${access.getText().replace(/\s+/g, '')}\`.`,
						'Inject TransactionRunner from @n8n/db and call txRunner.run(ctx, ...). Put the query in a use-case repository method.',
					),
				);
			}
		}

		return violations;
	}
}
