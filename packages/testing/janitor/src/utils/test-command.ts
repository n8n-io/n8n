/**
 * Test Command Resolver
 *
 * Priority: CLI override > config file > fallback default
 */

import { getConfig, hasConfig } from '../config.js';

const DEFAULT_TEST_COMMAND = 'npx playwright test';
const DEFAULT_WORKERS = 1;

export function resolveTestCommand(override?: string): string {
	if (override) {
		return override;
	}

	if (hasConfig()) {
		const config = getConfig();
		if (config.tcr?.testCommand) {
			return config.tcr.testCommand;
		}
	}

	return `${DEFAULT_TEST_COMMAND} --workers=${DEFAULT_WORKERS}`;
}

export function buildTestCommand(testFiles: string[], override?: string): string {
	const baseCommand = resolveTestCommand(override);
	const fileArgs = testFiles.join(' ');
	return `${baseCommand} ${fileArgs}`;
}
