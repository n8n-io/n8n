import type { INodeProperties } from 'n8n-workflow';

export const searchProperties: INodeProperties[] = [
	{
		displayName: 'Use JSON to Specify Fields',
		name: 'useJson',
		type: 'boolean',
		default: false,
		description: 'Whether to use JSON to specify the fields for the search request',
	},
	{
		displayName: 'JSON',
		name: 'jsonOutput',
		type: 'json',
		description:
			'Get more info at {YOUR_BASE_URL_SPECIFIED_IN_CREDENTIALS}/api/openapi#operation/restSearchAttributes',
		typeOptions: {
			rows: 5,
		},
		default: '{\n  "value": "search value",\n  "type": "text"\n}\n',
		validateType: 'object',
		displayOptions: {
			show: {
				useJson: [true],
			},
		},
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		placeholder: 'e.g. 127.0.0.1',
		default: '',
		displayOptions: {
			show: {
				useJson: [false],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				useJson: [false],
			},
		},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				placeholder: 'e.g. Internal reference',
				default: '',
			},
			{
				displayName: 'Deleted',
				name: 'deleted',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Search All',
				name: 'searchall',
				type: 'string',
				description:
					'Search by matching any tag names, event descriptions, attribute values or attribute comments',
				default: '',
				displayOptions: {
					hide: {
						'/resource': ['attribute'],
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				placeholder: 'e.g. tag1,tag2',
				hint: 'Comma-separated list of tags',
				default: '',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				placeholder: 'e.g. text',
				default: '',
			},
			{
				displayName: 'Published',
				name: 'published',
				type: 'boolean',
				default: false,
			},
		],
	},
];
