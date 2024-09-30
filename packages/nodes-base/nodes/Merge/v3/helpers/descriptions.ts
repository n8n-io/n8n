import type { INodeProperties } from 'n8n-workflow';

export const fuzzyCompareProperty: INodeProperties = {
	displayName: 'Fuzzy Compare',
	name: 'fuzzyCompare',
	type: 'boolean',
	default: false,
	description:
		"Whether to tolerate small type differences when comparing fields. E.g. the number 3 and the string '3' are treated as the same.",
};
export const numberInputsProperty: INodeProperties = {
	displayName: 'Number of Inputs',
	name: 'numberInputs',
	type: 'options',
	noDataExpression: true,
	default: 2,
	options: [
		{
			name: '2',
			value: 2,
		},
		{
			name: '3',
			value: 3,
		},
		{
			name: '4',
			value: 4,
		},
		{
			name: '5',
			value: 5,
		},
		{
			name: '6',
			value: 6,
		},
		{
			name: '7',
			value: 7,
		},
		{
			name: '8',
			value: 8,
		},
		{
			name: '9',
			value: 9,
		},
		{
			name: '10',
			value: 10,
		},
	],
	validateType: 'number',
	description:
		'The number of data inputs you want to merge. The node waits for all connected inputs to be executed.',
};

export const clashHandlingProperties: INodeProperties = {
	displayName: 'Clash Handling',
	name: 'clashHandling',
	type: 'fixedCollection',
	default: {
		values: { resolveClash: 'preferLast', mergeMode: 'deepMerge', overrideEmpty: false },
	},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
					displayName: 'When Field Values Clash',
					name: 'resolveClash',
					// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-options
					type: 'options',
					default: '',
					typeOptions: {
						loadOptionsMethod: 'getResolveClashOptions',
						loadOptionsDependsOn: ['numberInputs'],
					},
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
							resolveClash: [{ _cnd: { not: 'addSuffix' } }],
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
							resolveClash: [{ _cnd: { not: 'addSuffix' } }],
						},
					},
				},
			],
		},
	],
};
