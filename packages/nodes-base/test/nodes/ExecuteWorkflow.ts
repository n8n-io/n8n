import { WorkflowExecute } from 'n8n-core';
import type { INodeTypes, IRun, IRunExecutionData } from 'n8n-workflow';
import { createDeferredPromise, Workflow } from 'n8n-workflow';
import nock from 'nock';

import * as Helpers from './Helpers';
import type { WorkflowTestData } from './types';

export async function executeWorkflow(testData: WorkflowTestData, nodeTypes: INodeTypes) {
	if (testData.nock) {
		const { baseUrl, mocks } = testData.nock;
		const agent = nock(baseUrl);
		mocks.forEach(
			({
				method,
				path,
				statusCode,
				requestBody,
				requestHeaders,
				responseBody,
				responseHeaders,
			}) => {
				let mock = agent[method](path, requestBody);

				// nock interceptor reqheaders option is ignored, so we chain matchHeader()
				// agent[method](path, requestBody, { reqheaders: requestHeaders }).reply(statusCode, responseBody, responseHeaders)
				// https://github.com/nock/nock/issues/2545
				if (requestHeaders && Object.keys(requestHeaders).length > 0) {
					Object.entries(requestHeaders).forEach(([key, value]) => {
						mock = mock.matchHeader(key, value);
					});
				}

				mock.reply(statusCode, responseBody, responseHeaders);
			},
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
	const waitPromise = createDeferredPromise<IRun>();
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

	const result = await waitPromise.promise;
	return { executionData, result, nodeExecutionOrder };
}
