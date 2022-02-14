import {
	INodeProperties,
} from 'n8n-workflow';

export const sendEmailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'sendEmail',
				],
			},
		},
		options: [
			{
				name: 'Send To Contact',
				value: 'contact',
				description: 'Send email to contact',
			},
			{
				name: 'Send To Segment',
				value: 'segment',
				description: 'Send email to segment',
			},
		],
		default: 'contact',
		description: 'Send email to contact or segment',
	},
];

export const sendEmailFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                               sendEmail:send                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Campaign Email ID',
		name: 'campaignEmailId',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'sendEmail',
				],
				operation: [
					'contact',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getCampaignEmails',
		},
		default: '',
	},
	{
		displayName: 'Segment Email ID',
		name: 'segmentEmailId',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'sendEmail',
				],
				operation: [
					'segment',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSegmentEmails',
		},
		default: '',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'sendEmail',
				],
				operation: [
					'contact',
				],
			},
		},
		default: '',
	},
];
