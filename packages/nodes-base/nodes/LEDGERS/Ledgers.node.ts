import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import * as descriptions from './descriptions';
import { execute } from './GenericFunctions';

export class Ledgers implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LEDGERS',
		name: 'ledgers',
		group: ['transform'],
		version: 1,
		description: 'Interact with LEDGERS API',
		defaults: {
			name: 'LEDGERS',
		},
		inputs: ['main'],
		outputs: ['main'],
		icon: 'file:ledgers.svg',
		credentials: [
			{
				name: 'ledgersApi',
				required: true,
			},
		],
		properties: [...descriptions.contactOperations],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await execute.call(this);
	}
}
