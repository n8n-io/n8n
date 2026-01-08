import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import { sendErrorPostReceive } from '../../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['async'],
			},
		},
		options: [
			{
				name: 'List Async Chat Completion Requests',
				value: 'asyncList',
				action: 'List async chat completion requests',
				description: 'List all asynchronous chat completion requests',
				routing: {
					request: {
						method: 'GET',
						url: '/async/chat/completions',
					},
					output: {
						postReceive: [sendErrorPostReceive],
					},
				},
			},
			{
				name: 'Create an Async Chat Completion Request',
				value: 'asyncCreate',
				action: 'Create an async chat completion request',
				description: 'Create an asynchronous chat completion job',
				routing: {
					request: {
						method: 'POST',
						url: '/async/chat/completions',
					},
					output: {
						postReceive: [sendErrorPostReceive],
					},
				},
			},
			{
				name: 'Get Async Chat Completion Status',
				value: 'asyncGet',
				action: 'Get async chat completion status',
				description: 'Retrieve the status and result of an asynchronous chat completion job',
				routing: {
					request: {
						method: 'GET',
						url: '=/async/chat/completions/{{ $parameter.requestId }}',
					},
					output: {
						postReceive: [sendErrorPostReceive],
					},
				},
			},
		],
		default: 'asyncList',
	},

	...list.properties,
	...create.properties,
	...get.properties,
];
