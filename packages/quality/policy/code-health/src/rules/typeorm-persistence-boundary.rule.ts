import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { Node, Project } from 'ts-morph';
import type { ImportDeclaration, SourceFile } from 'ts-morph';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	findPackageJsonFiles,
	parsePackageJson,
	relativeDir,
} from '../utils/package-json-scanner.js';

const TYPEORM_PACKAGE = '@n8n/typeorm';
const DB_PACKAGE = '@n8n/db';
const GUARDED_DB_REEXPORTS = new Set([
	'In',
	'Like',
	'MoreThanOrEqual',
	'Not',
	'DataSource',
	'FindManyOptions',
	'FindOptionsWhere',
	'EntityManager',
]);

const DEFAULT_ALLOWED_FILES = [
	// CLI migration tooling owns the TypeORM migration executor.
	'packages/cli/src/commands/db/revert.ts',
	// These adapters use composition instead of a repository base class.
	'packages/cli/src/modules/data-table/data-table-rows.repository.ts',
	'packages/cli/src/modules/instance-ai/repositories/instance-ai-conversation-history.repository.ts',
	// Engine v2 keeps its persistence infrastructure and composition root in one package.
	'packages/@n8n/engine/src/database/create-stores.ts',
	'packages/@n8n/engine/src/database/data-source.ts',
	'packages/@n8n/engine/src/database/typeorm-execution-store.ts',
	'packages/@n8n/engine/src/database/typeorm-execution-view-store.ts',
	'packages/@n8n/engine/src/database/typeorm-step-store.ts',
	'packages/@n8n/engine/src/runtime/create-engine-runtime.ts',
];
// This package exists only to build database-backed test fixtures.
const DEFAULT_EXEMPT_PACKAGES = ['@n8n/backend-test-utils'];

const SOURCE_GLOBS = [
	'src/**/*.ts',
	'!src/**/*.test.ts',
	'!src/**/*.spec.ts',
	'!src/**/__tests__/**',
	'!src/**/migrations/**',
];

function stringArrayOption(value: unknown, fallback: string[]): string[] {
	return Array.isArray(value) && value.every((entry): entry is string => typeof entry === 'string')
		? value
		: fallback;
}

function normalizedRelativePath(rootDir: string, filePath: string): string {
	return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function namedImportBindings(declaration: ImportDeclaration, importedName: string): string[] {
	return declaration
		.getNamedImports()
		.filter((specifier) => specifier.getName() === importedName)
		.map((specifier) => specifier.getAliasNode()?.getText() ?? specifier.getName());
}

function isPersistenceAdapter(file: SourceFile): boolean {
	const typeormImports = file
		.getImportDeclarations()
		.filter((declaration) => declaration.getModuleSpecifierValue() === TYPEORM_PACKAGE);
	const dbImports = file
		.getImportDeclarations()
		.filter((declaration) => declaration.getModuleSpecifierValue() === DB_PACKAGE);

	const entityNames = new Set(
		typeormImports.flatMap((declaration) => namedImportBindings(declaration, 'Entity')),
	);
	const repositoryNames = new Set([
		...typeormImports.flatMap((declaration) => namedImportBindings(declaration, 'Repository')),
		...dbImports.flatMap((declaration) => namedImportBindings(declaration, 'BaseRepository')),
	]);
	const namespaceNames = new Set(
		typeormImports.flatMap((declaration) => {
			const namespace = declaration.getNamespaceImport();
			return namespace ? [namespace.getText()] : [];
		}),
	);

	return file.getClasses().some((cls) => {
		const hasEntityDecorator = cls.getDecorators().some((decorator) => {
			const expression = decorator.getExpression();
			const target = Node.isCallExpression(expression) ? expression.getExpression() : expression;
			const name = target.getText();
			return entityNames.has(name) || [...namespaceNames].some((ns) => name === `${ns}.Entity`);
		});
		if (hasEntityDecorator) return true;

		const base = cls.getExtends()?.getExpression().getText();
		return (
			base !== undefined &&
			(repositoryNames.has(base) || [...namespaceNames].some((ns) => base === `${ns}.Repository`))
		);
	});
}

/** Enforces the TypeORM persistence boundary without prescribing a package layout. */
export class TypeormPersistenceBoundaryRule extends BaseRule<CodeHealthContext> {
	readonly id = 'typeorm-persistence-boundary';
	readonly name = 'TypeORM Persistence Boundary';
	readonly description =
		'Business logic must not import TypeORM. Entity and repository declarations may import it in any package layout.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const allowedFiles = new Set(
			stringArrayOption(this.getOptions().allowedFiles, DEFAULT_ALLOWED_FILES),
		);
		const exemptPackages = new Set(
			stringArrayOption(this.getOptions().exemptPackages, DEFAULT_EXEMPT_PACKAGES),
		);
		const violations: Violation[] = [];

		for (const packageJsonPath of await findPackageJsonFiles(context.rootDir)) {
			const packageInfo = parsePackageJson(packageJsonPath);
			if (packageInfo.packageName === DB_PACKAGE || exemptPackages.has(packageInfo.packageName)) {
				continue;
			}
			if (
				!packageInfo.deps.some((dependency) =>
					[TYPEORM_PACKAGE, DB_PACKAGE].includes(dependency.name),
				)
			) {
				continue;
			}

			const packageDir = path.dirname(packageJsonPath);
			const project = new Project({
				skipAddingFilesFromTsConfig: true,
				skipFileDependencyResolution: true,
			});
			const packagePath = relativeDir(context.rootDir, packageJsonPath);
			const patterns = SOURCE_GLOBS.map((glob) => {
				const prefix = glob.startsWith('!') ? '!' : '';
				const relativeGlob = prefix ? glob.slice(1) : glob;
				return `${prefix}${packageDir}/${relativeGlob}`.replaceAll('\\', '/');
			});

			project.addSourceFilesAtPaths(patterns);
			for (const file of project.getSourceFiles()) {
				const relativeFile = normalizedRelativePath(context.rootDir, file.getFilePath());
				if (allowedFiles.has(relativeFile)) continue;
				violations.push(...this.analyzeFile(file, packagePath));
			}
		}

		return violations;
	}

	private analyzeFile(file: SourceFile, packagePath: string): Violation[] {
		const violations: Violation[] = [];
		const adapter = isPersistenceAdapter(file);

		for (const declaration of file.getImportDeclarations()) {
			const source = declaration.getModuleSpecifierValue();
			if (source === TYPEORM_PACKAGE || source.startsWith(`${TYPEORM_PACKAGE}/`)) {
				if (!adapter) {
					violations.push(
						this.importViolation(
							declaration,
							'Business logic imports TypeORM directly.',
							'Add a use-case repository method, or move this query into a persistence adapter.',
						),
					);
				}
				continue;
			}

			if (source !== DB_PACKAGE) continue;
			for (const specifier of declaration.getNamedImports()) {
				const importedName = specifier.getName();
				if (!GUARDED_DB_REEXPORTS.has(importedName)) continue;
				violations.push(
					this.importViolation(
						specifier,
						`${packagePath} imports the TypeORM re-export \`${importedName}\` from @n8n/db.`,
						'Import TypeORM directly in a persistence adapter. Add a use-case repository method for business logic.',
					),
				);
			}
		}

		return violations;
	}

	private importViolation(node: Node, message: string, suggestion: string): Violation {
		const position = node.getSourceFile().getLineAndColumnAtPos(node.getStart());
		return this.createViolation(
			node.getSourceFile().getFilePath(),
			position.line,
			position.column,
			message,
			suggestion,
		);
	}
}
