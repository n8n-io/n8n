import { INodeProperties } from 'n8n-workflow';

const clashHandlingProperties: INodeProperties = 	{
	displayName: 'Clash Handling',
	name: 'clashHandling',
	type: 'fixedCollection',
	default: {values: {resolveClash: 'preferInput1', mergeMode: 'deepMerge', overrideEmpty: false}},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'When Field Names Clash',
					name: 'resolveClash',
					type: 'options',
					default: '',
					options: [
						{
							name: 'Always Add Input Number to Field Names',
							value: 'addSuffix',
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
					name: 'mergeMode',
					type: 'options',
					default: 'deepMerge',
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
							resolveClash: ['preferInput1', 'preferInput2'],
						},
					},
				},
				{
					displayName: 'Minimise Empty Fields',
					name: 'overrideEmpty',
					type: 'boolean',
					default: false,
					description: 'Whether to override the preferred input version if it is null, undefined or an empty string',
					displayOptions: {
						show: {
							resolveClash: ['preferInput1', 'preferInput2'],
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
				description: 'Whether to disallow referencing child fields using `parent.child` in the field name',
				displayOptions: {
					show: {
						'/mode': [
							'matchFields',
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
						'/mergeMatchedItems': [true],
					},
					hide: {
						'/joinMode': [
							'keepMatches',
							'keepNonMatches',
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
							'keepMatches',
						],
						'/outputDataFrom': [
							'both',
						],
						'/mergeMatchedItems': [true],
					},
				},
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': [
							'multiplex',
							'matchPositions',
						],
					},
				},
			},
		],
		displayOptions: {
			hide: {
				mode: [
					'chooseBranch',
					'append',
				],
			},
		},
	},
];
