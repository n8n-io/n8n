import type { INodeProperties } from 'n8n-workflow';
import { caseStatusOptions, severityOptions, tlpOptions } from './common.description';

const customFieldsCollection: INodeProperties = {
	displayName: 'Custom Fields',
	name: 'customFieldsUi',
	type: 'fixedCollection',
	placeholder: 'Add Custom Fields',
	default: {},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'Use JSON',
					name: 'jsonInput',
					type: 'boolean',
					default: true,
				},
				{
					displayName: 'JSON',
					name: 'json',
					type: 'string',
					default: '',
					displayOptions: {
						show: {
							jsonInput: [true],
						},
					},
					description: 'Custom fields in JSON format',
				},
				{
					displayName: 'Custom Fields',
					name: 'customFields',
					type: 'fixedCollection',
					placeholder: 'Add Custom Fields',
					default: {},
					displayOptions: {
						show: {
							jsonInput: [false],
						},
					},
					options: [
						{
							displayName: 'Values',
							name: 'values',
							values: [
								{
									displayName: 'Fields',
									name: 'fields',
									type: 'fixedCollection',
									default: {},
									typeOptions: {
										multipleValues: true,
									},
									placeholder: 'Add Field',
									options: [
										{
											displayName: 'Values',
											name: 'values',
											values: [
												{
													// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
													displayName: 'Field',
													name: 'field',
													type: 'options',
													description:
														'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
													typeOptions: {
														loadOptionsMethod: 'listCustomField',
													},
													default: '',
												},
												{
													displayName: 'Value',
													name: 'value',
													type: 'string',
													default: '',
													description:
														'Custom Field value. Use an expression if the type is not a string. Could be a single value or an array of values.',
													hint: 'Use an expression to send multiple values as an array',
												},
											],
										},
									],
								},
							],
						},
					],
				},
			],
		},
	],
};

export const filtersCollection: INodeProperties = {
	displayName: 'Filters',
	name: 'filters',
	type: 'collection',
	default: {},
	placeholder: 'Add a Filter',
	options: [
		customFieldsCollection,
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
		},
		{
			displayName: 'End Date',
			name: 'endDate',
			type: 'dateTime',
			default: '',
			description: 'Resolution date',
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
			},
		},
		{
			displayName: 'Follow',
			name: 'follow',
			type: 'boolean',
			default: false,
			description: 'Whether the alert becomes active when updated default=true',
			displayOptions: {
				show: {
					'/resource': ['alert'],
				},
			},
		},
		{
			displayName: 'Flag',
			name: 'flag',
			type: 'boolean',
			default: false,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
			description: 'Flag of the case default=false',
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
			},
		},
		{
			displayName: 'Impact Status',
			name: 'impactStatus',
			type: 'options',
			default: '',
			options: [
				{
					name: 'No Impact',
					value: 'NoImpact',
				},
				{
					name: 'With Impact',
					value: 'WithImpact',
				},
				{
					name: 'Not Applicable',
					value: 'NotApplicable',
				},
			],
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
			},
		},
		{
			displayName: 'Owner',
			name: 'owner',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
			},
		},
		{
			displayName: 'Resolution Status',
			name: 'resolutionStatus',
			type: 'options',
			default: '',
			options: [
				{
					value: 'Duplicated',
					name: 'Duplicated',
				},
				{
					value: 'False Positive',
					name: 'FalsePositive',
				},
				{
					value: 'Indeterminate',
					name: 'Indeterminate',
				},
				{
					value: 'Other',
					name: 'Other',
				},
				{
					value: 'True Positive',
					name: 'TruePositive',
				},
			],
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
			},
		},
		severityOptions,
		{
			displayName: 'Start Date',
			name: 'startDate',
			type: 'dateTime',
			default: '',
			description: 'Date and time of the begin of the case default=now',
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
			},
		},
		{
			...caseStatusOptions,
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
			},
		},
		{
			displayName: 'Summary',
			name: 'summary',
			type: 'string',
			default: '',
			description: 'Summary of the case, to be provided when closing a case',
			displayOptions: {
				show: {
					'/resource': ['case'],
				},
			},
		},
		{
			displayName: 'Tags',
			name: 'tags',
			type: 'string',
			default: '',
			placeholder: 'tag,tag2,tag3...',
		},
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
		},
		tlpOptions,
	],
};

export const genericFiltersCollection: INodeProperties = {
	displayName: 'Filters',
	name: 'filters',
	type: 'fixedCollection',
	placeholder: 'Add Filter',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'Field',
					name: 'field',
					type: 'string',
					default: '',
					requiresDataPath: 'single',
					description: 'Dot notation is also supported, e.g. customFields.field1',
					displayOptions: {
						hide: {
							'/resource': ['alert', 'case', 'task'],
						},
					},
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
					displayName: 'Field',
					name: 'field',
					type: 'options',
					default: 'title',
					typeOptions: {
						loadOptionsMethod: 'loadAlertFields',
					},
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
					displayOptions: {
						show: {
							'/resource': ['alert'],
						},
					},
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
					displayName: 'Field',
					name: 'field',
					type: 'options',
					default: 'title',
					typeOptions: {
						loadOptionsMethod: 'loadCaseFields',
					},
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
					displayOptions: {
						show: {
							'/resource': ['case'],
						},
					},
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
					displayName: 'Field',
					name: 'field',
					type: 'options',
					default: 'title',
					typeOptions: {
						loadOptionsMethod: 'loadTaskFields',
					},
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
					displayOptions: {
						show: {
							'/resource': ['task'],
						},
					},
				},
				{
					displayName: 'Operator',
					name: 'operator',
					type: 'options',
					options: [
						{
							name: 'Between',
							value: '_between',
						},
						{
							name: 'Ends With',
							value: '_endsWith',
						},
						{
							name: 'Equal',
							value: '_eq',
						},
						{
							name: 'Greater Than',
							value: '_gt',
						},
						{
							name: 'Greater Than Or Equal',
							value: '_gte',
						},
						{
							name: 'In',
							value: '_in',
						},
						{
							name: 'Less Than',
							value: '_lt',
						},
						{
							name: 'Less Than Or Equal',
							value: '_lte',
						},
						{
							name: 'Match Word',
							value: '_match',
						},
						{
							name: 'Not Equal',
							value: '_ne',
						},
						{
							name: 'Starts With',
							value: '_startsWith',
						},
					],
					default: '_eq',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					displayOptions: {
						hide: {
							operator: ['_between', '_in'],
						},
					},
				},
				{
					displayName: 'Values',
					name: 'values',
					type: 'string',
					default: '',
					placeholder: 'e.g. value1,value2',
					displayOptions: {
						show: {
							operator: ['_in'],
						},
					},
				},
				{
					displayName: 'From',
					name: 'from',
					type: 'string',
					default: '',
					displayOptions: {
						show: {
							operator: ['_between'],
						},
					},
				},
				{
					displayName: 'To',
					name: 'to',
					type: 'string',
					default: '',
					displayOptions: {
						show: {
							operator: ['_between'],
						},
					},
				},
			],
		},
	],
};
