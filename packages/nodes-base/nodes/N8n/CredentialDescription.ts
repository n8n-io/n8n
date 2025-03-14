import type { INodeProperties } from 'n8n-workflow';

import { parseAndSetBodyJson } from './GenericFunctions';

export const credentialOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: {
			show: {
				resource: ['credential'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a credential',
				routing: {
					request: {
						method: 'POST',
						url: '/credentials',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a credential',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/credentials/{{ $parameter.credentialId }}',
					},
				},
			},
			{
				name: 'Get Schema',
				value: 'getSchema',
				action: 'Get credential data schema for type',
				routing: {
					request: {
						method: 'GET',
						url: '=/credentials/schema/{{ $parameter.credentialTypeName }}',
					},
				},
			},
		],
	},
];

const createOperation: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. n8n account',
		required: true,
		displayOptions: {
			show: {
				resource: ['credential'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					name: '={{ $value }}',
				},
			},
		},
		description: 'Name of the new credential',
	},
	{
		displayName: 'Credential Type',
		name: 'credentialTypeName',
		type: 'string',
		placeholder: 'e.g. n8nApi',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['credential'],
				operation: ['create'],
			},
		},
		routing: {
			request: {
				body: {
					type: '={{ $value }}',
				},
			},
		},
		description:
			"The available types depend on nodes installed on the n8n instance. Some built-in types include e.g. 'githubApi', 'notionApi', and 'slackApi'.",
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '',
		placeholder:
			'// e.g. for n8nApi \n{\n  "apiKey": "my-n8n-api-key",\n  "baseUrl": "https://<name>.app.n8n.cloud/api/v1",\n}',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['credential'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				// Validate that the 'data' property is parseable as JSON and
				// set it into the request as body.data.
				preSend: [parseAndSetBodyJson('data', 'data')],
			},
		},
		description:
			"A valid JSON object with properties required for this Credential Type. To see the expected format, you can use 'Get Schema' operation.",
	},
];

const deleteOperation: INodeProperties[] = [
	{
		displayName: 'Credential ID',
		name: 'credentialId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['credential'],
				operation: ['delete'],
			},
		},
	},
];

const getSchemaOperation: INodeProperties[] = [
	{
		displayName: 'Credential Type',
		name: 'credentialTypeName',
		default: '',
		placeholder: 'e.g. n8nApi',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				resource: ['credential'],
				operation: ['getSchema'],
			},
		},
		description:
			"The available types depend on nodes installed on the n8n instance. Some built-in types include e.g. 'githubApi', 'notionApi', and 'slackApi'.",
	},
];

export const credentialFields: INodeProperties[] = [
	...createOperation,
	...deleteOperation,
	...getSchemaOperation,
];
