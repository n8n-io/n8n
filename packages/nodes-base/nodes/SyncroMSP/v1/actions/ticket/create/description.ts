import {
	TicketProperties,
} from '../../Interfaces';

export const ticketCreateDescription: TicketProperties = [
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
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
			// {
			// 	displayName: 'Due Date',
			// 	name: 'dueDate',
			// 	type: 'dateTime',
			// 	default: '',
			// },
			{
				displayName: 'Issue Type',
				name: 'issueType',
				type: 'options',
				options: [
					{
						name: 'Remote Support',
						value: 'Remote Support',
					},
					{
						name: 'Contract Work',
						value: 'Contract Work',
					},
					{
						name: 'Network Project',
						value: 'Network Project',
					},
					{
						name: 'Regular Maintenance',
						value: 'Regular Maintenance',
					},
					{
						name: 'Other',
						value: 'Other',
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
				description: 'Filter tickets by status. It cannot be used along with the parameter Search Query',
			},
		],
	},
];
