import type { Page } from '@playwright/test';
import { stringify } from 'flatted';
import pick from 'lodash/pick';
import type {
	IDataObject,
	IRunData,
	IRunExecutionData,
	ITaskData,
	ITaskDataConnections,
} from 'n8n-workflow';
import { nanoid } from 'nanoid';

export function createMockNodeExecutionData(
	name: string,
	{
		data,
		inputOverride,
		executionStatus = 'success',
		jsonData,
		...rest
	}: Partial<ITaskData> & { jsonData?: Record<string, IDataObject> },
): Record<string, ITaskData> {
	return {
		[name]: {
			startTime: Date.now(),
			executionIndex: 0,
			executionTime: 1,
			executionStatus,
			data: jsonData
				? Object.keys(jsonData).reduce<ITaskDataConnections>((acc, key) => {
						acc[key] = [
							[
								{
									json: jsonData[key],
									pairedItem: { item: 0 },
								},
							],
						];

						return acc;
					}, {})
				: data,
			source: [null],
			inputOverride,
			...rest,
		},
	};
}

export interface MockWorkflowExecutionOptions {
	trigger?: () => Promise<void>;
	lastNodeExecuted: string;
	runData: Array<ReturnType<typeof createMockNodeExecutionData>>;
}

export async function runMockWorkflowExecution(
	page: Page,
	{ trigger, lastNodeExecuted, runData }: MockWorkflowExecutionOptions,
) {
	const workflowId = nanoid();
	const executionId = Math.floor(Math.random() * 1_000_000).toString();

	const resolvedRunData = runData.reduce<IRunData>((acc, nodeExecution) => {
		const nodeName = Object.keys(nodeExecution)[0];
		acc[nodeName] = [nodeExecution[nodeName]];
		return acc;
	}, {});

	const executionData: IRunExecutionData = {
		startData: {},
		resultData: {
			runData: resolvedRunData,
			pinData: {},
			lastNodeExecuted,
		},
		executionData: {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: {},
		},
	};

	// Intercept the workflow run API call
	await page.route('**/rest/workflows/**/run?**', async (route) => {
		if (route.request().method() === 'POST') {
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({
					data: {
						executionId,
					},
				}),
			});
		} else {
			await route.continue();
		}
	});

	// Start the workflow execution
	if (trigger) {
		await trigger();
	} else {
		// Default to clicking execute button
		await page.getByTestId('execute-workflow-button').click();
	}

	// Wait for the API call to complete
	await page.waitForResponse(
		(response) => response.url().includes('/rest/workflows/') && response.url().includes('/run'),
	);

	// Send push events via API endpoint (same as Cypress implementation)
	const apiContext = page.context();

	// Send executionStarted event
	await apiContext.request.post('/rest/e2e/push', {
		data: {
			type: 'executionStarted',
			data: {
				workflowId,
				executionId,
				mode: 'manual',
				startedAt: new Date(),
				workflowName: '',
				flattedRunData: '',
			},
		},
	});

	// Send node execution events
	for (const nodeExecution of runData) {
		const nodeName = Object.keys(nodeExecution)[0];
		const nodeRunData = nodeExecution[nodeName];

		// Send nodeExecuteBefore event
		await apiContext.request.post('/rest/e2e/push', {
			data: {
				type: 'nodeExecuteBefore',
				data: {
					executionId,
					nodeName,
					data: pick(nodeRunData, ['startTime', 'executionIndex', 'source', 'hints']),
				},
			},
		});

		// Send nodeExecuteAfter event
		await apiContext.request.post('/rest/e2e/push', {
			data: {
				type: 'nodeExecuteAfter',
				data: {
					executionId,
					nodeName,
					data: nodeRunData,
				},
			},
		});
	}

	// Send executionFinished event
	await apiContext.request.post('/rest/e2e/push', {
		data: {
			type: 'executionFinished',
			data: {
				executionId,
				workflowId,
				status: 'success',
				rawData: stringify(executionData),
			},
		},
	});
}
