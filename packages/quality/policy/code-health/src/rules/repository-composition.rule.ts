import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { Node } from 'ts-morph';
import type { ClassDeclaration, SourceFile } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';
import { persistenceScopeFiles } from './typeorm-persistence-boundary.rule.js';

/** Local names that refer to TypeORM's `Repository` or n8n's `BaseRepository` in a file. */
function repositoryBaseNames(file: SourceFile): Set<string> {
	const names = new Set<string>();
	for (const declaration of file.getImportDeclarations()) {
		const source = declaration.getModuleSpecifierValue();
		const importedBase =
			source === '@n8n/typeorm'
				? 'Repository'
				: source === '@n8n/db'
					? 'BaseRepository'
					: undefined;
		if (!importedBase) continue;
		for (const specifier of declaration.getNamedImports()) {
			if (specifier.getName() === importedBase) {
				names.add(specifier.getAliasNode()?.getText() ?? importedBase);
			}
		}
		const namespace = declaration.getNamespaceImport()?.getText();
		if (namespace) names.add(`${namespace}.${importedBase}`);
	}
	return names;
}

function isRegisteredService(cls: ClassDeclaration): boolean {
	return cls.getDecorators().some((decorator) => {
		const expression = decorator.getExpression();
		const target = Node.isCallExpression(expression) ? expression.getExpression() : expression;
		return target.getText() === 'Service';
	});
}

/**
 * A repository is a `@Service()` class that holds a file-private table class.
 * Only the table may extend `BaseRepository` or `Repository`.
 */
export class RepositoryCompositionRule extends BaseRule<CodeHealthContext> {
	readonly id = 'repository-composition';
	readonly name = 'Repository Composition';
	readonly description =
		'A class that extends BaseRepository or Repository stays file-private and is not a DI service.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const violations: Violation[] = [];
		const files = await persistenceScopeFiles(context.rootDir, this.getOptions(), {
			includeDbPackage: true,
		});

		for (const { file } of files) {
			const baseNames = repositoryBaseNames(file);
			if (baseNames.size === 0) continue;

			for (const cls of file.getClasses()) {
				const base = cls.getExtends()?.getExpression().getText();
				if (!base || !baseNames.has(base)) continue;
				if (cls.isAbstract()) continue; // a shared base class, such as BaseRepository itself
				if (!cls.isExported() && !isRegisteredService(cls)) continue;

				const position = file.getLineAndColumnAtPos(cls.getStart());
				violations.push(
					this.createViolation(
						file.getFilePath(),
						position.line,
						position.column,
						`Repository \`${cls.getName() ?? 'anonymous'}\` extends \`${base}\`, so TypeORM's API leaks to every class that injects it.`,
						'Make a plain @Service() class that holds a file-private table class (`class XTable extends BaseRepository<X>`). See inbound-auth-core/database/repositories/trusted-source.repository.ts.',
					),
				);
			}
		}

		return violations;
	}
}
