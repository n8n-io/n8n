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
				name: 'Upload',
				value: 'upload',
				description: 'Upload a certificate',
			},
		],
		default: 'upload',
	},
] as INodeProperties[];

export const certificateFields = [
	/* -------------------------------------------------------------------------- */
	/*                          certificate:upload                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSites',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'upload',
				],
			},
		},
		default: '',
	},
	// {
	// 	displayName: 'Take Input From Field',
	// 	name: 'binaryProperty',
	// 	type: 'string',
	// 	description: 'The field containing the binary file data to be uploaded',
	// 	default: '',
	// 	displayOptions: {
	// 		show: {
	// 			binaryData: [
	// 				true,
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'Binary Data',
	// 	name: 'binaryData',
	// 	type: 'boolean',
	// 	default: true,
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'upload',
	// 			],
	// 			resource: [
	// 				'certificate',
	// 			],
	// 		},
	// 	},
	// 	description: 'If the data to upload should be taken from binary field',
	// },
	// {
	// 	displayName: 'Binary Property',
	// 	name: 'binaryProperty',
	// 	type: 'string',
	// 	required: true,
	// 	default: 'data',
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'upload',
	// 			],
	// 			resource: [
	// 				'certificate',
	// 			],
	// 			binaryData: [
	// 				true,
	// 			],
	// 		},
	// 	},
	// 	description: 'Name of the binary property to which to write to',
	// },
	{
		displayName: 'Certificate (Base64 format)',
		name: 'certificate',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'upload',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'upload',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Passphrase',
				name: 'passphrase',
				type: 'string',
				default: '',
				description: 'The passphrase used to protect your SSL certificate',
			},
			{
				displayName: 'Private Key',
				name: 'private_key',
				type: 'string',
				default: '',
				description: 'The private key of the certificate in base64 format. Optional in case of PFX certificate file format',
			},
		],
	},

] as INodeProperties[];