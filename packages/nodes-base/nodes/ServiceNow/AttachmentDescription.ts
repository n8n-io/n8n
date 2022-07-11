import {
	INodeProperties,
} from 'n8n-workflow';

export const attachmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
			},
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload an attachment to a specific table record',
				action: 'Upload an attachment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an attachment',
				action: 'Delete an attachment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an attachment',
				action: 'Get an attachment',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all attachments on a table',
				action: 'Get all attachments',
			},
		],
		default: 'upload',
	},
];

export const attachmentFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                            attachment common fields                        */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Table Name or ID',
		name: 'tableName',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'upload',
					'getAll',
				],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                attachment:upload                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Record ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'upload',
				],
			},
		},
		required: true,
		description: 'Sys_id of the record in the table specified in Table Name that you want to attach the file to',
	},
	{
		displayName: 'Input Data Field Name',
		name: 'inputDataFieldName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'upload',
				],
			},
		},
		description: 'Name of the binary property that contains the data to upload',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'upload',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'File Name for the Attachment',
				name: 'file_name',
				type: 'string',
				default: '',
				description: 'Name to give the attachment',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                attachment:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
		description: 'Sys_id value of the attachment to delete',
	},
	/* -------------------------------------------------------------------------- */
	/*                                attachment:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
		description: 'Sys_id value of the attachment to delete',
	},
	/* -------------------------------------------------------------------------- */
	/*                                attachment:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'attachment',
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
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Download Attachments',
		name: 'download',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'get',
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Output Field',
		name: 'outputField',
		type: 'string',
		default: 'data',
		description: 'Field name where downloaded data will be placed',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'get',
					'getAll',
				],
				download: [
					true,
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'get', 'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Filter',
				name: 'queryFilter',
				type: 'string',
				placeholder: '<col_name><operator><value>',
				default: '',
				description: 'An encoded query string used to filter the results',
				hint: 'All parameters are case-sensitive. Queries can contain more than one entry. <a href="https://developer.servicenow.com/dev.do#!/learn/learning-plans/quebec/servicenow_application_developer/app_store_learnv2_rest_quebec_more_about_query_parameters">more information</a>.',
			},
		],
	},
];
