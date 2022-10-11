import { INodeProperties } from 'n8n-workflow';

export const certificateRequestOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: ['certificateRequest'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new certificate request',
				action: 'Create a certificate request',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a certificate request',
				action: 'Get a certificate request',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve many certificate requests',
				action: 'Get many certificate requests',
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
		displayName: 'Application Name or ID',
		name: 'applicationId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getApplications',
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificateRequest'],
			},
		},
		default: '',
	},
	{
		displayName: 'Certificate Issuing Template Name or ID',
		name: 'certificateIssuingTemplateId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getCertificateIssuingTemplates',
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificateRequest'],
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
				operation: ['create'],
				resource: ['certificateRequest'],
			},
		},
		default: false,
	},
	{
		displayName: 'Application Server Type Name or ID',
		name: 'applicationServerTypeId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getApplicationServerTypes',
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificateRequest'],
				generateCsr: [true],
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
				operation: ['create'],
				resource: ['certificateRequest'],
				generateCsr: [true],
			},
		},
		type: 'string',
		default: 'n8n.io',
		description: 'The Common Name field for the certificate Subject (CN)',
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
				operation: ['create'],
				resource: ['certificateRequest'],
				generateCsr: [true],
			},
		},
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'A 2 letter country code',
			},
			{
				displayName: 'Key Curve',
				name: 'keyCurve',
				type: 'options',
				options: [
					{
						name: 'ED25519',
						value: 'ED25519',
						description: 'Use Edwards-curve Digital Signature Algorithm (EdDSA)',
					},
					{
						name: 'P256',
						value: 'P256',
						description: 'Use Elliptic Prime Curve 256 bit encryption',
					},
					{
						name: 'P384',
						value: 'P384',
						description: 'Use Elliptic Prime Curve 384 bit encryption',
					},
					{
						name: 'P521',
						value: 'P521',
						description: 'Use Elliptic Prime Curve 521 bit encryption',
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
				description: 'The number of bits to allow for key generation',
			},
			{
				displayName: 'Key Type',
				name: 'keyType',
				type: 'options',
				options: [
					{
						name: 'EC',
						value: 'EC',
						description: 'Elliptic Curve (EC)',
					},
					{
						name: 'RSA',
						value: 'RSA',
						description: 'Rivest, Shamir, Adleman key (RSA)',
					},
				],
				default: 'RSA',
				description: 'The encryption algorithm for the public key',
			},
			{
				displayName: 'Locality',
				name: 'locality',
				type: 'string',
				default: '',
				description: 'The name of a city or town',
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'string',
				default: '',
				description: 'The name of a company or organization',
			},
			{
				displayName: 'Organizational Units',
				name: 'organizationalUnits',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
				description: 'The name of a department or section',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
				description: 'The name of a state or province',
			},
			{
				displayName: 'Subject Alt Names',
				name: 'SubjectAltNamesUi',
				placeholder: 'Add Subject',
				type: 'fixedCollection',
				default: {},
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
								description:
									'The SAN friendly name that corresponds to the Type or TypeName parameter. For example, if a TypeName is IPAddress, the Name value is a valid IP address.',
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
				operation: ['create'],
				resource: ['certificateRequest'],
				generateCsr: [false],
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
				operation: ['create'],
				resource: ['certificateRequest'],
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
				operation: ['get'],
				resource: ['certificateRequest'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificateRequest:getMany                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getMany'],
				resource: ['certificateRequest'],
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
				resource: ['certificateRequest'],
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
];
