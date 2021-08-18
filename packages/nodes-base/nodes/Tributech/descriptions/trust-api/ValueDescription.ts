import {
	INodeProperties,
} from 'n8n-workflow';

export const valueOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
			},
		},
		options: [
			{
				name: 'Save Values As Byte Array',
				value: 'saveValuesAsByte',
			},
			{
				name: 'Save Values As Double',
				value: 'saveValuesAsDouble',
			},
			{
				name: 'Save Values As String',
				value: 'saveValuesAsString',
			},
		],
		default: 'saveValuesAsByte',
	},
] as INodeProperties[];

export const valueFields = [
	{
		displayName: 'Precision',
		name: 'precision',
		description: 'Precision of DateTime.',
		type: 'string',
		default: 'MicroSeconds',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'saveValuesAsString',
					'saveValuesAsByte',
					'saveValuesAsDouble',
				],
			},
		},
	},
	{
		displayName: 'Proof Kind',
		name: 'proofKind',
		description: 'Specifies the kind of a signed merkle-tree root hash. It gives a hint which algorithms have been used in order to create the proof to be able to verify it accordingly. Default = SHA256_RSA2048_PSS. Available Values: 0 (=SHA256_RSA2048_PSS), 1 (=SHA256_RSA2048_PKCS1)',
		type: 'string',
		default: 'SHA256_RSA2048_PSS',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'saveValuesAsString',
					'saveValuesAsByte',
					'saveValuesAsDouble',
				],
			},
		},
	},
	{
		displayName: 'Values',
		name: 'values',
		type: 'fixedCollection',
		placeholder: 'Add Value',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'saveValuesAsString',
					'saveValuesAsByte',
					'saveValuesAsDouble',
				],
			},
		},
		options: [
			{
				displayName: 'Value',
				name: 'value',
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
						required: true,
						default: '',
					},
					{
						displayName: 'Value(s)',
						name: 'values',
						description: 'Values',
						type: 'json',
						required: true,
						default: '',
					},
				],
			},
		],
	},

] as INodeProperties[];
