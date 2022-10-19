import { INodeProperties } from 'n8n-workflow';

const clashHandlingProperties: INodeProperties = {
	displayName: 'Clash Handling',
	name: 'clashHandling',
	type: 'fixedCollection',
	default: {
		values: { resolveClash: 'preferInput2', mergeMode: 'deepMerge', overrideEmpty: false },
	},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'When Field Values Clash',
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
							description:
								'Merge at the top level only (all nested fields will come from the same input)',
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
					displayName: 'Minimize Empty Fields',
					name: 'overrideEmpty',
					type: 'boolean',
					default: false,
					description:
						"Whether to override the preferred input version for a field if it is empty and the other version isn't. Here 'empty' means undefined, null or an empty string.",
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
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
					},
					hide: {
						'/joinMode': ['keepMatches', 'keepNonMatches'],
					},
				},
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
						'/joinMode': ['keepMatches'],
						'/outputDataFrom': ['both'],
					},
				},
			},
			{
				...clashHandlingProperties,
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['multiplex', 'mergeByPosition'],
					},
				},
			},
			{
				displayName: 'Disable Dot Notation',
				name: 'disableDotNotation',
				type: 'boolean',
				default: false,
				description:
					'Whether to disallow referencing child fields using `parent.child` in the field name',
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
					},
				},
			},
			{
				displayName: 'Include Any Unpaired Items',
				name: 'includeUnpaired',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'If there are different numbers of items in input 1 and input 2, whether to include the ones at the end with nothing to pair with',
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByPosition'],
					},
				},
			},
			{
				displayName: 'Multiple Matches',
				name: 'multipleMatches',
				type: 'options',
				default: 'all',
				options: [
					{
						name: 'Include All Matches',
						value: 'all',
						description: 'Output multiple items if there are multiple matches',
					},
					{
						name: 'Include First Match Only',
						value: 'first',
						description: 'Only ever output a single item per match',
					},
				],
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
						'/joinMode': ['keepMatches'],
						'/outputDataFrom': ['both'],
					},
				},
			},
			{
				displayName: 'Multiple Matches',
				name: 'multipleMatches',
				type: 'options',
				default: 'all',
				options: [
					{
						name: 'Include All Matches',
						value: 'all',
						description: 'Output multiple items if there are multiple matches',
					},
					{
						name: 'Include First Match Only',
						value: 'first',
						description: 'Only ever output a single item per match',
					},
				],
				displayOptions: {
					show: {
						'/mode': ['combine'],
						'/combinationMode': ['mergeByFields'],
						'/joinMode': ['enrichInput1', 'enrichInput2', 'keepEverything'],
					},
				},
			},
		],
		displayOptions: {
			hide: {
				mode: ['chooseBranch', 'append'],
			},
		},
	},
];
