import { INodeProperties } from 'n8n-workflow';
import * as data from './data/ticketFields.json';
import { fieldsToOptions } from '../GenericFunctions';

export const ticketDescription: INodeProperties[] = [
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		default: '',
		description: 'Enter ticket\'s summary',
		placeholder: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['tickets'],
			},
		},
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'string',
		default: '',
		description: 'Enter tickets\'s details',
		placeholder: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['tickets'],
			},
		},
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
				resource: ['tickets'],
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
						default: 'user_name',
						required: true,
						description: 'Ticket field name',
						options: fieldsToOptions(data),
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						required: true,
					},
				],
			},
		],
	},
];
