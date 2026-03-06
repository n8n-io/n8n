import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as attachment from './attachment';
import * as comment from './comment';
import * as cycle from './cycle';
import * as issue from './issue';
import * as label from './label';
import type { Linear } from './node.type';
import * as project from './project';
import * as team from './team';
import * as user from './user';
import * as workflowState from './workflowState';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	const linear = { resource, operation } as Linear;

	let returnData: INodeExecutionData[] = [];

	switch (linear.resource) {
		case 'issue':
			returnData = await issue[linear.operation].execute.call(this, items);
			break;
		case 'comment':
			returnData = await comment[linear.operation].execute.call(this, items);
			break;
		case 'project':
			returnData = await project[linear.operation].execute.call(this, items);
			break;
		case 'user':
			returnData = await user[linear.operation].execute.call(this, items);
			break;
		case 'team':
			returnData = await team[linear.operation].execute.call(this, items);
			break;
		case 'label':
			returnData = await label[linear.operation].execute.call(this, items);
			break;
		case 'cycle':
			returnData = await cycle[linear.operation].execute.call(this, items);
			break;
		case 'attachment':
			returnData = await attachment[linear.operation].execute.call(this, items);
			break;
		case 'workflowState':
			returnData = await workflowState[linear.operation].execute.call(this, items);
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
	}

	return [returnData];
}
