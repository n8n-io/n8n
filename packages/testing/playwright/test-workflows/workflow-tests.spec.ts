/* eslint-disable playwright/expect-expect */
/* eslint-disable playwright/no-conditional-expect */
/* eslint-disable playwright/no-conditional-in-test */
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import GenerateSchema from 'generate-schema';
import * as path from 'path';

// Configuration
if (process.argv.includes('--update-snapshots') && !process.env.SCHEMA) {
	process.env.SCHEMA = 'true';
}
const SCHEMA_MODE = process.env.SCHEMA === 'true';
const WORKFLOW_CONFIG_PATH = path.join(__dirname, 'workflowConfig.json');
const WORKFLOWS_DIR = path.join(__dirname, '../test-workflows/workflows');

interface WorkflowConfig {
	workflowId: string;
	status: 'SKIPPED' | 'ACTIVE';
	enableSchemaValidation?: boolean;
}

/**
 * Load workflow configuration
 * @returns A map of workflow IDs to their config
 */
function getWorkflowConfig(): Map<string, WorkflowConfig> {
	if (!fs.existsSync(WORKFLOW_CONFIG_PATH)) return new Map();

	const configs: WorkflowConfig[] = JSON.parse(fs.readFileSync(WORKFLOW_CONFIG_PATH, 'utf-8'));
	return new Map(configs.map((config) => [config.workflowId, config]));
}

/**
 * Load workflows with their config
 * @returns An array of workflow objects with their config
 */
function getWorkflowsWithConfig() {
	if (!fs.existsSync(WORKFLOWS_DIR)) return [];

	const workflowConfigs = getWorkflowConfig();

	return fs
		.readdirSync(WORKFLOWS_DIR)
		.filter((file) => file.endsWith('.json'))
		.map((file) => {
			const id = file.replace('.json', '');
			const content = JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8'));
			const config = workflowConfigs.get(id);

			return {
				id,
				name: content.name ?? `Workflow ${id}`,
				status: config?.status ?? 'ACTIVE',
				enableSchemaValidation: config?.enableSchemaValidation ?? true,
			};
		});
}

/**
 * Execute a workflow and return the result
 * @param workflowId - The ID of the workflow to execute
 * @returns The result of the workflow execution
 */
function executeWorkflow(workflowId: string) {
	const divider = '====================================';
	try {
		const stdout = execSync(`../../cli/bin/n8n execute --id="${workflowId}"`, {
			encoding: 'utf-8',
			maxBuffer: 10 * 1024 * 1024,
			env: { ...process.env, SKIP_STATISTICS_EVENTS: 'true' },
		});

		const dividerIndex = stdout.indexOf(divider);

		if (dividerIndex === -1) {
			return { success: stdout.includes('Execution was successful'), data: null };
		}

		const data = JSON.parse(stdout.substring(dividerIndex + divider.length));
		return { success: true, data };
	} catch (error: any) {
		const stdout = error.stdout ?? '';
		const dividerIndex = stdout.indexOf(divider);
		if (dividerIndex !== -1) {
			const errorDetails = stdout.substring(dividerIndex + divider.length).trim();
			return { success: false, data: null, error: errorDetails };
		}

		return { success: false, data: null, error: error.message };
	}
}

// Run tests
test.describe('Workflow Tests', () => {
	const workflows = getWorkflowsWithConfig();

	for (const workflow of workflows) {
		if (workflow.status === 'SKIPPED') {
			// eslint-disable-next-line playwright/no-skipped-test
			test.skip(`${workflow.name} (ID: ${workflow.id})`, () => {});
			continue;
		}

		test(`${workflow.name} (ID: ${workflow.id})`, ({}, testInfo) => {
			// Keep the snapshot name the same for all workflows, since it's not OS dependent
			testInfo.snapshotSuffix = '';

			// Execute the workflow
			const result = executeWorkflow(workflow.id);

			// Always verify the workflow executed successfully
			expect(result.success, result.error).toBe(true);

			// If schema mode is enabled and this workflow has schema validation enabled
			if (SCHEMA_MODE && result.data && workflow.enableSchemaValidation) {
				const schema = GenerateSchema.json(result.data);

				expect(JSON.stringify(schema, null, 2)).toMatchSnapshot(
					`workflow-${workflow.id}-schema.snap`,
				);
			}
		});
	}
});
