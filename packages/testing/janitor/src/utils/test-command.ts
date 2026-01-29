/**
 * Test Command Resolver
 *
 * Priority: CLI override > config file > fallback default
 * Worker count is always appended from config (default: 1)
 */

import { getConfig, hasConfig } from '../config.js';

const DEFAULT_TEST_COMMAND = 'npx playwright test';
const DEFAULT_WORKERS = 1;

function getWorkerCount(): number {
	if (hasConfig()) {
		const config = getConfig();
		return config.tcr?.workerCount ?? DEFAULT_WORKERS;
	}
	return DEFAULT_WORKERS;
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

export function resolveTestCommand(override?: string): string {
	const baseCommand = getBaseCommand(override);
	const workers = getWorkerCount();
	return `${baseCommand} --workers=${workers}`;
}

export function buildTestCommand(testFiles: string[], override?: string): string {
	const baseCommand = resolveTestCommand(override);
	const fileArgs = testFiles.join(' ');
	return `${baseCommand} ${fileArgs}`;
}
