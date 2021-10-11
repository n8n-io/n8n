import {
	INodeProperties,
} from 'n8n-workflow';

export const MentionsDescription = [
			// ----------------------------------
			//         Operation: mention
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['mention'],
						api: ['rest']
					}
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry.'
					},
					{
						name: 'List',
						value: 'list',
						description: 'Get data of all entries.'
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an entry.'
					},
				],
				default: 'create',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: mention
			// ----------------------------------
			{
				displayName: 'Mentionabe Type',
				name: 'mentionable_type',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['mention'],
						api: ['rest'],
					}
				},
				description: 'The type of the mentionable.'
			},
			{
				displayName: 'Mentionable ID',
				name: 'mentionable_id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['mention'],
						api: ['rest'],
					}
				},
				description: 'The id of the mentionable.'
			},
			{
				displayName: 'Mention ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['delete'],
						resource: ['mention'],
						api: ['rest'],
					}
				},
				description: 'The id of the mention.'
			},
] as INodeProperties[];
