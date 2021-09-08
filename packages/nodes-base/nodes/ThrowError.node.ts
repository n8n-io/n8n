import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class ThrowError implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Throw Error',
		name: 'throw',
		icon: 'fa:exclamation-triangle',
		group: ['input'],
		version: 1,
		description: 'Throws an Error in the Workflow',
		maxNodes: 1,
		defaults: {
			name: 'Throw Error',
			color: '#ff0000',
		},
		inputs: ['main'],
		outputs: [],
		properties: [{
			displayName: 'Error Message',
			name: 'error_message',
			type: 'string',
			default: 'An error occured',
			description: 'The message to pass to the Error',
		}
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const message = this.getNodeParameter('error_message', 0) as string;

		throw new Error(message);
	}
}
