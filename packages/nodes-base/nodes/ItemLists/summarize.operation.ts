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
	const newItems = items.map(({ json }) => json);

	const fieldsToSplitBy = (this.getNodeParameter('fieldsToSplitBy', 0, '') as string)
		.split(',')
		.map((field) => field.trim())
		.filter((field) => field);

	const fieldsToSummarize = this.getNodeParameter('fieldsToSummarize.values', 0, []) as Array<{
		aggregation: string;
		field: string;
	}>;

	if (fieldsToSummarize.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Please select at least one field to summarize');
	}

	const summarizeField = (items: IDataObject[], field: string, aggregation: string) => {
		if (aggregation === 'sum') {
			return items.reduce((acc, item) => {
				if (typeof item[field] === 'number') {
					return acc + (item[field] as number);
				} else {
					throw new NodeOperationError(this.getNode(), `The field '${field}' is not a number`);
				}
			}, 0);
		} else if (aggregation === 'count') {
			return items.map((item) => item[field]).filter((item) => item).length;
		} else if (aggregation === 'countUnique') {
			return new Set(items.map((item) => item[field])).size;
		} else if (aggregation === 'min') {
			return Math.min(
				...(items.map((item) => {
					if (typeof item[field] === 'number') {
						return item[field];
					} else {
						throw new NodeOperationError(this.getNode(), `The field '${field}' is not a number`);
					}
				}) as number[]),
			);
		} else if (aggregation === 'max') {
			return Math.max(
				...(items.map((item) => {
					if (typeof item[field] === 'number') {
						return item[field];
					} else {
						throw new NodeOperationError(this.getNode(), `The field '${field}' is not a number`);
					}
				}) as number[]),
			);
		}
	};

	const getSummaries = (data: IDataObject[]) => {
		type Aggregation = 'count' | 'countUnique' | 'max' | 'min' | 'sum';
		const aggregationDisplayNames = {
			count: 'Count',
			countUnique: 'Unique count',
			max: 'Max',
			min: 'Min',
			sum: 'Sum',
		};
		return fieldsToSummarize.reduce((acc, { field, aggregation }) => {
			acc[`${aggregationDisplayNames[aggregation as Aggregation]} of ${field}`] = summarizeField(
				data,
				field,
				aggregation,
			);
			return acc;
		}, {} as IDataObject);
	};

	const groupDataByKeys = (splitKeys: string[], data: IDataObject[]) => {
		if (!splitKeys || splitKeys.length === 0) {
			return getSummaries(data);
		}

		const [firstSplitKey, ...restSplitKeys] = splitKeys;

		const groupedData = data.reduce((acc, item) => {
			const keyValuee = item[firstSplitKey] as string;

			if (acc[keyValuee] === undefined) {
				acc[keyValuee] = [item];
			} else {
				(acc[keyValuee] as IDataObject[]).push(item);
			}
			return acc;
		}, {} as IDataObject);

		return Object.keys(groupedData).reduce((acc, key) => {
			const value = groupedData[key] as IDataObject[];
			acc[key] = groupDataByKeys(restSplitKeys, value);
			return acc;
		}, {} as IDataObject);
	};

	const groupedDataAsObject = groupDataByKeys(fieldsToSplitBy, newItems) as IDataObject;

	const executionData = this.prepareOutputData(this.helpers.returnJsonArray(groupedDataAsObject));

	return executionData;
}
