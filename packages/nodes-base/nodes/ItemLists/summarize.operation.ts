import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

export const description: INodeProperties[] = [
	{
		displayName: 'Fields to Summarize',
		name: 'fieldsToSummarize',
		type: 'fixedCollection',
		placeholder: 'Add Field',
		default: { values: [{ aggregation: 'count', field: '' }] },
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: '',
				name: 'values',
				values: [
					{
						displayName: 'Aggregation',
						name: 'aggregation',
						type: 'options',
						options: [
							{
								name: 'Count',
								value: 'count',
							},
							{
								name: 'Count Unique',
								value: 'countUnique',
							},
							{
								name: 'Max',
								value: 'max',
							},
							{
								name: 'Min',
								value: 'min',
							},
							{
								name: 'Sum',
								value: 'sum',
							},
						],
						default: 'count',
						description: 'How to combine the values of the field you want to summarize',
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
						required: true,
						description:
							'The name of an input field that you want to summarize. The field should contain numbers or dates.',
						placeholder: 'e.g. cost',
						hint: ' Enter the field name as text',
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['itemList'],
				operation: ['summarize'],
			},
		},
	},
	{
		displayName: 'Fields to Split By',
		name: 'fieldsToSplitBy',
		type: 'string',
		placeholder: 'e.g. country, city',
		default: '',
		required: true,
		description: 'The name of the input fields that you want to split the summary by',
		hint: 'Enter the name of the fields as text (separated by commas)',
		displayOptions: {
			show: {
				resource: ['itemList'],
				operation: ['summarize'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[][]> {
	let newItems = items.map(({ json }) => json);

	const fieldsToSplitBy = (this.getNodeParameter('fieldsToSplitBy', 0, '') as string)
		.split(',')
		.map((field) => field.trim());

	const fieldsToSummarize = this.getNodeParameter('fieldsToSummarize.values', 0, []) as Array<{
		aggregation: string;
		field: string;
	}>;

	if (fieldsToSummarize.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Please select at least one field to summarize');
	}

	const summarizeField = (items: IDataObject[], field: string, aggregation: string) => {
		if (aggregation === 'sum') {
			return items.reduce((acc, item) => acc + (item[field] as number), 0);
		} else if (aggregation === 'count') {
			return items.length;
		} else if (aggregation === 'countUnique') {
			return new Set(items.map((item) => item[field])).size;
		} else if (aggregation === 'min') {
			return Math.min(...(items.map((item) => item[field]) as number[]));
		} else if (aggregation === 'max') {
			return Math.max(...(items.map((item) => item[field]) as number[]));
		}
	};

	const getSummaries = (data: IDataObject[]) => {
		return fieldsToSummarize.reduce((acc, { field, aggregation }) => {
			acc[field] = summarizeField(data, field, aggregation);
			return acc;
		}, {} as IDataObject);
	};

	const groupDataByKeys = (keys: string[], data: IDataObject[]) => {
		if (!keys || keys.length === 0) {
			return getSummaries(data);
		}

		const [firstKey, ...restKey] = keys;

		const groupedData = data.reduce((acc, item) => {
			const keyValuee = item[firstKey] as string;
			if (acc[keyValuee] === undefined) {
				acc[keyValuee] = [item];
			} else {
				(acc[keyValuee] as IDataObject[]).push(item);
			}
			return acc;
		}, {} as IDataObject);

		return Object.keys(groupedData).reduce((acc, key) => {
			const value = groupedData[key] as IDataObject[];
			acc[key] = groupDataByKeys(restKey, value);
			return acc;
		}, {} as IDataObject);
	};

	const grouped = groupDataByKeys(fieldsToSplitBy, newItems) as IDataObject;

	// const flattenResult = (keys: string[], data: IDataObject) => {
	// 	if (!keys || keys.length === 0) {
	// 		return data;
	// 	}

	// 	const [firstKey, ...restKey] = keys;

	// 	const result = Object.keys(grouped).map((key) => ({
	// 		[firstKey]: key,
	// 		...flattenResult(restKey, grouped[key] as IDataObject),
	// 	}));

	// 	console.log(firstKey, restKey, result);
	// };

	// flattenResult(fieldsToSplitBy, grouped);

	const executionData = this.prepareOutputData(
		this.helpers.returnJsonArray(Object.keys(grouped).map((key) => ({ [key]: grouped[key] }))),
	);

	return executionData;
}
