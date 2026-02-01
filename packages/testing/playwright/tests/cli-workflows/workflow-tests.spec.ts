/* eslint-disable playwright/no-conditional-expect */
/* eslint-disable playwright/no-conditional-in-test */
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
// @ts-expect-error - 'generate-schema' is not typed, so we ignore the TS error.
import generateSchema from 'generate-schema';
import * as path from 'path';

import { findPackagesRoot } from '../../utils/path-helper';

// --- Configuration ---
const IGNORE_SKIPLIST = process.env.IGNORE_SKIPLIST === 'true';
const SCHEMA_MODE = process.env.SCHEMA === 'true';
const WORKFLOWS_DIR = path.join(__dirname, '../cli-workflows/workflows');
const WORKFLOW_CONFIG_PATH = path.join(__dirname, 'workflowConfig.json');

interface Workflow {
	id: string;
	name: string;
	status: 'SKIPPED' | 'ACTIVE';
	enableSchemaValidation: boolean;
}

interface WorkflowConfigItem {
	workflowId: string;
	status: 'SKIPPED' | 'ACTIVE';
	enableSchemaValidation?: boolean;
}

interface ExecutionResult {
	success: boolean;
	data: unknown;
	error?: string;
}

// --- Helper Functions ---

/**
 * Loads and merges workflow files with their configurations from `workflowConfig.json`.
 * @returns An array of workflow objects ready for testing.
 */
function loadWorkflows(): Workflow[] {
	if (!fs.existsSync(WORKFLOWS_DIR)) return [];

	const configs = new Map<string, WorkflowConfigItem>();
	if (fs.existsSync(WORKFLOW_CONFIG_PATH)) {
		const rawConfigs: WorkflowConfigItem[] = JSON.parse(
			fs.readFileSync(WORKFLOW_CONFIG_PATH, 'utf-8'),
		);
		rawConfigs.forEach((c) => configs.set(c.workflowId, c));
	}

	return fs
		.readdirSync(WORKFLOWS_DIR)
		.filter((file) => file.endsWith('.json'))
		.map((file) => {
			const id = path.basename(file, '.json');
			const content = JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8'));
			const config = configs.get(id);

			return {
				id,
				name: content.name ?? `Workflow ${id}`,
				status: config?.status ?? 'ACTIVE',
				enableSchemaValidation: config?.enableSchemaValidation ?? true,
			};
		});
}

/**
 * Executes a workflow via the CLI and captures the structured output or error.
 * @param workflowId - The ID of the workflow to execute.
 * @returns An object containing the execution status, data, and any errors.
 */
function executeWorkflow(workflowId: string): ExecutionResult {
	const packagesRoot = findPackagesRoot('cli');
	const n8nExecutablePath = path.join(packagesRoot, 'cli/bin/n8n');
	const command = `"${n8nExecutablePath}" execute --id="${workflowId}"`;
	const options = {
		encoding: 'utf-8' as const,
		maxBuffer: 10 * 1024 * 1024,
		env: { ...process.env, SKIP_STATISTICS_EVENTS: 'true' },
	};
	const divider = '====================================';

	try {
		const stdout = execSync(command, options);
		const dividerIndex = stdout.indexOf(divider);

		if (dividerIndex === -1) {
			// Handles cases where execution finishes but may not produce structured JSON output.
			return { success: stdout.includes('Execution was successful'), data: null };
		}

		const jsonData = stdout.substring(dividerIndex + divider.length);
		return { success: true, data: JSON.parse(jsonData) };
	} catch (error: unknown) {
		let stdout = '';

		if (error && typeof error === 'object' && 'stdout' in error) {
			stdout = (error as { stdout?: string }).stdout ?? '';
		}
		const dividerIndex = stdout.indexOf(divider);

		// Try to parse specific error details from stdout if the divider is present.
		if (dividerIndex !== -1) {
			const errorDetails = stdout.substring(dividerIndex + divider.length).trim();
			return { success: false, data: null, error: errorDetails };
		}

		// Fallback to the generic error message from the caught exception.
		return { success: false, data: null, error: stdout };
	}
}

// --- Test Suite ---
test.describe('Workflow Tests', () => {
	const workflows = loadWorkflows();

	for (const workflow of workflows) {
		test(`${workflow.name} (ID: ${workflow.id})`, ({}, testInfo) => {
			// Conditionally skip the test based on its status in the config file.
			// This can be overridden by setting the IGNORE_SKIPLIST environment variable.
			// eslint-disable-next-line playwright/no-skipped-test
			test.skip(
				workflow.status === 'SKIPPED' && !IGNORE_SKIPLIST,
				'Workflow is marked as SKIPPED in workflowConfig.json',
			);
			// Standardize snapshot names to be consistent across different operating systems.
			testInfo.snapshotSuffix = '';

			const result = executeWorkflow(workflow.id);

			expect(result.success, `Workflow execution failed: ${result.error}`).toBe(true);

			// Optionally, validate the output against a JSON schema snapshot if enabled.
			if (SCHEMA_MODE && result.data && workflow.enableSchemaValidation) {
				const schema = generateSchema.json(result.data);
				expect(JSON.stringify(schema, null, 2)).toMatchSnapshot(
					`workflow-${workflow.id}-schema.snap`,
				);
			}
		});
	}
});
