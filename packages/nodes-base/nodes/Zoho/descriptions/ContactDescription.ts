import type { INodeProperties } from 'n8n-workflow';

import {
	currencies,
	mailingAddress,
	makeCustomFieldsFixedCollection,
	makeGetAllFields,
	otherAddress,
} from './SharedFields';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
				action: 'Create a contact',
			},
			{
				name: 'Create or update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
	// ----------------------------------------
	//             contact: create
	// ----------------------------------------
	{
		displayName: 'Last name',
		name: 'lastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assistant',
				name: 'Assistant',
				type: 'string',
				default: '',
				description: 'Name of the contact’s assistant',
			},
			makeCustomFieldsFixedCollection('contact'),
			{
				displayName: 'Date of birth',
				name: 'Date_of_Birth',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'Department',
				type: 'string',
				default: '',
				description: 'Company department to which the contact belongs',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (primary)',
				name: 'Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (secondary)',
				name: 'Secondary_Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax',
				name: 'Fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First name',
				name: 'First_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Full name',
				name: 'Full_Name',
				type: 'string',
				default: '',
			},
			mailingAddress,
			{
				displayName: 'Mobile',
				name: 'Mobile',
				type: 'string',
				default: '',
			},
			otherAddress,
			{
				displayName: 'Phone',
				name: 'Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone (assistant)',
				name: 'Asst_Phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact’s assistant',
			},
			{
				displayName: 'Phone (home)',
				name: 'Home_Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone (other)',
				name: 'Other_Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'Salutation',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Skype ID',
				name: 'Skype_ID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'Title',
				type: 'string',
				default: '',
				description: 'Position of the contact at their company',
			},
			{
				displayName: 'Twitter',
				name: 'Twitter',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//           contact: upsert
	// ----------------------------------------
	{
		displayName: 'Last name',
		name: 'lastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				displayName: 'Assistant',
				name: 'Assistant',
				type: 'string',
				default: '',
				description: 'Name of the contact’s assistant',
			},
			makeCustomFieldsFixedCollection('contact'),
			{
				displayName: 'Date of birth',
				name: 'Date_of_Birth',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'Department',
				type: 'string',
				default: '',
				description: 'Company department to which the contact belongs',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (primary)',
				name: 'Email',
				type: 'string',
				default: '',
				description:
					'Email of the contact. If a record with this email exists it will be updated, otherwise a new one will be created.',
			},
			{
				displayName: 'Email (secondary)',
				name: 'Secondary_Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax',
				name: 'Fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First name',
				name: 'First_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Full name',
				name: 'Full_Name',
				type: 'string',
				default: '',
			},
			mailingAddress,
			{
				displayName: 'Mobile',
				name: 'Mobile',
				type: 'string',
				default: '',
			},
			otherAddress,
			{
				displayName: 'Phone',
				name: 'Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone (assistant)',
				name: 'Asst_Phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact’s assistant',
			},
			{
				displayName: 'Phone (home)',
				name: 'Home_Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone (other)',
				name: 'Other_Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'Salutation',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Skype ID',
				name: 'Skype_ID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'Title',
				type: 'string',
				default: '',
				description: 'Position of the contact at their company',
			},
			{
				displayName: 'Twitter',
				name: 'Twitter',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//             contact: delete
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               contact: get
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             contact: getAll
	// ----------------------------------------
	...makeGetAllFields('contact'),

	// ----------------------------------------
	//             contact: update
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Assistant',
				name: 'Assistant',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Assistant’s phone',
				name: 'Asst_Phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact’s assistant',
			},
			{
				displayName: 'Currency',
				name: 'Currency',
				type: 'options',
				default: 'USD',
				description: 'Symbol of the currency in which revenue is generated',
				options: currencies,
			},
			makeCustomFieldsFixedCollection('contact'),
			{
				displayName: 'Date of birth',
				name: 'Date_of_Birth',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'Department',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (primary)',
				name: 'Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (secondary)',
				name: 'Secondary_Email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax',
				name: 'Fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First name',
				name: 'First_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Full name',
				name: 'Full_Name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Home phone',
				name: 'Home_Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last name',
				name: 'Last_Name',
				type: 'string',
				default: '',
			},
			mailingAddress,
			{
				displayName: 'Mobile',
				name: 'Mobile',
				type: 'string',
				default: '',
			},
			otherAddress,
			{
				displayName: 'Other phone',
				name: 'Other_Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'Salutation',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Skype ID',
				name: 'Skype_ID',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'Title',
				type: 'string',
				default: '',
				description: 'Position of the contact at their company',
			},
			{
				displayName: 'Twitter',
				name: 'Twitter',
				type: 'string',
				default: '',
			},
		],
	},
];
