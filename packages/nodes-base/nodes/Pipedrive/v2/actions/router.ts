import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as activity from './activity';
import * as deal from './deal';
import * as dealProduct from './dealProduct';
import * as file from './file';
import * as lead from './lead';
import * as note from './note';
import type { PipedriveType } from './node.type';
import * as organization from './organization';
import * as person from './person';
import * as product from './product';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter<PipedriveType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const pipedrive = {
		resource,
		operation,
	} as PipedriveType;

	switch (pipedrive.resource) {
		case 'activity':
			returnData = await activity[pipedrive.operation].execute.call(this);
			break;
		case 'deal':
			returnData = await deal[pipedrive.operation].execute.call(this);
			break;
		case 'dealProduct':
			returnData = await dealProduct[pipedrive.operation].execute.call(this);
			break;
		case 'file':
			returnData = await file[pipedrive.operation].execute.call(this);
			break;
		case 'lead':
			returnData = await lead[pipedrive.operation].execute.call(this);
			break;
		case 'note':
			returnData = await note[pipedrive.operation].execute.call(this);
			break;
		case 'organization':
			returnData = await organization[pipedrive.operation].execute.call(this);
			break;
		case 'person':
			returnData = await person[pipedrive.operation].execute.call(this);
			break;
		case 'product':
			returnData = await product[pipedrive.operation].execute.call(this);
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
	}

	return [returnData];
}
