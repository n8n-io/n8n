/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	assign,
	get,
	merge,
} from 'lodash';

import {
	IExecuteFunctions
} from 'n8n-core';

import {
	GenericValue,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';

import {
	addSuffixToEntriesKeys,
	findMatches,
 } from './GenericFunctions';

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
			name: 'matchFields',
			type: 'fixedCollection',
			placeholder: 'Add Fields',
			default: {values: [{field1: '', field2: ''}]},
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					displayName: 'Values',
					name: 'values',
					values: [
						{
							displayName: 'Input 1 Field Named',
							name: 'field1',
							type: 'string',
							default: '',
							required: true,
						},
						{
							displayName: 'Input 2 Field Named',
							name: 'field2',
							type: 'string',
							default: '',
							required: true,
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
					value: 'keepMatches',
					description: 'Items that match, merged together (inner join)',
				},
				{
					name: 'Keep Non-Matches',
					value: 'keepNonMatches',
					description: 'Items that don\'t match (outer join)',
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
					joinMode: ['keepMatches', 'keepNonMatches'],
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

			let mergeEntries = merge;

			if (options.mergeMode === 'shallowMerge') {
				mergeEntries = assign;
			}

			if (!dataInput1 || !dataInput2) {
				return [returnData];
			}

			let entry1: INodeExecutionData;
			let entry2: INodeExecutionData;

			for (entry1 of dataInput1) {
				for (entry2 of dataInput2) {
					returnData.push({
						json: {
							...mergeEntries({}, entry1.json, entry2.json),
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
			const includeUnpaired = this.getNodeParameter('includeUnpaired', 0) as boolean;
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

			let mergeEntries = merge;

			if (options.mergeMode === 'shallowMerge') {
				mergeEntries = assign;
			}

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
						...mergeEntries({}, entry1.json, entry2.json),
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

		if (mode === 'matchFields') {
			const matchFields = this.getNodeParameter('matchFields.values', 0, []) as IDataObject[];
			const joinMode = this.getNodeParameter('joinMode', 0) as string;
			const options = this.getNodeParameter('options.clashHandling.values', 0, {}) as IDataObject;
			const disableDotNotation = this.getNodeParameter('options.disableDotNotation', 0, false) as boolean;

			const dataInput1 = this.getInputData(0);
			if (!dataInput1 ) return [returnData];

			const dataInput2 = this.getInputData(1);
			if (!dataInput2 || !matchFields.length) {
				if (joinMode === 'keepMatches' || joinMode === 'enrichInput2') {
					return [returnData];
				}
				return [dataInput1];
			}

			const filteredData = findMatches(dataInput1, dataInput2, matchFields, disableDotNotation);

			if (joinMode === 'keepMatches') {
				const outputDataFrom = this.getNodeParameter('outputDataFrom', 0) as string;

				if (outputDataFrom === 'input1' ) {
					return [filteredData.getMatches1()];
				}
				if (outputDataFrom === 'input2' ) {
					return [filteredData.getMatches2()];
				}
				if (outputDataFrom === 'both' ) {
					return [[...filteredData.getMatches1(), ...filteredData.getMatches2()]];
				}
			}

			if (joinMode === 'keepNonMatches') {
				const outputDataFrom = this.getNodeParameter('outputDataFrom', 0) as string;
				if (outputDataFrom === 'input1' ) {
					return [filteredData.unmatched1];
				}
				if (outputDataFrom === 'input2' ) {
					return [filteredData.unmatched2];
				}
				if (outputDataFrom === 'both' ) {
					return [[...filteredData.unmatched1, ...filteredData.unmatched2]];
				}
			}

			if (joinMode === 'enrichInput1') {
				return [[...dataInput1, ...filteredData.getMatches2()]];
			}

			if (joinMode === 'enrichInput2') {
				return [[...dataInput2, ...filteredData.getMatches1()]];
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
