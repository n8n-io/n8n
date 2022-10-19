import { INodeProperties } from 'n8n-workflow';

export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['report'],
			},
		},
		options: [
			{
				name: 'Download',
				value: 'download',
				description: 'Download a generated report',
				action: 'Download a report',
			},
			{
				name: 'Generate',
				value: 'generate',
				description: 'Generate a report',
				action: 'Generate a report',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get list of recently generated report',
				action: 'Get many reports',
			},
		],
		default: 'getAll',
	},
];

export const reportFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Report',
		name: 'report',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['generate'],
			},
		},
		options: [
			{
				name: 'Company Detailed',
				value: 'detailed',
			},
			{
				name: 'Company Events',
				value: 'events-json',
			},
			{
				name: 'Company Issues',
				value: 'issues',
			},
			{
				name: 'Company Partnership',
				value: 'partnership',
			},
			{
				name: 'Company Summary',
				value: 'summary',
			},
			{
				name: 'Full Scorecard',
				value: 'full-scorecard-json',
			},
			{
				name: 'Portfolio',
				value: 'portfolio',
			},
			{
				name: 'Scorecard Footprint',
				value: 'scorecard-footprint',
			},
		],
		default: 'detailed',
	},
	{
		displayName: 'Scorecard Identifier',
		name: 'scorecardIdentifier',
		description: 'Primary identifier of a company or scorecard, i.e. domain.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['generate'],
				report: [
					'detailed',
					'events-json',
					'full-scorecard-json',
					'issues',
					'partnership',
					'scorecard-footprint',
					'summary',
				],
			},
		},
	},
	{
		displayName: 'Portfolio ID',
		name: 'portfolioId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['generate'],
				report: ['portfolio'],
			},
		},
	},
	{
		displayName: 'Branding',
		name: 'branding',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['generate'],
				report: ['detailed', 'summary'],
			},
		},
		options: [
			{
				name: 'SecurityScorecard',
				value: 'securityscorecard',
			},
			{
				name: 'Company and SecurityScorecard',
				value: 'company_and_securityscorecard',
			},
			{
				name: 'Company',
				value: 'company',
			},
		],
		default: 'securityscorecard',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['generate'],
				report: ['events-json'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['generate'],
				report: ['issues', 'portfolio'],
			},
		},
		options: [
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'pdf',
				options: [
					{
						name: 'CSV',
						value: 'csv',
					},
					{
						name: 'PDF',
						value: 'pdf',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['generate'],
				report: ['scorecard-footprint'],
			},
		},
		options: [
			{
				displayName: 'Countries',
				name: 'countries',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'pdf',
				options: [
					{
						name: 'CSV',
						value: 'csv',
					},
					{
						name: 'PDF',
						value: 'pdf',
					},
				],
			},
			{
				displayName: 'IPs',
				name: 'ips',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
			},
			{
				displayName: 'Subdomains',
				name: 'subdomains',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
			},
		],
	},
	{
		displayName: 'Report URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		description: 'URL to a generated report',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['download'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['download'],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file',
	},
];
