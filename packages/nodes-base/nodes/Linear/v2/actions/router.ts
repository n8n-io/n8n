import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
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
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	const linear = { resource, operation } as Linear;

	for (let i = 0; i < items.length; i++) {
		try {
			let responseData: IDataObject | IDataObject[];

			switch (linear.resource) {
				case 'issue':
					responseData = await issue[linear.operation].execute.call(this, i);
					break;
				case 'comment':
					responseData = await comment[linear.operation].execute.call(this, i);
					break;
				case 'customer':
					responseData = await customer[linear.operation].execute.call(this, i);
					break;
				case 'customerNeed':
					responseData = await customerNeed[linear.operation].execute.call(this, i);
					break;
				case 'project':
					responseData = await project[linear.operation].execute.call(this, i);
					break;
				case 'projectMilestone':
					responseData = await projectMilestone[linear.operation].execute.call(this, i);
					break;
				case 'projectUpdate':
					responseData = await projectUpdate[linear.operation].execute.call(this, i);
					break;
				case 'user':
					responseData = await user[linear.operation].execute.call(this, i);
					break;
				case 'team':
					responseData = await team[linear.operation].execute.call(this, i);
					break;
				case 'label':
					responseData = await label[linear.operation].execute.call(this, i);
					break;
				case 'cycle':
					responseData = await cycle[linear.operation].execute.call(this, i);
					break;
				case 'attachment':
					responseData = await attachment[linear.operation].execute.call(this, i);
					break;
				case 'workflowState':
					responseData = await workflowState[linear.operation].execute.call(this, i);
					break;
				case 'document':
					responseData = await document[linear.operation].execute.call(this, i);
					break;
				case 'initiative':
					responseData = await initiative[linear.operation].execute.call(this, i);
					break;
				case 'teamMembership':
					responseData = await teamMembership[linear.operation].execute.call(this, i);
					break;
				case 'release':
					responseData = await release[linear.operation].execute.call(this, i);
					break;
				case 'view':
					responseData = await view[linear.operation].execute.call(this, i);
					break;
				case 'issueRelation':
					responseData = await issueRelation[linear.operation].execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
			}

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), {
					itemData: { item: i },
				}),
			);
		} catch (error) {
			if (!this.continueOnFail()) throw error;
			returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
		}
	}

	return [returnData];
}
