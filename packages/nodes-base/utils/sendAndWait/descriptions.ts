import type { INodeProperties, IWebhookDescription } from 'n8n-workflow';

export const sendAndWaitWebhooksDescription: IWebhookDescription[] = [
	{
		name: 'default',
		httpMethod: 'GET',
		responseMode: 'onReceived',
		responseData: '',
		path: '={{ $nodeId }}',
		restartWebhook: true,
		isFullPath: true,
	},
	{
		name: 'default',
		httpMethod: 'POST',
		responseMode: 'onReceived',
		responseData: '',
		path: '={{ $nodeId }}',
		restartWebhook: true,
		isFullPath: true,
	},
];

/**
 * Opt-in per node: pass this via `getSendAndWaitProperties`'s
 * `additionalProperties` to let users require a confirmation step on the
 * response page. Top-level (not in the `options` collection) so the frontend
 * can gate its visibility by parameter name. Read by `sendAndWaitWebhook`.
 */
export const confirmationPageOption: INodeProperties = {
	displayName: 'Show Confirmation Page',
	name: 'confirmationPage',
	type: 'boolean',
	default: false,
	description:
		'Whether the response link opens a page where the responder confirms their choice. If disabled, the response is recorded as soon as the link is opened.',
	displayOptions: {
		show: {
			responseType: ['approval'],
		},
	},
};

export const limitWaitTimeProperties: INodeProperties[] = [
	{
		displayName: 'Limit Type',
		name: 'limitType',
		type: 'options',
		default: 'afterTimeInterval',
		description:
			'Sets the condition for the execution to resume. Can be a specified date or after some time.',
		options: [
			{
				name: 'After Time Interval',
				description: 'Waits for a certain amount of time',
				value: 'afterTimeInterval',
			},
			{
				name: 'At Specified Time',
				description: 'Waits until the set date and time to continue',
				value: 'atSpecifiedTime',
			},
		],
	},
	{
		displayName: 'Amount',
		name: 'resumeAmount',
		type: 'number',
		displayOptions: {
			show: {
				limitType: ['afterTimeInterval'],
			},
		},
		typeOptions: {
			minValue: 0,
			numberPrecision: 2,
		},
		default: 1,
		description: 'The time to wait',
	},
	{
		displayName: 'Unit',
		name: 'resumeUnit',
		type: 'options',
		displayOptions: {
			show: {
				limitType: ['afterTimeInterval'],
			},
		},
		options: [
			{
				name: 'Minutes',
				value: 'minutes',
			},
			{
				name: 'Hours',
				value: 'hours',
			},
			{
				name: 'Days',
				value: 'days',
			},
		],
		default: 'hours',
		description: 'Unit of the interval value',
	},
	{
		displayName: 'Max Date and Time',
		name: 'maxDateAndTime',
		type: 'dateTime',
		displayOptions: {
			show: {
				limitType: ['atSpecifiedTime'],
			},
		},
		default: '',
		description: 'Continue execution after the specified date and time',
	},
];

export const limitWaitTimeOption: INodeProperties = {
	displayName: 'Limit Wait Time',
	name: 'limitWaitTime',
	type: 'fixedCollection',
	description:
		'Whether to limit the time this node should wait for a user response before execution resumes',
	default: { values: { limitType: 'afterTimeInterval', resumeAmount: 45, resumeUnit: 'minutes' } },
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: limitWaitTimeProperties,
		},
	],
};
