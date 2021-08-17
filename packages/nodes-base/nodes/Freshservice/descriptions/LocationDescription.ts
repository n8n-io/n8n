import {
	INodeProperties,
} from 'n8n-workflow';

export const locationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'location',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a location',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a location',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a location',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all locations',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a location',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const locationFields = [
	// ----------------------------------------
	//             location: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the location',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'location',
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
					'location',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Line1',
				name: 'line1',
				type: 'string',
				default: '',
				description: 'Address line 1',
			},
			{
				displayName: 'Line2',
				name: 'line2',
				type: 'string',
				default: '',
				description: 'Address line 2',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'Name of the city',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Name of the country',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'Name of the state',
			},
			{
				displayName: 'Zipcode',
				name: 'zipcode',
				type: 'string',
				default: '',
				description: 'Zip code of the location',
			},
		],
	},

	// ----------------------------------------
	//             location: delete
	// ----------------------------------------
	{
		displayName: 'Location ID',
		name: 'locationId',
		description: 'ID of the location to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'location',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//              location: get
	// ----------------------------------------
	{
		displayName: 'Location ID',
		name: 'locationId',
		description: 'ID of the location to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'location',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             location: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'location',
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
					'location',
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
	//             location: update
	// ----------------------------------------
	{
		displayName: 'Location ID',
		name: 'locationId',
		description: 'ID of the location to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'location',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'location',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the location',
			},
			{
				displayName: 'Line1',
				name: 'line1',
				type: 'string',
				default: '',
				description: 'Address line 1',
			},
			{
				displayName: 'Line2',
				name: 'line2',
				type: 'string',
				default: '',
				description: 'Address line 2',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'Name of the city',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Name of the country',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'Name of the state',
			},
			{
				displayName: 'Zipcode',
				name: 'zipcode',
				type: 'string',
				default: '',
				description: 'Zip code of the location',
			},
		],
	},
] as INodeProperties[];
