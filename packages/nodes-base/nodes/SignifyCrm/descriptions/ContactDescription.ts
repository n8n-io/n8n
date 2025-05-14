import type { INodeProperties } from 'n8n-workflow';

import {
	makeGetAllFields,
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
				name: 'Get Many',
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
		displayName: 'Salutation',
		name: 'salutation',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
        options: [
            {
                name: '',
                value: '',
            },
            {
                name: "K.",
                value: "K.",
            },
            {
                name: "Mr.",
                value: "Mr.",
            },
            {
                name: "Ms.",
                value: "Ms.",
            },
            {
                name: "Mrs.",
                value: "Mrs.",
            },
            {
                name: "Dr.",
                value: "Dr.",
            },
            {
                name: "Prof.",
                value: "Prof.",
            },
            {
                name: "Asst.",
                value: "Asst.",
            },
            {
                name: "คุณ",
                value: "คุณ",
            },
            {
                name: "นาย",
                value: "นาย",
            },
            {
                name: "นางสาว",
                value: "นางสาว",
            },
            {
                name: "นาง",
                value: "นาง",
            },
            {
                name: "ดร.",
                value: "ดร.",
            },
            {
                name: "ศจ.",
                value: "ศจ.",
            },
            {
                name: "รศ.",
                value: "รศ.",
            }
        ]
	},
	{
		displayName: 'First Name',
		name: 'first_name',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [
            {
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (Primary)',
				name: 'email1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Office Phone',
				name: 'phone_work',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Mobile',
				name: 'phone_mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Birthdate',
				name: 'birthdate',
				type: 'dateTime',
				default: '',
			},
            {
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Assigned To',
				name: 'assigned_user_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUserList',
				},
				default: [],
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
		displayName: 'Salutation',
		name: 'salutation',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
        options: [
            {
                name: '',
                value: '',
            },
            {
                name: "K.",
                value: "K.",
            },
            {
                name: "Mr.",
                value: "Mr.",
            },
            {
                name: "Ms.",
                value: "Ms.",
            },
            {
                name: "Mrs.",
                value: "Mrs.",
            },
            {
                name: "Dr.",
                value: "Dr.",
            },
            {
                name: "Prof.",
                value: "Prof.",
            },
            {
                name: "Asst.",
                value: "Asst.",
            },
            {
                name: "คุณ",
                value: "คุณ",
            },
            {
                name: "นาย",
                value: "นาย",
            },
            {
                name: "นางสาว",
                value: "นางสาว",
            },
            {
                name: "นาง",
                value: "นาง",
            },
            {
                name: "ดร.",
                value: "ดร.",
            },
            {
                name: "ศจ.",
                value: "ศจ.",
            },
            {
                name: "รศ.",
                value: "รศ.",
            }
        ]
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [
            {
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (Primary)',
				name: 'email1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Office Phone',
				name: 'phone_work',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Mobile Number',
				name: 'phone_mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Birthdate',
				name: 'birthdate',
				type: 'dateTime',
				default: '',
			},
            {
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Assigned To',
				name: 'assigned_user_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUserList',
				},
				default: [],
			},
		],
	},
];
