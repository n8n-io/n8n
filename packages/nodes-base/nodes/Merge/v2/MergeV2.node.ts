/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { IExecuteFunctions } from 'n8n-core';

import { merge } from 'lodash';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';

import {
	addSuffixToEntriesKeys,
	checkInput,
	checkMatchFieldsInput,
	findMatches,
	mergeMatched,
	selectMergeMethod,
} from './GenericFunctions';

import { optionsDescription } from './OptionsDescription';
import get from 'lodash.get';

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
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			options: [
				{
					name: 'Append',
					value: 'append',
					description: 'All items of input 1, then all items of input 2',
				},
				{
					name: 'Choose Branch',
					value: 'chooseBranch',
					description: 'Output input data, without modifying it',
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
			],
			default: 'append',
			description: 'How data of branches should be merged',
		},

		// matchFields ------------------------------------------------------------------
		{
			displayName: 'Fields to Match',
			name: 'matchFields',
			type: 'fixedCollection',
			placeholder: 'Add Fields to Match',
			default: { values: [{ field1: '', field2: '' }] },
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					displayName: 'Values',
					name: 'values',
					values: [
						{
							displayName: 'Input 1 Field',
							name: 'field1',
							type: 'string',
							default: '',
							// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
							placeholder: 'id',
							hint: ' Enter the field name as text',
						},
						{
							displayName: 'Input 2 Field',
							name: 'field2',
							type: 'string',
							default: '',
							// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
							placeholder: 'id',
							hint: ' Enter the field name as text',
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
			displayName: 'Output Type',
			name: 'joinMode',
			type: 'options',
			options: [
				{
					name: 'Keep Matches',
					value: 'keepMatches',
					description: 'Items that match, merged together (inner join)',
				},
				{
					name: 'Keep Non-Matches',
					value: 'keepNonMatches',
					description: "Items that don't match (outer join)",
				},
				{
					name: 'Enrich Input 1',
					value: 'enrichInput1',
					description: 'All of input 1, with data from input 2 added in (left join)',
				},
				{
					name: 'Enrich Input 2',
					value: 'enrichInput2',
					description: 'All of input 2, with data from input 1 added in (right join)',
				},
			],
			default: 'keepMatches',
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
					name: 'Both Inputs',
					value: 'both',
				},
				{
					name: 'Input 1',
					value: 'input1',
				},
				{
					name: 'Input 2',
					value: 'input2',
				},
			],
			default: 'input1',
			displayOptions: {
				show: {
					mode: ['matchFields'],
					joinMode: ['keepMatches', 'keepNonMatches'],
				},
			},
		},
		{
			displayName: 'Merge Matched Items',
			name: 'mergeMatchedItems',
			type: 'boolean',
			default: false,
			description: 'Whether to merge matched items into a single object',
			displayOptions: {
				show: {
					mode: ['matchFields'],
					joinMode: ['keepMatches', 'keepNonMatches'],
					outputDataFrom: ['both'],
				},
			},
		},
		{
			displayName: 'Merge Matched Items',
			name: 'mergeMatchedItems',
			type: 'boolean',
			default: false,
			description: 'Whether to merge matched items into a single object',
			displayOptions: {
				show: {
					mode: ['matchFields'],
					joinMode: ['enrichInput1', 'enrichInput2'],
				},
			},
		},

		// chooseBranch -----------------------------------------------------------------
		{
			displayName: 'Output Type',
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
					name: 'Input 1 Data',
					value: 'input1',
				},
				{
					name: 'Input 2 Data',
					value: 'input2',
				},
				{
					name: 'A Single, Empty Item',
					value: 'empty',
				},
			],
			default: 'input1',
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
			for (let i = 0; i < 2; i++) {
				returnData.push.apply(returnData, this.getInputData(i));
			}
		}

		if (mode === 'multiplex') {
			const options = this.getNodeParameter('options.clashHandling.values', 0, {}) as IDataObject;

			let dataInput1 = this.getInputData(0);
			let dataInput2 = this.getInputData(1);

			if (options.resolveClash === 'preferInput1') {
				const dataTemp = [...dataInput1];
				dataInput1 = dataInput2;
				dataInput2 = dataTemp;
			}

			if (options.resolveClash === 'addSuffix') {
				dataInput1 = addSuffixToEntriesKeys(dataInput1, '1');
				dataInput2 = addSuffixToEntriesKeys(dataInput2, '2');
			}

			const mergeEntries = selectMergeMethod(options);

			if (!dataInput1 || !dataInput2) {
				return [returnData];
			}

			let entry1: INodeExecutionData;
			let entry2: INodeExecutionData;

			for (entry1 of dataInput1) {
				for (entry2 of dataInput2) {
					returnData.push({
						json: {
							...mergeEntries(entry1.json, [entry2.json]),
						},
						binary: {
							...merge({}, entry1.binary, entry2.binary),
						},
						pairedItem: [
							entry1.pairedItem as IPairedItemData,
							entry2.pairedItem as IPairedItemData,
						],
					});
				}
			}
			return [returnData];
		}

		if (mode === 'matchPositions') {
			const options = this.getNodeParameter('options.clashHandling.values', 0, {}) as IDataObject;
			const includeUnpaired = this.getNodeParameter('options.includeUnpaired', 0, false) as boolean;

			let dataInput1 = this.getInputData(0);
			let dataInput2 = this.getInputData(1);

			if (options.resolveClash === 'preferInput1') {
				const dataTemp = [...dataInput1];
				dataInput1 = dataInput2;
				dataInput2 = dataTemp;
			}

			if (options.resolveClash === 'addSuffix') {
				dataInput1 = addSuffixToEntriesKeys(dataInput1, '1');
				dataInput2 = addSuffixToEntriesKeys(dataInput2, '2');
			}

			if (dataInput1 === undefined || dataInput1.length === 0) {
				if (includeUnpaired) {
					return [dataInput2];
				}
				return [returnData];
			}

			if (dataInput2 === undefined || dataInput2.length === 0) {
				if (includeUnpaired) {
					return [dataInput1];
				}
				return [returnData];
			}

			let numEntries = dataInput1.length;
			if (includeUnpaired) {
				numEntries = Math.max(dataInput1.length, dataInput2.length);
			} else {
				numEntries = Math.min(dataInput1.length, dataInput2.length);
			}

			const mergeEntries = selectMergeMethod(options);

			for (let i = 0; i < numEntries; i++) {
				if (i >= dataInput1.length) {
					returnData.push(dataInput2[i]);
					continue;
				}
				if (i >= dataInput2.length) {
					returnData.push(dataInput1[i]);
					continue;
				}

				const entry1 = dataInput1[i];
				const entry2 = dataInput2[i];

				returnData.push({
					json: {
						...mergeEntries(entry1.json, [entry2.json]),
					},
					binary: {
						...merge({}, entry1.binary, entry2.binary),
					},
					pairedItem: [entry1.pairedItem as IPairedItemData, entry2.pairedItem as IPairedItemData],
				});
			}
		}

		if (mode === 'matchFields') {
			const matchFields = checkMatchFieldsInput(
				this.getNodeParameter('matchFields.values', 0, []) as IDataObject[],
			);

			const joinMode = this.getNodeParameter('joinMode', 0) as string;
			const disableDotNotation = this.getNodeParameter(
				'options.disableDotNotation',
				0,
				false,
			) as boolean;

			const dataInput1 = checkInput(
				this.getInputData(0),
				matchFields.map((pair) => pair.field1 as string),
				disableDotNotation,
				'Input 1',
			);
			if (!dataInput1) return [returnData];

			const dataInput2 = checkInput(
				this.getInputData(1),
				matchFields.map((pair) => pair.field2 as string),
				disableDotNotation,
				'Input 2',
			);

			if (!dataInput2 || !matchFields.length) {
				if (joinMode === 'keepMatches' || joinMode === 'enrichInput2') {
					return [returnData];
				}
				return [dataInput1];
			}

			const matches = findMatches(dataInput1, dataInput2, matchFields, disableDotNotation);

			if (joinMode === 'keepMatches') {
				const outputDataFrom = this.getNodeParameter('outputDataFrom', 0) as string;
				const mergeMatchedItems = this.getNodeParameter('mergeMatchedItems', 0, false) as boolean;

				if (outputDataFrom === 'input1') {
					return [matches.getMatches1()];
				}
				if (outputDataFrom === 'input2') {
					return [matches.getMatches2()];
				}
				if (outputDataFrom === 'both' && !mergeMatchedItems) {
					return [[...matches.getMatches1(), ...matches.getMatches2()]];
				}
				if (outputDataFrom === 'both' && mergeMatchedItems) {
					const clashResolveOptions = this.getNodeParameter(
						'options.clashHandling.values',
						0,
						{},
					) as IDataObject;
					const mergedEntries = mergeMatched(matches, clashResolveOptions);

					returnData.push(...mergedEntries);
				}
			}

			if (joinMode === 'keepNonMatches') {
				const outputDataFrom = this.getNodeParameter('outputDataFrom', 0) as string;
				if (outputDataFrom === 'input1') {
					return [matches.unmatched1];
				}
				if (outputDataFrom === 'input2') {
					return [matches.unmatched2];
				}
				if (outputDataFrom === 'both') {
					return [[...matches.unmatched1, ...matches.unmatched2]];
				}
			}

			if (joinMode === 'enrichInput1') {
				const mergeMatchedItems = this.getNodeParameter('mergeMatchedItems', 0, false) as boolean;
				if (mergeMatchedItems) {
					const clashResolveOptions = this.getNodeParameter(
						'options.clashHandling.values',
						0,
						{},
					) as IDataObject;
					const mergedEntries = mergeMatched(matches, clashResolveOptions);

					if (clashResolveOptions.resolveClash === 'addSuffix') {
						returnData.push(...mergedEntries, ...addSuffixToEntriesKeys(matches.unmatched1, '1'));
					} else {
						returnData.push(...mergedEntries, ...matches.unmatched1);
					}
				} else {
					return [[...dataInput1, ...matches.getMatches2()]];
				}
			}

			if (joinMode === 'enrichInput2') {
				const mergeMatchedItems = this.getNodeParameter('mergeMatchedItems', 0, false) as boolean;
				if (mergeMatchedItems) {
					const clashResolveOptions = this.getNodeParameter(
						'options.clashHandling.values',
						0,
						{},
					) as IDataObject;
					const mergedEntries = mergeMatched(matches, clashResolveOptions);

					if (clashResolveOptions.resolveClash === 'addSuffix') {
						returnData.push(...mergedEntries, ...addSuffixToEntriesKeys(matches.unmatched2, '2'));
					} else {
						returnData.push(...mergedEntries, ...matches.unmatched2);
					}
				} else {
					return [[...dataInput2, ...matches.getMatches1()]];
				}
			}
		}

		if (mode === 'chooseBranch') {
			const chooseBranchMode = this.getNodeParameter('chooseBranchMode', 0) as string;

			if (chooseBranchMode === 'waitForBoth') {
				const output = this.getNodeParameter('output', 0) as string;

				if (output === 'input1') {
					returnData.push.apply(returnData, this.getInputData(0));
				}
				if (output === 'input2') {
					returnData.push.apply(returnData, this.getInputData(1));
				}
				if (output === 'empty') {
					returnData.push({ json: {} });
				}
			}
		}

		return [returnData];
	}
}
