import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

export const description: INodeProperties[] = [
	{
		displayName: 'Column Name',
		name: 'columnName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['simplify'],
				operation: ['extractCell'],
			},
		},
	},
	{
		displayName: 'Row Number',
		name: 'rowNumber',
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
				operation: ['extractCell'],
			},
		},
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const responseData: IDataObject[] = [];
	const items = this.getInputData();

	const columnName = this.getNodeParameter('columnName', 0) as string;
	const rowNumber = this.getNodeParameter('rowNumber', 0) as number;

	try {
		const cell = items[rowNumber].json[columnName];

		responseData.push({ json: { cell } });
	} catch (error) {
		const err = new NodeOperationError(
			this.getNode(),
			`Couldn\'t find column \'${columnName}\' in row ${rowNumber} of input data`,
		);
		if (this.continueOnFail()) {
			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: err.message }),
				{ itemData: { item: 0 } },
			);
			responseData.push(...executionErrorData);
		}
		throw err;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: 0 } },
	);

	return executionData;
}
