import {
	IDataObject,
	INodeExecutionData,
	IPairedItemData
} from "n8n-workflow";

import {
	assign,
	get,
	isEqual,
	merge,
} from 'lodash';

interface IMatch {
	entry: INodeExecutionData;
	matches: INodeExecutionData[];
}

export function addSuffixToEntriesKeys(data: INodeExecutionData[], suffix: string) {
	return data.map( entry => {
		const json: IDataObject = {};
		Object.keys(entry.json).forEach( key => {
			json[`${key}_${suffix}`] = entry.json[key];
		});
		return {...entry, json};
	});
}


export function findMatches(dataInput1: INodeExecutionData[], dataInput2: INodeExecutionData[], fieldsToMatch: IDataObject[], disableDotNotation: boolean) {
	const data1 = [...dataInput1];
	const data2 = [...dataInput2];

	const filteredData = {
		matched: [] as IMatch[],
		unmatched1: [] as INodeExecutionData[],
		unmatched2: [] as INodeExecutionData[],
		getMatches1 () {
			return this.matched.map( match => match.entry);
		},
		getMatches2 () {
			return this.matched.reduce((acc, match) => acc.concat(match.matches), [] as INodeExecutionData[]);
		},
	};

	matchesLoop:
	for (const entry1 of data1) {
		const lookup: IDataObject = {};

		fieldsToMatch.forEach(matchCase => {
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

		const foundedMarches = data2.filter( (entry2, i) => {
			if (entry2 === undefined) return false;

			let matched = true;
			for (const key of Object.keys(lookup)) {
				const excpectedValue = lookup[key];
				let entry2FieldValue;

				if (disableDotNotation) {
					entry2FieldValue = entry2.json[key];
				} else {
					entry2FieldValue = get(entry2.json, key);
				}

				if (!isEqual(excpectedValue, entry2FieldValue)) {
					matched = false;
					break;
				}
			}

			if (matched) {
				delete data2[i];
			}
			return matched;
		});

		if (foundedMarches.length) {
			filteredData.matched.push({
				entry: entry1,
				matches: foundedMarches,
			});
		} else {
			filteredData.unmatched1.push(entry1);
		}
	}

	filteredData.unmatched2.push(...data2.filter( entry => entry !== undefined));

	return filteredData;
}

export function mergeMatched(data: IDataObject, clashResolveOptions: IDataObject) {
	const returnData: INodeExecutionData[] = [];

	let mergeEntries = merge;

	if (clashResolveOptions.mergeMode === 'shallowMerge') {
		mergeEntries = assign;
	}

	for (const match of data.matched as IMatch[]) {
		let entry = match.entry;
		let matches = match.matches;

		let json: IDataObject = {};

		if (clashResolveOptions.resolveClash === 'addSuffix') {
			[entry] = addSuffixToEntriesKeys([entry], '1');
			matches = addSuffixToEntriesKeys(matches, '2');
			json = mergeEntries({}, entry.json, ...matches.map(match => match.json));
		}

		if (clashResolveOptions.resolveClash === 'preferInput1') {
			json = mergeEntries({}, ...matches.map(match => match.json), entry.json);
		}

		if (clashResolveOptions.resolveClash === 'preferInput2' || clashResolveOptions.resolveClash === undefined) {
			json = mergeEntries({}, entry.json, ...matches.map(match => match.json));
		}

		const pairedItem = [
			entry.pairedItem as IPairedItemData,
			...matches.map(m => m.pairedItem as IPairedItemData),
		];

		returnData.push({
			json,
			pairedItem,
		});
	}

	return returnData;
}
