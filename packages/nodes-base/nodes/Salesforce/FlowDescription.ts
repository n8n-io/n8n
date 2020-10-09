import { INodeProperties } from 'n8n-workflow';

export const flowOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'flow',
				],
			},
		},
		options: [
			{
				name: 'Invoke',
				value: 'invoke',
				description: 'Invoke a flow',
            },
            {
				name: 'List',
				value: 'list',
				description: 'List flows',
			},
		],
		default: 'invoke',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const flowFields = [

/* -------------------------------------------------------------------------- */
/*                                flow:invoke                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'API Name',
		name: 'apiName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'flow',
				],
				operation: [
					'invoke'
				],
			},
		},
		description: 'Required. API name of the flow.',
	},
	{
		displayName: 'JSON/RAW Inputs',
		name: 'jsonInputVariables',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'flow',
				],
				operation: [
					'invoke'
				],
			},
		},
		description: 'If the input variables should be set via the value-key pair UI or JSON/RAW.',
	},
	{
		displayName: 'Input Variables',
		name: 'inputVariables',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'flow',
				],
				operation: [
					'invoke'
				],
				jsonInputVariables: [
					true,
				],
			},
		},
		default: '',
		description: 'Input variables as JSON object',
	},
	{
		displayName: 'Input Variables',
		name: 'inputVariablesUi',
		placeholder: 'Add Input Variable',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'flow',
				],
				operation: [
					'invoke'
				],
				jsonInputVariables: [
					false,
				],
			},
		},
		description: 'The input variable to send.',
		default: {},
		options: [
			{
				name: 'inputVariable',
				displayName: 'Input Variable',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the input variable.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the input variable.',
					},
				]
			},
		],
	},
] as INodeProperties[];
