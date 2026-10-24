import { parseImports } from '@n8n/rules-engine/ast';
import { Node, Project, SyntaxKind } from 'ts-morph';
import type { CompilerOptions, SourceFile } from 'ts-morph';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const CLI_PATH = 'packages/cli';
export const MODULES_PATH = `${CLI_PATH}/src/modules`;

export function isWithin(directory: string, target: string): boolean {
	return target === directory || target.startsWith(`${directory}${path.sep}`);
}

/** Loads cli files with its tsconfig, so the `@/` aliases resolve. */
export function loadCliFiles(rootDir: string, globs: string[]) {
	const configPath = path.join(rootDir, CLI_PATH, 'tsconfig.json');
	const project = new Project({
		...(fs.existsSync(configPath) ? { tsConfigFilePath: configPath } : {}),
		skipAddingFilesFromTsConfig: true,
		skipFileDependencyResolution: true,
	});
	const files = project.addSourceFilesAtPaths(globs);
	return { files, options: project.getCompilerOptions() };
}

/** Resolves a relative or cli-aliased specifier to an absolute path, without extension lookup. */
export function resolveLocalImport(
	rootDir: string,
	filePath: string,
	specifier: string,
	options: CompilerOptions,
): string | undefined {
	if (specifier.startsWith('.')) return path.resolve(path.dirname(filePath), specifier);
	if (path.isAbsolute(specifier)) return path.normalize(specifier);
	const base = options.baseUrl ?? path.join(rootDir, CLI_PATH);
	for (const [alias, targets] of Object.entries(options.paths ?? { '@/*': ['./src/*'] })) {
		const wildcard = alias.indexOf('*');
		if (wildcard === -1 && alias === specifier) return path.resolve(base, targets[0]);
		if (wildcard === -1) continue;
		const prefix = alias.slice(0, wildcard);
		const suffix = alias.slice(wildcard + 1);
		if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
		const matched = specifier.slice(prefix.length, specifier.length - suffix.length);
		return path.resolve(base, targets[0].replace('*', matched));
	}
	return undefined;
}

/** Static imports and exports, `import('…')` types, and dynamic `import()` calls with a literal. */
export function importReferences(file: SourceFile) {
	const references = parseImports(file);
	for (const importType of file.getDescendantsOfKind(SyntaxKind.ImportType)) {
		const argument = importType.getArgument();
		if (!Node.isLiteralTypeNode(argument)) continue;
		const literal = argument.getLiteral();
		if (Node.isStringLiteral(literal)) {
			references.push({
				specifier: literal.getLiteralText(),
				typeOnly: true,
				line: literal.getStartLineNumber(),
			});
		}
	}
	for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
		const [argument] = call.getArguments();
		if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword || !argument) continue;
		if (Node.isNoSubstitutionTemplateLiteral(argument)) {
			references.push({
				specifier: argument.getLiteralText(),
				typeOnly: false,
				line: argument.getStartLineNumber(),
			});
		}
	}
	return references;
}

/** The path of `target` below `directory`, in `/` form, without extension or `/index`. */
export function entryPointOf(directory: string, target: string): string {
	return path
		.relative(directory, target)
		.replace(/\.(?:ts|js)$/, '')
		.split(path.sep)
		.join('/')
		.replace(/(?:^|\/)index$/, '');
}
