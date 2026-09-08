import type { INodeProperties } from 'n8n-workflow';

import { LANGUAGES } from '../constants';

export const requesterOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['requester'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a requester',
				action: 'Create a requester',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a requester',
				action: 'Delete a requester',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a requester',
				action: 'Get a requester',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many requesters',
				action: 'Get many requesters',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a requester',
				action: 'Update a requester',
			},
		],
		default: 'create',
	},
];

export const requesterFields: INodeProperties[] = [
	// ----------------------------------------
	//            requester: create
	// ----------------------------------------
	{
		displayName: 'First name',
		name: 'firstName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['requester'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Primary email',
		name: 'primaryEmail',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['requester'],
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
				resource: ['requester'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Background information',
				name: 'background_information',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department names or IDs',
				name: 'department_ids',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of the departments associated with the requester. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Job title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Location name or ID',
				name: 'location_id',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getLocations',
				},
			},
			{
				displayName: 'Mobile phone',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Secondary emails',
				name: 'secondary_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated secondary emails associated with the requester',
			},
			{
				displayName: 'Time format',
				name: 'time_format',
				type: 'options',
				default: '12h',
				options: [
					{
						name: '12-hour format',
						value: '12h',
					},
					{
						name: '24-hour format',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Work phone',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//            requester: delete
	// ----------------------------------------
	{
		displayName: 'Requester ID',
		name: 'requesterId',
		description: 'ID of the requester to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['requester'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//              requester: get
	// ----------------------------------------
	{
		displayName: 'Requester ID',
		name: 'requesterId',
		description: 'ID of the requester to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['requester'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//            requester: getAll
	// ----------------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['requester'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['requester'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['requester'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Department name or ID',
				name: 'department_id',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'First name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Location name or ID',
				name: 'location_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getLocations',
				},
			},
			{
				displayName: 'Mobile phone number',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Primary email',
				name: 'primary_email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Work phone number',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//            requester: update
	// ----------------------------------------
	{
		displayName: 'Requester ID',
		name: 'requesterId',
		description: 'ID of the requester to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['requester'],
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
				resource: ['requester'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Background information',
				name: 'background_information',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department names or IDs',
				name: 'department_ids',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of the departments associated with the requester. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'First name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Location name or ID',
				name: 'location_id',
				type: 'options',
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLocations',
				},
			},
			{
				displayName: 'Mobile phone',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Primary email',
				name: 'primary_email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Secondary emails',
				name: 'secondary_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated secondary emails associated with the requester',
			},
			{
				displayName: 'Time format',
				name: 'time_format',
				type: 'options',
				default: '12h',
				options: [
					{
						name: '12-hour format',
						value: '12h',
					},
					{
						name: '24-hour format',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Work phone',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},
];
