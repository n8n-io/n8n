import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const description: INodeProperties[] = [
	{
		displayName: 'Pivot Columns',
		name: 'pivotColumns',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['summarize'],
				operation: ['pivotColumns'],
			},
		},
	},
	{
		displayName: 'Value Columns',
		name: 'valueColumns',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['summarize'],
				operation: ['pivotColumns'],
			},
		},
	},
];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const responseData: IDataObject[] = [];
	const items = (this.getInputData() as INodeExecutionData[]).map((item) => item.json);

	const pivotColumns = this.getNodeParameter('pivotColumns', 0) as string;
	const valueColumns = this.getNodeParameter('valueColumns', 0) as string;

	const pivotData = (
		data: IDataObject[],
		pivotColumn: string,
		valueColumn: string,
		value: string,
	) => {
		const pivotedData: IDataObject[] = [];

		const columns = data.reduce((acc, item) => {
			const column = item[pivotColumn] as string;
			if (column && !acc.includes(column)) {
				acc.push(column);
			}
			return acc;
		}, [] as string[]);

		columns.forEach((column) => {
			pivotedData.push(
				data.reduce((newRow, item) => {
					if (column === item[pivotColumn]) {
						newRow[pivotColumn] = item[pivotColumn];

						const keyName = item[valueColumn] as string;
						if (newRow[keyName]) {
							newRow[keyName] = (item[value] as number) + (newRow[keyName] as number);
						} else {
							newRow[keyName] = item[value];
						}
					}
					return newRow;
				}, {}),
			);
		});

		return pivotedData;
	};

	responseData.push(...pivotData(items, pivotColumns, valueColumns, 'count'));

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: 0 } },
	);

	return executionData;
}
