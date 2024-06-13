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
import { addSuffixToEntriesKeys, getMergeNodeInputs, selectMergeMethod } from '../../helpers/utils';

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

	const inputs = getMergeNodeInputs(this);

	const inputsData = inputs.map((_, i) => {
		return this.getInputData(i) ?? [];
	});

	// let input1 = this.getInputData(0);
	// let input2 = this.getInputData(1);

	if ((inputsData.length === 2 && inputsData[0].length === 0) || inputsData[1].length === 0) {
		// If data of any input is missing, return the data of
		// the input that contains data
		return [...inputsData[0], ...inputsData[1]];
	}

	let prefered = [];
	if (clashHandling.resolveClash.includes('preferInput')) {
		const preferedInputIndex = Number(clashHandling.resolveClash.replace('preferInput', '')) - 1;
		prefered = inputsData.splice(preferedInputIndex, 1)[0];
	} else {
		prefered = inputsData.splice(inputsData.length - 1, 1)[0];
	}

	if (clashHandling.resolveClash === 'addSuffix') {
		for (const [inputIndex, input] of inputsData.entries()) {
			inputsData[inputIndex] = addSuffixToEntriesKeys(input, String(inputIndex + 1));
		}
	}

	// if (input1 === undefined || input1.length === 0) {
	// 	if (includeUnpaired) {
	// 		return input2;
	// 	}
	// 	return returnData;
	// }

	// if (input2 === undefined || input2.length === 0) {
	// 	if (includeUnpaired) {
	// 		return input1;
	// 	}
	// 	return returnData;
	// }

	let numEntries: number;
	if (includeUnpaired) {
		numEntries = Math.max(...inputsData.map((input) => input.length), prefered.length);
	} else {
		numEntries = Math.min(...inputsData.map((input) => input.length), prefered.length);
	}

	const mergeIntoSingleObject = selectMergeMethod(clashHandling);

	for (let i = 0; i < numEntries; i++) {
		// if (i >= input1.length) {
		// 	returnData.push(input2[i]);
		// 	continue;
		// }
		// if (i >= input2.length) {
		// 	returnData.push(input1[i]);
		// 	continue;
		// }

		// const entry1 = input1[i];
		const preferedEntry = prefered[i] ?? {};
		const restEntries = inputsData.map((input) => input[i] ?? {});

		returnData.push({
			json: {
				...mergeIntoSingleObject({}, ...restEntries.map((entry) => entry.json), preferedEntry.json),
			},
			binary: {
				...merge({}, ...restEntries.map((entry) => entry.binary), preferedEntry.binary),
			},
			pairedItem: [
				...restEntries.map((entry) => entry.pairedItem as IPairedItemData).flat(),
				preferedEntry.pairedItem as IPairedItemData,
			],
		});
	}

	return returnData;
}
