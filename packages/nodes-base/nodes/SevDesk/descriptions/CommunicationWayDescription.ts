import {
	INodeProperties,
} from 'n8n-workflow';

export const communicationWayOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact communication way',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes a communication way',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns all communication ways which have been added up until now. Filters can be added.',
			},
		],
		default: 'getAll',
	},
];

export const communicationWayFields: INodeProperties[] = [
	// ----------------------------------------
	//         communicationWay: create
	// ----------------------------------------
	{
		displayName: 'Contact',
		name: 'contact',
		description: 'The contact to which this communication way belongs',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				description: 'Unique identifier of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				description: 'Model name, which is "Contact"',
				type: 'string',
				default: 'Contact',
			},
		],
	},
	{
		displayName: 'Type',
		name: 'type',
		description: 'Type of the communication way. One of "EMAIL", "PHONE", "WEB", "MOBILE".',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Value',
		name: 'value',
		description: 'The value of the communication way. For example the phone number, e-mail address or website.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Key',
		name: 'key',
		description: 'The key of the communication way. Similar to the category of addresses. For all communication way keys please send a GET to /CommunicationWayKey.',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				description: 'Unique identifier of the key',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				description: 'Model name, which is "CommunicationWayKey"',
				type: 'string',
				default: 'CommunicationWayKey',
			},
		],
	},
	{
		displayName: 'Main',
		name: 'main',
		description: 'Defines whether the communication way is the main communication way for the contact',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'create',
				],
			},
		},
	},
	// ----------------------------------------
	//         communicationWay: delete
	// ----------------------------------------
	{
		displayName: 'communicationWay ID',
		name: 'communicationWayId',
		description: 'Id of communication way resource to delete',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//         communicationWay: getAll
	// ----------------------------------------
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
				resource: [
					'communicationWay',
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		description: 'There are a multitude of parameter which can be used to filter. A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-invoices#filtering">this</> list.',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'communicationWay',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Contact ID',
				name: 'contactId',
				description: 'Retrieve all invoices with this contact. Must be provided with Contact Object Name.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Contact Object Name',
				name: 'contactId',
				description: 'Only required if Contact ID was provided. "Contact" should be used as value.',
				type: 'string',
				default: 'Contact',
			},
			{
				displayName: 'Type',
				name: 'type',
				description: 'Type of the communication ways you want to get',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Main',
				name: 'main',
				description: 'Define if you only want the main communication way',
				type: 'number',
				default: 0,
			},
		],
	},
];
