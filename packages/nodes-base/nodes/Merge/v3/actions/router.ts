import merge from 'lodash/merge';

import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	IPairedItemData,
} from 'n8n-workflow';

import { NodeHelpers, NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import type {
	ClashResolveOptions,
	MatchFieldsJoinMode,
	MatchFieldsOptions,
	MatchFieldsOutput,
} from '../helpers/interfaces';

import {
	addSourceField,
	addSuffixToEntriesKeys,
	checkInput,
	checkMatchFieldsInput,
	findMatches,
	mergeMatched,
	selectMergeMethod,
} from '../helpers/utils';

import { preparePairedItemDataArray } from '@utils/utilities';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	const nodeInputs = this.getNodeInputs();
	const inputs = NodeHelpers.getConnectionTypes(nodeInputs).filter(
		(type) => type === NodeConnectionType.Main,
	);

	const operation = this.getNodeParameter('mode', 0);

	if (operation === 'append') {
		for (let i = 0; i < inputs.length; i++) {
			returnData.push.apply(returnData, this.getInputData(i));
		}
	}

	if (operation === 'combineAll') {
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
					pairedItem: [entry1.pairedItem as IPairedItemData, entry2.pairedItem as IPairedItemData],
				});
			}
		}
		return [returnData];
	}

	if (operation === 'combineByPosition') {
		const clashHandling = this.getNodeParameter(
			'options.clashHandling.values',
			0,
			{},
		) as ClashResolveOptions;
		const includeUnpaired = this.getNodeParameter('options.includeUnpaired', 0, false) as boolean;

		let input1 = this.getInputData(0);
		let input2 = this.getInputData(1);

		if (input1.length === 0 || input2.length === 0) {
			// If data of any input is missing, return the data of
			// the input that contains data
			return [[...input1, ...input2]];
		}

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
				pairedItem: [entry1.pairedItem as IPairedItemData, entry2.pairedItem as IPairedItemData],
			});
		}
	}

	if (operation === 'combineByFields') {
		const matchFields = checkMatchFieldsInput(
			this.getNodeParameter('mergeByFields.values', 0, []) as IDataObject[],
		);

		const joinMode = this.getNodeParameter('joinMode', 0) as MatchFieldsJoinMode;
		const outputDataFrom = this.getNodeParameter('outputDataFrom', 0, 'both') as MatchFieldsOutput;
		const options = this.getNodeParameter('options', 0, {}) as MatchFieldsOptions;

		options.joinMode = joinMode;
		options.outputDataFrom = outputDataFrom;

		const nodeVersion = this.getNode().typeVersion;

		let input1 = this.getInputData(0);
		let input2 = this.getInputData(1);

		if (nodeVersion < 2.1) {
			input1 = checkInput(
				this.getInputData(0),
				matchFields.map((pair) => pair.field1),
				options.disableDotNotation || false,
				'Input 1',
			);
			if (!input1) return [returnData];

			input2 = checkInput(
				this.getInputData(1),
				matchFields.map((pair) => pair.field2),
				options.disableDotNotation || false,
				'Input 2',
			);
		} else {
			if (!input1) return [returnData];
		}

		if (input1.length === 0 || input2.length === 0) {
			if (!input1.length && joinMode === 'keepNonMatches' && outputDataFrom === 'input1')
				return [returnData];
			if (!input2.length && joinMode === 'keepNonMatches' && outputDataFrom === 'input2')
				return [returnData];

			if (joinMode === 'keepMatches') {
				// Stop the execution
				return [[]];
			} else if (joinMode === 'enrichInput1' && input1.length === 0) {
				// No data to enrich so stop
				return [[]];
			} else if (joinMode === 'enrichInput2' && input2.length === 0) {
				// No data to enrich so stop
				return [[]];
			} else {
				// Return the data of any of the inputs that contains data
				return [[...input1, ...input2]];
			}
		}

		if (!input1) return [returnData];

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

			if (joinMode === 'enrichInput1') {
				if (clashResolveOptions.resolveClash === 'addSuffix') {
					returnData.push(...mergedEntries, ...addSuffixToEntriesKeys(matches.unmatched1, '1'));
				} else {
					returnData.push(...mergedEntries, ...matches.unmatched1);
				}
			} else {
				if (clashResolveOptions.resolveClash === 'addSuffix') {
					returnData.push(...mergedEntries, ...addSuffixToEntriesKeys(matches.unmatched2, '2'));
				} else {
					returnData.push(...mergedEntries, ...matches.unmatched2);
				}
			}
		}
	}

	if (operation === 'chooseBranch') {
		const chooseBranchMode = this.getNodeParameter('chooseBranchMode', 0) as string;

		if (chooseBranchMode === 'waitForAll') {
			const output = this.getNodeParameter('output', 0) as string;

			if (output === 'specifiedInput') {
				const useDataOfInput = this.getNodeParameter('useDataOfInput', 0) as number;
				if (useDataOfInput > inputs.length) {
					throw new NodeOperationError(
						this.getNode(),
						`The input ${useDataOfInput} is not allowed.`,
						{
							description: `The node has only ${inputs.length} inputs, so selecting input ${useDataOfInput} is not possible.`,
						},
					);
				}
				returnData.push.apply(returnData, this.getInputData(parseInt(String(useDataOfInput)) - 1));
			}
			if (output === 'empty') {
				const pairedItem = [
					...this.getInputData(0).map((inputData) => inputData.pairedItem),
					...this.getInputData(1).map((inputData) => inputData.pairedItem),
				].flatMap(preparePairedItemDataArray);

				returnData.push({
					json: {},
					pairedItem,
				});
			}
		}
	}

	return [returnData];
}
