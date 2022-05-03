import { INodeProperties } from 'n8n-workflow';

export const operatorOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['operator'],
			},
		},
		options: [
			{
				name: 'Detect Gender',
				value: 'gender',
				description: 'Detect possible gender by providing a name.',
			},
			{
				name: 'Split Name',
				value: 'splitname',
				description: 'Split Name into first- and lastname.',
			},
			{
				name: 'Expand URL',
				value: 'urlexpander',
				description: 'Expand a given URL',
			},
			{
				name: 'Advanced Switch',
				value: 'advancedswitch',
				description:
					'Switches the input value with a JSON text of values or a URL to a remote JSON.',
			},
			{
				name: 'Scheduler',
				value: 'scheduler',
				description: 'Schedule a Cronjob or a Timer for a Webhook.',
			},
			{
				name: 'UTM',
				value: 'utm',
				description: 'Build url with utm parameters or parse urls utm parameters from url.',
			},
		],
		default: 'city',
	},
] as INodeProperties[];

export const operatorFields = [
	// operator: gender
	{
		displayName: 'Detect gender from firstname',
		name: 'firstname',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['gender'],
				resource: ['operator'],
			},
		},
		default: '',
	},
	// operator: splitname
	{
		displayName: 'Name to split',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['splitname'],
				resource: ['operator'],
			},
		},
		default: '',
	},
	// operator: urlexpander
	{
		displayName: 'Expand an url',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['urlexpander'],
				resource: ['operator'],
			},
		},
		default: '',
	},
	// operator: advancedswitch
	{
		displayName: 'External JSON?',
		name: 'external',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				operation: ['advancedswitch'],
				resource: ['operator'],
			},
		},
		default: false,
	},
	{
		displayName: 'Url',
		name: 'urlJson',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['advancedswitch'],
				resource: ['operator'],
				external: [true],
			},
		},
		default: '',
	},
	{
		displayName: 'Content',
		name: 'adsJson',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['advancedswitch'],
				resource: ['operator'],
				external: [false],
			},
		},
		description: 'Only accepts stringified JSON data. Validate your JSON and stringify it only if needed.',
	},
	{
		displayName: 'Keys',
		name: 'key',
		type: 'string',
		required: true,
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				operation: ['advancedswitch'],
				resource: ['operator'],
			},
		},
		default: '',
		description: 'For multiple keys add each key in a new line.',
	},
	// operator: scheduler
	{
		displayName: 'Webhook to send to',
		name: 'sendToWebhook',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['scheduler'],
				resource: ['operator'],
			},
		},
		default: '',
		description: 'The webhook url to where you want to send to data.',
	},
	{
		displayName: 'Stringified JSON data',
		name: 'data',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['scheduler'],
				resource: ['operator'],
			},
		},
		default: '',
	},
	{
		intervalType: 'Stringified JSON data',
		name: 'intervalType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['scheduler'],
				resource: ['operator'],
			},
		},
		options: [
			{
				name: 'One-time',
				value: 1,
			},
			{
				name: 'Multiple times',
				value: 2,
			},
			{
				name: 'Cronjob',
				value: 3,
			},
			{
				name: 'Timed Posthook',
				value: 4,
			},
		],
		default: 1,
	},
	{
		displayName: 'One-Time Execution',
		name: 'onetime',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				operation: ['scheduler'],
				resource: ['operator'],
				intervalType: [1],
			},
		},
		default: '',
		description: 'Post the specified data to the provided webhook one time.',
	},
	{
		displayName: 'Multiple Times',
		name: 'multipletimes',
		type: 'collection',
		required: true,
		displayOptions: {
			show: {
				operation: ['scheduler'],
				resource: ['operator'],
				intervalType: [2],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
		],
		default: {},
		description: 'Post the specified data to the provided webhook multiple time.',
	},
	{
		displayName: 'Cronjob',
		name: 'cronjob',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['scheduler'],
				resource: ['operator'],
				intervalType: [3],
			},
		},
		default: '',
		description: 'For more information on cronjobs, you can visit https://crontab-generator.com/.',
	},
	{
		displayName: 'Times Posthook',
		name: 'posthook',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['scheduler'],
				resource: ['operator'],
				intervalType: [4],
			},
		},
		default: '',
		description:
			'For more information on post hooks, take a look at https://docs.1saas.co/api-documentation/nocode-helper#request-example-to-setup-a-timed-post-hook',
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		displayOptions: {
			show: {
				operation: ['scheduler'],
				resource: ['operator'],
			},
		},
		default: '',
		description: 'Define a date for when the scheduler should be deactivated.',
	},
	// operator: utm
	{
		displayName: 'Build or parse UTM?',
		name: 'utmop',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['utm'],
				resource: ['operator'],
			},
		},
		options: [
			{
				name: 'Build a URL',
				value: 'build',
			},
			{
				name: 'Parse UTM from Url',
				value: 'parse',
			},
		],
		default: '',
	},
	{
		displayName: 'Url',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['utm'],
				resource: ['operator'],
			},
		},
		default: '',
	},
	{
		displayName: 'UTM Source',
		name: 'utm_source',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['utm'],
				resource: ['operator'],
				utmop: ['build'],
			},
		},
		description: '',
	},
	{
		displayName: 'UTM Medium',
		name: 'utm_medium',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['utm'],
				resource: ['operator'],
				utmop: ['build'],
			},
		},
		description: '',
	},
	{
		displayName: 'UTM Campaign',
		name: 'utm_campaign',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['utm'],
				resource: ['operator'],
				utmop: ['build'],
			},
		},
		description: '',
	},
	{
		displayName: 'UTM Content',
		name: 'utm_content',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['utm'],
				resource: ['operator'],
				utmop: ['build'],
			},
		},
		description: '',
	},
] as INodeProperties[];
