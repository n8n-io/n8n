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
	// CSR Builder
	{
		displayName: 'Generate CSR',
		name: 'generateCsr',
		type: 'boolean',
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
		default: false,
	},
	// Is this always going to be true?
	{
		displayName: 'VaaS Generated',
		name: 'isVaaSGenerated',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'certificateRequest',
				],
				generateCsr: [
					true,
				],
			},
		},
		default: true,
	},
	// Required
	{
		displayName: 'Application Server Type',
		name: 'applicationServerTypeId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getApplicationServerTypes',
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'certificateRequest',
				],
				generateCsr: [
					true,
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Common Name',
		name: 'commonName',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'certificateRequest',
				],
				generateCsr: [
					true,
				],
			},
		},
		type: 'string',
		default: 'your-domain.com',
	},
	// Optional...
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
				generateCsr: [
					true,
				],
			},
		},
		options: [
			{
				displayName: 'Country Code',
				name: 'country',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Locality',
				name: 'locality',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Organizational Units',
				name: 'organizationalUnits',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
			},
			{
				displayName: 'Key Curve',
				name: 'keyCurve',
				type: 'options',
				options: [
					{
						name: 'P256',
						value: 'P256',
					},
					{
						name: 'P384',
						value: 'P384',
					},
					{
						name: 'P521',
						value: 'P521',
					},
					{
						name: 'ED25519',
						value: 'ED25519',
					},
					{
						name: 'UNKNOWN',
						value: 'UNKNOWN',
					},
				],
				default: 'ED25519',
			},
			{
				displayName: 'Key Length',
				name: 'keyLength',
				type: 'number',
				default: 2048,
			},
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				options: [
					{
						name: 'EC',
						value: 'EC',
					},
					{
						name: 'RSA',
						value: 'RSA',
					},
				],
				default: 'RSA',
			},
			{
				displayName: 'Subject Alt Names',
				name: 'SubjectAltNamesUi',
				placeholder: 'Add Subject',
				type: 'fixedCollection',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'SubjectAltNamesValues',
						displayName: 'Subject alt Name',
						values: [
							{
								displayName: 'Typename',
								name: 'Typename',
								type: 'options',
								options: [
									{
										name: 'RFC822 Names',
										value: 'rfc822Names',
									},
									{
										name: 'DNS',
										value: 'dnsNames',
									},
									{
										name: 'URI',
										value: 'uniformResourceIdentifiers',
									},
									{
										name: 'IP Address',
										value: 'ipAddresses',
									},
								],
								description: 'An integer that represents the kind of SAN',
								default: '',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'The SAN friendly name that corresponds to the Type or TypeName parameter. For example, if a TypeName is IPAddress, the Name value is a valid IP address.',
							},
						],
					},
				],
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
			},
		],
	},
	// End CSR Builder
	{
		displayName: 'Certificate Signing Request',
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
				generateCsr: [
					false,
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
		description: 'Max number of results to return',
	},

] as INodeProperties[];
