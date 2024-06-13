import type { INodeProperties } from 'n8n-workflow';
import { optionsDescription } from '../common.descriptions';

export const description: INodeProperties[] = [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'All items of Input 1, then all items from following inputs',
				action: 'Append items',
			},
			{
				name: 'Combine by Matching Fields',
				value: 'combineByFields',
				description: 'Combine items with the same field values',
				action: 'Combine by fields',
			},
			{
				name: 'Combine by Position',
				value: 'combineByPosition',
				description: 'Combine items based on their order',
				action: 'Combine by position',
			},
			{
				name: 'Combine by All Possible Combinations',
				value: 'combineAll',
				description: 'All possible item combinations (cross join)',
				action: 'Combine all possible item combinations',
			},
			{
				name: 'Choose Branch',
				value: 'chooseBranch',
				description: 'Output input data of a selected branch, without modifying it',
				action: 'Choose branch',
			},
		],
		default: 'append',
		description: 'How data of branches should be merged',
	},
	{
		displayName: 'Number of Inputs',
		name: 'numberInputs',
		type: 'number',
		default: 2,
		typeOptions: {
			minValue: 1,
		},
		description: 'How many inputs to create',
	},
	// combineByFields ------------------------------------------------------------------
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
						requiresDataPath: 'single',
					},
					{
						displayName: 'Input 2 Field',
						name: 'field2',
						type: 'string',
						default: '',
						// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
						placeholder: 'e.g. id',
						hint: ' Enter the field name as text',
						requiresDataPath: 'single',
					},
				],
			},
		],
		displayOptions: {
			show: {
				mode: ['combineByFields'],
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
				mode: ['combineByFields'],
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
				mode: ['combineByFields'],
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
				mode: ['combineByFields'],
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
				name: 'Wait for All Inputs to Arrive',
				value: 'waitForAll',
			},
		],
		default: 'waitForAll',
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
				name: 'Data of Specified Input',
				value: 'specifiedInput',
			},
			{
				name: 'A Single, Empty Item',
				value: 'empty',
			},
		],
		default: 'specifiedInput',
		displayOptions: {
			show: {
				mode: ['chooseBranch'],
				chooseBranchMode: ['waitForAll'],
			},
		},
	},
	{
		displayName: 'Use Data of Input',
		name: 'useDataOfInput',
		type: 'number',
		default: 1,
		displayOptions: {
			show: {
				output: ['specifiedInput'],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		description: 'The number of the input to use data of',
	},

	...optionsDescription,
];
