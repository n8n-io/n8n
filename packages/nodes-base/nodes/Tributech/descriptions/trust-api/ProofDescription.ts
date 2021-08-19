import {
	INodeProperties,
} from 'n8n-workflow';

export const proofOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
			},
		},
		options: [
			{
				name: 'Get Proof With Values',
				value: 'getProofWithValues',
			},
			{
				name: 'Get Proof',
				value: 'getProof',
			},
			{
				name: 'Validate Proof',
				value: 'validateProofs',
			},
			{
				name: 'Save Proofs',
				value: 'saveProofs',
			},
		],
		default: 'validateProofs',
	},
] as INodeProperties[];

export const proofFields = [
	{
		displayName: 'ValueMetadata ID',
		name: 'valueMetadataId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'getProofWithValues',
					'getProof',
				],
			},
		},
	},
	{
		displayName: 'Timestamp',
		name: 'timestamp',
		description: 'Point in time of which the proof should be validated / fetched',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'getProofWithValues',
					'getProof',
				],
			},
		},
	},
	{
		displayName: 'Precision',
		name: 'precision',
		description: 'Precision of DateTime. Default = MicroSeconds. Available Values: 1 (=Microseconds), 2 (=Nanoseconds).',
		type: 'string',
		default: 'Microseconds',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'getProofWithValues',
					'validateProofs',
				],
			},
		},
	},
	{
		displayName: 'proofKind',
		name: 'proofKind',
		description: 'Specifies the kind of a signed merkle-tree root hash. It gives a hint which algorithms have been used in order to create the proof to be able to verify it accordingly. Default = SHA256_RSA2048_PSS. Available Values: 0 (=SHA256_RSA2048_PSS), 1 (=SHA256_RSA2048_PKCS1)',
		type: 'string',
		default: 'SHA256_RSA2048_PSS',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'validateProofs',
				],
			},
		},
	},
	{
		displayName: 'Custom Public Key',
		name: 'customKey',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'validateProofs',
				],
			},
		},
	},
	{
		displayName: 'Public Key',
		name: 'publicKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'validateProofs',
				],
				customKey: [
					true,
				],
			},
		},
	},
	{
		displayName: 'Proofs',
		name: 'proofs',
		type: 'fixedCollection',
		placeholder: 'Add Proof',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'validateProofs',
				],
			},
		},
		options: [
			{
				displayName: 'Proof',
				name: 'keys',
				values: [
					{
						displayName: 'ValueMetadata ID',
						name: 'valueMetadataId',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						description: 'Timestamp',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Proofs',
		name: 'proofs',
		type: 'fixedCollection',
		placeholder: 'Add Proof',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'saveProofs',
				],
			},
		},
		options: [
			{
				displayName: 'Proof',
				name: 'keys',
				values: [
					{
						displayName: 'ValueMetadata ID',
						name: 'valueMetadataId',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Last Timestamp',
						name: 'lastTimestamp',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Merkel Tree Depth',
						name: 'merkelTreeDepth',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Proof Id',
						name: 'id',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Root Hash',
						name: 'rootHash',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Signature',
						name: 'signature',
						type: 'string',
						required: true,
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
