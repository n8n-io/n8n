import type {
	GenericValue,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import get from 'lodash.get';

type AggregationType =
	| 'append'
	| 'average'
	| 'concatenate'
	| 'count'
	| 'countUnique'
	| 'max'
	| 'min'
	| 'sum';

type Aggregation = {
	aggregation: AggregationType;
	field: string;
	includeEmpty?: boolean;
	separateBy?: string;
	customSeparator?: string;
};

type Aggregations = Aggregation[];

enum AggregationDisplayNames {
	append = 'appended_',
	average = 'average_',
	concatenate = 'concatenated_',
	count = 'count_',
	countUnique = 'unique_count_',
	max = 'max_',
	min = 'min_',
	sum = 'sum_',
}

const NUMERICAL_AGGREGATIONS = ['average', 'max', 'min', 'sum'];

type SummarizeOptions = {
	disableDotNotation?: boolean;
	outputFormat?: 'separateItems' | 'singleItem';
	skipEmptySplitFields?: boolean;
};

type ValueGetterFn = (
	item: IDataObject,
	field: string,
) => IDataObject | IDataObject[] | GenericValue | GenericValue[];

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
								name: 'Average',
								value: 'average',
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
					//field repeated to have different descriptions for different aggregations --------------------------------
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
						description: 'The name of an input field that you want to summarize',
						placeholder: 'e.g. cost',
						hint: ' Enter the field name as text',
						displayOptions: {
							hide: {
								aggregation: [...NUMERICAL_AGGREGATIONS, 'countUnique', 'count'],
							},
						},
						requiresDataPath: 'single',
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
						description:
							'The name of an input field that you want to summarize. The field should contain numerical values; null, undefined, empty strings would be ignored.',
						placeholder: 'e.g. cost',
						hint: ' Enter the field name as text',
						displayOptions: {
							show: {
								aggregation: NUMERICAL_AGGREGATIONS,
							},
						},
						requiresDataPath: 'single',
					},
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
						description:
							'The name of an input field that you want to summarize; null, undefined, empty strings would be ignored',
						placeholder: 'e.g. cost',
						hint: ' Enter the field name as text',
						displayOptions: {
							show: {
								aggregation: ['countUnique', 'count'],
							},
						},
						requiresDataPath: 'single',
					},
					// ----------------------------------------------------------------------------------------------------------
					{
						displayName: 'Include Empty Values',
						name: 'includeEmpty',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								aggregation: ['append', 'concatenate'],
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
	// fieldsToSplitBy repeated to have different displayName for singleItem and separateItems -----------------------------
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
			hide: {
				'/options.outputFormat': ['singleItem'],
			},
		},
		requiresDataPath: 'multiple',
	},
	{
		displayName: 'Fields to Group By',
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
				'/options.outputFormat': ['singleItem'],
			},
		},
		requiresDataPath: 'multiple',
	},
	// ----------------------------------------------------------------------------------------------------------
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
				displayName: 'Disable Dot Notation',
				name: 'disableDotNotation',
				type: 'boolean',
				default: false,
				description:
					'Whether to disallow referencing child fields using `parent.child` in the field name',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				default: 'separateItems',
				options: [
					{
						name: 'Each Split in a Separate Item',
						value: 'separateItems',
					},
					{
						name: 'All Splits in a Single Item',
						value: 'singleItem',
					},
				],
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Ignore items without valid fields to group by',
				name: 'skipEmptySplitFields',
				type: 'boolean',
				default: false,
			},
		],
	},
];

function isEmpty<T>(value: T) {
	return value === undefined || value === null || value === '';
}

function parseReturnData(returnData: IDataObject) {
	const regexBrackets = /[\]\["]/g;
	const regexSpaces = /[ .]/g;
	for (const key of Object.keys(returnData)) {
		if (key.match(regexBrackets)) {
			const newKey = key.replace(regexBrackets, '');
			returnData[newKey] = returnData[key];
			delete returnData[key];
		}
	}
	for (const key of Object.keys(returnData)) {
		if (key.match(regexSpaces)) {
			const newKey = key.replace(regexSpaces, '_');
			returnData[newKey] = returnData[key];
			delete returnData[key];
		}
	}
}

function parseFieldName(fieldName: string[]) {
	const regexBrackets = /[\]\["]/g;
	const regexSpaces = /[ .]/g;
	fieldName = fieldName.map((field) => {
		field = field.replace(regexBrackets, '');
		field = field.replace(regexSpaces, '_');
		return field;
	});
	return fieldName;
}

const fieldValueGetter = (disableDotNotation?: boolean) => {
	if (disableDotNotation) {
		return (item: IDataObject, field: string) => item[field];
	} else {
		return (item: IDataObject, field: string) => get(item, field);
	}
};

function checkIfFieldExists(
	this: IExecuteFunctions,
	items: IDataObject[],
	aggregations: Aggregations,
	getValue: ValueGetterFn,
) {
	for (const aggregation of aggregations) {
		if (aggregation.field === '') {
			continue;
		}
		const exist = items.some((item) => getValue(item, aggregation.field) !== undefined);
		if (!exist) {
			throw new NodeOperationError(
				this.getNode(),
				`The field '${aggregation.field}' does not exist in any items`,
			);
		}
	}
}

function aggregate(items: IDataObject[], entry: Aggregation, getValue: ValueGetterFn) {
	const { aggregation, field } = entry;
	let data = [...items];

	if (NUMERICAL_AGGREGATIONS.includes(aggregation)) {
		data = data.filter(
			(item) => typeof getValue(item, field) === 'number' && !isEmpty(getValue(item, field)),
		);
	}

	switch (aggregation) {
		//combine operations
		case 'append':
			if (!entry.includeEmpty) {
				data = data.filter((item) => !isEmpty(getValue(item, field)));
			}
			return data.map((item) => getValue(item, field));
		case 'concatenate':
			const separateBy = entry.separateBy === 'other' ? entry.customSeparator : entry.separateBy;
			if (!entry.includeEmpty) {
				data = data.filter((item) => !isEmpty(getValue(item, field)));
			}
			return data
				.map((item) => {
					let value = getValue(item, field);
					if (typeof value === 'object') {
						value = JSON.stringify(value);
					}
					if (typeof value === 'undefined') {
						value = 'undefined';
					}

					return value;
				})
				.join(separateBy);

		//numerical operations
		case 'average':
			return (
				data.reduce((acc, item) => {
					return acc + (getValue(item, field) as number);
				}, 0) / data.length
			);
		case 'sum':
			return data.reduce((acc, item) => {
				return acc + (getValue(item, field) as number);
			}, 0);
		case 'min':
			return Math.min(
				...(data.map((item) => {
					return getValue(item, field);
				}) as number[]),
			);
		case 'max':
			return Math.max(
				...(data.map((item) => {
					return getValue(item, field);
				}) as number[]),
			);

		//count operations
		case 'countUnique':
			return new Set(data.map((item) => getValue(item, field)).filter((item) => !isEmpty(item)))
				.size;
		default:
			//count by default
			return data.filter((item) => !isEmpty(getValue(item, field))).length;
	}
}

function aggregateData(
	data: IDataObject[],
	fieldsToSummarize: Aggregations,
	options: SummarizeOptions,
	getValue: ValueGetterFn,
) {
	const returnData = fieldsToSummarize.reduce((acc, aggregation) => {
		acc[`${AggregationDisplayNames[aggregation.aggregation]}${aggregation.field}`] = aggregate(
			data,
			aggregation,
			getValue,
		);
		return acc;
	}, {} as IDataObject);
	parseReturnData(returnData);
	if (options.outputFormat === 'singleItem') {
		parseReturnData(returnData);
		return returnData;
	} else {
		return { ...returnData, pairedItems: data.map((item) => item._itemIndex as number) };
	}
}

function splitData(
	splitKeys: string[],
	data: IDataObject[],
	fieldsToSummarize: Aggregations,
	options: SummarizeOptions,
	getValue: ValueGetterFn,
) {
	if (!splitKeys || splitKeys.length === 0) {
		return aggregateData(data, fieldsToSummarize, options, getValue);
	}

	const [firstSplitKey, ...restSplitKeys] = splitKeys;

	const groupedData = data.reduce((acc, item) => {
		let keyValuee = getValue(item, firstSplitKey) as string;

		if (typeof keyValuee === 'object') {
			keyValuee = JSON.stringify(keyValuee);
		}

		if (options.skipEmptySplitFields && typeof keyValuee !== 'number' && !keyValuee) {
			return acc;
		}

		if (acc[keyValuee] === undefined) {
			acc[keyValuee] = [item];
		} else {
			(acc[keyValuee] as IDataObject[]).push(item);
		}
		return acc;
	}, {} as IDataObject);

	return Object.keys(groupedData).reduce((acc, key) => {
		const value = groupedData[key] as IDataObject[];
		acc[key] = splitData(restSplitKeys, value, fieldsToSummarize, options, getValue);
		return acc;
	}, {} as IDataObject);
}

function aggregationToArray(
	aggregationResult: IDataObject,
	fieldsToSplitBy: string[],
	previousStage: IDataObject = {},
) {
	const returnData: IDataObject[] = [];
	fieldsToSplitBy = parseFieldName(fieldsToSplitBy);
	const splitFieldName = fieldsToSplitBy[0];
	const isNext = fieldsToSplitBy[1];

	if (isNext === undefined) {
		for (const fieldName of Object.keys(aggregationResult)) {
			returnData.push({
				...previousStage,
				[splitFieldName]: fieldName,
				...(aggregationResult[fieldName] as IDataObject),
			});
		}
		return returnData;
	} else {
		for (const key of Object.keys(aggregationResult)) {
			returnData.push(
				...aggregationToArray(aggregationResult[key] as IDataObject, fieldsToSplitBy.slice(1), {
					...previousStage,
					[splitFieldName]: key,
				}),
			);
		}
		return returnData;
	}
}

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[][]> {
	const newItems = items.map(({ json }, i) => ({ ...json, _itemIndex: i }));

	const options = this.getNodeParameter('options', 0, {}) as SummarizeOptions;

	const fieldsToSplitBy = (this.getNodeParameter('fieldsToSplitBy', 0, '') as string)
		.split(',')
		.map((field) => field.trim())
		.filter((field) => field);

	const fieldsToSummarize = this.getNodeParameter(
		'fieldsToSummarize.values',
		0,
		[],
	) as Aggregations;

	if (fieldsToSummarize.filter((aggregation) => aggregation.field !== '').length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			"You need to add at least one aggregation to 'Fields to Summarize' with non empty 'Field'",
		);
	}

	const getValue = fieldValueGetter(options.disableDotNotation);

	checkIfFieldExists.call(this, newItems, fieldsToSummarize, getValue);

	const aggregationResult = splitData(
		fieldsToSplitBy,
		newItems,
		fieldsToSummarize,
		options,
		getValue,
	);

	if (options.outputFormat === 'singleItem') {
		const executionData: INodeExecutionData = {
			json: aggregationResult,
			pairedItem: newItems.map((_v, index) => ({
				item: index,
			})),
		};
		return this.prepareOutputData([executionData]);
	} else {
		if (!fieldsToSplitBy.length) {
			const { pairedItems, ...json } = aggregationResult;
			const executionData: INodeExecutionData = {
				json,
				pairedItem: ((pairedItems as number[]) || []).map((index: number) => ({
					item: index,
				})),
			};
			return this.prepareOutputData([executionData]);
		}
		const returnData = aggregationToArray(aggregationResult, fieldsToSplitBy);
		const executionData = returnData.map((item) => {
			const { pairedItems, ...json } = item;
			return {
				json,
				pairedItem: ((pairedItems as number[]) || []).map((index: number) => ({
					item: index,
				})),
			};
		});
		return this.prepareOutputData(executionData);
	}
}
