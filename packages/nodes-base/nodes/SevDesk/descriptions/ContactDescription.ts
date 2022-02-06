import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Contact Add Address',
				value: 'contactAddAddress',
				description: 'Adds an address to a contact',
			},
			{
				name: 'Contact Add Email',
				value: 'contactAddEmail',
				description: 'Adds an email to a contact',
			},
			{
				name: 'Contact Add Phone',
				value: 'contactAddPhone',
				description: 'Adds a phone number to a contact',
			},
			{
				name: 'Contact Customer Number Availability Check',
				value: 'contactCustomerNumberAvailabilityCheck',
				description: 'Checks if a given customer number is available or already used',
			},
			{
				name: 'Contact Get Communication Ways',
				value: 'contactGetCommunicationWays',
				description: 'Returns all communication ways of a given contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a single contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'There are a multitude of parameter which can be used to filter.<br> A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-contacts#filtering">this</a> list',
			},
			{
				name: 'Get Next Customer Number',
				value: 'getNextCustomerNumber',
				description: 'Retrieves the next available customer number. Avoids duplicates.',
			},
		],
		default: 'get',
		// nodelinter-ignore-next-line WEAK_PARAM_DESCRIPTION
		description: 'The operation to perform',
	},
];

export const contactFields: INodeProperties[] = [
	// ----------------------------------------
	//        contact: contactAddAddress
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of contact to which address is added',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'Contact',
				],
				operation: [
					'contactAddAddress',
				],
			},
		},
	},

	// ----------------------------------------
	//         contact: contactAddEmail
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of contact to which email is added',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'Contact',
				],
				operation: [
					'contactAddEmail',
				],
			},
		},
	},

	// ----------------------------------------
	//         contact: contactAddPhone
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of contact to which phone number is added',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'Contact',
				],
				operation: [
					'contactAddPhone',
				],
			},
		},
	},

	// ----------------------------------------
	// contact: contactCustomerNumberAvailabilityCheck
	// ----------------------------------------
	{
		displayName: 'customerNumber',
		name: 'customerNumber',
		description: 'The customer number to be checked',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'Contact',
				],
				operation: [
					'contactCustomerNumberAvailabilityCheck',
				],
			},
		},
	},

	// ----------------------------------------
	//   contact: contactGetCommunicationWays
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of contact for which you want the communication ways',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'Contact',
				],
				operation: [
					'contactGetCommunicationWays',
				],
			},
		},
	},

	// ----------------------------------------
	//               contact: get
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of contact to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'Contact',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             contact: getAll
	// ----------------------------------------
	{
		displayName: 'Depth',
		name: 'depth',
		description: 'Defines if both organizations <b>and</b> persons should be returned.<br> "0" -> only organizations, "1" -> organizations and persons',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'Contact',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'customerNumber',
		name: 'customerNumber',
		description: 'Retrieve all contacts with this customer number',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'Contact',
				],
				operation: [
					'getAll',
				],
			},
		},
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
					'Contact',
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
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'Contact',
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
];
