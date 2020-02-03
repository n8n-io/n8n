import { INodeProperties } from "n8n-workflow";

const resource = ['contacts'];

export const contactOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource,
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all contacts',
			},
			{
				name: 'Create',
				value: 'create',
				description: `Create a contact`,
			},
			{
				name: 'Update',
				value: 'update',
				description: `Update a contact`,
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Delete a contact`,
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},

] as INodeProperties[];

export const contactFields = [

	/* -------------------------------------------------------------------------- */
	/*                                contact:getAll                            */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Returns a list of your user contacts.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource,
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Is Active',
				name: 'is_active',
				type: 'boolean',
				default: '',
				description: 'Pass true to only return active clients and false to return inactive clients.',
			},
			{
				displayName: 'Updated Since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
				description: 'Only return clients that have been updated since the given date and time.',
			}
		]
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource,
			},
		},
		description: 'The ID of the contact you are retrieving.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource,
			},
		},
		description: 'The ID of the contact you want to delete.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'First name',
		name: 'first_name',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The first name of the contact.',
	},
	{
		displayName: 'client_id',
		name: 'client_id',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: '',
		required: true,
		description: 'The ID of the client associated with this contact.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'last_name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'The last name of the contact.'
			},
			{
				displayName: 'title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title of the contact.'
			},
			{
				displayName: 'email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The contact’s email address.'
			},
			{
				displayName: 'phone_office',
				name: 'phone_office',
				type: 'string',
				default: '',
				description: 'The contact’s office phone number.'
			},
			{
				displayName: 'phone_mobile',
				name: 'phone_mobile',
				type: 'string',
				default: '',
				description: 'The contact’s mobile phone number.'
			},
			{
				displayName: 'fax',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'The contact’s fax number.'
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:update                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'contact Id',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource,
			},
		},
		description: 'The ID of the contact want to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource,
			},
		},
		default: {},
		options: [
			{
				displayName: 'client_id',
				name: 'client_id',
				type: 'string',
				default: '',
				description: 'The ID of the client associated with this contact.',
			},
			{
				displayName: 'First name',
				name: 'first_name',
				type: 'string',
				default: '',
				description: 'The first name of the contact.',
			},
			{
				displayName: 'last_name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'The last name of the contact.'
			},
			{
				displayName: 'title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title of the contact.'
			},
			{
				displayName: 'email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The contact’s email address.'
			},
			{
				displayName: 'phone_office',
				name: 'phone_office',
				type: 'string',
				default: '',
				description: 'The contact’s office phone number.'
			},
			{
				displayName: 'phone_mobile',
				name: 'phone_mobile',
				type: 'string',
				default: '',
				description: 'The contact’s mobile phone number.'
			},
			{
				displayName: 'fax',
				name: 'fax',
				type: 'string',
				default: '',
				description: 'The contact’s fax number.'
			},
		],
	},

] as INodeProperties[];
