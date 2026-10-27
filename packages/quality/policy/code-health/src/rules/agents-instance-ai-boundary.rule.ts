import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { parseImports } from '@n8n/rules-engine/ast';
import { Node, Project, SyntaxKind } from 'ts-morph';
import type { CompilerOptions, SourceFile } from 'ts-morph';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';

const CLI_PATH = 'packages/cli';
const MODULES_PATH = `${CLI_PATH}/src/modules`;
const AGENT_ENTRY_POINTS = new Set([
	'agent-context.service',
	'agent-context.contracts',
	'agent-credential-provider.contracts',
	'agent-draft.service',
	'agent-draft.contracts',
	'format-agent-session-context',
	'builder/agents-builder.service',
	'builder/builder-session',
	'evaluation/agent-evaluation.service',
	'evaluation/agent-evaluation.contracts',
	'evaluation/evaluation-config',
	'system-agents/system-agent.types',
	'system-agents/system-agent-registration.service',
]);

function isWithin(directory: string, target: string): boolean {
	return target === directory || target.startsWith(`${directory}${path.sep}`);
}

function resolveLocalImport(
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

function sdkEntryPoints(rootDir: string): Set<string> {
	const allowed = new Set(['@n8n/agents']);
	const manifestPath = path.join(rootDir, 'packages/@n8n/agents/package.json');
	if (!fs.existsSync(manifestPath)) return allowed;
	const manifest: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	if (manifest === null || typeof manifest !== 'object' || !('exports' in manifest)) return allowed;
	const entries = manifest.exports;
	if (entries === null || typeof entries !== 'object') return allowed;
	for (const entry of Object.keys(entries)) {
		if (entry.startsWith('./')) allowed.add(`@n8n/agents/${entry.slice(2)}`);
	}
	return allowed;
}

function importReferences(file: SourceFile) {
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

export class AgentsInstanceAiBoundaryRule extends BaseRule<CodeHealthContext> {
	readonly id = 'agents-instance-ai-boundary';
	readonly name = 'Agents and Instance AI Boundary';
	readonly description =
		'Agents cannot depend on Instance AI. Instance AI must use supported Agent operations and contracts.';
	readonly severity = 'error' as const;

	analyze({ rootDir }: CodeHealthContext): Violation[] {
		const configPath = path.join(rootDir, CLI_PATH, 'tsconfig.json');
		const project = new Project({
			...(fs.existsSync(configPath) ? { tsConfigFilePath: configPath } : {}),
			skipAddingFilesFromTsConfig: true,
			skipFileDependencyResolution: true,
		});
		const agentsPath = path.join(rootDir, MODULES_PATH, 'agents');
		const assistantPath = path.join(rootDir, MODULES_PATH, 'instance-ai');
		const files = project.addSourceFilesAtPaths([
			`${agentsPath}/**/*.ts`,
			`${assistantPath}/**/*.ts`,
		]);
		const sdkEntries = sdkEntryPoints(rootDir);
		const options = project.getCompilerOptions();
		return files.flatMap((file) => this.checkFile(rootDir, file, options, sdkEntries));
	}

	private checkFile(
		rootDir: string,
		file: SourceFile,
		options: CompilerOptions,
		sdkEntries: Set<string>,
	): Violation[] {
		const fromAgents = isWithin(path.join(rootDir, MODULES_PATH, 'agents'), file.getFilePath());
		return importReferences(file).flatMap((reference) => {
			const target = resolveLocalImport(rootDir, file.getFilePath(), reference.specifier, options);
			const message = this.boundaryError(
				rootDir,
				reference.specifier,
				target,
				fromAgents,
				sdkEntries,
			);
			if (!message) return [];
			return [
				this.createViolation(
					file.getFilePath(),
					reference.line,
					1,
					message,
					'Keep Assistant adapters in Instance AI. Use supported Agent services and contracts. Keep persistence and runtime internals private.',
				),
			];
		});
	}

	private boundaryError(
		rootDir: string,
		specifier: string,
		target: string | undefined,
		fromAgents: boolean,
		sdkEntries: Set<string>,
	): string | undefined {
		if (fromAgents) {
			const assistantPackage =
				specifier === '@n8n/instance-ai' || specifier.startsWith('@n8n/instance-ai/');
			const assistantSource =
				target &&
				(isWithin(path.join(rootDir, MODULES_PATH, 'instance-ai'), target) ||
					isWithin(path.join(rootDir, 'packages/@n8n/instance-ai'), target));
			if (assistantPackage || assistantSource)
				return `Agents must not depend on Instance AI: "${specifier}".`;
			return undefined;
		}
		const privateSdkImport = specifier.startsWith('@n8n/agents/') && !sdkEntries.has(specifier);
		const sdkSourceImport = target && isWithin(path.join(rootDir, 'packages/@n8n/agents'), target);
		if (privateSdkImport || sdkSourceImport) {
			return `Instance AI must use a public Agents SDK entry point: "${specifier}".`;
		}
		if (!target || !isWithin(path.join(rootDir, MODULES_PATH, 'agents'), target)) return undefined;
		const entryPoint = path
			.relative(path.join(rootDir, MODULES_PATH, 'agents'), target)
			.replace(/\.(?:ts|js)$/, '')
			.split(path.sep)
			.join('/');
		if (AGENT_ENTRY_POINTS.has(entryPoint)) return undefined;
		return `Instance AI must use a supported Agent operation or contract: "${specifier}".`;
	}
}
