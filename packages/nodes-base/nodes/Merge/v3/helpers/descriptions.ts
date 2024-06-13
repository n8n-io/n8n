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
	type: 'number',
	default: 2,
	typeOptions: {
		minValue: 2,
		maxValue: 10,
	},
	description:
		'The number of data inputs you want to merge. The node waits for all connected inputs to be executed.',
};

export const clashHandlingProperties: INodeProperties = {
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
