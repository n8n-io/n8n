import {
	TaskProperties,
} from '../../Interfaces';

export const addResponseDescription: TaskProperties = [
	{
		displayName: 'ContextTypeName',
		name: 'contextTypeName',
		type: 'string',
		displayOptions: {
				show: {
						resource: [
								'task',
						],
						operation: [
							'addResponse',
						],
				},
		},
		default:'',
		description:'The Context Type Name',
	},
	{
		displayName: 'ContextReference',
		name: 'contextReference',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'addResponse',
				],
			},
		},
		default: '',
		description: 'The Context Reference',
	},
	{
		displayName: 'TaskTypeName',
		name: 'taskTypeName',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'addResponse',
				],
			},
		},
		default: '',
		description: 'The Task Type Name',
	},
	{
		displayName: 'ResponseTypeName',
		name: 'responseTypeName',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'addResponse',
				],
			},
		},
		default: '',
		description: 'The Response Type Name',
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'addResponse',
				],
			},
		},
		default: '',
		description: 'Payload parameters as JSON',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
								'task',
						],
						operation: [
								'addResponse',
						],
					},
				},
				options: [
					{
						displayName: 'SentBy',
						name: 'sentBy',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
					},
				{
					displayName: 'StartedOn',
					name: 'startedOn',
					type: 'dateTime',
					default: null,
				},
				{
					displayName: 'SentOn',
					name: 'sentOn',
					type: 'dateTime',
					default: null,
				},
		],
	},
];
