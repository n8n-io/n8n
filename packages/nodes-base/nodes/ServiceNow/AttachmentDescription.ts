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
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
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
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
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
		description: 'The table name',
	},

	/* -------------------------------------------------------------------------- */
	/*                                attachment:upload                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Record Sys ID',
		name: 'table_sys_id',
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
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
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
				displayName: 'File name for the attachment',
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
		displayName: 'Attachment Sys ID',
		name: 'attachments_sys_id',
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
		displayName: 'Attachment Sys ID',
		name: 'attachments_sys_id',
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
	{
		displayName: 'Download',
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
				],
			},
		},
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
		description: 'The max number of results to return',
	},
	{
		displayName: 'Filter',
		name: 'sysparm_query',
		type: 'string',
		default: '',
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
		description: 'An encoded query string used to filter the results. <a href="https://developer.servicenow.com/dev.do#!/learn/learning-plans/quebec/servicenow_application_developer/app_store_learnv2_rest_quebec_more_about_query_parameters">More info</a>.',
	},
];
