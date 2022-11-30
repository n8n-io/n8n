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
		description: 'The name of the input fields that you want to split the summary by',
		hint: 'Enter the name of the fields as text (separated by commas)',
		displayOptions: {
			show: {
				resource: ['itemList'],
				operation: ['summarize'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['itemList'],
				operation: ['summarize'],
			},
		},
		options: [
			{
				displayName: 'Output Data as Object',
				name: 'outputDataAsObject',
				type: 'boolean',
				default: false,
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[][]> {
	const newItems = items.map(({ json }) => json);

	const outputDataAsObject = this.getNodeParameter(
		'options.outputDataAsObject',
		0,
		false,
	) as boolean;

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
		return this.prepareOutputData(
			this.helpers.returnJsonArray(aggregateData(newItems, fieldsToSummarize)),
		);
	}

	checkAggregationsFieldType.call(this, newItems, fieldsToSummarize);

	const aggregationResult = splitData(fieldsToSplitBy, newItems, fieldsToSummarize) as IDataObject;

	const result = outputDataAsObject
		? aggregationResult
		: processAggregation(aggregationResult, fieldsToSplitBy, {});

	const executionData = this.prepareOutputData(this.helpers.returnJsonArray(result));

	return executionData;
}

function processAggregation(
	aggregationResult: IDataObject,
	fieldsToSplitBy: string[],
	previousStage: IDataObject,
) {
	const result: IDataObject[] = [];

	const curentColumnName = fieldsToSplitBy[0];
	const nextColumnName = fieldsToSplitBy[1];

	if (nextColumnName === undefined) {
		for (const key of Object.keys(aggregationResult)) {
			result.push({
				...previousStage,
				[curentColumnName]: key,
				...(aggregationResult[key] as IDataObject),
			});
		}
		return result;
	} else {
		for (const key of Object.keys(aggregationResult)) {
			result.push(
				...processAggregation(aggregationResult[key] as IDataObject, fieldsToSplitBy.slice(1), {
					...previousStage,
					[curentColumnName]: key,
				}),
			);
		}
		return result;
	}
}

type AggregationType = 'append' | 'concatenate' | 'count' | 'countUnique' | 'max' | 'min' | 'sum';

type Aggregation = {
	aggregation: AggregationType;
	field: string;
	includeEmpty?: boolean;
	separateBy?: string;
	customSeparator?: string;
};

type Aggregations = Aggregation[];

enum AggregationDisplayNames {
	append = 'List',
	concatenate = 'Concatenation',
	count = 'Count',
	countUnique = 'Unique count',
	max = 'Max value',
	min = 'Min value',
	sum = 'Sum',
}

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

function splitData(splitKeys: string[], data: IDataObject[], fieldsToSummarize: Aggregations) {
	if (!splitKeys || splitKeys.length === 0) {
		return aggregateData(data, fieldsToSummarize);
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
		acc[key] = splitData(restSplitKeys, value, fieldsToSummarize);
		return acc;
	}, {} as IDataObject);
}

function aggregate(items: IDataObject[], entry: Aggregation) {
	const { aggregation, field } = entry;

	switch (aggregation) {
		case 'append':
			if (!entry.includeEmpty) {
				items = items.filter((item) => item[field] || typeof item[field] === 'number');
			}
			return items.map((item) => item[field]);
		case 'concatenate':
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
		case 'sum':
			return items.reduce((acc, item) => {
				return acc + (item[field] as number);
			}, 0);
		case 'countUnique':
			return new Set(items.map((item) => item[field])).size;
		case 'min':
			return Math.min(
				...(items.map((item) => {
					return item[field];
				}) as number[]),
			);
		case 'max':
			return Math.max(
				...(items.map((item) => {
					return item[field];
				}) as number[]),
			);
		default:
			//count by default
			return items.map((item) => item[field]).filter((item) => item).length;
	}
}

function aggregateData(data: IDataObject[], fieldsToSummarize: Aggregations) {
	return fieldsToSummarize.reduce((acc, entry) => {
		acc[`${AggregationDisplayNames[entry.aggregation as AggregationType]} of ${entry.field}`] =
			aggregate(data, entry);
		return acc;
	}, {} as IDataObject);
}
