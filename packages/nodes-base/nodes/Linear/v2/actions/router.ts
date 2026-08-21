import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as attachment from './attachment';
import * as comment from './comment';
import * as customer from './customer';
import * as customerNeed from './customerNeed';
import * as cycle from './cycle';
import * as document from './document';
import * as initiative from './initiative';
import * as issue from './issue';
import * as issueRelation from './issueRelation';
import * as label from './label';
import type { Linear } from './node.type';
import * as project from './project';
import * as projectMilestone from './projectMilestone';
import * as projectUpdate from './projectUpdate';
import * as release from './release';
import * as team from './team';
import * as teamMembership from './teamMembership';
import * as user from './user';
import * as view from './view';
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
		case 'customer':
			returnData = await customer[linear.operation].execute.call(this, items);
			break;
		case 'customerNeed':
			returnData = await customerNeed[linear.operation].execute.call(this, items);
			break;
		case 'project':
			returnData = await project[linear.operation].execute.call(this, items);
			break;
		case 'projectMilestone':
			returnData = await projectMilestone[linear.operation].execute.call(this, items);
			break;
		case 'projectUpdate':
			returnData = await projectUpdate[linear.operation].execute.call(this, items);
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
		case 'document':
			returnData = await document[linear.operation].execute.call(this, items);
			break;
		case 'initiative':
			returnData = await initiative[linear.operation].execute.call(this, items);
			break;
		case 'teamMembership':
			returnData = await teamMembership[linear.operation].execute.call(this, items);
			break;
		case 'release':
			returnData = await release[linear.operation].execute.call(this, items);
			break;
		case 'view':
			returnData = await view[linear.operation].execute.call(this, items);
			break;
		case 'issueRelation':
			returnData = await issueRelation[linear.operation].execute.call(this, items);
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
	}

	return [returnData];
}
