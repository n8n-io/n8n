import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as activity from './activity';
import * as contact from './contact';
import * as custom from './custom';
import * as opportunity from './opportunity';
import type { OdooType } from './node.type';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	const items = this.getInputData();

	const odooNodeData = { resource, operation } as OdooType;

	let returnData: INodeExecutionData[];

	switch (odooNodeData.resource) {
		case 'contact':
			returnData = await contact[odooNodeData.operation].execute.call(this, items);
			break;
		case 'opportunity':
			returnData = await opportunity[odooNodeData.operation].execute.call(this, items);
			break;
		case 'activity':
			returnData = await activity[odooNodeData.operation].execute.call(this, items);
			break;
		case 'custom':
			returnData = await custom[odooNodeData.operation].execute.call(this, items);
			break;
		default:
			throw new NodeOperationError(this.getNode(), `Unknown resource "${String(resource)}"`);
	}

	return [returnData];
}
