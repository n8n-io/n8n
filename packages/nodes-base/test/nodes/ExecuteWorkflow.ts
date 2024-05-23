import nock from 'nock';
import { WorkflowExecute } from 'n8n-core';
import type { INodeTypes, IRun, IRunExecutionData } from 'n8n-workflow';
import { createDeferredPromise, Workflow } from 'n8n-workflow';
import * as Helpers from './Helpers';
import type { WorkflowTestData } from './types';

export async function executeWorkflow(testData: WorkflowTestData, nodeTypes: INodeTypes) {
	if (testData.nock) {
		const { baseUrl, mocks } = testData.nock;
		const agent = nock(baseUrl);
		mocks.forEach(({ method, path, statusCode, responseBody }) =>
			// @ts-expect-error
			agent[method](path).reply(statusCode, responseBody),
		);
	}
	const executionMode = testData.trigger?.mode ?? 'manual';
	const workflowInstance = new Workflow({
		id: 'test',
		nodes: testData.input.workflowData.nodes,
		connections: testData.input.workflowData.connections,
		active: false,
		nodeTypes,
		settings: testData.input.workflowData.settings,
	});
	const waitPromise = await createDeferredPromise<IRun>();
	const nodeExecutionOrder: string[] = [];
	const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise, nodeExecutionOrder);

	let executionData: IRun;
	const runExecutionData: IRunExecutionData = {
		resultData: {
			runData: {},
		},
		executionData: {
			metadata: {},
			contextData: {},
			waitingExecution: {},
			waitingExecutionSource: null,
			nodeExecutionStack: [
				{
					node: workflowInstance.getStartNode()!,
					data: {
						main: [[testData.trigger?.input ?? { json: {} }]],
					},
					source: null,
				},
			],
		},
	};
	const workflowExecute = new WorkflowExecute(additionalData, executionMode, runExecutionData);
	executionData = await workflowExecute.processRunExecutionData(workflowInstance);

	const result = await waitPromise.promise();
	return { executionData, result, nodeExecutionOrder };
}
