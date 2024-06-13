import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IPairedItemData,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type { ClashResolveOptions } from '../../helpers/interfaces';
import { clashHandlingProperties, fuzzyCompareProperty } from '../../helpers/descriptions';
import { addSuffixToEntriesKeys, selectMergeMethod } from '../../helpers/utils';

import merge from 'lodash/merge';

export const properties: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [clashHandlingProperties, fuzzyCompareProperty],
	},
];

const displayOptions = {
	show: {
		operation: ['combineAll'],
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
		return returnData;
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

	return returnData;
}
