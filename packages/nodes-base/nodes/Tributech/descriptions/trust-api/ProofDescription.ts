import {
	INodeProperties,
} from 'n8n-workflow';

export const proofOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		description: 'The operation that should be executed',
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
				name: 'Get Proof',
				description: 'Get Proof',
				value: 'getProof',
			},
			{
				name: 'Get Proof With Values',
				description: 'Get Proof With Values',
				value: 'getProofWithValues',
			},
			{
				name: 'Save Proofs',
				description: 'Save Proofs',
				value: 'saveProofs',
			},
			{
				name: 'Validate Proof',
				description: 'Validate Proof',
				value: 'validateProofs',
			},
			{
				name: 'Validate Stream',
				description: 'Validate Stream',
				value: 'validateStream',
			},
		],
		default: 'validateProofs',
	},
] as INodeProperties[];

export const proofFields = [
	{
		displayName: 'ValueMetadata ID',
		name: 'valueMetadataId',
		description: 'ValueMetadata ID',
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
					'validateStream',
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
		displayName: 'From',
		name: 'from',
		description: 'The point in time starting the validation',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'validateStream',
				],
			},
		},
	},
	{
		displayName: 'To',
		name: 'to',
		description: 'The point in time ending the validation',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'validateStream',
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
					'validateStream',
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
					'validateStream',
				],
			},
		},
	},
	{
		displayName: 'Custom Public Key',
		name: 'customKey',
		description: 'Custom Public Key',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'validateProofs',
					'validateStream',
				],
			},
		},
	},
	{
		displayName: 'Public Key',
		name: 'publicKey',
		description: 'Public Key',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'proof',
				],
				operation: [
					'validateProofs',
					'validateStream',
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
		description: 'Collection of proofs to validate.',
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
						description: 'ValueMetadata ID',
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
		description: 'Collection of proofs to save.',
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
						displayName: 'Last Timestamp',
						name: 'lastTimestamp',
						description: 'Last Timestamp',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Merkel Tree Depth',
						name: 'merkelTreeDepth',
						description: 'Merkel Tree Depth',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Proof ID',
						name: 'id',
						description: 'Proof ID',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Root Hash',
						name: 'rootHash',
						description: 'Root Hash',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Signature',
						name: 'signature',
						description: 'Signature',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'ValueMetadata ID',
						name: 'valueMetadataId',
						description: 'ValueMetadata ID',
						type: 'string',
						required: true,
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
