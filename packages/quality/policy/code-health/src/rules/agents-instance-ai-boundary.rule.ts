import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import type { CompilerOptions, SourceFile } from 'ts-morph';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	MODULES_PATH,
	entryPointOf,
	importReferences,
	isWithin,
	loadCliFiles,
	resolveLocalImport,
} from '../utils/cli-imports.js';

const AGENT_ENTRY_POINTS = new Set([
	'agent-context.service',
	'agent-context.contracts',
	'agent-credential-provider.contracts',
	'agent-draft.service',
	'agent-draft.contracts',
	'builder/agents-builder.service',
	'builder/builder-session',
	'evaluation/agent-evaluation.service',
	'evaluation/agent-evaluation.contracts',
	'evaluation/evaluation-config',
	'system-agents/system-agent.types',
	'system-agents/system-agent-registration.service',
]);

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

export class AgentsInstanceAiBoundaryRule extends BaseRule<CodeHealthContext> {
	readonly id = 'agents-instance-ai-boundary';
	readonly name = 'Agents and Instance AI Boundary';
	readonly description =
		'Agents cannot depend on Instance AI. Instance AI must use supported Agent operations and contracts.';
	readonly severity = 'error' as const;

	analyze({ rootDir }: CodeHealthContext): Violation[] {
		const agentsPath = path.join(rootDir, MODULES_PATH, 'agents');
		const assistantPath = path.join(rootDir, MODULES_PATH, 'instance-ai');
		const { files, options } = loadCliFiles(rootDir, [
			`${agentsPath}/**/*.ts`,
			`${assistantPath}/**/*.ts`,
		]);
		const sdkEntries = sdkEntryPoints(rootDir);
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
		const entryPoint = entryPointOf(path.join(rootDir, MODULES_PATH, 'agents'), target);
		if (AGENT_ENTRY_POINTS.has(entryPoint)) return undefined;
		return `Instance AI must use a supported Agent operation or contract: "${specifier}".`;
	}
}
