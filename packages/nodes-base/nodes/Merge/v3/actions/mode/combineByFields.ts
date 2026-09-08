import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { clashHandlingProperties, fuzzyCompareProperty } from '../../helpers/descriptions';
import type {
	ClashResolveOptions,
	MatchFieldsJoinMode,
	MatchFieldsOptions,
	MatchFieldsOutput,
} from '../../helpers/interfaces';
import {
	addSourceField,
	addSuffixToEntriesKeys,
	checkInput,
	checkMatchFieldsInput,
	findMatches,
	mergeMatched,
} from '../../helpers/utils';

const multipleMatchesProperty: INodeProperties = {
	displayName: 'Multiple matches',
	name: 'multipleMatches',
	type: 'options',
	default: 'all',
	options: [
		{
			name: 'Include all matches',
			value: 'all',
			description: 'Output multiple items if there are multiple matches',
		},
		{
			name: 'Include first match only',
			value: 'first',
			description: 'Only ever output a single item per match',
		},
	],
};

export const properties: INodeProperties[] = [
	{
		displayName: 'Fields to match have different names',
		name: 'advanced',
		type: 'boolean',
		default: false,
		description: 'Whether name(s) of field to match are different in input 1 and input 2',
	},
	{
		displayName: 'Fields to match',
		name: 'fieldsToMatchString',
		type: 'string',
		// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
		placeholder: 'e.g. id, name',
		default: '',
		requiresDataPath: 'multiple',
		description: 'Specify the fields to use for matching input items',
		hint: 'Drag or type the input field name',
		displayOptions: {
			show: {
				advanced: [false],
			},
		},
	},
	{
		displayName: 'Fields to match',
		name: 'mergeByFields',
		type: 'fixedCollection',
		placeholder: 'Add fields to match',
		default: { values: [{ field1: '', field2: '' }] },
		typeOptions: {
			multipleValues: true,
		},
		description: 'Specify the fields to use for matching input items',
		displayOptions: {
			show: {
				advanced: [true],
			},
		},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Input 1 field',
						name: 'field1',
						type: 'string',
						default: '',
						// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
						placeholder: 'e.g. id',
						hint: 'Drag or type the input field name',
						requiresDataPath: 'single',
					},
					{
						displayName: 'Input 2 field',
						name: 'field2',
						type: 'string',
						default: '',
						// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
						placeholder: 'e.g. id',
						hint: 'Drag or type the input field name',
						requiresDataPath: 'single',
					},
				],
			},
		],
	},
	{
		displayName: 'Output type',
		name: 'joinMode',
		type: 'options',
		description: 'How to select the items to send to output',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Keep matches',
				value: 'keepMatches',
				description: 'Items that match, merged together (inner join)',
			},
			{
				name: 'Keep non-matches',
				value: 'keepNonMatches',
				description: "Items that don't match",
			},
			{
				name: 'Keep everything',
				value: 'keepEverything',
				description: "Items that match merged together, plus items that don't match (outer join)",
			},
			{
				name: 'Enrich input 1',
				value: 'enrichInput1',
				description: 'All of input 1, with data from input 2 added in (left join)',
			},
			{
				name: 'Enrich input 2',
				value: 'enrichInput2',
				description: 'All of input 2, with data from input 1 added in (right join)',
			},
		],
		default: 'keepMatches',
	},
	{
		displayName: 'Output data from',
		name: 'outputDataFrom',
		type: 'options',
		options: [
			{
				name: 'Both inputs merged together',
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
				joinMode: ['keepMatches'],
			},
		},
	},
	{
		displayName: 'Output data from',
		name: 'outputDataFrom',
		type: 'options',
		options: [
			{
				name: 'Both inputs appended together',
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
				joinMode: ['keepNonMatches'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				...clashHandlingProperties,
				displayOptions: {
					hide: {
						'/joinMode': ['keepMatches', 'keepNonMatches'],
					},
				},
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/joinMode': ['keepMatches'],
						'/outputDataFrom': ['both'],
					},
				},
			},
			{
				displayName: 'Disable dot notation',
				name: 'disableDotNotation',
				type: 'boolean',
				default: false,
				description:
					'Whether to disallow referencing child fields using `parent.child` in the field name',
			},
			fuzzyCompareProperty,
			{
				...multipleMatchesProperty,
				displayOptions: {
					show: {
						'/joinMode': ['keepMatches'],
						'/outputDataFrom': ['both'],
					},
				},
			},
			{
				...multipleMatchesProperty,
				displayOptions: {
					show: {
						'/joinMode': ['enrichInput1', 'enrichInput2', 'keepEverything'],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		mode: ['combine'],
		combineBy: ['combineByFields'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	inputsData: INodeExecutionData[][],
): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];
	const advanced = this.getNodeParameter('advanced', 0) as boolean;
	let matchFields;

	if (advanced) {
		matchFields = this.getNodeParameter('mergeByFields.values', 0, []) as IDataObject[];
	} else {
		matchFields = (this.getNodeParameter('fieldsToMatchString', 0, '') as string)
			.split(',')
			.map((f) => {
				const field = f.trim();
				return { field1: field, field2: field };
			});
	}

	matchFields = checkMatchFieldsInput(matchFields);

	const joinMode = this.getNodeParameter('joinMode', 0) as MatchFieldsJoinMode;
	const outputDataFrom = this.getNodeParameter('outputDataFrom', 0, 'both') as MatchFieldsOutput;
	const options = this.getNodeParameter('options', 0, {}) as MatchFieldsOptions;

	options.joinMode = joinMode;
	options.outputDataFrom = outputDataFrom;

	const nodeVersion = this.getNode().typeVersion;

	let input1 = inputsData[0];
	let input2 = inputsData[1];

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
			return [];
		} else if (joinMode === 'enrichInput1' && input1.length === 0) {
			// No data to enrich so stop
			return [];
		} else if (joinMode === 'enrichInput2' && input2.length === 0) {
			// No data to enrich so stop
			return [];
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

		returnData = returnData.concat(output);
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
				returnData = returnData.concat(
					mergedEntries,
					addSuffixToEntriesKeys(matches.unmatched1, '1'),
				);
			} else {
				returnData = returnData.concat(mergedEntries, matches.unmatched1);
			}
		} else {
			if (clashResolveOptions.resolveClash === 'addSuffix') {
				returnData = returnData.concat(
					mergedEntries,
					addSuffixToEntriesKeys(matches.unmatched2, '2'),
				);
			} else {
				returnData = returnData.concat(mergedEntries, matches.unmatched2);
			}
		}
	}

	return [returnData];
}
