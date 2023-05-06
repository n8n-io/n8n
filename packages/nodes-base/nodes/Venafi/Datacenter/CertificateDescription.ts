/* eslint-disable n8n-nodes-base/node-param-description-boolean-without-whether */
import type { INodeProperties } from 'n8n-workflow';

export const certificateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Provision a new certificate',
				action: 'Create a certificate',
			},
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
		default: 'create',
	},
];

export const certificateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Policy DN',
		name: 'PolicyDN',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
			},
		},
		default: '',
		description:
			'The folder DN for the new certificate. If the value is missing, the folder name is the system default. If no system default is configured',
	},
	{
		displayName: 'Subject',
		name: 'Subject',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
			},
		},
		default: '',
		description: 'The Common Name field for the certificate Subject (DN)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
			},
		},
		options: [
			{
				displayName: 'Approvers',
				name: 'Approvers',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
				description: 'An array of one or more identities for certificate workflow approvers',
			},
			{
				displayName: 'CADN',
				name: 'CADN',
				type: 'string',
				default: '',
				description:
					'Only required when no policy sets a CA template. The Distinguished Name (DN) of the Trust Protection Platform Certificate Authority Template object for enrolling the certificate.',
			},
			{
				displayName: 'Certificate Type',
				name: 'CertificateType',
				type: 'options',
				options: [
					{
						name: 'Code Signing',
						value: 'Code Signing',
						description: 'X.509 Code Signing Certificate',
					},
					{
						name: 'Device',
						value: 'Device',
						description: 'X.509 Device Certificate',
					},
					{
						name: 'Server',
						value: 'Server',
						description: 'X.509 Server Certificate',
					},
					{
						name: 'User',
						value: 'User',
						description: 'X.509 User Certificate',
					},
				],
				default: '',
				description: 'One of the following Certificate objects. Ignores any other value.',
			},
			{
				displayName: 'City',
				name: 'City',
				type: 'string',
				default: '',
				description:
					'The City field for the certificate Subject DN. Specify a value when requesting a centrally generated CSR.',
			},
			{
				displayName: 'Contacts',
				name: 'Contacts',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				description:
					'An array of one or more identities for users or groups who receive notifications about events pertaining to the object',
			},
			{
				displayName: 'Country',
				name: 'Country',
				type: 'string',
				default: '',
				description:
					'The Country field for the certificate Subject DN. Specify a value when requesting a centrally generated CSR.',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Custom Fields',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'customFielsValues',
						displayName: 'Address',
						values: [
							{
								displayName: 'Name',
								name: 'Name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Values',
								name: 'Values',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Created By',
				name: 'CreatedBy',
				type: 'string',
				default: 'Web SDK',
				description:
					'The person, entity, or caller of this request. The default is Web SDK. Avoid overriding the default unless the caller is a significant enterprise application that is tightly integrated with Trust Protection Platform, such as a custom web portal. To add details, use Origin instead. If you want both attributes to have the same value, set only CreatedBy.',
			},
			{
				displayName: 'Devices',
				name: 'Devices',
				type: 'collection',
				placeholder: 'Add Field',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Device',
				},
				default: {},
				options: [
					{
						displayName: 'Applications',
						name: 'applications',
						type: 'string',
						default: '',
						description:
							'An array of one or more Application objects to allow software, which runs on ObjectName, to use the same certificate',
					},
					{
						displayName: 'Cloud Instance ID',
						name: 'CloudInstanceID',
						type: 'string',
						default: '',
						description: 'Required for Amazon EC2 provisioning. The unique cloud instance ID.',
					},
					{
						displayName: 'Cloud Region',
						name: 'CloudRegion',
						type: 'string',
						default: '',
						description:
							'Required for Amazon EC2 provisioning. The geographic location where the cloud service instance resides. An instance in AWS can only exist in a single region.',
					},
					{
						displayName: 'Cloud Service',
						name: 'CloudService',
						type: 'string',
						default: '',
						description:
							'Required for Amazon EC2 provisioning. AWS: An Amazon E2C cloud service. Requires you to install and configure the Cloud Instance Monitoring feature.',
					},
					{
						displayName: 'Concurrent Connection Limit',
						name: 'ConcurrentConnectionLimit',
						type: 'number',
						default: 0,
						description:
							'Maximum number of connections the device will accept from Trust Protection Platform',
					},
					{
						displayName: 'Contacts',
						name: 'Contacts',
						type: 'string',
						typeOptions: {
							multipleValues: true,
						},
						default: [],
						description:
							'An array of one or more identities who receive notifications for this device',
					},
					{
						displayName: 'Created By',
						name: 'CreatedBy',
						type: 'string',
						default: 'Web SDK',
						description:
							'The person or entity that is creating the device and any associated software applications for the device. Any value is accepted. Default is Web SDK.',
					},
					{
						displayName: 'Credential DN',
						name: 'CredentialDN',
						type: 'string',
						default: '',
						description: 'The device credential',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description for this device',
					},
					{
						displayName: 'Enforce Known Host',
						name: 'EnforceKnownHost',
						type: 'boolean',
						default: true,
						description:
							'For SSH keys. true: Enable known host key enforcement. false: Disable known host key enforcement.',
					},
					{
						displayName: 'Host',
						name: 'host',
						type: 'string',
						default: '',
						description:
							'The physical Fully Qualified Domain Name (FQDN) for the host or the IP address for a device',
					},
					{
						displayName: 'Object Name',
						name: 'ObjectName',
						type: 'string',
						default: '',
						description:
							'The device host name or IP address for the certificate object in Trust Protection Platform. If the value is missing, the object name is the Subject.',
					},
					{
						displayName: 'Port',
						name: 'port',
						type: 'number',
						default: 0,
						description: 'The port number to communicate with the device',
					},
					{
						displayName: 'Sudo Credential DN',
						name: 'SudoCredentialDN',
						type: 'number',
						default: 0,
						description:
							'Use in conjunction with UseSudo. The DN that holds the password credential to be used if sudo is configured to prompt for a password when executing a command.',
					},
					{
						displayName: 'Temp Directory',
						name: 'TempDirectory',
						type: 'string',
						default: '',
						description:
							'The host directory path to hold temporary files during provisioning. For example /tmp/. The folder should have the necessary write permissions.',
					},
					{
						displayName: 'Trusted Fingerprint',
						name: 'TrustedFingerprint',
						type: 'string',
						default: '',
						description:
							'For Secure Shell (SSH) keys. The SSH server key fingerprint. If this value is set, and EnforceKnownHost is enabled, Trust Protection Platform will only successfully connect to the device if the hosts fingerprint matches this value.',
					},
					{
						displayName: 'Use Sudo',
						name: 'UseSudo',
						type: 'boolean',
						default: false,
						description:
							'Use in conjunction with SudoCredentialDN. For cases where the device credentials require sudo privilege elevation to execute commands when installing the certificate on a Unix or Linux device: true: Execute commands using sudo when provisioning. false: Execute commands directly without using sudo.',
					},
				],
			},
			{
				displayName: 'Disable Automatic Renewal',
				name: 'DisableAutomaticRenewal',
				type: 'boolean',
				default: false,
				description:
					'The setting to control whether manual intervention is required for certificate renewal',
			},
			{
				displayName: 'Elliptic Curve',
				name: 'EllipticCurve',
				type: 'options',
				options: [
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
						description:
							'Use Elliptic Prime Curve 521 bit encryption. (not supported by all Certificate Authorities).',
					},
				],
				default: '',
				description:
					'For Elliptic Curve Cryptography (ECC), use this parameter in conjunction with KeyAlgorithm',
			},
			{
				displayName: 'Key Algorithm',
				name: 'KeyAlgorithm',
				type: 'options',
				options: [
					{
						name: 'RSA',
						value: 'RSA',
						description: 'Rivest, Shamir, Adleman key (RSA)',
					},
					{
						name: 'ECC',
						value: 'ECC',
						description: 'Elliptic Curve Cryptography (ECC)',
					},
				],
				default: '',
				description: 'The encryption algorithm for the public ke:',
			},
			{
				displayName: 'Key Bit Size',
				name: 'KeyBitSize',
				type: 'number',
				default: 2048,
				description:
					'Use this parameter when KeyAlgorithm is RSA. The number of bits to allow for key generation.',
			},
			{
				displayName: 'Management Type',
				name: 'ManagementType',
				type: 'options',
				options: [
					{
						name: 'Enrollment',
						value: 'Enrollment',
						description:
							'Issue a new certificate, renewcertificate, or key generation request to a CA for enrollment',
					},
					{
						name: 'Monitoring',
						value: 'Monitoring',
						description:
							'Allow Trust Protection Platform to monitor the certificate for expiration and renewal',
					},
					{
						name: 'Provisioning',
						value: 'Provisioning',
						description:
							'Issue a new certificate, renew a certificate, or send a key generation request to a CA for enrollment. Automatically install or provision the certificate.',
					},
					{
						name: 'Unassigned',
						value: 'Unassigned',
						description:
							'Certificates are neither enrolled or monitored by Trust Protection Platform',
					},
				],
				default: '',
				description:
					'The level of management that Trust Protection Platform applies to the certificate',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: 'Web SDK',
				description:
					'Additional information, such as the name and version of the calling application, that describes the source of this enrollment, renewal, or provisioning request. The default is Web SDK.',
			},
			{
				displayName: 'Organization',
				name: 'Organization',
				type: 'string',
				default: '',
				description:
					'The Organization field for the certificate Subject DN. Specify a value when the CSR centrally generates.',
			},
			{
				displayName: 'Organizational Unit',
				name: 'OrganizationalUnit',
				type: 'string',
				default: '',
				description:
					'The department or division within the organization that is responsible for maintaining the certificate',
			},
			{
				displayName: 'PKCS10',
				name: 'PKCS10',
				type: 'string',
				default: '',
				description:
					'The PKCS#10 Certificate Signing Request (CSR). Omit escape characters such as or . If this value is provided, any Subject DN fields and the KeyBitSize in the request are ignored.',
			},
			{
				displayName: 'Reenable',
				name: 'Reenable',
				type: 'boolean',
				default: false,
				description: 'The action to control a previously disabled certificate',
			},
			{
				displayName: 'Set Work To Do',
				name: 'SetWorkToDo',
				type: 'boolean',
				default: false,
				description: 'The setting to control certificate processing',
			},
			{
				displayName: 'State',
				name: 'State',
				type: 'string',
				default: '',
				description:
					'The State field for the certificate Subject DN. Specify a value when requesting a centrally generated CSR.',
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
										name: 'OtherName',
										value: 0,
										description: 'Specify a Uniform Resource Name (URN) or username',
									},
									{
										name: 'Email',
										value: 1,
									},
									{
										name: 'DNS',
										value: 2,
									},
									{
										name: 'URI',
										value: 6,
									},
									{
										name: 'IP Address',
										value: 7,
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
								description:
									'The SAN friendly name that corresponds to the Type or TypeName parameter. For example, if a TypeName is IPAddress, the Name value is a valid IP address.',
							},
						],
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:download                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate DN',
		name: 'certificateDn',
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
		displayName: 'Include Private Key',
		name: 'includePrivateKey',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['download'],
			},
		},
		default: false,
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['download'],
				includePrivateKey: [true],
			},
		},
		default: '',
	},
	{
		displayName: 'Input Data Field Name',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['certificate'],
			},
		},
		description: 'The name of the input field containing the binary file data to be uploaded',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
				displayName: 'Include Chain',
				name: 'IncludeChain',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Root First Order',
				name: 'RootFirstOrder',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Keystore Password',
				name: 'KeystorePassword',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate GUID',
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
		description: 'A GUID that uniquely identifies the certificate',
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
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getMany'],
				resource: ['certificate'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				options: [
					{
						name: 'Issuer',
						value: 'Issuer',
					},
					{
						name: 'KeyAlgorithm',
						value: 'KeyAlgorithm',
					},
					{
						name: 'KeySize',
						value: 'KeySize',
					},
					{
						name: 'Subject',
						value: 'Subject',
					},
				],
				default: [],
				description:
					'Include one or more of the following certificate attributes in the return value',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:renew                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate DN',
		name: 'certificateDN',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['renew'],
				resource: ['certificate'],
			},
		},
		default: '',
		description: 'The Distinguished Name (DN) of the certificate to renew',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
				displayName: 'PKCS10',
				name: 'PKCS10',
				type: 'string',
				default: '',
				description:
					'The PKCS#10 Certificate Signing Request (CSR). Omit escape characters such as or . If this value is provided, any Subject DN fields and the KeyBitSize in the request are ignored.',
			},
			{
				displayName: 'Reenable',
				name: 'Reenable',
				type: 'boolean',
				default: false,
				description: 'The action to control a previously disabled certificate',
			},
		],
	},
];
