import { INodeProperties } from 'n8n-workflow';

export const contactOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
			},
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactFields = [

/* -------------------------------------------------------------------------- */
/*                                contact:create                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				]
			},
		},
		default: '',
		description: 'Email address of the contact.',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				]
			},
		},
		default: '',
		description: 'First Name',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Last Name',
	},
	{
		displayName: 'Primary Company',
		name: 'company',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCompanies',
		},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Primary company',
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Position',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: '',
		description: 'Title',
	},
	{
		displayName: 'Body',
		name: 'bodyJson',
		type: 'json',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Contact parameters',
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
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				description: 'IP address to associate with the contact',
			},
			{
				displayName: 'Last Active',
				name: 'lastActive',
				type: 'dateTime',
				default: '',
				description: 'Date/time in UTC;',
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'string',
				default: '',
				description: 'ID of a Mautic user to assign this contact to',
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                               contact:update                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Contact ID',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
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
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Body',
				name: 'bodyJson',
				type: 'json',
				displayOptions: {
					show: {
						'/jsonParameters': [
							true,
						],
					},
				},
				default: '',
				description: 'Contact parameters',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Email address of the contact.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'First Name',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'LastName',
			},
			{
				displayName: 'Primary Company',
				name: 'company',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Primary company',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Position',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				displayOptions: {
					show: {
						'/jsonParameters': [
							false,
						],
					},
				},
				default: '',
				description: 'Title',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				description: 'IP address to associate with the contact',
			},
			{
				displayName: 'Last Active',
				name: 'lastActive',
				type: 'dateTime',
				default: '',
				description: 'Date/time in UTC;',
			},
			{
				displayName: 'Owner ID',
				name: 'ownerId',
				type: 'string',
				default: '',
				description: 'ID of a Mautic user to assign this contact to',
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                                 contact:get                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Contact ID',
	},

/* -------------------------------------------------------------------------- */
/*                                contact:getAll                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
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
			maxValue: 30,
		},
		default: 30,
		description: 'How many results to return.',
	},

/* -------------------------------------------------------------------------- */
/*                               contact:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Contact ID',
	},

/* -------------------------------------------------------------------------- */
/*                                 contact:all                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				'resource': [
					'contact',
				],
			},
		},
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: '',
				description: 'String or search command to filter entities by.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'string',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: '',
				description: 'Column to sort by. Can use any column listed in the response.',
			},
			{
				displayName: 'Order By Dir',
				name: 'orderByDir',
				type: 'options',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: '',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				description: 'Sort direction: ASC or DESC.',
			},
			{
				displayName: 'Published Only',
				name: 'publishedOnly',
				type: 'boolean',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: false,
				description: 'Only return currently published entities.',
			},
			{
				displayName: 'Minimal',
				name: 'minimal',
				type: 'boolean',
				displayOptions: {
					show: {
						'/resource': [
							'contact',
						],
						'/operation': [
							'getAll',
						],
					},
				},
				default: false,
				description: 'Return only array of entities without additional lists in it.',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: false,
				description: `By default only the data of the fields get returned. If this<br />
							  options gets set the RAW response with all data gets returned.`,
			},
		]
	},

] as INodeProperties[];
