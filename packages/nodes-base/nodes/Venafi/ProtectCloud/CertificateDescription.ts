import type { INodeProperties } from 'n8n-workflow';

export const certificateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: ['certificate'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a certificate',
				action: 'Delete a certificate',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a certificate',
				action: 'Download a certificate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a certificate',
				action: 'Get a certificate',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve many certificates',
				action: 'Get many certificates',
			},
			{
				name: 'Renew',
				value: 'renew',
				description: 'Renew a certificate',
				action: 'Renew a certificate',
			},
		],
		default: 'delete',
	},
];

export const certificateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                          certificate:download                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate ID',
		name: 'certificateId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
			},
		},
		default: '',
	},
	{
		displayName: 'Download Item',
		name: 'downloadItem',
		type: 'options',
		options: [
			{
				name: 'Certificate',
				value: 'certificate',
			},
			{
				name: 'Keystore',
				value: 'keystore',
			},
		],
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
			},
		},
		default: 'certificate',
	},
	{
		displayName: 'Keystore Type',
		name: 'keystoreType',
		type: 'options',
		options: [
			{
				name: 'JKS',
				value: 'JKS',
			},
			{
				name: 'PKCS12',
				value: 'PKCS12',
			},
			{
				name: 'PEM',
				value: 'PEM',
			},
		],
		default: 'PEM',
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
				downloadItem: ['keystore'],
			},
		},
	},
	{
		displayName: 'Certificate Label',
		name: 'certificateLabel',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
				downloadItem: ['keystore'],
			},
		},
		default: '',
	},
	{
		displayName: 'Private Key Passphrase',
		name: 'privateKeyPassphrase',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
				downloadItem: ['keystore'],
			},
		},
		default: '',
	},
	{
		displayName: 'Keystore Passphrase',
		name: 'keystorePassphrase',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
				downloadItem: ['keystore'],
				keystoreType: ['JKS'],
			},
		},
		default: '',
	},
	{
		displayName: 'Input Data Field Name',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
			},
		},
		required: true,
		description: 'The name of the input field containing the binary file data to be uploaded',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
			},
		},
		options: [
			{
				displayName: 'Chain Order',
				name: 'chainOrder',
				type: 'options',
				options: [
					{
						name: 'EE_FIRST',
						value: 'EE_FIRST',
						description: 'Download the certificate with the end-entity portion of the chain first',
					},
					{
						name: 'EE_ONLY',
						value: 'EE_ONLY',
						description: 'Download only the end-entity certificate',
					},
					{
						name: 'ROOT_FIRST',
						value: 'ROOT_FIRST',
						description: 'Download the certificate with root portion of the chain first',
					},
				],
				default: 'ROOT_FIRST',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'PEM',
						value: 'PEM',
					},
					{
						name: 'DER',
						value: 'DER',
					},
				],
				default: 'PEM',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate ID',
		name: 'certificateId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get', 'delete'],
				resource: ['certificate'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:getMany                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getMany'],
				resource: ['certificate'],
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
				operation: ['getMany'],
				resource: ['certificate'],
				returnAll: [false],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['getMany'],
				resource: ['certificate'],
			},
		},
		options: [
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:renew                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Application Name or ID',
		name: 'applicationId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getApplications',
		},
		displayOptions: {
			show: {
				operation: ['renew'],
				resource: ['certificate'],
			},
		},
		default: '',
	},
	{
		displayName: 'Existing Certificate ID',
		name: 'existingCertificateId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['renew'],
				resource: ['certificate'],
			},
		},
		default: '',
	},
	{
		displayName: 'Certificate Issuing Template Name or ID',
		name: 'certificateIssuingTemplateId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getCertificateIssuingTemplates',
		},
		displayOptions: {
			show: {
				operation: ['renew'],
				resource: ['certificate'],
			},
		},
		default: '',
	},
	{
		displayName: 'Certificate Signing Request',
		name: 'certificateSigningRequest',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['renew'],
				resource: ['certificate'],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['renew'],
				resource: ['certificate'],
			},
		},
		options: [
			{
				displayName: 'Validity Period',
				name: 'validityPeriod',
				type: 'options',
				options: [
					{
						name: '1 Year',
						value: 'P1Y',
					},
					{
						name: '10 Days',
						value: 'P10D',
					},
					{
						name: '12 Hours',
						value: 'PT12H',
					},
				],
				default: 'P1Y',
			},
		],
	},
];
