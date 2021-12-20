import {
	INodeProperties,
} from 'n8n-workflow';

export const certificateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a certificate',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a certificate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a certificate',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all certificates',
			},
			{
				name: 'Renew',
				value: 'renew',
				description: 'Renew a certificate',
			},
		],
		default: 'delete',
	},
] as INodeProperties[];

export const certificateFields = [
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
				operation: [
					'download',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'certificate',
				],
			},
		},
		description: 'Name of the binary property to which to write to',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'certificate',
				],
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
				operation: [
					'get',
					'delete',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'certificate',
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
				operation: [
					'getAll',
				],
				resource: [
					'certificate',
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
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'certificate',
				],
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
		displayName: 'Application ID',
		name: 'applicationId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getApplications',
		},
		displayOptions: {
			show: {
				operation: [
					'renew',
				],
				resource: [
					'certificate',
				],
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
				operation: [
					'renew',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Certificate Issuing Template ID',
		name: 'certificateIssuingTemplateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCertificateIssuingTemplates',
		},
		displayOptions: {
			show: {
				operation: [
					'renew',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Certificatet Signing Request',
		name: 'certificateSigningRequest',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: [
					'renew',
				],
				resource: [
					'certificate',
				],
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
				operation: [
					'renew',
				],
				resource: [
					'certificate',
				],
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
						name: '12 hours',
						value: 'PT12H',
					},
				],
				default: 'P1Y',
			},
		],
	},
] as INodeProperties[];