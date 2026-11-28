import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { Node } from 'ts-morph';
import type { ClassDeclaration, SourceFile } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';
import { persistenceScopeFiles } from './typeorm-persistence-boundary.rule.js';

/** Local names (with aliases and namespace imports) under which a file imports `importedName`. */
function localNames(
	file: SourceFile,
	importedName: string,
	fromSource: (source: string) => boolean,
): Set<string> {
	const names = new Set<string>();
	for (const declaration of file.getImportDeclarations()) {
		if (!fromSource(declaration.getModuleSpecifierValue())) continue;
		for (const specifier of declaration.getNamedImports()) {
			if (specifier.getName() === importedName) {
				names.add(specifier.getAliasNode()?.getText() ?? importedName);
			}
		}
		const namespace = declaration.getNamespaceImport()?.getText();
		if (namespace) names.add(`${namespace}.${importedName}`);
	}
	return names;
}

/** Local names that refer to TypeORM's `Repository` or n8n's `BaseRepository` in a file. */
function repositoryBaseNames(file: SourceFile): Set<string> {
	return new Set([
		...localNames(file, 'Repository', (source) => source === '@n8n/typeorm'),
		// Inside @n8n/db, repositories import BaseRepository with a relative path.
		...localNames(
			file,
			'BaseRepository',
			(source) => source === '@n8n/db' || source.startsWith('.'),
		),
	]);
}

function isRegisteredService(cls: ClassDeclaration, serviceNames: Set<string>): boolean {
	return cls.getDecorators().some((decorator) => {
		const expression = decorator.getExpression();
		const target = Node.isCallExpression(expression) ? expression.getExpression() : expression;
		return serviceNames.has(target.getText());
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
			const serviceNames = localNames(file, 'Service', (source) => source === '@n8n/di');

			for (const cls of file.getClasses()) {
				const base = cls.getExtends()?.getExpression().getText();
				if (!base || !baseNames.has(base)) continue;
				if (cls.isAbstract()) continue; // a shared base class, such as BaseRepository itself
				if (!cls.isExported() && !isRegisteredService(cls, serviceNames)) continue;

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
