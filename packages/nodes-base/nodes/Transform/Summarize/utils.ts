import { isNaN } from 'lodash';
import get from 'lodash/get';
import {
	type IDataObject,
	type GenericValue,
	type IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

type AggregationType =
	| 'append'
	| 'average'
	| 'concatenate'
	| 'count'
	| 'countUnique'
	| 'max'
	| 'min'
	| 'sum';

export type Aggregation = {
	aggregation: AggregationType;
	field: string;
	includeEmpty?: boolean;
	separateBy?: string;
	customSeparator?: string;
};

export type Aggregations = Aggregation[];

const AggregationDisplayNames = {
	append: 'appended_',
	average: 'average_',
	concatenate: 'concatenated_',
	count: 'count_',
	countUnique: 'unique_count_',
	max: 'max_',
	min: 'min_',
	sum: 'sum_',
};

export const NUMERICAL_AGGREGATIONS = ['average', 'sum'];

export type SummarizeOptions = {
	continueIfFieldNotFound: boolean;
	disableDotNotation?: boolean;
	outputFormat?: 'separateItems' | 'singleItem';
	skipEmptySplitFields?: boolean;
};

export type ValueGetterFn = (
	item: IDataObject,
	field: string,
) => IDataObject | IDataObject[] | GenericValue | GenericValue[];

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

export const fieldValueGetter = (disableDotNotation?: boolean) => {
	if (disableDotNotation) {
		return (item: IDataObject, field: string) => item[field];
	} else {
		return (item: IDataObject, field: string) => get(item, field);
	}
};

export function checkIfFieldExists(
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
		//comparison operations
		case 'min':
			let min;
			for (const item of data) {
				const value = getValue(item, field);
				if (value !== undefined && value !== null && value !== '') {
					if (min === undefined || value < min) {
						min = value;
					}
				}
			}
			return min ?? null;
		case 'max':
			let max;
			for (const item of data) {
				const value = getValue(item, field);
				if (value !== undefined && value !== null && value !== '') {
					if (max === undefined || value > max) {
						max = value;
					}
				}
			}
			return max ?? null;

		//count operations
		case 'countUnique':
			if (!entry.includeEmpty) {
				return new Set(data.map((item) => getValue(item, field)).filter((item) => !isEmpty(item)))
					.size;
			}
			return new Set(data.map((item) => getValue(item, field))).size;

		default:
			//count by default
			if (!entry.includeEmpty) {
				return data.filter((item) => !isEmpty(getValue(item, field))).length;
			}
			return data.length;
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

export function splitData(
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
		let keyValue = getValue(item, firstSplitKey) as string;

		if (typeof keyValue === 'object') {
			keyValue = JSON.stringify(keyValue);
		}

		if (options.skipEmptySplitFields && typeof keyValue !== 'number' && !keyValue) {
			return acc;
		}

		if (acc[keyValue] === undefined) {
			acc[keyValue] = [item];
		} else {
			(acc[keyValue] as IDataObject[]).push(item);
		}
		return acc;
	}, {} as IDataObject);

	return Object.keys(groupedData).reduce((acc, key) => {
		const value = groupedData[key] as IDataObject[];
		acc[key] = splitData(restSplitKeys, value, fieldsToSummarize, options, getValue);
		return acc;
	}, {} as IDataObject);
}

export function aggregationToArray(
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

const getOriginalFieldValue = (field: string | number) =>
	field === 'null' ? null : isNaN(Number(field)) ? field : Number(field);

export function aggregationToArrayWithOriginalTypes(
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
				[splitFieldName]: getOriginalFieldValue(fieldName),
				...(aggregationResult[fieldName] as IDataObject),
			});
		}
		return returnData;
	} else {
		for (const key of Object.keys(aggregationResult)) {
			returnData.push(
				...aggregationToArray(aggregationResult[key] as IDataObject, fieldsToSplitBy.slice(1), {
					...previousStage,
					[splitFieldName]: getOriginalFieldValue(key),
				}),
			);
		}
		return returnData;
	}
}
