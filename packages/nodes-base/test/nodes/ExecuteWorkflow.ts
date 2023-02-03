import { WorkflowExecute } from 'n8n-core';
import { createDeferredPromise, INodeTypes, IRun, Workflow } from 'n8n-workflow';
import * as Helpers from './Helpers';

export async function executeWorkflow(testData, nodeTypes: INodeTypes) {
	const executionMode = 'manual';
	const workflowInstance = new Workflow({
		id: 'test',
		nodes: testData.input.workflowData.nodes,
		connections: testData.input.workflowData.connections,
		active: false,
		nodeTypes,
	});

	const waitPromise = await createDeferredPromise<IRun>();
	const nodeExecutionOrder: string[] = [];
	const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise, nodeExecutionOrder);

	const workflowExecute = new WorkflowExecute(additionalData, executionMode);

	const executionData = await workflowExecute.run(workflowInstance);
	const result = await waitPromise.promise();
	return { executionData, result, nodeExecutionOrder };
}
