import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { createErrorFromParameters } from './utils';

const errorObjectPlaceholder = `{
	"code": "404",
	"description": "The resource could not be fetched"
}`;

export class StopAndError implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Stop and Error',
		name: 'stopAndError',
		icon: 'fa:exclamation-triangle',
		iconColor: 'red',
		group: ['input'],
		version: 1,
		description: 'Throw an error in the workflow',
		defaults: {
			name: 'Stop and Error',
			color: '#ff0000',
		},
		inputs: [NodeConnectionTypes.Main],

		outputs: [],
		properties: [
			{
				displayName: 'Error Type',
				name: 'errorType',
				type: 'options',
				options: [
					{
						name: 'Error Message',
						value: 'errorMessage',
					},
					{
						name: 'Error Object',
						value: 'errorObject',
					},
				],
				default: 'errorMessage',
				description: 'Type of error to throw',
			},
			{
				displayName: 'Error Message',
				name: 'errorMessage',
				type: 'string',
				placeholder: 'An error occurred!',
				default: '',
				required: true,
				displayOptions: {
					show: {
						errorType: ['errorMessage'],
					},
				},
			},
			{
				displayName: 'Error Object',
				name: 'errorObject',
				type: 'json',
				description: 'Object containing error properties',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				placeholder: errorObjectPlaceholder,
				required: true,
				displayOptions: {
					show: {
						errorType: ['errorObject'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const errorType = this.getNodeParameter('errorType', 0) as 'errorMessage' | 'errorObject';
		const errorParameter =
			errorType === 'errorMessage'
				? (this.getNodeParameter('errorMessage', 0) as string)
				: (this.getNodeParameter('errorObject', 0) as string);

		const { message, options } = createErrorFromParameters(errorType, errorParameter);

		throw new NodeOperationError(this.getNode(), message, options);
	}
}
