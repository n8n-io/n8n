import type { INodeProperties } from 'n8n-workflow';

export const generatedProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Audit', value: 'audit' },
			{ name: 'Credential', value: 'credential' },
			{ name: 'Execution', value: 'execution' },
			{ name: 'Project', value: 'project' },
			{ name: 'User', value: 'user' },
			{ name: 'Workflow', value: 'workflow' },
		],
		default: 'audit',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['audit'] } },
		options: [
			{
				name: 'Generate',
				value: 'generate',
				action: 'Generate an audit',
				description:
					'Generate a security audit for your n8n instance. Requires the API key scope "securityAudit:generate".',
				routing: { request: { method: 'POST', url: '/audit' } },
			},
		],
		default: 'generate',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['audit'], operation: ['generate'] } },
		options: [
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'json',
				default: '{}',
				routing: {
					send: {
						type: 'body',
						property: 'additionalOptions',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['credential'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a credential',
				description:
					'Creates a credential that can be used by nodes of the specified type. Requires the API key scope "credential:create".',
				routing: { request: { method: 'POST', url: '/credentials' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete credential by ID',
				description:
					'Deletes a credential from your instance. You must be the owner of the credential. Requires the API key scope "credential:delete".',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/credentials/{{ toPathSegment($parameter["credentialId"]) }}',
					},
				},
			},
			{
				name: 'Get Type',
				value: 'getType',
				action: 'Show credential data schema',
				routing: {
					request: {
						method: 'GET',
						url: '=/credentials/schema/{{ toPathSegment($parameter["credentialTypeName"]) }}',
					},
				},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'name' } },
		required: true,
		displayOptions: { show: { resource: ['credential'], operation: ['create'] } },
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'type' } },
		required: true,
		displayOptions: { show: { resource: ['credential'], operation: ['create'] } },
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '{}',
		routing: {
			send: {
				type: 'body',
				property: 'data',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['credential'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['credential'], operation: ['create'] } },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description:
					'Plain text, up to 512 characters. A blank value is saved as null. Ignored when credential descriptions are disabled.',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				description:
					'An unused credential ID of 1–16 letters, digits, underscores, or hyphens. The supplied ID is preserved exactly. Omit to generate an ID.',
				routing: { send: { type: 'body', property: 'id' } },
			},
			{
				displayName: 'Is Resolvable',
				name: 'isResolvable',
				type: 'boolean',
				default: false,
				description: 'Whether this credential has resolvable fields',
				routing: { send: { type: 'body', property: 'isResolvable' } },
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				description:
					"Project to create the credential in. Defaults to the user's personal project.",
				routing: { send: { type: 'body', property: 'projectId' } },
			},
		],
	},
	{
		displayName: 'Credential ID',
		name: 'credentialId',
		type: 'string',
		default: '',
		description: 'The ID of the credential',
		required: true,
		displayOptions: { show: { resource: ['credential'], operation: ['delete'] } },
	},
	{
		displayName: 'Credential Type Name',
		name: 'credentialTypeName',
		type: 'string',
		default: '',
		description: 'The credential type name that you want to get the schema for',
		required: true,
		displayOptions: { show: { resource: ['credential'], operation: ['getType'] } },
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['execution'] } },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an execution',
				description:
					'Deletes an execution from your instance. Requires the API key scope "execution:delete".',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/executions/{{ toPathSegment($parameter["executionId"]) }}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Retrieve an execution',
				description:
					'Retrieve an execution from your instance. Requires the API key scope "execution:read".',
				routing: {
					request: {
						method: 'GET',
						url: '=/executions/{{ toPathSegment($parameter["executionId"]) }}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Retrieve all executions',
				description:
					'Retrieve many executions from your instance. Requires the API key scope "execution:list".',
				routing: {
					request: { method: 'GET', url: '/executions' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
		],
		default: 'delete',
	},
	{
		displayName: 'Execution ID',
		name: 'executionId',
		type: 'number',
		default: 0,
		description: 'The ID of the execution',
		required: true,
		displayOptions: { show: { resource: ['execution'], operation: ['delete'] } },
	},
	{
		displayName: 'Execution ID',
		name: 'executionId',
		type: 'number',
		default: 0,
		description: 'The ID of the execution',
		required: true,
		displayOptions: { show: { resource: ['execution'], operation: ['get'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['execution'], operation: ['get'] } },
		options: [
			{
				displayName: 'Ignore Data Size Limit',
				name: 'ignoreDataSizeLimit',
				type: 'boolean',
				default: false,
				description:
					'Whether to return the full execution data even if it exceeds the configured size limit (EXECUTIONS_DATA_MAX_DISPLAY_SIZE). Oversized executions are otherwise returned without their data.',
				routing: { send: { type: 'query', property: 'ignoreDataSizeLimit' } },
			},
			{
				displayName: 'Include Data',
				name: 'includeData',
				type: 'boolean',
				default: false,
				description: "Whether or not to include the execution's detailed data",
				routing: { send: { type: 'query', property: 'includeData' } },
			},
			{
				displayName: 'Redact Execution Data',
				name: 'redactExecutionData',
				type: 'boolean',
				default: false,
				description:
					'Whether to redact the execution output data. Leave it out to follow the workflow redaction policy. Revealing the data needs the `execution:reveal` scope.',
				routing: { send: { type: 'query', property: 'redactExecutionData' } },
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['execution'], operation: ['getAll'] } },
		routing: {
			send: { paginate: '={{ $value }}' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.nextCursor }}',
						request: {
							qs: {
								limit: '={{ $request.qs?.["limit"] }}',
								includeData: '={{ $request.qs?.["includeData"] }}',
								ignoreDataSizeLimit: '={{ $request.qs?.["ignoreDataSizeLimit"] }}',
								redactExecutionData: '={{ $request.qs?.["redactExecutionData"] }}',
								status: '={{ $request.qs?.["status"] }}',
								workflowId: '={{ $request.qs?.["workflowId"] }}',
								projectId: '={{ $request.qs?.["projectId"] }}',
								startedAfter: '={{ $request.qs?.["startedAfter"] }}',
								startedBefore: '={{ $request.qs?.["startedBefore"] }}',
								cursor: '={{ $response.body?.nextCursor }}',
							},
						},
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, maxValue: 250 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { resource: ['execution'], operation: ['getAll'], returnAll: [false] },
		},
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['execution'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Ignore Data Size Limit',
				name: 'ignoreDataSizeLimit',
				type: 'boolean',
				default: false,
				description:
					'Whether to return the full execution data even if it exceeds the configured size limit (EXECUTIONS_DATA_MAX_DISPLAY_SIZE). Oversized executions are otherwise returned without their data.',
				routing: { send: { type: 'query', property: 'ignoreDataSizeLimit' } },
			},
			{
				displayName: 'Include Data',
				name: 'includeData',
				type: 'boolean',
				default: false,
				description: "Whether or not to include the execution's detailed data",
				routing: { send: { type: 'query', property: 'includeData' } },
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'projectId' } },
			},
			{
				displayName: 'Redact Execution Data',
				name: 'redactExecutionData',
				type: 'boolean',
				default: false,
				description:
					'Whether to redact the execution output data. Leave it out to follow the workflow redaction policy. Revealing the data needs the `execution:reveal` scope.',
				routing: { send: { type: 'query', property: 'redactExecutionData' } },
			},
			{
				displayName: 'Started After',
				name: 'startedAfter',
				type: 'dateTime',
				default: '',
				description: 'Only return executions that started after this time',
				routing: { send: { type: 'query', property: 'startedAfter' } },
			},
			{
				displayName: 'Started Before',
				name: 'startedBefore',
				type: 'dateTime',
				default: '',
				description: 'Only return executions that started before this time',
				routing: { send: { type: 'query', property: 'startedBefore' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'canceled',
				options: [
					{ name: 'Canceled', value: 'canceled' },
					{ name: 'Crashed', value: 'crashed' },
					{ name: 'Error', value: 'error' },
					{ name: 'New', value: 'new' },
					{ name: 'Running', value: 'running' },
					{ name: 'Success', value: 'success' },
					{ name: 'Unknown', value: 'unknown' },
					{ name: 'Waiting', value: 'waiting' },
				],
				description: 'Status to filter the executions by',
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'Workflow',
				name: 'workflowId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Choose the workflow from the list, or enter its URL or ID',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Workflow...',
						initType: 'workflow',
						typeOptions: {
							searchListMethod: 'searchWorkflows',
							searchFilterRequired: false,
							searchable: true,
						},
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://myinstance.app.n8n.cloud/workflow/1',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '.*/workflow/([0-9a-zA-Z]{1,})',
									errorMessage: 'Not a valid Workflow URL',
								},
							},
						],
						extractValue: { type: 'regex', regex: '.*/workflow/([0-9a-zA-Z]{1,})' },
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: { regex: '[0-9a-zA-Z]{1,}', errorMessage: 'Not a valid Workflow ID' },
							},
						],
						placeholder: '1',
					},
				],
				routing: { send: { type: 'query', property: 'workflowId' } },
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['project'] } },
		options: [
			{
				name: 'Add User',
				value: 'addUser',
				action: 'Add a user to a project',
				description:
					'Add a user to a project with a project role. Requires the API key scope "project:manageMembers".',
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{ toPathSegment($parameter["projectId"]) }}/users',
					},
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }],
					},
				},
			},
			{
				name: 'Change User Role',
				value: 'changeUserRole',
				action: "Change a user's role in a project",
				description:
					'Change a user\'s role in a project. Requires the API key scope "project:manageMembers".',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/projects/{{ toPathSegment($parameter["projectId"]) }}/users/{{ toPathSegment($parameter["userId"]) }}',
					},
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }],
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a project',
				description:
					'Create a team project on your instance. Requires the API key scope "project:create".',
				routing: { request: { method: 'POST', url: '/projects' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a project',
				description:
					'Delete a project from your instance. Requires the API key scope "project:delete".',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/projects/{{ toPathSegment($parameter["projectId"]) }}',
					},
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }],
					},
				},
			},
			{
				name: 'Delete User',
				value: 'deleteUser',
				action: 'Delete a user from a project',
				description:
					'Delete a user from a project on your instance. Requires the API key scope "project:manageMembers".',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/projects/{{ toPathSegment($parameter["projectId"]) }}/users/{{ toPathSegment($parameter["userId"]) }}',
					},
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }],
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Retrieve projects',
				description:
					'Retrieve projects from your instance. Requires the API key scope "project:list".',
				routing: {
					request: { method: 'GET', url: '/projects' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Get Users',
				value: 'getUsers',
				action: 'List project members',
				description:
					'Returns a list of all members of a project including their role. Requires user:list scope. Requires the API key scope "user:list".',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{ toPathSegment($parameter["projectId"]) }}/users',
					},
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a project',
				description:
					'Update a project on your instance. Requires the API key scope "project:update".',
				routing: {
					request: {
						method: 'PUT',
						url: '=/projects/{{ toPathSegment($parameter["projectId"]) }}',
					},
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }],
					},
				},
			},
		],
		default: 'addUser',
	},
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		description: 'The ID of the project',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['addUser'] } },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description: 'The unique identifier of the user',
		routing: {
			send: {
				type: 'body',
				property: 'relations',
				value: '={{ [{ "userId": $parameter["userId"], "role": $parameter["role"] }] }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['addUser'] } },
	},
	{
		displayName: 'Role Name or ID',
		name: 'role',
		type: 'options',
		default: 'project:viewer',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getProjectRoles' },
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['addUser'] } },
	},
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		description: 'The ID of the project',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['changeUserRole'] } },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description: 'The ID of the user',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['changeUserRole'] } },
	},
	{
		displayName: 'Role Name or ID',
		name: 'role',
		type: 'options',
		default: 'project:viewer',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getProjectRoles' },
		routing: { send: { type: 'body', property: 'role' } },
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['changeUserRole'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'name' } },
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['project'], operation: ['create'] } },
		options: [
			{
				displayName: 'Custom Telemetry Tags',
				name: 'customTelemetryTags',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Custom Telemetry Tags',
				options: [
					{
						displayName: 'Custom Telemetry Tags',
						name: 'values',
						values: [
							{ displayName: 'Key', name: 'key', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'customTelemetryTags',
						value: '={{ $value.values ?? [] }}',
					},
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Icon',
				name: 'icon',
				type: 'json',
				default: '{}',
				routing: {
					send: {
						type: 'body',
						property: 'icon',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				description:
					'Project ID. The server generates an ID when omitted. An ID that is in use returns HTTP 409.',
				routing: { send: { type: 'body', property: 'id' } },
			},
		],
	},
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		description: 'The ID of the project',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['delete'] } },
	},
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		description: 'The ID of the project',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['deleteUser'] } },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description: 'The ID of the user',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['deleteUser'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['project'], operation: ['getAll'] } },
		routing: {
			send: { paginate: '={{ $value }}' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.nextCursor }}',
						request: {
							qs: {
								limit: '={{ $request.qs?.["limit"] }}',
								cursor: '={{ $response.body?.nextCursor }}',
							},
						},
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, maxValue: 250 },
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['project'], operation: ['getAll'], returnAll: [false] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['project'], operation: ['getUsers'] } },
		routing: {
			send: { paginate: '={{ $value }}' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.nextCursor }}',
						request: {
							qs: {
								limit: '={{ $request.qs?.["limit"] }}',
								cursor: '={{ $response.body?.nextCursor }}',
							},
						},
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, maxValue: 250 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { resource: ['project'], operation: ['getUsers'], returnAll: [false] },
		},
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		description: 'The ID of the project',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['getUsers'] } },
	},
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		description: 'The ID of the project',
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['update'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'name' } },
		required: true,
		displayOptions: { show: { resource: ['project'], operation: ['update'] } },
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['user'] } },
		options: [
			{
				name: 'Change Role',
				value: 'changeRole',
				action: "Change a user's global role",
				description: 'Change a user\'s global role Requires the API key scope "user:changeRole"',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/users/{{ toPathSegment($parameter["userId"]) }}/role',
					},
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }],
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create multiple users',
				description: 'Create one or more users. Requires the API key scope "user:create".',
				routing: { request: { method: 'POST', url: '/users' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete user',
				description: 'Delete a user from your instance. Requires the API key scope "user:delete".',
				routing: {
					request: { method: 'DELETE', url: '=/users/{{ toPathSegment($parameter["userId"]) }}' },
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get user by ID/Email',
				description:
					'Retrieve a user from your instance. Only available for the instance owner. Requires the API key scope "user:read".',
				routing: {
					request: { method: 'GET', url: '=/users/{{ toPathSegment($parameter["userId"]) }}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Retrieve all users',
				description:
					'Retrieve many users from your instance. Only available for the instance owner. Requires the API key scope "user:list".',
				routing: {
					request: { method: 'GET', url: '/users' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
		],
		default: 'changeRole',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description: 'The ID of the user',
		required: true,
		displayOptions: { show: { resource: ['user'], operation: ['changeRole'] } },
	},
	{
		displayName: 'New Role Name',
		name: 'newRoleName',
		type: 'json',
		default: '{}',
		routing: {
			send: {
				type: 'body',
				property: 'newRoleName',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['user'], operation: ['changeRole'] } },
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'json',
		default: '[]',
		routing: {
			request: { body: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}' },
		},
		required: true,
		displayOptions: { show: { resource: ['user'], operation: ['create'] } },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description: 'The ID of the user',
		required: true,
		displayOptions: { show: { resource: ['user'], operation: ['delete'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['user'], operation: ['delete'] } },
		options: [
			{
				displayName: 'Transfer ID',
				name: 'transferId',
				type: 'string',
				default: '',
				description:
					"ID of the project to transfer the deleted user's workflows and credentials to. Omit to delete those resources instead of transferring them.",
				routing: { send: { type: 'query', property: 'transferId' } },
			},
		],
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		default: '',
		description: 'The ID or email of the user',
		required: true,
		displayOptions: { show: { resource: ['user'], operation: ['get'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['user'], operation: ['get'] } },
		options: [
			{
				displayName: 'Include Role',
				name: 'includeRole',
				type: 'boolean',
				default: false,
				routing: { send: { type: 'query', property: 'includeRole' } },
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['user'], operation: ['getAll'] } },
		routing: {
			send: { paginate: '={{ $value }}' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.nextCursor }}',
						request: {
							qs: {
								limit: '={{ $request.qs?.["limit"] }}',
								includeRole: '={{ $request.qs?.["includeRole"] }}',
								projectId: '={{ $request.qs?.["projectId"] }}',
								cursor: '={{ $response.body?.nextCursor }}',
							},
						},
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, maxValue: 250 },
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['user'], operation: ['getAll'], returnAll: [false] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['user'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Include Role',
				name: 'includeRole',
				type: 'boolean',
				default: false,
				routing: { send: { type: 'query', property: 'includeRole' } },
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'projectId' } },
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['workflow'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a workflow',
				description:
					'Create a workflow in your instance. Requires the API key scope "workflow:create".',
				routing: { request: { method: 'POST', url: '/workflows' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a workflow',
				description: 'Delete a workflow. Requires the API key scope "workflow:delete".',
				routing: {},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Retrieve a workflow',
				description: 'Retrieve a workflow. Requires the API key scope "workflow:read".',
				routing: {},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Retrieve all workflows',
				description:
					'Retrieve many workflows from your instance. Requires the API key scope "workflow:list".',
				routing: {
					request: { method: 'GET', url: '/workflows' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }] },
				},
			},
			{
				name: 'Get Version',
				value: 'getVersion',
				action: 'Retrieve a workflow version',
				description:
					'Retrieve a single version of a workflow from its version history. Requires the API key scope "workflow:read".',
				routing: {},
			},
			{
				name: 'Publish',
				value: 'publish',
				action: 'Publish a workflow',
				description:
					'Publish a workflow. In n8n v1, this action was termed activating a workflow. Requires the API key scope "workflow:activate".',
				routing: {},
			},
			{
				name: 'Unpublish',
				value: 'unpublish',
				action: 'Unpublish a workflow',
				description:
					'Unpublish a workflow. In n8n v1, this action was termed deactivating a workflow. Requires the API key scope "workflow:deactivate".',
				routing: {},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a workflow',
				description:
					'Update a workflow. If the workflow is published, the updated version will be automatically re-published unless `publishIfActive` is set to `false`. Because that re-publication puts a new version live, it additionally requires the `workflow:activate` API key scope and the `workflow:publish` project permission. A caller without either can still save: the new version is stored as a draft and the response is a `403` naming the missing permission, leaving the published version live. Saving an unpublished workflow, or saving with `publishIfActive=false`, only needs `workflow:update`. Requires the API key scope "workflow:update".',
				routing: {},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'name' } },
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['create'] } },
	},
	{
		displayName: 'Nodes',
		name: 'nodes',
		type: 'json',
		default: '[]',
		description: 'Nodes that make up the workflow',
		routing: {
			send: {
				type: 'body',
				property: 'nodes',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['create'] } },
	},
	{
		displayName: 'Connections',
		name: 'connections',
		type: 'json',
		default: '{}',
		description: 'Connections between nodes, keyed by source node name',
		routing: {
			send: {
				type: 'body',
				property: 'connections',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['create'] } },
	},
	{
		displayName: 'Settings',
		name: 'settings',
		type: 'json',
		default: '{}',
		routing: {
			send: {
				type: 'body',
				property: 'settings',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['workflow'], operation: ['create'] } },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the workflow',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Node Groups',
				name: 'nodeGroups',
				type: 'json',
				default: '[]',
				description: 'Visual groupings of nodes shown as frames on the canvas',
				routing: {
					send: {
						type: 'body',
						property: 'nodeGroups',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
			{
				displayName: 'Parent Folder ID',
				name: 'parentFolderId',
				type: 'string',
				default: '',
				description:
					'ID of the folder to place the workflow in. Omit or null to place at the project root.',
				routing: { send: { type: 'body', property: 'parentFolderId' } },
			},
			{
				displayName: 'Pin Data',
				name: 'pinData',
				type: 'json',
				default: '{}',
				description: 'Pinned sample data for nodes, keyed by node name',
				routing: {
					send: {
						type: 'body',
						property: 'pinData',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				description:
					"Target project to create the workflow in. Defaults to the user's personal project.",
				routing: { send: { type: 'body', property: 'projectId' } },
			},
			{
				displayName: 'Shared',
				name: 'shared',
				type: 'json',
				default: '[]',
				description:
					'Accepted for compatibility and ignored. The owner share is derived from the target project.',
				routing: {
					send: {
						type: 'body',
						property: 'shared',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
			{
				displayName: 'Static Data',
				name: 'staticData',
				type: 'json',
				default: '{}',
				description: 'Data the workflow keeps between executions',
				routing: {
					send: {
						type: 'body',
						property: 'staticData',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
		],
	},
	{
		displayName: 'Workflow',
		name: 'workflowId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Choose the workflow from the list, or enter its URL or ID',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Workflow...',
				initType: 'workflow',
				typeOptions: {
					searchListMethod: 'searchWorkflows',
					searchFilterRequired: false,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://myinstance.app.n8n.cloud/workflow/1',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.*/workflow/([0-9a-zA-Z]{1,})',
							errorMessage: 'Not a valid Workflow URL',
						},
					},
				],
				extractValue: { type: 'regex', regex: '.*/workflow/([0-9a-zA-Z]{1,})' },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: { regex: '[0-9a-zA-Z]{1,}', errorMessage: 'Not a valid Workflow ID' },
					},
				],
				placeholder: '1',
			},
		],
		routing: { request: { method: 'DELETE', url: '=/workflows/{{ toPathSegment($value) }}' } },
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['delete'] } },
	},
	{
		displayName: 'Workflow',
		name: 'workflowId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Choose the workflow from the list, or enter its URL or ID',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Workflow...',
				initType: 'workflow',
				typeOptions: {
					searchListMethod: 'searchWorkflows',
					searchFilterRequired: false,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://myinstance.app.n8n.cloud/workflow/1',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.*/workflow/([0-9a-zA-Z]{1,})',
							errorMessage: 'Not a valid Workflow URL',
						},
					},
				],
				extractValue: { type: 'regex', regex: '.*/workflow/([0-9a-zA-Z]{1,})' },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: { regex: '[0-9a-zA-Z]{1,}', errorMessage: 'Not a valid Workflow ID' },
					},
				],
				placeholder: '1',
			},
		],
		routing: { request: { method: 'GET', url: '=/workflows/{{ toPathSegment($value) }}' } },
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['get'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['workflow'], operation: ['get'] } },
		options: [
			{
				displayName: 'Exclude Pinned Data',
				name: 'excludePinnedData',
				type: 'boolean',
				default: false,
				routing: { send: { type: 'query', property: 'excludePinnedData' } },
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['workflow'], operation: ['getAll'] } },
		routing: {
			send: { paginate: '={{ $value }}' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.nextCursor }}',
						request: {
							qs: {
								limit: '={{ $request.qs?.["limit"] }}',
								offset: '={{ $request.qs?.["offset"] }}',
								active: '={{ $request.qs?.["active"] }}',
								tags: '={{ $request.qs?.["tags"] }}',
								name: '={{ $request.qs?.["name"] }}',
								projectId: '={{ $request.qs?.["projectId"] }}',
								excludePinnedData: '={{ $request.qs?.["excludePinnedData"] }}',
								includeParentFolder: '={{ $request.qs?.["includeParentFolder"] }}',
								cursor: '={{ $response.body?.nextCursor }}',
							},
						},
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, maxValue: 250 },
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['workflow'], operation: ['getAll'], returnAll: [false] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['workflow'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: false,
				routing: { send: { type: 'query', property: 'active' } },
			},
			{
				displayName: 'Exclude Pinned Data',
				name: 'excludePinnedData',
				type: 'boolean',
				default: false,
				routing: { send: { type: 'query', property: 'excludePinnedData' } },
			},
			{
				displayName: 'Include Parent Folder',
				name: 'includeParentFolder',
				type: 'boolean',
				default: false,
				description: 'Whether to add the parent folder to each workflow',
				routing: { send: { type: 'query', property: 'includeParentFolder' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'name' } },
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'The number of items to skip before starting to collect the result set',
				routing: { send: { type: 'query', property: 'offset' } },
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'projectId' } },
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'tags' } },
			},
		],
	},
	{
		displayName: 'Workflow',
		name: 'workflowId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Choose the workflow from the list, or enter its URL or ID',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Workflow...',
				initType: 'workflow',
				typeOptions: {
					searchListMethod: 'searchWorkflows',
					searchFilterRequired: false,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://myinstance.app.n8n.cloud/workflow/1',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.*/workflow/([0-9a-zA-Z]{1,})',
							errorMessage: 'Not a valid Workflow URL',
						},
					},
				],
				extractValue: { type: 'regex', regex: '.*/workflow/([0-9a-zA-Z]{1,})' },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: { regex: '[0-9a-zA-Z]{1,}', errorMessage: 'Not a valid Workflow ID' },
					},
				],
				placeholder: '1',
			},
		],
		routing: {
			request: {
				method: 'GET',
				url: '=/workflows/{{ toPathSegment($value) }}/versions/{{ toPathSegment($parameter["workflowVersionId"]) }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['getVersion'] } },
	},
	{
		displayName: 'Workflow Version ID',
		name: 'workflowVersionId',
		type: 'string',
		default: '',
		description: 'The ID of the workflow version',
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['getVersion'] } },
	},
	{
		displayName: 'Workflow',
		name: 'workflowId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Choose the workflow from the list, or enter its URL or ID',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Workflow...',
				initType: 'workflow',
				typeOptions: {
					searchListMethod: 'searchWorkflows',
					searchFilterRequired: false,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://myinstance.app.n8n.cloud/workflow/1',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.*/workflow/([0-9a-zA-Z]{1,})',
							errorMessage: 'Not a valid Workflow URL',
						},
					},
				],
				extractValue: { type: 'regex', regex: '.*/workflow/([0-9a-zA-Z]{1,})' },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: { regex: '[0-9a-zA-Z]{1,}', errorMessage: 'Not a valid Workflow ID' },
					},
				],
				placeholder: '1',
			},
		],
		routing: {
			request: { method: 'POST', url: '=/workflows/{{ toPathSegment($value) }}/publish' },
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['publish'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['workflow'], operation: ['publish'] } },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Optional description for the workflow version during publication',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Optional name for the workflow version during publication',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Version ID',
				name: 'versionId',
				type: 'string',
				default: '',
				description:
					'The specific version ID to publish. If not provided, the latest version is used.',
				routing: { send: { type: 'body', property: 'versionId' } },
			},
		],
	},
	{
		displayName: 'Workflow',
		name: 'workflowId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Choose the workflow from the list, or enter its URL or ID',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Workflow...',
				initType: 'workflow',
				typeOptions: {
					searchListMethod: 'searchWorkflows',
					searchFilterRequired: false,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://myinstance.app.n8n.cloud/workflow/1',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.*/workflow/([0-9a-zA-Z]{1,})',
							errorMessage: 'Not a valid Workflow URL',
						},
					},
				],
				extractValue: { type: 'regex', regex: '.*/workflow/([0-9a-zA-Z]{1,})' },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: { regex: '[0-9a-zA-Z]{1,}', errorMessage: 'Not a valid Workflow ID' },
					},
				],
				placeholder: '1',
			},
		],
		routing: {
			request: { method: 'POST', url: '=/workflows/{{ toPathSegment($value) }}/unpublish' },
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['unpublish'] } },
	},
	{
		displayName: 'Workflow',
		name: 'workflowId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Choose the workflow from the list, or enter its URL or ID',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Workflow...',
				initType: 'workflow',
				typeOptions: {
					searchListMethod: 'searchWorkflows',
					searchFilterRequired: false,
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://myinstance.app.n8n.cloud/workflow/1',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '.*/workflow/([0-9a-zA-Z]{1,})',
							errorMessage: 'Not a valid Workflow URL',
						},
					},
				],
				extractValue: { type: 'regex', regex: '.*/workflow/([0-9a-zA-Z]{1,})' },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: { regex: '[0-9a-zA-Z]{1,}', errorMessage: 'Not a valid Workflow ID' },
					},
				],
				placeholder: '1',
			},
		],
		routing: { request: { method: 'PUT', url: '=/workflows/{{ toPathSegment($value) }}' } },
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['update'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		routing: { send: { type: 'body', property: 'name' } },
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['update'] } },
	},
	{
		displayName: 'Nodes',
		name: 'nodes',
		type: 'json',
		default: '[]',
		description: 'Nodes that make up the workflow',
		routing: {
			send: {
				type: 'body',
				property: 'nodes',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['update'] } },
	},
	{
		displayName: 'Connections',
		name: 'connections',
		type: 'json',
		default: '{}',
		description: 'Connections between nodes, keyed by source node name',
		routing: {
			send: {
				type: 'body',
				property: 'connections',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['update'] } },
	},
	{
		displayName: 'Settings',
		name: 'settings',
		type: 'json',
		default: '{}',
		routing: {
			send: {
				type: 'body',
				property: 'settings',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
		required: true,
		displayOptions: { show: { resource: ['workflow'], operation: ['update'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['workflow'], operation: ['update'] } },
		options: [
			{
				displayName: 'Publish If Active',
				name: 'publishIfActive',
				type: 'boolean',
				default: true,
				description:
					"Whether to publish the update if the workflow is currently published. Set to `false` to save the change as a draft on the existing published version instead of releasing it. Has no effect on a workflow that isn't currently published.",
				routing: { send: { type: 'query', property: 'publishIfActive' } },
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['workflow'], operation: ['update'] } },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the workflow',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Node Groups',
				name: 'nodeGroups',
				type: 'json',
				default: '[]',
				description: 'Visual groupings of nodes shown as frames on the canvas',
				routing: {
					send: {
						type: 'body',
						property: 'nodeGroups',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
			{
				displayName: 'Parent Folder ID',
				name: 'parentFolderId',
				type: 'string',
				default: '',
				description:
					'ID of the folder to move the workflow into. Pass null to move it to the project root; omit to leave its current folder unchanged.',
				routing: { send: { type: 'body', property: 'parentFolderId' } },
			},
			{
				displayName: 'Pin Data',
				name: 'pinData',
				type: 'json',
				default: '{}',
				description: 'Pinned sample data for nodes, keyed by node name',
				routing: {
					send: {
						type: 'body',
						property: 'pinData',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
			{
				displayName: 'Shared',
				name: 'shared',
				type: 'json',
				default: '[]',
				description:
					'Accepted for compatibility and ignored. The owner share is derived from the target project.',
				routing: {
					send: {
						type: 'body',
						property: 'shared',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
			{
				displayName: 'Static Data',
				name: 'staticData',
				type: 'json',
				default: '{}',
				description: 'Data the workflow keeps between executions',
				routing: {
					send: {
						type: 'body',
						property: 'staticData',
						value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
					},
				},
			},
		],
	},
];
