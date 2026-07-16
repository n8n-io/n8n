import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteTeamMembership from './delete.operation';
import * as getAll from './getAll.operation';

export { create, deleteTeamMembership as delete, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['teamMembership'],
			},
		},
		options: [
			{
				name: 'Add Member',
				value: 'create',
				description: 'Add a member to a team',
				action: 'Add a member to a team',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get team memberships',
				action: 'Get many team memberships',
			},
			{
				name: 'Remove Member',
				value: 'delete',
				description: 'Remove a member from a team',
				action: 'Remove a member from a team',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteTeamMembership.description,
	...getAll.description,
];
