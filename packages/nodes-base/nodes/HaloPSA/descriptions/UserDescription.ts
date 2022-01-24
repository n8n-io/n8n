import { INodeProperties } from 'n8n-workflow';
import * as data from './data/userFields.json';
import { fieldsToOptions } from '../GenericFunctions';

export const userDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'userName',
		type: 'string',
		default: '',
		description: 'Enter user name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['users'],
			},
		},
	},
	{
		displayName: 'Website',
		name: 'sitesList',
		type: 'options',
		default: '',
		noDataExpression: true,
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getHaloPSASites',
		},
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['users'],
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
				resource: ['users'],
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
								name: 'Surname',
								value: 'surname',
							},
							{
								name: 'Password',
								value: 'password',
								description:
									'Your new password must be at least 8 characters long and contain at least one letter, one number or symbol, one upper case character and one lower case character.',
							},
							{
								name: 'Email Address',
								value: 'emailaddress',
							},
							{
								name: 'Network Login',
								value: 'login',
							},
							{
								name: 'User is Active',
								value: 'inactive',
							},
							{
								name: 'Site Telephone Number',
								value: 'sitephonenumber',
							},
							{
								name: 'Notes',
								value: 'notes',
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
									'notes',
									'sitephonenumber',
									'login',
									'emailaddress',
									'password',
									'surname',
								],
							},
						},
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'boolean',
						default: false,
						required: true,
						displayOptions: {
							show: {
								fieldName: ['inactive'],
							},
						},
					},
				],
			},
		],
	},
];
