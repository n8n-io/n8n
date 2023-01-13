import {
	GenericValue,
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	IPairedItemData,
	jsonParse,
} from 'n8n-workflow';

import { assign, assignWith, get, isEqual, isNull, merge, mergeWith } from 'lodash';

type PairToMatch = {
	field1: string;
	field2: string;
};

export type MatchFieldsOptions = {
	joinMode: MatchFieldsJoinMode;
	outputDataFrom: MatchFieldsOutput;
	multipleMatches: MultipleMatches;
	disableDotNotation: boolean;
	fuzzyCompare?: boolean;
};

export type ClashResolveOptions = {
	resolveClash: ClashResolveMode;
	mergeMode: ClashMergeMode;
	overrideEmpty: boolean;
};

type ClashMergeMode = 'deepMerge' | 'shallowMerge';

type ClashResolveMode = 'addSuffix' | 'preferInput1' | 'preferInput2';

type MultipleMatches = 'all' | 'first';

export type MatchFieldsOutput = 'both' | 'input1' | 'input2';

export type MatchFieldsJoinMode =
	| 'keepEverything'
	| 'keepMatches'
	| 'keepNonMatches'
	| 'enrichInput2'
	| 'enrichInput1';

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

const parseStringAndCompareToObject = (str: string, arr: IDataObject) => {
	try {
		const parsedArray = jsonParse(str);
		return isEqual(parsedArray, arr);
	} catch (error) {
		return false;
	}
};

function isFalsy<T>(value: T) {
	if (isNull(value)) return true;
	if (typeof value === 'string' && value === '') return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
}

const fuzzyCompare =
	(options: IDataObject) =>
	<T, U>(item1: T, item2: U) => {
		//Fuzzy compare is disabled, so we do strict comparison
		if (!options.fuzzyCompare) return isEqual(item1, item2);

		//Both types are the same, so we do strict comparison
		if (!isNull(item1) && !isNull(item2) && typeof item1 === typeof item2) {
			return isEqual(item1, item2);
		}

		//Null, empty strings, empty arrays all treated as the same
		if (isFalsy(item1) && isFalsy(item2)) return true;

		//When a field is missing in one branch and isFalsy() in another, treat them as matching
		if (isFalsy(item1) && item2 === undefined) return true;
		if (item1 === undefined && isFalsy(item2)) return true;

		//Compare numbers and strings representing that number
		if (typeof item1 === 'number' && typeof item2 === 'string') {
			return item1.toString() === item2;
		}

		if (typeof item1 === 'string' && typeof item2 === 'number') {
			return item1 === item2.toString();
		}

		//Compare objects/arrays and their stringified version
		if (!isNull(item1) && typeof item1 === 'object' && typeof item2 === 'string') {
			return parseStringAndCompareToObject(item2, item1 as IDataObject);
		}

		if (!isNull(item2) && typeof item1 === 'string' && typeof item2 === 'object') {
			return parseStringAndCompareToObject(item1, item2 as IDataObject);
		}

		//Compare booleans and strings representing the boolean (’true’, ‘True’, ‘TRUE’)
		if (typeof item1 === 'boolean' && typeof item2 === 'string') {
			if (item1 === true && item2.toLocaleLowerCase() === 'true') return true;
			if (item1 === false && item2.toLocaleLowerCase() === 'false') return true;
		}

		if (typeof item2 === 'boolean' && typeof item1 === 'string') {
			if (item2 === true && item1.toLocaleLowerCase() === 'true') return true;
			if (item2 === false && item1.toLocaleLowerCase() === 'false') return true;
		}

		//Compare booleans and the numbers/string 0 and 1
		if (typeof item1 === 'boolean' && typeof item2 === 'number') {
			if (item1 === true && item2 === 1) return true;
			if (item1 === false && item2 === 0) return true;
		}

		if (typeof item2 === 'boolean' && typeof item1 === 'number') {
			if (item2 === true && item1 === 1) return true;
			if (item2 === false && item1 === 0) return true;
		}

		if (typeof item1 === 'boolean' && typeof item2 === 'string') {
			if (item1 === true && item2 === '1') return true;
			if (item1 === false && item2 === '0') return true;
		}

		if (typeof item2 === 'boolean' && typeof item1 === 'string') {
			if (item2 === true && item1 === '1') return true;
			if (item2 === false && item1 === '0') return true;
		}

		return isEqual(item1, item2);
	};

export function findMatches(
	input1: INodeExecutionData[],
	input2: INodeExecutionData[],
	fieldsToMatch: PairToMatch[],
	options: MatchFieldsOptions,
) {
	let data1 = [...input1];
	let data2 = [...input2];

	if (options.joinMode === 'enrichInput2') {
		[data1, data2] = [data2, data1];
	}

	const isEntriesEqual = fuzzyCompare(options);
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

		if (resolveClash === 'addSuffix') {
			let suffix1 = '1';
			let suffix2 = '2';

			if (joinMode === 'enrichInput2') {
				[suffix1, suffix2] = [suffix2, suffix1];
			}

			[entry] = addSuffixToEntriesKeys([entry], suffix1);
			matches = addSuffixToEntriesKeys(matches, suffix2);

			json = mergeIntoSingleObject({ ...entry.json }, ...matches.map((item) => item.json));
			binary = mergeIntoSingleObject(
				{ ...entry.binary },
				...matches.map((item) => item.binary as IDataObject),
			);
		} else {
			let preferInput1 = 'preferInput1';
			let preferInput2 = 'preferInput2';

			if (joinMode === 'enrichInput2') {
				[preferInput1, preferInput2] = [preferInput2, preferInput1];
			}

			if (resolveClash === undefined) {
				resolveClash = 'preferInput2';
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
			}

			if (resolveClash === preferInput2) {
				json = mergeIntoSingleObject({ ...entry.json }, ...matches.map((item) => item.json));
				binary = mergeIntoSingleObject(
					{ ...entry.binary },
					...matches.map((item) => item.binary as IDataObject),
				);
			}
		}

		const pairedItem = [
			entry.pairedItem as IPairedItemData,
			...matches.map((m) => m.pairedItem as IPairedItemData),
		];

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
		throw new Error(
			'You need to define at least one pair of fields in "Fields to Match" to match on',
		);
	}
	for (const [index, pair] of data.entries()) {
		if (pair.field1 === '' || pair.field2 === '') {
			throw new Error(
				`You need to define both fields in "Fields to Match" for pair ${index + 1},
				 field 1 = '${pair.field1}'
				 field 2 = '${pair.field2}'`,
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
			throw new Error(`Field '${field}' is not present in any of items in '${inputLabel}'`);
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
