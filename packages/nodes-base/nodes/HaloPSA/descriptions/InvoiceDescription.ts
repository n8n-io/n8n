import { INodeProperties } from 'n8n-workflow';
import * as data from './data/invoiceFields.json';
import { fieldsToOptions } from '../GenericFunctions';

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
		displayName: 'Add Optional Field',
		name: 'fieldsToCreateOrUpdate',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Field',
		},
		default: {},
		description: 'Add field and value',
		placeholder: 'Add Optional Field',
		displayOptions: {
			show: {
				operation: ['update', 'create'],
				resource: ['invoice'],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'fields',
				values: [
					{
						displayName: 'Field Name',
						name: 'fieldName',
						type: 'options',
						noDataExpression: true,
						// nodelinter-ignore-next-line
						default: '',
						required: true,
						options: [
							{
								name: 'Invoice Number',
								value: 'thirdpartyinvoicenumber',
							},
							{
								name: 'Currency',
								value: 'currency',
							},
							{
								name: 'Reference',
								value: 'reference',
							},
							{
								name: 'Date Posted',
								value: 'dateposted',
							},
							{
								name: 'Due Date',
								value: 'duedate',
							},
							{
								name: 'Date Sent',
								value: 'datesent',
							},
							{
								name: 'Date Paid',
								value: 'datepaid',
							},
							{
								name: 'Note',
								value: 'notes_1',
							},
							{
								name: 'Internal Note',
								value: 'internal_note',
							},
						],
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						required: true,
						displayOptions: {
							show: {
								fieldName: [
									'thirdpartyinvoicenumber',
									'currency',
									'reference',
									'notes_1',
									'internal_note',
								],
							},
						},
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'dateTime',
						default: '',
						required: true,
						displayOptions: {
							show: {
								fieldName: ['dateposted', 'duedate', 'datesent', 'datepaid'],
							},
						},
					},
				],
			},
		],
	},
];
