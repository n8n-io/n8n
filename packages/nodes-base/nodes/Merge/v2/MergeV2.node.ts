/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { IExecuteFunctions } from 'n8n-core';

import { merge } from 'lodash';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';

import type {
	ClashResolveOptions,
	MatchFieldsJoinMode,
	MatchFieldsOptions,
	MatchFieldsOutput,
} from './GenericFunctions';
import {
	addSourceField,
	addSuffixToEntriesKeys,
	checkInput,
	checkMatchFieldsInput,
	findMatches,
	mergeMatched,
	selectMergeMethod,
} from './GenericFunctions';

import { optionsDescription } from './OptionsDescription';

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
					name: 'Combine',
					value: 'combine',
					description: 'Merge matching items together',
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
		{
			displayName: 'Combination Mode',
			name: 'combinationMode',
			type: 'options',
			options: [
				{
					name: 'Merge By Fields',
					value: 'mergeByFields',
					description: 'Combine items with the same field values',
				},
				{
					name: 'Merge By Position',
					value: 'mergeByPosition',
					description: 'Combine items based on their order',
				},
				{
					name: 'Multiplex',
					value: 'multiplex',
					description: 'All possible item combinations (cross join)',
				},
			],
			default: 'mergeByFields',
			displayOptions: {
				show: {
					mode: ['combine'],
				},
			},
		},
		// mergeByFields ------------------------------------------------------------------
		{
			displayName: 'Fields to Match',
			name: 'mergeByFields',
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
							placeholder: 'e.g. id',
							hint: ' Enter the field name as text',
						},
						{
							displayName: 'Input 2 Field',
							name: 'field2',
							type: 'string',
							default: '',
							// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
							placeholder: 'e.g. id',
							hint: ' Enter the field name as text',
						},
					],
				},
			],
			displayOptions: {
				show: {
					mode: ['combine'],
					combinationMode: ['mergeByFields'],
				},
			},
		},
		{
			displayName: 'Output Type',
			name: 'joinMode',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'Keep Matches',
					value: 'keepMatches',
					description: 'Items that match, merged together (inner join)',
				},
				{
					name: 'Keep Non-Matches',
					value: 'keepNonMatches',
					description: "Items that don't match",
				},
				{
					name: 'Keep Everything',
					value: 'keepEverything',
					description: "Items that match merged together, plus items that don't match (outer join)",
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
					mode: ['combine'],
					combinationMode: ['mergeByFields'],
				},
			},
		},
		{
			displayName: 'Output Data From',
			name: 'outputDataFrom',
			type: 'options',
			options: [
				{
					name: 'Both Inputs Merged Together',
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
			default: 'both',
			displayOptions: {
				show: {
					mode: ['combine'],
					combinationMode: ['mergeByFields'],
					joinMode: ['keepMatches'],
				},
			},
		},
		{
			displayName: 'Output Data From',
			name: 'outputDataFrom',
			type: 'options',
			options: [
				{
					name: 'Both Inputs Appended Together',
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
			default: 'both',
			displayOptions: {
				show: {
					mode: ['combine'],
					combinationMode: ['mergeByFields'],
					joinMode: ['keepNonMatches'],
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

		if (mode === 'combine') {
			const combinationMode = this.getNodeParameter('combinationMode', 0) as string;

			if (combinationMode === 'multiplex') {
				const clashHandling = this.getNodeParameter(
					'options.clashHandling.values',
					0,
					{},
				) as ClashResolveOptions;

				let input1 = this.getInputData(0);
				let input2 = this.getInputData(1);

				if (clashHandling.resolveClash === 'preferInput1') {
					[input1, input2] = [input2, input1];
				}

				if (clashHandling.resolveClash === 'addSuffix') {
					input1 = addSuffixToEntriesKeys(input1, '1');
					input2 = addSuffixToEntriesKeys(input2, '2');
				}

				const mergeIntoSingleObject = selectMergeMethod(clashHandling);

				if (!input1 || !input2) {
					return [returnData];
				}

				let entry1: INodeExecutionData;
				let entry2: INodeExecutionData;

				for (entry1 of input1) {
					for (entry2 of input2) {
						returnData.push({
							json: {
								...mergeIntoSingleObject(entry1.json, entry2.json),
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

			if (combinationMode === 'mergeByPosition') {
				const clashHandling = this.getNodeParameter(
					'options.clashHandling.values',
					0,
					{},
				) as ClashResolveOptions;
				const includeUnpaired = this.getNodeParameter(
					'options.includeUnpaired',
					0,
					false,
				) as boolean;

				let input1 = this.getInputData(0);
				let input2 = this.getInputData(1);

				if (clashHandling.resolveClash === 'preferInput1') {
					[input1, input2] = [input2, input1];
				}

				if (clashHandling.resolveClash === 'addSuffix') {
					input1 = addSuffixToEntriesKeys(input1, '1');
					input2 = addSuffixToEntriesKeys(input2, '2');
				}

				if (input1 === undefined || input1.length === 0) {
					if (includeUnpaired) {
						return [input2];
					}
					return [returnData];
				}

				if (input2 === undefined || input2.length === 0) {
					if (includeUnpaired) {
						return [input1];
					}
					return [returnData];
				}

				let numEntries: number;
				if (includeUnpaired) {
					numEntries = Math.max(input1.length, input2.length);
				} else {
					numEntries = Math.min(input1.length, input2.length);
				}

				const mergeIntoSingleObject = selectMergeMethod(clashHandling);

				for (let i = 0; i < numEntries; i++) {
					if (i >= input1.length) {
						returnData.push(input2[i]);
						continue;
					}
					if (i >= input2.length) {
						returnData.push(input1[i]);
						continue;
					}

					const entry1 = input1[i];
					const entry2 = input2[i];

					returnData.push({
						json: {
							...mergeIntoSingleObject(entry1.json, entry2.json),
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

			if (combinationMode === 'mergeByFields') {
				const matchFields = checkMatchFieldsInput(
					this.getNodeParameter('mergeByFields.values', 0, []) as IDataObject[],
				);

				const joinMode = this.getNodeParameter('joinMode', 0) as MatchFieldsJoinMode;
				const outputDataFrom = this.getNodeParameter(
					'outputDataFrom',
					0,
					'both',
				) as MatchFieldsOutput;
				const options = this.getNodeParameter('options', 0, {}) as MatchFieldsOptions;

				options.joinMode = joinMode;
				options.outputDataFrom = outputDataFrom;

				const input1 = checkInput(
					this.getInputData(0),
					matchFields.map((pair) => pair.field1),
					options.disableDotNotation || false,
					'Input 1',
				);
				if (!input1) return [returnData];

				const input2 = checkInput(
					this.getInputData(1),
					matchFields.map((pair) => pair.field2),
					options.disableDotNotation || false,
					'Input 2',
				);

				if (!input2 || !matchFields.length) {
					if (
						joinMode === 'keepMatches' ||
						joinMode === 'keepEverything' ||
						joinMode === 'enrichInput2'
					) {
						return [returnData];
					}
					return [input1];
				}

				const matches = findMatches(input1, input2, matchFields, options);

				if (joinMode === 'keepMatches' || joinMode === 'keepEverything') {
					let output: INodeExecutionData[] = [];
					const clashResolveOptions = this.getNodeParameter(
						'options.clashHandling.values',
						0,
						{},
					) as ClashResolveOptions;

					if (outputDataFrom === 'input1') {
						output = matches.matched.map((match) => match.entry);
					}
					if (outputDataFrom === 'input2') {
						output = matches.matched2;
					}
					if (outputDataFrom === 'both') {
						output = mergeMatched(matches.matched, clashResolveOptions);
					}

					if (joinMode === 'keepEverything') {
						let unmatched1 = matches.unmatched1;
						let unmatched2 = matches.unmatched2;
						if (clashResolveOptions.resolveClash === 'addSuffix') {
							unmatched1 = addSuffixToEntriesKeys(unmatched1, '1');
							unmatched2 = addSuffixToEntriesKeys(unmatched2, '2');
						}
						output = [...output, ...unmatched1, ...unmatched2];
					}

					returnData.push(...output);
				}

				if (joinMode === 'keepNonMatches') {
					if (outputDataFrom === 'input1') {
						return [matches.unmatched1];
					}
					if (outputDataFrom === 'input2') {
						return [matches.unmatched2];
					}
					if (outputDataFrom === 'both') {
						let output: INodeExecutionData[] = [];
						output = output.concat(addSourceField(matches.unmatched1, 'input1'));
						output = output.concat(addSourceField(matches.unmatched2, 'input2'));
						return [output];
					}
				}

				if (joinMode === 'enrichInput1' || joinMode === 'enrichInput2') {
					const clashResolveOptions = this.getNodeParameter(
						'options.clashHandling.values',
						0,
						{},
					) as ClashResolveOptions;

					const mergedEntries = mergeMatched(matches.matched, clashResolveOptions, joinMode);

					if (clashResolveOptions.resolveClash === 'addSuffix') {
						const suffix = joinMode === 'enrichInput1' ? '1' : '2';
						returnData.push(
							...mergedEntries,
							...addSuffixToEntriesKeys(matches.unmatched1, suffix),
						);
					} else {
						returnData.push(...mergedEntries, ...matches.unmatched1);
					}
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
