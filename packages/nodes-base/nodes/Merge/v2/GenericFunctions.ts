import { GenericValue, IDataObject, INodeExecutionData, IPairedItemData } from 'n8n-workflow';

import { assign, assignWith, get, isEqual, merge, mergeWith } from 'lodash';

interface IMatch {
	entry: INodeExecutionData;
	matches: INodeExecutionData[];
}

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

			if (!isEqual(excpectedValue, entry2FieldValue)) {
				return acc;
			}
		}

		return acc.concat({
			entry: entry2,
			index: i,
		});
	}, [] as IDataObject[]);
}

function findFirstMatches(
	data: INodeExecutionData[],
	lookup: IDataObject,
	disableDotNotation: boolean,
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

			if (!isEqual(excpectedValue, entry2FieldValue)) {
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
	fieldsToMatch: IDataObject[],
	options: IDataObject,
) {
	let data1 = [...input1];
	let data2 = [...input2];

	if (options.joinMode === 'enrichInput2') {
		[data1, data2] = [data2, data1];
	}

	const disableDotNotation = (options.disableDotNotation as boolean) || false;
	const multipleMatches = (options.multipleMatches as string) || 'all';

	const filteredData = {
		matched: [] as IMatch[],
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
				valueToCompare = entry1.json[matchCase.field1 as string];
			} else {
				valueToCompare = get(entry1.json, matchCase.field1 as string);
			}
			lookup[matchCase.field2 as string] = valueToCompare;
		});

		for (const fieldValue of Object.values(lookup)) {
			if (fieldValue === undefined) {
				filteredData.unmatched1.push(entry1);
				continue matchesLoop;
			}
		}

		const foundedMatches =
			multipleMatches === 'all'
				? findAllMatches(data2, lookup, disableDotNotation)
				: findFirstMatches(data2, lookup, disableDotNotation);

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

export function mergeMatched(data: IDataObject, clashResolveOptions: IDataObject, joinMode = '') {
	const returnData: INodeExecutionData[] = [];
	let resolveClash = clashResolveOptions.resolveClash as string;

	const mergeIntoSingleObject = selectMergeMethod(clashResolveOptions);

	for (const match of data.matched as IMatch[]) {
		let { entry, matches } = match;

		let json: IDataObject = {};

		if (resolveClash === 'addSuffix') {
			let suffix1 = '1';
			let suffix2 = '2';

			if (joinMode === 'enrichInput2') {
				[suffix1, suffix2] = [suffix2, suffix1];
			}

			[entry] = addSuffixToEntriesKeys([entry], suffix1);
			matches = addSuffixToEntriesKeys(matches, suffix2);

			json = mergeIntoSingleObject(
				{ ...entry.json },
				matches.map((match) => match.json),
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
				const [firstMatch, ...restMatches] = matches.map((match) => match.json);
				json = mergeIntoSingleObject({ ...firstMatch }, [...restMatches, entry.json]);
			}

			if (resolveClash === preferInput2) {
				json = mergeIntoSingleObject(
					{ ...entry.json },
					matches.map((match) => match.json),
				);
			}
		}

		const pairedItem = [
			entry.pairedItem as IPairedItemData,
			...matches.map((m) => m.pairedItem as IPairedItemData),
		];

		returnData.push({
			json,
			pairedItem,
		});
	}

	return returnData;
}

export function selectMergeMethod(clashResolveOptions: IDataObject) {
	const mergeMode = clashResolveOptions.mergeMode as string;

	if (clashResolveOptions.overrideEmpty) {
		function customizer(targetValue: GenericValue, srcValue: GenericValue) {
			if (srcValue === undefined || srcValue === null || srcValue === '') {
				return targetValue;
			}
		}
		if (mergeMode === 'deepMerge') {
			return (target: IDataObject, source: IDataObject[]) =>
				mergeWith(target, ...source, customizer);
		}
		if (mergeMode === 'shallowMerge') {
			return (target: IDataObject, source: IDataObject[]) =>
				assignWith(target, ...source, customizer);
		}
	} else {
		if (mergeMode === 'deepMerge') {
			return (target: IDataObject, source: IDataObject[]) => merge({}, target, ...source);
		}
		if (mergeMode === 'shallowMerge') {
			return (target: IDataObject, source: IDataObject[]) => assign({}, target, ...source);
		}
	}
	return (target: IDataObject, source: IDataObject[]) => merge({}, target, ...source);
}

export function checkMatchFieldsInput(data: IDataObject[]) {
	if (data.length === 1 && data[0].field1 === '' && data[0].field2 === '') {
		throw new Error(
			'You need to define at least one pair of fields in "Fields to Match" to match on!',
		);
	}
	for (const [index, pair] of data.entries()) {
		if (pair.field1 === '' || pair.field2 === '') {
			throw new Error(
				`You need to define both fields in "Fields to Match" for pair ${index + 1},
				 field 1 = '${pair.field1}'
				 field 2 = '${pair.field2}'!`,
			);
		}
	}
	return data;
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
			throw new Error(`Field "${field}" is not present in any of items in "${inputLabel}"`);
		}
	}
	return input;
}
