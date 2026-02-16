import { readFileSync } from 'fs';
import type { IWorkflowBase, IPinData, INodeExecutionData } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';
import { resolveFromRoot } from '../../../utils/path-helper';

/**
 * Workflow Execution with Code Nodes
 *
 * These tests verify that workflows containing Code nodes execute correctly
 * and produce the expected output. They replace the unit tests in
 * packages/core/src/execution-engine/__tests__/workflow-execute.test.ts
 * ('run test workflows' section) which cannot run without the task runner.
 *
 * Each test imports a workflow JSON file (stripping pinData before import),
 * executes it via the API, and compares the actual node output against the
 * expected pinData from the original file.
 */

interface ExecutionData {
	resultData: {
		runData: Record<
			string,
			Array<{
				data?: {
					main: Array<INodeExecutionData[] | null>;
				};
			}>
		>;
		error?: unknown;
	};
	executionData?: {
		nodeExecutionStack: unknown[];
	};
}

function loadWorkflowWithExpectedOutput(fileName: string) {
	const filePath = resolveFromRoot('workflows', fileName);
	const workflow = JSON.parse(readFileSync(filePath, 'utf8')) as IWorkflowBase & {
		pinData?: IPinData;
	};
	const expectedPinData = workflow.pinData ?? {};
	return { expectedPinData };
}

function stripPinData(workflow: Partial<IWorkflowBase>): Partial<IWorkflowBase> {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { pinData, ...rest } = workflow as IWorkflowBase & { pinData?: IPinData };
	return rest;
}

test.describe(
	'Workflow execution with Code nodes',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should execute error_outputs workflow and produce correct output', async ({ api }) => {
			const workflowFile = 'Core_error_outputs.json';
			const { expectedPinData } = loadWorkflowWithExpectedOutput(workflowFile);

			const { workflowId } = await api.workflows.importWorkflowFromFile(workflowFile, {
				transform: stripPinData,
			});

			const execution = await api.workflows.runManually(workflowId, { timeoutMs: 15000 });
			const executionData = JSON.parse(execution.data) as ExecutionData;
			const runData = executionData.resultData.runData;

			expect(executionData.resultData.error).toBeUndefined();

			for (const [nodeName, expectedItems] of Object.entries(expectedPinData)) {
				expect(runData[nodeName]).toBeDefined();

				const actualItems = runData[nodeName].flatMap((nodeData) => {
					if (!nodeData.data) return [];
					return nodeData.data.main[0] ?? [];
				});

				// Compare json output (ignoring pairedItem for error_outputs tests)
				const actualJson = actualItems.map((item) => item.json);
				const expectedJson = expectedItems.map((item) => item.json);
				expect(actualJson).toEqual(expectedJson);
			}
		});

		test('should execute paired_items_fix workflow and produce correct output', async ({ api }) => {
			const workflowFile = 'Core_paired_items_fix.json';
			const { expectedPinData } = loadWorkflowWithExpectedOutput(workflowFile);

			const { workflowId } = await api.workflows.importWorkflowFromFile(workflowFile, {
				transform: stripPinData,
			});

			const execution = await api.workflows.runManually(workflowId, { timeoutMs: 15000 });
			const executionData = JSON.parse(execution.data) as ExecutionData;
			const runData = executionData.resultData.runData;

			expect(executionData.resultData.error).toBeUndefined();

			for (const [nodeName, expectedItems] of Object.entries(expectedPinData)) {
				expect(runData[nodeName]).toBeDefined();

				const actualItems = runData[nodeName].flatMap((nodeData) => {
					if (!nodeData.data) return [];
					return nodeData.data.main[0] ?? [];
				});

				const actualOutput = actualItems.map((item) => ({
					json: item.json,
					pairedItem: item.pairedItem,
				}));
				const expectedOutput = expectedItems.map((item) => ({
					json: item.json,
					pairedItem: item.pairedItem,
				}));
				expect(actualOutput).toEqual(expectedOutput);
			}
		});

		test('should execute retry_and_continue_on_error workflow and produce correct output', async ({
			api,
		}) => {
			const workflowFile = 'Core_retry_and_continue_on_error.json';
			const { expectedPinData } = loadWorkflowWithExpectedOutput(workflowFile);

			const { workflowId } = await api.workflows.importWorkflowFromFile(workflowFile, {
				transform: stripPinData,
			});

			const execution = await api.workflows.runManually(workflowId, { timeoutMs: 30000 });
			const executionData = JSON.parse(execution.data) as ExecutionData;
			const runData = executionData.resultData.runData;

			expect(executionData.resultData.error).toBeUndefined();

			for (const [nodeName, expectedItems] of Object.entries(expectedPinData)) {
				expect(runData[nodeName]).toBeDefined();

				const actualItems = runData[nodeName].flatMap((nodeData) => {
					if (!nodeData.data) return [];
					return nodeData.data.main[0] ?? [];
				});

				const actualOutput = actualItems.map((item) => ({
					json: item.json,
					pairedItem: item.pairedItem,
				}));
				const expectedOutput = expectedItems.map((item) => ({
					json: item.json,
					pairedItem: item.pairedItem,
				}));
				expect(actualOutput).toEqual(expectedOutput);
			}
		});
	},
);
