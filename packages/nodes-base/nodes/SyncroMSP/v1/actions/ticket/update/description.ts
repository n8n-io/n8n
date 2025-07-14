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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
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
				displayName: 'Assign to Contact',
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
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Issue Type',
				name: 'issueType',
				type: 'options',
				options: [
					{
						name: 'Contract Work',
						value: 'Contract Work',
					},
					{
						name: 'Network Project',
						value: 'Network Project',
					},
					{
						name: 'Other',
						value: 'Other',
					},
					{
						name: 'Regular Maintenance',
						value: 'Regular Maintenance',
					},
					{
						name: 'Remote Support',
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
						name: 'Customer Reply',
						value: 'Customer Reply',
					},
					{
						name: 'In Progress',
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
						name: 'Waiting for Parts',
						value: 'Waiting for Parts',
					},
					{
						name: 'Waiting on Customer',
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
