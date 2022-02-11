import {
	INodeProperties,
} from 'n8n-workflow';

export const sendEmailOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'sendEmail',
				],
			},
		},
		options: [
			{
				name: 'Send to Contact',
				value: 'contact',
				description: 'Send email to contact',
			},
			{
				name: 'Send to Segment',
				value: 'segment',
				description: 'Send email to segment',
			},
		],
		default: 'contact',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const sendEmailFields = [

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
		description: 'Campaign Email ID',
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
		description: 'Segment Email ID',
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
		description: 'Contact ID',
	},
] as INodeProperties[];