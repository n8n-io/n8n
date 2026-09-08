import type { INodeProperties } from 'n8n-workflow';

const clashHandlingProperties: INodeProperties = {
	displayName: 'Clash handling',
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
					displayName: 'When field values clash',
					name: 'resolveClash',
					type: 'options',
					default: '',
					options: [
						{
							name: 'Always add input number to field names',
							value: 'addSuffix',
						},
						{
							name: 'Prefer input 1 version',
							value: 'preferInput1',
						},
						{
							name: 'Prefer input 2 version',
							value: 'preferInput2',
						},
					],
				},
				{
					displayName: 'Merging nested fields',
					name: 'mergeMode',
					type: 'options',
					default: 'deepMerge',
					options: [
						{
							name: 'Deep merge',
							value: 'deepMerge',
							description: 'Merge at every level of nesting',
						},
						{
							name: 'Shallow merge',
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
					displayName: 'Minimize empty fields',
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
		placeholder: 'Add option',
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
				displayName: 'Disable dot notation',
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
				displayName: 'Fuzzy compare',
				name: 'fuzzyCompare',
				type: 'boolean',
				default: false,
				description:
					"Whether to tolerate small type differences when comparing fields. E.g. the number 3 and the string '3' are treated as the same.",
			},
			{
				displayName: 'Include any unpaired items',
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
