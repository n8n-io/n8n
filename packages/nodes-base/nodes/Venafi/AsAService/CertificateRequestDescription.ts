import {
	INodeProperties,
} from 'n8n-workflow';

export const certificateRequestOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'certificateRequest',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new certificate request',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a certificate request',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all certificate requests',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const certificateRequestFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 certificateRequest:create                  */
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
					'create',
				],
				resource: [
					'certificateRequest',
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
					'create',
				],
				resource: [
					'certificateRequest',
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
					'create',
				],
				resource: [
					'certificateRequest',
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
					'create',
				],
				resource: [
					'certificateRequest',
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
	/* -------------------------------------------------------------------------- */
	/*                                 certificateRequest:get                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate Request ID',
		name: 'certificateRequestId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'certificateRequest',
				],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificateRequest:getAll                  */
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
					'certificateRequest',
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
				operation: [
					'getAll',
				],
				resource: [
					'certificateRequest',
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
		description: 'How many results to return',
	},
	
] as INodeProperties[];
