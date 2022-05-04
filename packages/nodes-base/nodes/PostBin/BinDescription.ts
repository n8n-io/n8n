import {
	INodeProperties
} from 'n8n-workflow';

export const binOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
				show: {
						resource: [
							'bin',
						],
				},
		},
		options: [
			{
					name: 'Create',
					value: 'create',
					description: 'Create new bin',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns information based on the binId you provide.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: `Deletes this bin and all of it's posts.`,
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
]

export const binFields: INodeProperties[] = [
	{
		displayName: 'Bin ID',
		name: 'binId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'bin',
					'request'
				],
				operation: [
					'get',
					'delete',
					'shift',
				]
			},
		},
		description: 'Unique identifier for each bin.',
	},
	{
		displayName: 'Bin content',
		name: 'binContent',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: {
				resource: [
					'bin',
				],
				operation: [
					'get',
				]
			}
		}
	}
]
