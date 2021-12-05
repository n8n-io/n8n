import {
	INodeProperties,
} from 'n8n-workflow';

export const operations = [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'form',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a form definition',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
					},
				},
				options: [
					{
						name: 'Query',
						value: 'query',
						description: 'Query matching submissions',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a single submission',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a single submission',
					},
					{
						name: 'Get Validation Status',
						value: 'get_validation',
						description: 'Get the validation status for the submission',
					},
					{
						name: 'Update Validation Status',
						value: 'set_validation',
						description: 'Set the validation status of the submission',
					},
				],
				default: 'query',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'attachment',
						],
					},
				},
				options: [
					{
						name: 'Download',
						value: 'download',
						description: 'Download all attachments of a given submission',
					},
				],
				default: 'download',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'hook',
						],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List all hooks on a form',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a single hook definition',
					},
					{
						name: 'Retry All',
						value: 'retry_all',
						description: 'Retry all failed attempts for a given hook',
					},
					{
						name: 'Retry One',
						value: 'retry_one',
						description: 'Retry a specific hook',
					},
					{
						name: 'Logs',
						value: 'logs',
						description: 'Get hook logs',
					},
				],
				default: 'list',
				description: 'The operation to perform.',
			},
] as INodeProperties[];
