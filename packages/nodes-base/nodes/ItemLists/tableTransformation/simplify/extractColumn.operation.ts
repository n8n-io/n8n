import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

export const description: INodeProperties[] = [
	{
		displayName: 'Column Names',
		name: 'columnNames',
		type: 'string',
		default: '',
		description: 'Comma-separated list of column names to extract',
		required: true,
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['simplify'],
				operation: ['extractColumn'],
			},
		},
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const responseData: IDataObject[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		const columnNames = (this.getNodeParameter('columnNames', 0) as string)
			.split(',')
			.map((columnName) => columnName.trim());

		const newItem: IDataObject = {};

		try {
			for (const columnName of columnNames) {
				const value = item.json[columnName];

				if (value === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						`Column \'${columnName}\' missing from input ${i}`,
					);
				}

				newItem[columnName] = value;
			}
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				responseData.push(...executionErrorData);
				continue;
			}
			throw error;
		}

		responseData.push(newItem);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: 0 } },
	);

	return executionData;
}
