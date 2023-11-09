import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ItemListsType } from './node.type';

import * as itemList from './itemList';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter<ItemListsType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const itemListsNodeData = {
		resource,
		operation,
	} as ItemListsType;

	try {
		switch (itemListsNodeData.resource) {
			case 'itemList':
				returnData = await itemList[itemListsNodeData.operation].execute.call(this, items);
				break;
			default:
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
		}
	} catch (error) {
		throw error;
	}

	return [returnData];
}
