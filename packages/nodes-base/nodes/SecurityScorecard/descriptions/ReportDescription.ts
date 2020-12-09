import {
	INodeProperties,
} from 'n8n-workflow';

export const reportOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['reports'],
			},
		},
		options: [
			{ name: 'Download', value: 'download', description: 'Download a generated report' },
			{ name: 'Generate', value: 'generate', description: 'Generate a report' },
			{ name: 'Get All', value: 'getAll', description: 'Get list of recently generated reports' },
		],
		default: 'getAll',
	},
] as INodeProperties[];

export const reportFields = [
	{
		displayName: 'Report',
		name: 'report',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['reports'],
				operation: ['generate'],
			},
		},
		options: [
			{ name: 'Company Detailed', value: 'detailed', description: '' },
			{ name: 'Company Events', value: 'events-json', description: '' },
			{ name: 'Full Scorecard', value: 'full-scorecard-json', description: '' },
			{ name: 'Company Issues', value: 'issues', description: '' },
			{ name: 'Company Partnership', value: 'partnership', description: '' },
			{ name: 'Portfolio', value: 'portfolio', description: '' },
			{ name: 'Scorecard Footprint', value: 'scorecard-footprint', description: '' },
			{ name: 'Company Summary', value: 'summary', description: '' },
		],
		default: 'detailed',
	},
	{
		displayName: 'Scorecard Identifier',
		name: 'scorecardIdentifier',
		description: 'Primary identifier of a company or scorecard, i.e. domain',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['reports'],
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
				resource: ['reports'],
				operation: ['generate'],
				report: ['portfolio'],
			},
		},
		description: 'Portfolio ID',
	},
	{
		displayName: 'Branding',
		name: 'branding',
		type: 'options',
		required: false,
		displayOptions: {
			show: {
				resource: ['reports'],
				operation: [
					'generate',
				],
				report: [
					'detailed',
					'summary',
				],
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
		required: true,
		displayOptions: {
			show: {
				resource: [
					'reports',
				],
				operation: [
					'generate',
				],
				report: [
					'events-json',
				],
			},
		},
	},
	{
		displayName: 'Optional Fields',
		name: 'optional',
		type: 'collection',
		required: false,
		default: {},
		placeholder: 'Add Optional Field',
		displayOptions: {
			show: {
				resource: ['reports'],
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
					{ 'name': 'PDF', value: 'pdf' },
					{ 'name': 'CSV', value: 'csv '},
				],
				required: false,
			},
		],
	},
	{
		displayName: 'Optional Fields',
		name: 'optional',
		type: 'collection',
		required: false,
		default: {},
		placeholder: 'Add Optional Field',
		displayOptions: {
			show: {
				resource: ['reports'],
				operation: ['generate'],
				report: ['scorecard-footprint'],
			},
		},
		options: [
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				default: 'pdf',
				options: [
					{ 'name': 'PDF', value: 'pdf' },
					{ 'name': 'CSV', value: 'csv' },
				],
				required: false,
			},
			{
				displayName: 'IPs',
				name: 'ips',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				required: false,
			},
			{
				displayName: 'Subdomains',
				name: 'subdomains',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				required: false,
			},
			{
				displayName: 'Countries',
				name: 'countries',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				required: false,
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
				resource: ['reports'],
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
				resource: ['reports'],
				operation: ['download'],
			},
		},
		description: 'Name of the binary property to which to<br />write the data of the read file.',
	},
] as INodeProperties[];
