import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { ExecutionLifecycleHooks, WorkflowExecute } from 'n8n-core';
import type {
	IRun,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	WorkflowTestData,
} from 'n8n-workflow';
import { createDeferredPromise, Workflow } from 'n8n-workflow';
import nock from 'nock';

import { CredentialsHelper } from './credentials-helper';
import { NodeTypes } from './node-types';

export async function executeWorkflow(testData: WorkflowTestData) {
	const nodeTypes = Container.get(NodeTypes);

	const credentialsHelper = Container.get(CredentialsHelper);
	credentialsHelper.setCredentials(testData.credentials ?? {});

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

	const hooks = new ExecutionLifecycleHooks('trigger', '1', mock());
	hooks.addHandler('nodeExecuteAfter', (nodeName) => {
		nodeExecutionOrder.push(nodeName);
	});
	hooks.addHandler('workflowExecuteAfter', (fullRunData) => waitPromise.resolve(fullRunData));

	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks,
		// Get from node.parameters
		currentNodeParameters: undefined,
	});
	additionalData.credentialsHelper = credentialsHelper;

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
