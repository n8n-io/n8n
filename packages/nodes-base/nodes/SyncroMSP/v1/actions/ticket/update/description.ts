import type { TicketProperties } from '../../Interfaces';

export const ticketUpdateDescription: TicketProperties = [
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
		default: '',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Asset ID',
				name: 'assetId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Assign to contact',
				name: 'contactId',
				type: 'string',
				default: '',
				description: 'The ID of the contact you want to assign the ticket to',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Due date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Issue type',
				name: 'issueType',
				type: 'options',
				options: [
					{
						name: 'Contract work',
						value: 'Contract Work',
					},
					{
						name: 'Network project',
						value: 'Network Project',
					},
					{
						name: 'Other',
						value: 'Other',
					},
					{
						name: 'Regular maintenance',
						value: 'Regular Maintenance',
					},
					{
						name: 'Remote support',
						value: 'Remote Support',
					},
				],
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Customer reply',
						value: 'Customer Reply',
					},
					{
						name: 'In progress',
						value: 'In Progress',
					},
					{
						name: 'New',
						value: 'New',
					},
					{
						name: 'Resolved',
						value: 'Resolved',
					},
					{
						name: 'Scheduled',
						value: 'Scheduled',
					},
					{
						name: 'Waiting for parts',
						value: 'Waiting for Parts',
					},
					{
						name: 'Waiting on customer',
						value: 'Waiting on Customer',
					},
				],
				default: 'New',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
		],
	},
];
