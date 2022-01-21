import { INodeProperties } from 'n8n-workflow';
import * as data from './data/siteFields.json';
import { fieldsToOptions } from '../GenericFunctions';

export const siteDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'siteName',
		type: 'string',
		default: '',
		description: 'Enter site name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['site'],
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
				resource: ['site'],
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
						default: 'name',
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
