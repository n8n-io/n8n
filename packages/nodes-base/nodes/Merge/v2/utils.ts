import assign from 'lodash/assign';
import assignWith from 'lodash/assignWith';
import get from 'lodash/get';
import merge from 'lodash/merge';
import mergeWith from 'lodash/mergeWith';
import type {
	GenericValue,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	IPairedItemData,
} from 'n8n-workflow';
import { ApplicationError } from '@n8n/errors';

import { fuzzyCompare, preparePairedItemDataArray } from '@utils/utilities';

import type { ClashResolveOptions, MatchFieldsJoinMode, MatchFieldsOptions } from './interfaces';

type PairToMatch = {
	field1: string;
	field2: string;
};

type EntryMatches = {
	entry: INodeExecutionData;
	matches: INodeExecutionData[];
};

type CompareFunction = <T, U>(a: T, b: U) => boolean;

export function addSuffixToEntriesKeys(data: INodeExecutionData[], suffix: string) {
	return data.map((entry) => {
		const json: IDataObject = {};
		Object.keys(entry.json).forEach((key) => {
			json[`${key}_${suffix}`] = entry.json[key];
		});
		return { ...entry, json };
	});
}

function findAllMatches(
	data: INodeExecutionData[],
	lookup: IDataObject,
	disableDotNotation: boolean,
	isEntriesEqual: CompareFunction,
) {
	return data.reduce((acc, entry2, i) => {
		if (entry2 === undefined) return acc;

		for (const key of Object.keys(lookup)) {
			const excpectedValue = lookup[key];
			let entry2FieldValue;

			if (disableDotNotation) {
				entry2FieldValue = entry2.json[key];
			} else {
				entry2FieldValue = get(entry2.json, key);
			}

			if (!isEntriesEqual(excpectedValue, entry2FieldValue)) {
				return acc;
			}
		}

		return acc.concat({
			entry: entry2,
			index: i,
		});
	}, [] as IDataObject[]);
}

function findFirstMatch(
	data: INodeExecutionData[],
	lookup: IDataObject,
	disableDotNotation: boolean,
	isEntriesEqual: CompareFunction,
) {
	const index = data.findIndex((entry2) => {
		if (entry2 === undefined) return false;

		for (const key of Object.keys(lookup)) {
			const excpectedValue = lookup[key];
			let entry2FieldValue;

			if (disableDotNotation) {
				entry2FieldValue = entry2.json[key];
			} else {
				entry2FieldValue = get(entry2.json, key);
			}

			if (!isEntriesEqual(excpectedValue, entry2FieldValue)) {
				return false;
			}
		}

		return true;
	});
	if (index === -1) return [];

	return [{ entry: data[index], index }];
}

export function findMatches(
	input1: INodeExecutionData[],
	input2: INodeExecutionData[],
	fieldsToMatch: PairToMatch[],
	options: MatchFieldsOptions,
) {
	const data1 = [...input1];
	const data2 = [...input2];

	const isEntriesEqual = fuzzyCompare(options.fuzzyCompare as boolean);
	const disableDotNotation = options.disableDotNotation || false;
	const multipleMatches = (options.multipleMatches as string) || 'all';

	const filteredData = {
		matched: [] as EntryMatches[],
		matched2: [] as INodeExecutionData[],
		unmatched1: [] as INodeExecutionData[],
		unmatched2: [] as INodeExecutionData[],
	};

	const matchedInInput2 = new Set<number>();

	matchesLoop: for (const entry1 of data1) {
		const lookup: IDataObject = {};

		fieldsToMatch.forEach((matchCase) => {
			let valueToCompare;
			if (disableDotNotation) {
				valueToCompare = entry1.json[matchCase.field1];
			} else {
				valueToCompare = get(entry1.json, matchCase.field1);
			}
			lookup[matchCase.field2] = valueToCompare;
		});

		for (const fieldValue of Object.values(lookup)) {
			if (fieldValue === undefined) {
				filteredData.unmatched1.push(entry1);
				continue matchesLoop;
			}
		}

		const foundedMatches =
			multipleMatches === 'all'
				? findAllMatches(data2, lookup, disableDotNotation, isEntriesEqual)
				: findFirstMatch(data2, lookup, disableDotNotation, isEntriesEqual);

		const matches = foundedMatches.map((match) => match.entry) as INodeExecutionData[];
		foundedMatches.map((match) => matchedInInput2.add(match.index as number));

		if (matches.length) {
			if (
				options.outputDataFrom === 'both' ||
				options.joinMode === 'enrichInput1' ||
				options.joinMode === 'enrichInput2'
			) {
				matches.forEach((match) => {
					filteredData.matched.push({
						entry: entry1,
						matches: [match],
					});
				});
			} else {
				filteredData.matched.push({
					entry: entry1,
					matches,
				});
			}
		} else {
			filteredData.unmatched1.push(entry1);
		}
	}

	data2.forEach((entry, i) => {
		if (matchedInInput2.has(i)) {
			filteredData.matched2.push(entry);
		} else {
			filteredData.unmatched2.push(entry);
		}
	});

	return filteredData;
}

export function selectMergeMethod(clashResolveOptions: ClashResolveOptions) {
	const mergeMode = clashResolveOptions.mergeMode as string;

	if (clashResolveOptions.overrideEmpty) {
		function customizer(targetValue: GenericValue, srcValue: GenericValue) {
			if (srcValue === undefined || srcValue === null || srcValue === '') {
				return targetValue;
			}
		}
		if (mergeMode === 'deepMerge') {
			return (target: IDataObject, ...source: IDataObject[]) => {
				const targetCopy = Object.assign({}, target);
				return mergeWith(targetCopy, ...source, customizer);
			};
		}
		if (mergeMode === 'shallowMerge') {
			return (target: IDataObject, ...source: IDataObject[]) => {
				const targetCopy = Object.assign({}, target);
				return assignWith(targetCopy, ...source, customizer);
			};
		}
	} else {
		if (mergeMode === 'deepMerge') {
			return (target: IDataObject, ...source: IDataObject[]) => merge({}, target, ...source);
		}
		if (mergeMode === 'shallowMerge') {
			return (target: IDataObject, ...source: IDataObject[]) => assign({}, target, ...source);
		}
	}
	return (target: IDataObject, ...source: IDataObject[]) => merge({}, target, ...source);
}

export function mergeMatched(
	matched: EntryMatches[],
	clashResolveOptions: ClashResolveOptions,
	joinMode?: MatchFieldsJoinMode,
) {
	const returnData: INodeExecutionData[] = [];
	let resolveClash = clashResolveOptions.resolveClash as string;

	const mergeIntoSingleObject = selectMergeMethod(clashResolveOptions);

	for (const match of matched) {
		let { entry, matches } = match;

		let json: IDataObject = {};
		let binary: IBinaryKeyData = {};
		let pairedItem: IPairedItemData[] = [];

		if (resolveClash === 'addSuffix') {
			const suffix1 = '1';
			const suffix2 = '2';

			[entry] = addSuffixToEntriesKeys([entry], suffix1);
			matches = addSuffixToEntriesKeys(matches, suffix2);

			json = mergeIntoSingleObject({ ...entry.json }, ...matches.map((item) => item.json));
			binary = mergeIntoSingleObject(
				{ ...entry.binary },
				...matches.map((item) => item.binary as IDataObject),
			);
			pairedItem = [
				...preparePairedItemDataArray(entry.pairedItem),
				...matches.map((item) => preparePairedItemDataArray(item.pairedItem)).flat(),
			];
		} else {
			const preferInput1 = 'preferInput1';
			const preferInput2 = 'preferInput2';

			if (resolveClash === undefined) {
				if (joinMode !== 'enrichInput2') {
					resolveClash = 'preferInput2';
				} else {
					resolveClash = 'preferInput1';
				}
			}

			if (resolveClash === preferInput1) {
				const [firstMatch, ...restMatches] = matches;
				json = mergeIntoSingleObject(
					{ ...firstMatch.json },
					...restMatches.map((item) => item.json),
					entry.json,
				);
				binary = mergeIntoSingleObject(
					{ ...firstMatch.binary },
					...restMatches.map((item) => item.binary as IDataObject),
					entry.binary as IDataObject,
				);

				pairedItem = [
					...preparePairedItemDataArray(firstMatch.pairedItem),
					...restMatches.map((item) => preparePairedItemDataArray(item.pairedItem)).flat(),
					...preparePairedItemDataArray(entry.pairedItem),
				];
			}

			if (resolveClash === preferInput2) {
				json = mergeIntoSingleObject({ ...entry.json }, ...matches.map((item) => item.json));
				binary = mergeIntoSingleObject(
					{ ...entry.binary },
					...matches.map((item) => item.binary as IDataObject),
				);
				pairedItem = [
					...preparePairedItemDataArray(entry.pairedItem),
					...matches.map((item) => preparePairedItemDataArray(item.pairedItem)).flat(),
				];
			}
		}

		returnData.push({
			json,
			binary,
			pairedItem,
		});
	}

	return returnData;
}

export function checkMatchFieldsInput(data: IDataObject[]) {
	if (data.length === 1 && data[0].field1 === '' && data[0].field2 === '') {
		throw new ApplicationError(
			'You need to define at least one pair of fields in "Fields to Match" to match on',
			{ level: 'warning' },
		);
	}
	for (const [index, pair] of data.entries()) {
		if (pair.field1 === '' || pair.field2 === '') {
			throw new ApplicationError(
				`You need to define both fields in "Fields to Match" for pair ${index + 1},
				 field 1 = '${pair.field1}'
				 field 2 = '${pair.field2}'`,
				{ level: 'warning' },
			);
		}
	}
	return data as PairToMatch[];
}

export function checkInput(
	input: INodeExecutionData[],
	fields: string[],
	disableDotNotation: boolean,
	inputLabel: string,
) {
	for (const field of fields) {
		const isPresent = (input || []).some((entry) => {
			if (disableDotNotation) {
				return entry.json.hasOwnProperty(field);
			}
			return get(entry.json, field, undefined) !== undefined;
		});
		if (!isPresent) {
			throw new ApplicationError(
				`Field '${field}' is not present in any of items in '${inputLabel}'`,
				{ level: 'warning' },
			);
		}
	}
	return input;
}

export function addSourceField(data: INodeExecutionData[], sourceField: string) {
	return data.map((entry) => {
		const json = {
			...entry.json,
			_source: sourceField,
		};
		return {
			...entry,
			json,
		};
	});
}
