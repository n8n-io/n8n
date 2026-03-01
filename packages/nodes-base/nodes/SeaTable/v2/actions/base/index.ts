import type { INodeProperties } from 'n8n-workflow';

import * as collaborator from './collaborator.operation';
import * as metadata from './metadata.operation';
import * as snapshot from './snapshot.operation';

export { snapshot, metadata, collaborator };

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
				name: 'Collaborator',
				value: 'collaborator',
				description: 'Get the username from the email or name of a collaborator',
				action: 'Get username from email or name',
			},
		],
		default: 'snapshot',
	},
	...snapshot.description,
	...metadata.description,
	...collaborator.description,
];
