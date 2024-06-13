import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IPairedItemData,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type { ClashResolveOptions } from '../../helpers/interfaces';
import {
	clashHandlingProperties,
	fuzzyCompareProperty,
	numberInputsProperty,
} from '../../helpers/descriptions';
import { addSuffixToEntriesKeys, selectMergeMethod } from '../../helpers/utils';

import merge from 'lodash/merge';

export const properties: INodeProperties[] = [
	numberInputsProperty,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			clashHandlingProperties,
			fuzzyCompareProperty,
			{
				displayName: 'Include Any Unpaired Items',
				name: 'includeUnpaired',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'If there are different numbers of items in input 1 and input 2, whether to include the ones at the end with nothing to pair with',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['combineByPosition'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

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
		return [...input1, ...input2];
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
			return input2;
		}
		return returnData;
	}

	if (input2 === undefined || input2.length === 0) {
		if (includeUnpaired) {
			return input1;
		}
		return returnData;
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

	return returnData;
}
