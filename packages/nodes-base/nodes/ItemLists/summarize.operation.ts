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
								name: 'Append',
								value: 'append',
							},
							{
								name: 'Concatenate',
								value: 'concatenate',
							},
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
					{
						displayName: 'Include Empty Values',
						name: 'includeEmpty',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								aggregation: ['append'],
							},
						},
					},
					{
						displayName: 'Separator',
						name: 'separateBy',
						type: 'options',
						default: ',',
						// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
						options: [
							{
								name: 'Comma',
								value: ',',
							},
							{
								name: 'Comma and Space',
								value: ', ',
							},
							{
								name: 'New Line',
								value: '\n',
							},
							{
								name: 'None',
								value: '',
							},
							{
								name: 'Space',
								value: ' ',
							},
							{
								name: 'Other',
								value: 'other',
							},
						],
						hint: 'What to insert between values',
						displayOptions: {
							show: {
								aggregation: ['concatenate'],
							},
						},
					},
					{
						displayName: 'Custom Separator',
						name: 'customSeparator',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								aggregation: ['concatenate'],
								separateBy: ['other'],
							},
						},
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

	const fieldsToSummarize = this.getNodeParameter(
		'fieldsToSummarize.values',
		0,
		[],
	) as Aggregations;

	if (fieldsToSummarize.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Please select at least one field to summarize');
	}

	checkAggregationsFieldType.call(this, newItems, fieldsToSummarize);

	const getSummaries = (data: IDataObject[]) => {
		const displayNames = {
			append: 'List',
			concatenate: 'Concatenation',
			count: 'Count',
			countUnique: 'Unique count',
			max: 'Max value',
			min: 'Min value',
			sum: 'Sum',
		};
		return fieldsToSummarize.reduce((acc, entry) => {
			acc[`${displayNames[entry.aggregation as AggregationType]} of ${entry.field}`] =
				summarizeField(data, entry);
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

//types
type AggregationType = 'append' | 'concatenate' | 'count' | 'countUnique' | 'max' | 'min' | 'sum';
type Aggregation = {
	aggregation: AggregationType;
	field: string;
	includeEmpty?: boolean;
	separateBy?: string;
	customSeparator?: string;
};
type Aggregations = Aggregation[];

//utils
function checkAggregationsFieldType(
	this: IExecuteFunctions,
	items: IDataObject[],
	aggregations: Aggregations,
) {
	const requireNumericField = ['sum', 'max', 'min'];

	const numericFields = aggregations
		.filter((entry) => requireNumericField.includes(entry.aggregation))
		.map((entry) => entry.field);

	for (const [index, item] of items.entries()) {
		for (const field of numericFields) {
			if (item[field] === undefined || typeof item[field] !== 'number') {
				throw new NodeOperationError(
					this.getNode(),
					`The field '${field}' is not a number [item ${index}]`,
				);
			}
		}
	}
}

function summarizeField(items: IDataObject[], entry: Aggregation) {
	const { aggregation, field } = entry;
	if (aggregation === 'append') {
		if (!entry.includeEmpty) {
			items = items.filter((item) => item[field] || typeof item[field] === 'number');
		}
		return items.map((item) => item[field]);
	} else if (aggregation === 'concatenate') {
		const separateBy = entry.separateBy === 'other' ? entry.customSeparator : entry.separateBy;
		return items
			.map((item) => {
				let value = item[field];
				if (value !== null && typeof value === 'object') {
					value = JSON.stringify(value);
				}
				return value;
			})
			.join(separateBy);
	} else if (aggregation === 'sum') {
		return items.reduce((acc, item) => {
			return acc + (item[field] as number);
		}, 0);
	} else if (aggregation === 'count') {
		return items.map((item) => item[field]).filter((item) => item).length;
	} else if (aggregation === 'countUnique') {
		return new Set(items.map((item) => item[field])).size;
	} else if (aggregation === 'min') {
		return Math.min(
			...(items.map((item) => {
				return item[field];
			}) as number[]),
		);
	} else if (aggregation === 'max') {
		return Math.max(
			...(items.map((item) => {
				return item[field];
			}) as number[]),
		);
	}
}
