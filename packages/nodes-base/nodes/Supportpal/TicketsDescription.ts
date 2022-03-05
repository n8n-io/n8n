import { INodeProperties } from 'n8n-workflow';

export const ticketsDescription = [
	// ----------------------------------
	//         Fields: ticket
	// ----------------------------------
	{
		displayName: 'User ID',
		name: 'user',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
		description:
			'The ID of the user opening the ticket, an operator ID is required if opening an internal ticket.',
	},
	{
		displayName: 'Department',
		name: 'department',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
		description:
			'The department the ticket is being opened in. It must be assigned to the brand that the ticket is being opened in.',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
		description: 'The status of the new ticket.',
	},
	{
		displayName: 'Priority',
		name: 'priority',
		type: 'number',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
		description: 'The priority of the new ticket.',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
		description: 'The ticket subject.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['ticket'],
			},
		},
		description: 'The initial ticket message.',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update', 'get', 'delete'],
			},
		},
		description: 'The ID of the ticket.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simplify',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create', 'update', 'get', 'getAll'],
			},
		},
		description: 'Return simplified response. Only returns the ticket data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		default: {},
		description: 'Additional optional fields of the ticket.',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'User ID',
				name: 'user',
				type: 'number',
				default: 0,
				description:
					'The ID of the user opening the ticket, an operator ID is required if opening an internal ticket.',
			},
			{
				displayName: 'On Behalf Of',
				name: 'on_behalf_of',
				type: 'number',
				default: 0,
				description:
					'When opening a ticket as an operator, specify a user ID to open the ticket on behalf of.',
			},
			{
				displayName: 'User First Name',
				name: 'user_firstname',
				type: 'string',
				default: '',
				description: 'If a new user, set the first name of the user.',
			},
			{
				displayName: 'User Last Name',
				name: 'user_lastname',
				type: 'string',
				default: '',
				description: 'If a new user, set the last name of the user.',
			},
			{
				displayName: 'User Email',
				name: 'user_email',
				type: 'string',
				default: '',
				description:
					'If a new user, set the email of the user, required if no user ID set. Can be entered instead of the user parameter to find a user by their email address.',
			},
			{
				displayName: 'User Organisation',
				name: 'user_organisation',
				type: 'string',
				default: '',
				description:
					'If a new user, set the organisation of the user, will create a new organisation.',
			},
			{
				displayName: 'User IP Address',
				name: 'user_ip_address',
				type: 'string',
				default: '',
				description: 'The IP address of the user.',
			},
			{
				displayName: 'Brand ID',
				name: 'brand',
				type: 'number',
				default: 0,
				description:
					'The brand the ticket is being opened in, defaults to default brand if not entered.',
			},
			{
				displayName: 'Internal?',
				name: 'internal',
				type: 'boolean',
				default: false,
				description:
					'If the ticket is internal (for operators only). If true, requires the user parameter to be set to an operator ID.',
			},
			{
				displayName: 'Tag IDs',
				name: 'tag',
				type: 'json',
				default: '',
				description: 'An array of tag IDs for the new ticket.',
			},
			{
				displayName: 'Assigned To',
				name: 'assignedto',
				type: 'json',
				default: '',
				description: 'An array of operator IDs that are assigned to the new ticket.',
			},
			{
				displayName: 'Watching',
				name: 'watching',
				type: 'json',
				default: '',
				description: 'An array of operator IDs that are watching the new ticket.',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'json',
				default: '',
				description: 'An array of email addresses to CC on the ticket.',
			},
			{
				displayName: 'Send user email?',
				name: 'send_user_email',
				type: 'boolean',
				default: true,
				description: 'Whether to send an email to the user(s) about the new ticket.',
			},
			{
				displayName: 'Send operator email?',
				name: 'send_operator_email',
				type: 'boolean',
				default: true,
				description: 'Whether to send an email to the operator(s) about the new ticket.',
			},
			{
				displayName: 'Attachments',
				name: 'attachment',
				type: 'json',
				default: '',
				description:
					'A multi-dimensional array of attachments in the format of ‘attachment[n][filename]’ (attachment filename) and ‘attachment[n][contents]’ (base64-encoded file contents).',
			},
			{
				displayName: 'Created At',
				name: 'created_at',
				type: 'number',
				default: 0,
				description: 'If you wish to set a custom created time, must be a UNIX timestamp.',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
		default: {},
		description: 'Additional optional fields of the ticket.',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Brand ID',
				name: 'brand',
				type: 'number',
				default: 0,
				description:
					'Update the brand on the ticket. Must also have the department and department_email parameters set that is assigned to the new brand.',
			},
			{
				displayName: 'User ID',
				name: 'user',
				type: 'number',
				default: 0,
				description: 'Update the user on the ticket.',
			},
			{
				displayName: 'Department ID',
				name: 'department',
				type: 'number',
				default: 0,
				description:
					'Update the department email on the ticket, used to send emails notifications for this ticket. It must be assigned to the department and brand that the ticket has been opened in.',
			},
			{
				displayName: 'Department Email',
				name: 'department_email',
				type: 'number',
				default: 0,
				description:
					'Update the department email on the ticket, used to send emails notifications for this ticket. It must be assigned to the department and brand that the ticket has been opened in.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'number',
				default: 0,
				description: 'Update the status on the ticket.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				default: '',
				description: 'Update the priority on the ticket.',
			},
			{
				displayName: 'tag',
				name: 'tag',
				type: 'string',
				default: '',
				description:
					'Filter by ticket tag, accepts a single ID or a comma delimited string e.g. 1,2,3.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Update the subject on the ticket.',
			},

			{
				displayName: 'Tag IDs',
				name: 'tag',
				type: 'json',
				default: '',
				description: 'An array of tag IDs for the ticket (overwrites existing tags).',
			},
			{
				displayName: 'Assigned To',
				name: 'assignedto',
				type: 'json',
				default: '',
				description: 'An array of operator IDs that are assigned to the ticket.',
			},
			{
				displayName: 'Watching',
				name: 'watching',
				type: 'json',
				default: '',
				description: 'An array of operator IDs that are watching the ticket.',
			},
			{
				displayName: 'SLA Plan',
				name: 'sla_plan',
				type: 'number',
				default: 0,
				description: 'Update the SLA plan on the ticket (will also update due time).',
			},
			{
				displayName: 'Due Time',
				name: 'due_time',
				type: 'number',
				default: 0,
				description: 'Manually set the due time on the ticket, set as a UNIX timestamp.',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'json',
				default: '',
				description:
					'An array of email addresses to CC on the ticket. (Overwrites existing CC emails).',
			},
			{
				displayName: 'Locked?',
				name: 'locked',
				type: 'boolean',
				default: false,
				description:
					'If the ticket is locked and the user cannot add any further replies. This also closes the ticket.',
			},
		],
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
			},
		},
		default: {},
		description: 'Query Parameters for filtering the tickets.',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Filter ID',
				name: 'filter',
				type: 'number',
				default: 0,
				description:
					'Filter by a ticket filter, will ignore all of the below filtering options if set.',
			},
			{
				displayName: 'Filter Operator',
				name: 'filter_operator',
				type: 'number',
				default: 0,
				description:
					'If filtering by a ticket filter, set which operator to run the filter as. Required if the filter is private or limited to certain operator groups.',
			},
			{
				displayName: 'Ticket Number',
				name: 'number',
				type: 'number',
				default: 0,
				description: 'Search by ticket number.',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
				description:
					'Filter by ticket department, accepts a single ID or a comma delimited string e.g. 1,2,3. Parent departments include children department tickets.',
			},
			{
				displayName: 'Brand',
				name: 'brand',
				type: 'string',
				default: '',
				description:
					'Filter by ticket brand, accepts a single ID or a comma delimited string e.g. 1,2,3.',
			},
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				default: '',
				description:
					'Filter by ticket channel, accepts a single ID or a comma delimited string e.g. 1,2,3.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description:
					'Filter by ticket status, accepts a single ID or a comma delimited string e.g. 1,2,3.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'string',
				default: '',
				description:
					'Filter by ticket priority, accepts a single ID or a comma delimited string e.g. 1,2,3.',
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description:
					'Filter by ticket tag(s), accepts a single ID or a comma delimited string e.g. 1,2,3.',
			},
			{
				displayName: 'User',
				name: 'user',
				type: 'string',
				default: '',
				description:
					'Filter by submitting user, accepts a single ID or a comma delimited string e.g. 1,2,3.	',
			},
			{
				displayName: 'User Email',
				name: 'user_email',
				type: 'string',
				default: '',
				description: 'Filter by the email address of the user.',
			},
			{
				displayName: 'Organisation',
				name: 'organisation',
				type: 'string',
				default: 0,
				description:
					'Filter by organisation, accepts a single ID or a comma delimited string e.g. 1,2,3.',
			},
			{
				displayName: 'Assigned To',
				name: 'assigned',
				type: 'string',
				default: '',
				description:
					'Filter by assigned operator, accepts a single ID or a comma delimited string e.g. 1,2,3. Use "-1" to find unassigned tickets.',
			},
			{
				displayName: 'Watching',
				name: 'watching',
				type: 'string',
				default: '',
				description:
					'Filter by watching operator, accepts a single ID or a comma delimited string e.g. 1,2,3.',
			},
			{
				displayName: 'Internal?',
				name: 'internal',
				type: 'boolean',
				default: false,
				description: 'Fetch only internal tickets (true) or non-internal tickets (false).',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'number',
				default: 1,
				description: 'The first result to start from.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'The amount of results to fetch.',
			},
			{
				displayName: 'Order Column',
				name: 'order_column',
				type: 'string',
				default: 'id',
				description: 'The column to sort by.',
			},
			{
				displayName: 'Order Direction',
				name: 'order_direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
				description: 'The ordering of the results.',
			},
		],
	},
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		placeholder: 'Add Custom Field',
		description: 'Adds a custom field to set the value of.',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['create', 'update', 'getAll'],
				resource: ['ticket'],
			},
		},
		default: {},
		options: [
			{
				name: 'fields',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field ID',
						name: 'id',
						typeOptions: {
							loadOptionsMethod: 'getTicketCustomFields',
						},
						type: 'options',
						default: '',
						description: 'ID of the field to set.',
					},
					{
						displayName: 'Field Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the field to set.',
					},
				],
			},
		],
	},
] as INodeProperties[];
