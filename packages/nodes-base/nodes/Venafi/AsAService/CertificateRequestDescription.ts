import {
	INodeProperties,
} from 'n8n-workflow';

export const certificateRequestOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
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
	},
];

export const certificateRequestFields: INodeProperties[] = [
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
		required: true,
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
		default: 'n8n.io',
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
				displayName: 'Key Curve',
				name: 'keyCurve',
				type: 'options',
				options: [
					{
						name: 'ED25519',
						value: 'ED25519',
					},
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
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
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
						displayName: 'Subject Alt Name',
						values: [
							{
								displayName: 'Typename',
								name: 'Typename',
								type: 'options',
								options: [
									{
										name: 'DNS',
										value: 'dnsNames',
									},
									/*{
										name: 'IP Address',
										value: 'ipAddresses',
									},
									{
										name: 'RFC822 Names',
										value: 'rfc822Names',
									},

									{
										name: 'URI',
										value: 'uniformResourceIdentifiers',
									},*/
								],
								description: 'What type of SAN is being used',
								default: 'dnsNames',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'community.n8n.io',
								description: 'The SAN friendly name that corresponds to the Type or TypeName parameter. For example, if a TypeName is IPAddress, the Name value is a valid IP address.',
							},
						],
					},
				],
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
						name: '12 Hours',
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
		default: 50,
		description: 'Max number of results to return',
	},
];
