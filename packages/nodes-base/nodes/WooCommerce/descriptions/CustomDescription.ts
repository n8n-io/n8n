import { INodeProperties } from 'n8n-workflow';

export const customOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a resource',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a resource',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a resource',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all resources',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a resource',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const customFields = [

/* -------------------------------------------------------------------------- */
/*              	 			custom: create		     						*/
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Resource Path',
		name: 'resourcePath',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The path to the custom resource after the domain name',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'create',
				],
			},
		},
		default: false,
		description: 'If the query and/or body parameter should be set via the value-key pair UI or JSON.',
	},

	// Query Parameters
	{
		displayName: 'Query Parameters',
		name: 'queryParametersJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Query parameters as JSON (flat object).',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParametersUi',
		placeholder: 'Add Parameter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		description: 'The query parameter to send.',
		default: {},
		options: [
			{
				name: 'parameter',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the parameter.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the parameter.',
					},
				],
			},
		],
	},

	// Body Parameters
	{
		displayName: 'Body Parameters',
		name: 'bodyParametersJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Body parameters as JSON or RAW.',
	},
	{
		displayName: 'Body Parameters',
		name: 'bodyParametersUi',
		placeholder: 'Add Parameter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		description: 'The body parameter to send.',
		default: {},
		options: [
			{
				name: 'parameter',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the parameter.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the parameter.',
					},
				],
			},
		],
	},


/* -------------------------------------------------------------------------- */
/*              	 			custom: update      							*/
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Resource Path',
		name: 'resourcePath',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'The path to the custom resource after the domain name',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'update',
				],
			},
		},
		default: false,
		description: 'If the query and/or body parameter should be set via the value-key pair UI or JSON.',
	},

	// Query Parameters
	{
		displayName: 'Query Parameters',
		name: 'queryParametersJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Query parameters as JSON (flat object).',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParametersUi',
		placeholder: 'Add Parameter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					false,
				],
			},
		},
		description: 'The query parameter to send.',
		default: {},
		options: [
			{
				name: 'parameter',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the parameter.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the parameter.',
					},
				],
			},
		],
	},

	// Body Parameters
	{
		displayName: 'Body Parameters',
		name: 'bodyParametersJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Body parameters as JSON or RAW.',
	},
	{
		displayName: 'Body Parameters',
		name: 'bodyParametersUi',
		placeholder: 'Add Parameter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					false,
				],
			},
		},
		description: 'The body parameter to send.',
		default: {},
		options: [
			{
				name: 'parameter',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the parameter.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the parameter.',
					},
				],
			},
		],
	},


/* -------------------------------------------------------------------------- */
/*              				 custom:get						    			*/
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Resource Path',
		name: 'resourcePath',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'The path to the custom resource after the domain name',
	},

/* -------------------------------------------------------------------------- */
/*              				 custom:delete						    		*/
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Resource Path',
		name: 'resourcePath',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'The path to the custom resource after the domain name',
	},

/* -------------------------------------------------------------------------- */
/*              				 custom:getAll   				 				*/
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Resource Path',
		name: 'resourcePath',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: '',
		description: 'The path to the custom resource after the domain name',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If the query and/or body parameter should be set via the value-key pair UI or JSON.',
	},

	// Query Parameters
	{
		displayName: 'Query Parameters',
		name: 'queryParametersJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'getAll',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Query parameters as JSON (flat object).',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParametersUi',
		placeholder: 'Add Parameter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'custom',
				],
				operation: [
					'getAll',
				],
				jsonParameters: [
					false,
				],
			},
		},
		description: 'The query parameter to send.',
		default: {},
		options: [
			{
				name: 'parameter',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the parameter.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the parameter.',
					},
				],
			},
		],
	},


] as INodeProperties[];
