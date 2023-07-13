import type { INodeProperties } from 'n8n-workflow';

const field: INodeProperties[] = [
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
		default: '',
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
		default: '',
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
		default: '',
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
];

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
				...field,
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

export const sortCollection: INodeProperties = {
	displayName: 'Sort',
	name: 'sort',
	type: 'fixedCollection',
	placeholder: 'Add Sort Rule',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	options: [
		{
			displayName: 'Fields',
			name: 'fields',
			values: [
				...field,
				{
					displayName: 'Direction',
					name: 'direction',
					type: 'options',
					options: [
						{
							name: 'Ascending',
							value: 'asc',
						},
						{
							name: 'Descending',
							value: 'desc',
						},
					],
					default: 'asc',
				},
			],
		},
	],
};
