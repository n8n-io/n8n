/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	get
} from 'lodash';

import {
	IExecuteFunctions
} from 'n8n-core';

import {
	GenericValue,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';

import {
	optionsDescription,
} from './OptionsDescription';

const versionDescription: INodeTypeDescription = {
	displayName: 'Merge',
	name: 'merge',
	icon: 'fa:code-branch',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["mode"]}}',
	description: 'Merges data of multiple streams once data from both is available',
	defaults: {
		name: 'Merge',
		color: '#00bbcc',
	},
	// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
	inputs: ['main', 'main'],
	outputs: ['main'],
	inputNames: ['Input 1', 'Input 2'],
	properties: [
		{
			displayName: 'Type of Merging',
			name: 'mode',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'Append',
					value: 'append',
					description: 'All items of input 1, then all items of input 2',
				},
				{
					name: 'Match Fields',
					value: 'matchFields',
					description: 'Pair items with the same field values',
				},
				{
					name: 'Match Positions',
					value: 'matchPositions',
					description: 'Pair items based on their order',
				},
				{
					name: 'Multiplex',
					value: 'multiplex',
					description: 'All possible item combinations (cross join)',
				},
				{
					name: 'Choose Branch',
					value: 'chooseBranch',
					description: 'Output input data, without modifying it',
				},
			],
			default: 'append',
			description: 'How data of branches should be merged',
		},

		// matchFields ------------------------------------------------------------------
		{
			displayName: 'Fields to Match',
			name: 'customData',
			type: 'fixedCollection',
			placeholder: 'Add Fields',
			default: {match: [{input1FieldName: '', input2FieldName: ''}]},
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					displayName: 'Match',
					name: 'match',
					values: [
						{
							displayName: 'Input 1 Field Named',
							name: 'input1FieldName',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Input 2 Field Named',
							name: 'input2FieldName',
							type: 'string',
							default: '',
						},
					],
				},
			],
			displayOptions: {
				show: {
					mode: ['matchFields'],
				},
			},
		},
		{
			displayName: 'Mode',
			name: 'joinMode',
			type: 'options',
			options: [
				{
					name: 'Keep Matches',
					value: 'innerJoin',
					description: 'Items that match, merged together (inner join)',
				},
				{
					name: 'Keep Non-Matches',
					value: 'outerJoin',
					description: 'Items that don\'t match (outer join)',
				},
				{
					name: 'Enrich Input 1',
					value: 'leftJoin',
					description: 'All of input 1, with data from input 2 added in (left join)',
				},
				{
					name: 'Enrich Input 2',
					value: 'rightJoin',
					description: 'All of input 2, with data from input 1 added in (right join)',
				},
			],
			default: 'innerJoin',
			displayOptions: {
				show: {
					mode: ['matchFields'],
				},
			},
		},
		{
			displayName: 'Output Data From',
			name: 'outputDataFrom',
			type: 'options',
			options: [
				{
					name: 'Input 1',
					value: 'input1',
				},
				{
					name: 'Input 2',
					value: 'input2',
				},
				{
					name: 'Both Inputs',
					value: 'both',
				},
			],
			default: 'input1',
			displayOptions: {
				show: {
					mode: ['matchFields'],
					joinMode: ['innerJoin', 'outerJoin'],
				},
			},
		},

		// matchPositions ---------------------------------------------------------------
		{
			displayName: 'Include Any Unpaired Items',
			name: 'includeUnpaired',
			type: 'boolean',
			default: false,
			description: 'Whether to include at the end items with nothing to pair with, if there are different numbers of items in input 1 and input 2',
			displayOptions: {
				show: {
					mode: ['matchPositions'],
				},
			},
		},

		// chooseBranch -----------------------------------------------------------------
		{
			displayName: 'Mode',
			name: 'chooseBranchMode',
			type: 'options',
			options: [
				{
					name: 'Wait for Both Inputs to Arrive',
					value: 'waitForBoth',
				},
				// not MVP
				// {
				// 	name: 'Immediately Pass the First Input to Arrive',
				// 	value: 'passFirst',
				// },
			],
			default: 'waitForBoth',
			displayOptions: {
				show: {
					mode: ['chooseBranch'],
				},
			},
		},
		{
			displayName: 'Output',
			name: 'output',
			type: 'options',
			options: [
				{
					name: 'Input 1',
					value: 'input1',
				},
				{
					name: 'Input 2',
					value: 'input2',
				},
				{
					name: 'Empty Item',
					value: 'empty',
				},
			],
			default: 'empty',
			displayOptions: {
				show: {
					mode: ['chooseBranch'],
					chooseBranchMode: ['waitForBoth'],
				},
			},
		},

		...optionsDescription,
	],
};

export class MergeV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		const mode = this.getNodeParameter('mode', 0) as string;

		if (mode === 'append') {
			// Simply appends the data
			for (let i = 0; i < 2; i++) {
				returnData.push.apply(returnData, this.getInputData(i));
			}
		} else if (mode === 'mergeByIndex') {
			// Merges data by index

			const join = this.getNodeParameter('join', 0) as string;

			const dataInput1 = this.getInputData(0);
			const dataInput2 = this.getInputData(1);

			if (dataInput1 === undefined || dataInput1.length === 0) {
				if (['inner', 'left'].includes(join)) {
					// When "inner" or "left" join return empty if first
					// input does not contain any items
					return [returnData];
				}

				// For "outer" return data of second input
				return [dataInput2];
			}

			if (dataInput2 === undefined || dataInput2.length === 0) {
				if (['left', 'outer'].includes(join)) {
					// When "left" or "outer" join return data of first input
					return [dataInput1];
				}

				// For "inner" return empty
				return [returnData];
			}

			// Default "left"
			let numEntries = dataInput1.length;
			if (join === 'inner') {
				numEntries = Math.min(dataInput1.length, dataInput2.length);
			} else if (join === 'outer') {
				numEntries = Math.max(dataInput1.length, dataInput2.length);
			}

			let newItem: INodeExecutionData;
			for (let i = 0; i < numEntries; i++) {
				if (i >= dataInput1.length) {
					returnData.push(dataInput2[i]);
					continue;
				}
				if (i >= dataInput2.length) {
					returnData.push(dataInput1[i]);
					continue;
				}

				newItem = {
					json: {},
					pairedItem: [
						dataInput1[i].pairedItem as IPairedItemData,
						dataInput2[i].pairedItem as IPairedItemData,
					],
				};

				if (dataInput1[i].binary !== undefined) {
					newItem.binary = {};
					// Create a shallow copy of the binary data so that the old
					// data references which do not get changed still stay behind
					// but the incoming data does not get changed.
					Object.assign(newItem.binary, dataInput1[i].binary);
				}

				// Create also a shallow copy of the json data
				Object.assign(newItem.json, dataInput1[i].json);

				// Copy json data
				for (const key of Object.keys(dataInput2[i].json)) {
					newItem.json[key] = dataInput2[i].json[key];
				}

				// Copy binary data
				if (dataInput2[i].binary !== undefined) {
					if (newItem.binary === undefined) {
						newItem.binary = {};
					}

					for (const key of Object.keys(dataInput2[i].binary!)) {
						newItem.binary[key] = dataInput2[i].binary![key] ?? newItem.binary[key];
					}
				}

				returnData.push(newItem);
			}
		} else if (mode === 'multiplex') {
			const dataInput1 = this.getInputData(0);
			const dataInput2 = this.getInputData(1);

			if (!dataInput1 || !dataInput2) {
				return [returnData];
			}

			let entry1: INodeExecutionData;
			let entry2: INodeExecutionData;

			for (entry1 of dataInput1) {
				for (entry2 of dataInput2) {
					returnData.push({
						json: {
							...(entry1.json), ...(entry2.json),
						},
						pairedItem: [
							entry1.pairedItem as IPairedItemData,
							entry2.pairedItem as IPairedItemData,
						],
					});
				}
			}
			return [returnData];
		} else if (['keepKeyMatches', 'mergeByKey', 'removeKeyMatches'].includes(mode)) {
			const dataInput1 = this.getInputData(0);
			if (!dataInput1) {
				// If it has no input data from first input return nothing
				return [returnData];
			}

			const propertyName1 = this.getNodeParameter('propertyName1', 0) as string;
			const propertyName2 = this.getNodeParameter('propertyName2', 0) as string;
			const overwrite = this.getNodeParameter('overwrite', 0, 'always') as string;

			const dataInput2 = this.getInputData(1);
			if (!dataInput2 || !propertyName1 || !propertyName2) {
				// Second input does not have any data or the property names are not defined
				if (mode === 'keepKeyMatches') {
					// For "keepKeyMatches" return nothing
					return [returnData];
				}

				// For "mergeByKey" and "removeKeyMatches" return the data from the first input
				return [dataInput1];
			}

			// Get the data to copy
			const copyData: {
				[key: string]: INodeExecutionData;
			} = {};
			let entry: INodeExecutionData;
			for (entry of dataInput2) {
				const key = get(entry.json, propertyName2);
				if (!entry.json || !key) {
					// Entry does not have the property so skip it
					continue;
				}

				copyData[key as string] = entry;
			}

			// Copy data on entries or add matching entries
			let referenceValue: GenericValue;
			let key: string;
			for (entry of dataInput1) {
				referenceValue = get(entry.json, propertyName1);

				if (referenceValue === undefined) {
					// Entry does not have the property

					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" add item
						returnData.push(entry);
					}

					// For "mergeByKey" and "keepKeyMatches" skip item
					continue;
				}

				if (!['string', 'number'].includes(typeof referenceValue)) {
					if (referenceValue !== null && referenceValue.constructor.name !== 'Data') {
						// Reference value is not of comparable type

						if (mode === 'removeKeyMatches') {
							// For "removeKeyMatches" add item
							returnData.push(entry);
						}

						// For "mergeByKey" and "keepKeyMatches" skip item
						continue;
					}
				}

				if (typeof referenceValue === 'number') {
					referenceValue = referenceValue.toString();
				} else if (referenceValue !== null && referenceValue.constructor.name === 'Date') {
					referenceValue = (referenceValue as Date).toISOString();
				}

				if (copyData.hasOwnProperty(referenceValue as string)) {
					// Item with reference value got found

					if (['null', 'undefined'].includes(typeof referenceValue)) {
						// The reference value is null or undefined

						if (mode === 'removeKeyMatches') {
							// For "removeKeyMatches" add item
							returnData.push(entry);
						}

						// For "mergeByKey" and "keepKeyMatches" skip item
						continue;
					}

					// Match exists
					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" we can skip the item as it has a match
						continue;
					} else if (mode === 'mergeByKey') {
						// Copy the entry as the data gets changed
						entry = JSON.parse(JSON.stringify(entry));

						for (key of Object.keys(copyData[referenceValue as string].json)) {
							if (key === propertyName2) {
								continue;
							}

							// TODO: Currently only copies json data and no binary one
							const value = copyData[referenceValue as string].json[key];
							if (
								overwrite === 'always' ||
								(overwrite === 'undefined' && !entry.json.hasOwnProperty(key)) ||
								(overwrite === 'blank' && [null, undefined, ''].includes(entry.json[key] as string))
							) {
								entry.json[key] = value;
							}
						}
					} else {
						// For "keepKeyMatches" we add it as it is
						returnData.push(entry);
						continue;
					}
				} else {
					// No item for reference value got found
					if (mode === 'removeKeyMatches') {
						// For "removeKeyMatches" we can add it if not match got found
						returnData.push(entry);
						continue;
					}
				}

				if (mode === 'mergeByKey') {
					// For "mergeByKey" we always add the entry anyway but then the unchanged one
					returnData.push(entry);
				}
			}

			return [returnData];
		} else if (mode === 'passThrough') {
			const output = this.getNodeParameter('output', 0) as string;

			if (output === 'input1') {
				returnData.push.apply(returnData, this.getInputData(0));
			} else  {
				returnData.push.apply(returnData, this.getInputData(1));
			}
		} else if (mode === 'wait') {
			returnData.push({ json: {} });
		}

		return [returnData];
	}
}
