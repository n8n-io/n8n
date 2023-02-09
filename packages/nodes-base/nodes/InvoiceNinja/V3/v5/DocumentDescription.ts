import type { INodeProperties } from 'n8n-workflow';

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Document',
				action: 'Delete a Document',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a document',
				action: 'Get a document',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many documents',
				action: 'Get many documents',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a document',
				action: 'Upload a document to a ressource',
			},
		],
		default: 'get',
	},
];

export const documentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  document:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'perPage',
		type: 'number',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['getAll'],
			},
			hide: {
				returnAll: [true],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 document:upload                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Upload Ressource',
		name: 'uploadRessource',
		type: 'options',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['upload'],
			},
		},
		options: [
			{
				name: 'Client',
				value: 'clients',
			},
			{
				name: 'Company',
				value: 'companies',
			},
			{
				name: 'Credit',
				value: 'credits',
			},
			{
				name: 'Expense',
				value: 'expenses',
			},
			{
				name: 'Group Setting',
				value: 'group_settings',
			},
			{
				name: 'Invoice',
				value: 'invoices',
			},
			{
				name: 'Payment',
				value: 'payments',
			},
			{
				name: 'Product',
				value: 'products',
			},
			{
				name: 'Project',
				value: 'projects',
			},
			{
				name: 'Purchase Order',
				value: 'purchase_orders',
			},
			{
				name: 'Quote',
				value: 'quotes',
			},
			{
				name: 'Recurring Expense',
				value: 'recurring_expenses',
			},
			{
				name: 'Recurring Invoice',
				value: 'recurring_invoices',
			},
			{
				name: 'Task',
				value: 'tasks',
			},
			{
				name: 'Vendor',
				value: 'vendors',
			},
		],
	},
	{
		displayName: 'Upload Ressource ID',
		name: 'uploadRessourceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'Binary Property Name',
		name: 'binaryPropertyName',
		description: 'Name of the binary property which containsthe data for the file to be uploaded',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'customFileName',
		description:
			'Name of the file to be uploaded. If empty, the filename of the binary-property is used.',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['upload'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 document:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Download File',
		name: 'download',
		type: 'boolean',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['get'],
			},
		},
		default: false,
	},
	/* -------------------------------------------------------------------------- */
	/*                                 document:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName:
			'<strong>Warning</strong><br />You will physical delete this file. This cannot be restored.',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['document'],
				operation: ['delete'],
			},
		},
		default: '',
	},
];
