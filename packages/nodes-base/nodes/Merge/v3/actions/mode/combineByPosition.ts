import merge from 'lodash/merge';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IPairedItemData,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { clashHandlingProperties, numberInputsProperty } from '../../helpers/descriptions';
import type { ClashResolveOptions } from '../../helpers/interfaces';
import { addSuffixToEntriesKeys, selectMergeMethod } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	numberInputsProperty,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				...clashHandlingProperties,
				default: { values: { resolveClash: 'addSuffix' } },
			},
			{
				displayName: 'Include Any Unpaired Items',
				name: 'includeUnpaired',
				type: 'boolean',
				default: false,
				description:
					'Whether unpaired items should be included in the result when there are differing numbers of items among the inputs',
			},
		],
	},
];

const displayOptions = {
	show: {
		mode: ['combine'],
		combineBy: ['combineByPosition'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	inputsData: INodeExecutionData[][],
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	const clashHandling = this.getNodeParameter(
		'options.clashHandling.values',
		0,
		{},
	) as ClashResolveOptions;
	const includeUnpaired = this.getNodeParameter('options.includeUnpaired', 0, false) as boolean;

	let preferredInputIndex: number;

	if (clashHandling?.resolveClash?.includes('preferInput')) {
		preferredInputIndex = Number(clashHandling.resolveClash.replace('preferInput', '')) - 1;
	} else {
		preferredInputIndex = inputsData.length - 1;
	}

	const preferred = inputsData[preferredInputIndex];

	if (clashHandling.resolveClash === 'addSuffix') {
		for (const [inputIndex, input] of inputsData.entries()) {
			inputsData[inputIndex] = addSuffixToEntriesKeys(input, String(inputIndex + 1));
		}
	}

	let numEntries: number;
	if (includeUnpaired) {
		numEntries = Math.max(...inputsData.map((input) => input.length), preferred.length);
	} else {
		numEntries = Math.min(...inputsData.map((input) => input.length), preferred.length);
		if (numEntries === 0) {
			this.addExecutionHints({
				message: 'Consider enabling "Include Any Unpaired Items" in options or check your inputs',
			});
			return [returnData];
		}
	}

	const mergeIntoSingleObject = selectMergeMethod(clashHandling);

	for (let i = 0; i < numEntries; i++) {
		const preferredEntry = preferred[i] ?? ({} as INodeExecutionData);
		const restEntries = inputsData.map((input) => input[i] ?? ({} as INodeExecutionData));

		const json = {
			...mergeIntoSingleObject(
				{},
				...restEntries.map((entry) => entry.json ?? {}),
				preferredEntry.json ?? {},
			),
		};

		const binary = {
			...merge({}, ...restEntries.map((entry) => entry.binary ?? {}), preferredEntry.binary ?? {}),
		};

		const pairedItem = [
			...restEntries.map((entry) => entry.pairedItem as IPairedItemData).flat(),
			preferredEntry.pairedItem as IPairedItemData,
		].filter((item) => item !== undefined);

		returnData.push({ json, binary, pairedItem });
	}

	return [returnData];
}
