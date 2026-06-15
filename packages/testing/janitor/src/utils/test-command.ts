/**
 * Test Command Resolver
 *
 * Priority: CLI override > config file > fallback default
 * Worker count is always appended from config (default: 1)
 */

import { getConfig, hasConfig } from '../config.js';

const DEFAULT_TEST_COMMAND = 'npx playwright test';
const DEFAULT_WORKERS = 1;

export interface ResolvedCommand {
	bin: string;
	args: string[];
}

function getWorkerCount(): number {
	if (hasConfig()) {
		const config = getConfig();
		return config.tcr?.workerCount ?? DEFAULT_WORKERS;
	}
	return DEFAULT_WORKERS;
}

function getAllowedTestCommands(): string[] | undefined {
	if (hasConfig()) {
		const config = getConfig();
		return config.tcr?.allowedTestCommands;
	}
	return undefined;
}

function getBaseCommand(override?: string): string {
	if (override) {
		return override;
	}

	if (hasConfig()) {
		const config = getConfig();
		if (config.tcr?.testCommand) {
			return config.tcr.testCommand;
		}
	}

	return DEFAULT_TEST_COMMAND;
}

function parseCommand(command: string): ResolvedCommand {
	const parts = command.split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		throw new Error('Test command cannot be empty');
	}
	return { bin: parts[0], args: parts.slice(1) };
}

function validateAgainstAllowlist(command: string): void {
	const allowedCommands = getAllowedTestCommands();
	if (!allowedCommands) return;

	if (!allowedCommands.includes(command)) {
		throw new Error(
			`Test command "${command}" is not in the allowlist. Allowed commands: ${allowedCommands.join(', ')}`,
		);
	}
}

export function resolveTestCommand(override?: string): ResolvedCommand {
	const baseCommand = getBaseCommand(override);
	validateAgainstAllowlist(baseCommand);
	const workers = getWorkerCount();
	const parsed = parseCommand(baseCommand);
	parsed.args.push(`--workers=${workers}`);
	return parsed;
}

export function buildTestCommand(testFiles: string[], override?: string): ResolvedCommand {
	const resolved = resolveTestCommand(override);
	resolved.args.push(...testFiles);
	return resolved;
}
