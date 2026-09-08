import type { INodeProperties } from 'n8n-workflow';

export const certificateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a certificate',
			},
			{
				name: 'Install',
				value: 'install',
				action: 'Install a certificate',
			},
		],
		default: 'create',
		displayOptions: {
			show: {
				resource: ['certificate'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                certificate:create                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate file name',
		name: 'certificateFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: '',
		description:
			'Name for and, optionally, path to the generated certificate file. /nsconfig/ssl/ is the default path.',
	},
	{
		displayName: 'Certificate format',
		name: 'certificateFormat',
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
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: 'PEM',
		description: 'Format in which the certificate is stored on the appliance',
	},
	{
		displayName: 'Certificate type',
		name: 'certificateType',
		type: 'options',
		options: [
			{
				name: 'Root-CA',
				value: 'ROOT_CERT',
				description:
					'You must specify the key file name. The generated Root-CA certificate can be used for signing end-user client or server certificates or to create Intermediate-CA certificates.',
			},
			{
				name: 'Intermediate-CA',
				value: 'INTM_CERT',
				description: 'Intermediate-CA certificate',
			},
			{
				name: 'Server',
				value: 'SRVR_CERT',
				description: 'SSL server certificate used on SSL servers for end-to-end encryption',
			},
			{
				name: 'Client',
				value: 'CLNT_CERT',
				description: 'End-user client certificate used for client authentication',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: 'ROOT_CERT',
	},
	{
		displayName: 'Certificate request file name',
		name: 'certificateRequestFileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
			},
		},
		description:
			'Name for and, optionally, path to the certificate-signing request (CSR). /nsconfig/ssl/ is the default path.',
	},
	{
		displayName: 'CA certificate file name',
		name: 'caCertificateFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description:
			'Name of the CA certificate file that issues and signs the Intermediate-CA certificate or the end-user client and server certificates',
	},
	{
		displayName: 'CA certificate file format',
		name: 'caCertificateFileFormat',
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
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: 'PEM',
		description: 'Format of the CA certificate',
	},
	{
		displayName: 'CA private key file name',
		name: 'caPrivateKeyFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description:
			'Private key, associated with the CA certificate that is used to sign the Intermediate-CA certificate or the end-user client and server certificate. If the CA key file is password protected, the user is prompted to enter the pass phrase that was used to encrypt the key.',
	},
	{
		displayName: 'CA private key file format',
		name: 'caPrivateKeyFileFormat',
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
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: 'PEM',
		description: 'Format of the CA certificate',
	},
	{
		displayName: 'Private key file name',
		name: 'privateKeyFileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
				certificateType: ['ROOT_CERT'],
			},
		},
		description:
			'Name for and, optionally, path to the private key. You can either use an existing RSA or DSA key that you own or create a new private key on the Netscaler ADC. This file is required only when creating a self-signed Root-CA certificate. The key file is stored in the /nsconfig/ssl directory by default.',
	},
	{
		displayName: 'CA serial file number',
		name: 'caSerialFileNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description:
			'Serial number file maintained for the CA certificate. This file contains the serial number of the next certificate to be issued or signed by the CA.',
	},
	{
		displayName: 'Private key format',
		name: 'privateKeyFormat',
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
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['ROOT_CERT'],
			},
		},
		default: 'PEM',
		description: 'Format in which the key is stored on the appliance',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'PEM passphrase (for encrypted key)',
				name: 'pempassphrase',
				type: 'string',
				displayOptions: {
					show: {
						'/certificateType': ['ROOT_CERT'],
					},
				},
				default: '',
				description:
					'Name for and, optionally, path to the private key. You can either use an existing RSA or DSA key that you own or create a new private key on the Netscaler ADC. This file is required only when creating a self-signed Root-CA certificate. The key file is stored in the /nsconfig/ssl directory by default.',
			},
			{
				displayName: 'PEM passphrase (for encrypted CA key)',
				name: 'pempassphrase',
				type: 'string',
				displayOptions: {
					hide: {
						'/certificateType': ['ROOT_CERT'],
					},
				},
				default: '',
				description:
					'Name for and, optionally, path to the private key. You can either use an existing RSA or DSA key that you own or create a new private key on the Netscaler ADC. This file is required only when creating a self-signed Root-CA certificate. The key file is stored in the /nsconfig/ssl directory by default.',
			},
			{
				displayName: 'Subject alternative name',
				name: 'subjectaltname',
				type: 'string',
				default: '',
				description:
					'Subject Alternative Name (SAN) is an extension to X.509 that allows various values to be associated with a security certificate using a subjectAltName field',
			},
			{
				displayName: 'Validity period (number of days)',
				name: 'days',
				type: 'string',
				default: '',
				description:
					'Number of days for which the certificate will be valid, beginning with the time and day (system time) of creation',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                certificate:install                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate-key pair name',
		name: 'certificateKeyPairName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		default: '',
		description: 'Name for the certificate and private-key pair',
	},
	{
		displayName: 'Certificate file name',
		name: 'certificateFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		default: '',
		description:
			'Name of and, optionally, path to the X509 certificate file that is used to form the certificate-key pair. /nsconfig/ssl/ is the default path.',
	},
	{
		displayName: 'Private key file name',
		name: 'privateKeyFileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		description:
			'Name of and, optionally, path to the X509 certificate file that is used to form the certificate-key pair. /nsconfig/ssl/ is the default path.',
	},
	{
		displayName: 'Certificate format',
		name: 'certificateFormat',
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
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		default: 'PEM',
		description:
			'Input format of the certificate and the private-key files. The three formats supported by the appliance are: PEM - Privacy Enhanced Mail DER - Distinguished Encoding Rule PFX - Personal Information Exchange.',
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
				certificateFormat: ['PEM'],
			},
		},
		default: '',
		description:
			'Input format of the certificate and the private-key files. The three formats supported by the appliance are: PEM - Privacy Enhanced Mail DER - Distinguished Encoding Rule PFX - Personal Information Exchange.',
	},
	{
		displayName: 'Notify when expires',
		name: 'notifyExpiration',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
			},
		},
		default: false,
		description: 'Whether to alert when the certificate is about to expire',
	},
	{
		displayName: 'Notification period (days)',
		name: 'notificationPeriod',
		type: 'number',
		default: 10,
		required: true,
		typeOptions: {
			minValue: 10,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
				notifyExpiration: [true],
			},
		},
		description:
			'Time, in number of days, before certificate expiration, at which to generate an alert that the certificate is about to expire',
	},
	{
		displayName: 'Certificate bundle',
		name: 'certificateBundle',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['install'],
				certificateFormat: ['PEM'],
			},
		},
		description:
			"Whether to parse the certificate chain as a single file after linking the server certificate to its issuer's certificate within the file",
	},
];
