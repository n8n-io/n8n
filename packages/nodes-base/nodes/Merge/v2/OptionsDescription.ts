import {IDataObject, INodeProperties } from 'n8n-workflow';

const clashHandlingProperties: INodeProperties = 	{
	displayName: 'Clash Handling',
	name: 'clashHandling',
	type: 'fixedCollection',
	default: {values: {fieldClash: 'preferInput1', nestedFields: 'deepMerge', minimiseEmptyFields: false}},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'When Field Names Clash',
					name: 'fieldClash',
					type: 'options',
					default: '',
					options: [
						{
							name: 'Add Input Number to Field Names',
							value: 'addInputNumber',
						},
						{
							name: 'Prefer Input 1 Version',
							value: 'preferInput1',
						},
						{
							name: 'Prefer Input 2 Version',
							value: 'preferInput2',
						},
					],
				},
				{
					displayName: 'Merging Nested Fields',
					name: 'nestedFields',
					type: 'options',
					default: '',
					options: [
						{
							name: 'Deep Merge',
							value: 'deepMerge',
							description: 'Merge at every level of nesting',
						},
						{
							name: 'Shallow Merge',
							value: 'shallowMerge',
							description: 'Merge at the top level only (all nested fields will come from the same input)',
						},
					],
					hint: 'How to merge when there are sub-fields below the top-level ones',
					displayOptions: {
						show: {
							fieldClash: ['preferInput1', 'preferInput2'],
						},
					},
				},
				{
					displayName: 'Minimise Empty Fields',
					name: 'minimiseEmptyFields',
					type: 'boolean',
					default: false,
					description: 'Whether to override the preferred input version if it is null, undefined or an empty string',
					displayOptions: {
						show: {
							fieldClash: ['preferInput1', 'preferInput2'],
						},
					},
				},
			],
		},
	],
};

export const optionsDescription: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Disable Dot Notation',
				name: 'disableDotNotation',
				type: 'boolean',
				default: false,
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': [
							'matchFields',
						],
					},
					hide: {
						'/joinMode': [
							'innerJoin',
							'outerJoin',
						],
					},
				},
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': [
							'matchFields',
						],
						'/joinMode': [
							'innerJoin',
						],
						'/outputDataFrom': [
							'both',
						],
					},
				},
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': [
							'append',
							'multiplex',
						],
					},
				},
			},
		],
		displayOptions: {
			hide: {
				mode: ['chooseBranch'],
			},
		},
	},
];
