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
				name: 'Download',
				value: 'download',
				description: 'Download a document',
				action: 'Download a document from a ressource',
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
		default: 'download',
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
                value: 'clients'
            },
            {
                name: 'Vendor',
                value: 'vendors'
            },
            {
                name: 'Invoice',
                value: 'invoices'
            },
            {
                name: 'Recurring Invoice',
                value: 'recurring_invoices'
            },
            {
                name: 'Quote',
                value: 'quotes'
            },
            {
                name: 'Expense',
                value: 'expenses'
            },
            {
                name: 'Recurring Expense',
                value: 'recurring_expenses'
            },
            {
                name: 'Payment',
                value: 'payments'
            },
            {
                name: 'Project',
                value: 'projects'
            },
            {
                name: 'Task',
                value: 'tasks'
            },
            {
                name: 'Product',
                value: 'products'
            },
            {
                name: 'Purchase Order',
                value: 'purchase_orders'
            },
            {
                name: 'Credit',
                value: 'credits'
            },
            {
                name: 'Company',
                value: 'companies'
            },
            {
                name: 'Group Setting',
                value: 'group_settings'
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
	/* -------------------------------------------------------------------------- */
	/*                                 document:download                          */
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
				operation: ['download'],
			},
		},
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
];
