import {
	INodeProperties,
} from 'n8n-workflow';
import { LANGUAGES } from '../constants';

export const requesterOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'requester',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a requester',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a requester',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a requester',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all requesters',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a requester',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const requesterFields = [
	// ----------------------------------------
	//            requester: create
	// ----------------------------------------
	{
		displayName: 'First Name',
		name: 'first_name',
		description: 'First name of the requester',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'requester',
				],
				operation: [
					'create',
				],
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
				resource: [
					'requester',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address of the requester',
			},
			{
				displayName: 'Background Information',
				name: 'background_information',
				type: 'string',
				default: '',
				description: 'Background information of the requester',
			},
			{
				displayName: 'Department IDs',
				name: 'department_ids',
				type: 'options',
				default: '',
				description: 'Comma-separated IDs of the departments associated with the requester',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
				description: 'Job title of the requester',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				description: 'Language used by the requester',
				options: Object.entries(LANGUAGES).forEach((key, value) => ({ name: value, id: key })),
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'Last name of the requester',
			},
			{
				displayName: 'Location ID',
				name: 'location_id',
				type: 'options',
				default: '',
				description: 'ID of the location associated with the requester',
				typeOptions: {
					loadOptionsMethod: [
						'getLocations',
					],
				},
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
				description: 'Mobile phone number of the requester',
			},
			{
				displayName: 'Primary Email',
				name: 'primary_email',
				type: 'string',
				default: '',
				description: 'Primary email address of the requester',
			},
			{
				displayName: 'Secondary Emails',
				name: 'secondary_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated secondary emails associated with the requester',
			},
			{
				displayName: 'Time Format',
				name: 'time_format',
				type: 'options',
				default: '12h',
				options: [
					{
						name: '12-Hour Format',
						value: '12h',
					},
					{
						name: '24-Hour Format',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Work Phone',
				name: 'work_phone_number',
				type: 'string',
				default: '',
				description: 'Work phone number of the requester',
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
				resource: [
					'requester',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'requester',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//            requester: getAll
	// ----------------------------------------
	{
		displayName: 'Filters',
		name: 'Filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'requester',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Department ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description: 'ID of the department of the requester to filter by',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				description: 'First name of the requester to filter by',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
				description: 'Title of the requester to filter by',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				description: 'Language to filter by',
				options: Object.entries(LANGUAGES).forEach((key, value) => ({ name: value, id: key })),
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'Last name of the requester to filter by',
			},
			{
				displayName: 'Location ID',
				name: 'location_id',
				type: 'options',
				default: '',
				description: 'ID of the location to filter by',
				typeOptions: {
					loadOptionsMethod: [
						'getLocations',
					],
				},
			},
			{
				displayName: 'Mobile Phone Number',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
				description: 'Mobile phone of the requester to filter by',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Full name of the requester to filter by',
			},
			{
				displayName: 'Primary Email',
				name: 'primary_email',
				type: 'string',
				default: '',
				description: 'Email address of the requester to filter by',
			},
			{
				displayName: 'Work Phone Number',
				name: 'work_phone_number',
				type: 'string',
				default: '',
				description: 'Work phone of the requester to filter by',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'requester',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'requester',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
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
				resource: [
					'requester',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'Update Fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'requester',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				description: 'Address of the requester',
			},
			{
				displayName: 'Background Information',
				name: 'background_information',
				type: 'string',
				default: '',
				description: 'Background information of the requester',
			},
			{
				displayName: 'Department IDs',
				name: 'department_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated IDs of the departments associated with the requester',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				description: 'First name of the requester',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
				description: 'Job title of the requester',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Language used by the requester',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'Last name of the requester',
			},
			{
				displayName: 'Location ID',
				name: 'location_id',
				type: 'string',
				default: '',
				description: 'ID of the location associated with the requester',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
				description: 'Mobile phone number of the requester',
			},
			{
				displayName: 'Primary Email',
				name: 'primary_email',
				type: 'string',
				default: '',
				description: 'Primary email address of the requester',
			},
			{
				displayName: 'Reporting Manager ID',
				name: 'reporting_manager_id',
				type: 'string',
				default: '',
				description: 'User ID of the requester’s reporting manager',
			},
			{
				displayName: 'Secondary Emails',
				name: 'secondary_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated secondary emails associated with the requester',
			},
			{
				displayName: 'Time Format',
				name: 'time_format',
				type: 'options',
				default: '12h',
				options: [
					{
						name: '12-Hour Format',
						value: '12h',
					},
					{
						name: '24-Hour Format',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Work Phone',
				name: 'work_phone_number',
				type: 'string',
				default: '',
				description: 'Work phone number of the requester',
			},
		],
	},
] as INodeProperties[];
