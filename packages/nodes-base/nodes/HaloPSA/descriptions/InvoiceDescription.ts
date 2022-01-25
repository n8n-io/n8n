import { INodeProperties } from 'n8n-workflow';

export const invoiceDescription: INodeProperties[] = [
	{
		displayName: 'Client',
		name: 'clientsList',
		type: 'options',
		default: '',
		noDataExpression: true,
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getHaloPSAClients',
		},
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['invoice'],
			},
		},
	},
	{
		displayName: 'Date Invoiced',
		name: 'invoiceDate',
		type: 'dateTime',
		default: '',
		description: 'The date and time of invoice',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['invoice'],
			},
		},
	},
	// Invoice Items =============================================================
	{
		displayName: 'Add Item',
		name: 'itemsList',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Add item to invoice',
		placeholder: 'Add item',
		displayOptions: {
			show: {
				operation: ['update', 'create'],
				resource: ['invoice'],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'items',
				values: [
					{
						displayName: 'Item',
						name: 'item_id',
						type: 'options',
						default: '',
						noDataExpression: true,
						required: true,
						typeOptions: {
							loadOptionsMethod: 'getHaloPSAItems',
						},
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						typeOptions: {
							minValue: 0,
							numberStepSize: 1,
						},
						default: 0,
						required: true,
					},
				],
			},
		],
	},
	// Additional fields =============================================================
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update', 'create'],
				resource: ['invoice'],
			},
		},
		options: [
			{
				displayName: 'Invoice Number',
				name: 'thirdpartyinvoicenumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Date Posted',
				name: 'dateposted',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'duedate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Date Sent',
				name: 'datesent',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Date Paid',
				name: 'datepaid',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Note',
				name: 'notes_1',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Internal Note',
				name: 'internal_note',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
		],
	},
];
