import {
	IDataObject,
	INodeExecutionData
} from "n8n-workflow";

import {
	get,
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


export function findMatches(dataInput1: INodeExecutionData[], dataInput2: INodeExecutionData[], fieldsToMatch: IDataObject[]) {
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

	for (const entry1 of data1) {
		const lookup: IDataObject = {};

		fieldsToMatch.forEach(matchCase => {
			const valueToCompare = get(entry1.json, matchCase.field1 as string);
			lookup[matchCase.field2 as string] = valueToCompare;
		});

		const foundedMarches = [...data2].filter( (entry2, i) => {
			let matched = true;
			for (const key of Object.keys(lookup)) {
				if (get(entry2.json, key) !== lookup[key]) {
					matched = false;
					break;
				}
			}
			if (matched) {
				data2.splice(i, 1);
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

	filteredData.unmatched2.push(...data2);

	return filteredData;
}
