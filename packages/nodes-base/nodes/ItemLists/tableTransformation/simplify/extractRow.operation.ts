import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

export const description: INodeProperties[] = [
	{
		displayName: 'Start Row',
		name: 'startRow',
		type: 'number',
		default: 0,
		required: true,
		typeOptions: {
			minValue: 0,
		},
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['simplify'],
				operation: ['extractRow'],
			},
		},
	},
	{
		displayName: 'End Row',
		name: 'endRow',
		type: 'number',
		default: 0,
		required: true,
		typeOptions: {
			minValue: 0,
		},
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['simplify'],
				operation: ['extractRow'],
			},
		},
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();

	const startRow = this.getNodeParameter('startRow', 0) as number;
	const endRow = this.getNodeParameter('endRow', 0) as number;

	if (startRow > endRow) {
		throw new NodeOperationError(this.getNode(), 'Start row must be less than end row');
	}

	const executionData = items.slice(startRow, endRow);
	return executionData;
}
