import type { INodeProperties } from 'n8n-workflow';

import * as apiCall from './apiCall.operation';
import * as collaborator from './collaborator.operation';
import * as metadata from './metadata.operation';
import * as snapshot from './snapshot.operation';

export { snapshot, metadata, apiCall, collaborator };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['base'],
			},
		},
		options: [
			{
				name: 'Snapshot',
				value: 'snapshot',
				description: 'Create a snapshot of the base',
				action: 'Create a snapshot',
			},
			{
				name: 'Metadata',
				value: 'metadata',
				description: 'Get the complete metadata of the base',
				action: 'Get metadata of a base',
			},
			{
				name: 'API Call',
				value: 'apiCall',
				description: 'Perform an authorized API call (Base Operation)',
				action: 'Make an api call',
			},
			{
				name: 'Collaborator',
				value: 'collaborator',
				description: 'Get this username from the email or name of a collaborator',
				action: 'Get username from email or name',
			},
		],
		default: 'snapshot',
	},
	...snapshot.description,
	...metadata.description,
	...apiCall.description,
	...collaborator.description,
];
