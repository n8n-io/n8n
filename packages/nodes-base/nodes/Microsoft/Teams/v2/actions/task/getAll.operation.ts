import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { groupRLC, planRLC } from '../../descriptions';
import {
	buildTeamsPath,
	getTeamsCredentialType,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	SERVICE_PRINCIPAL_AUTH,
	SP_HIDE,
} from '../../transport';
import { byIdUnderSp } from './helpers';

const properties: INodeProperties[] = [
	{
		displayName: 'Tasks For',
		name: 'tasksFor',
		default: 'member',
		required: true,
		type: 'options',
		description: 'Whether to retrieve the tasks for a user or for a plan',
		options: [
			{
				name: 'Group Member',
				value: 'member',
				description: 'Tasks assigned to group member',
			},
			{
				name: 'Plan',
				value: 'plan',
				description: 'Tasks in group plan',
			},
		],
		// App-only Graph has no `/me`, so "Group Member" mode (which reads /v1.0/me)
		// has no app-only form — hidden under the Service Principal credential, which
		// is forced to plan mode in execute.
		displayOptions: {
			hide: {
				...SP_HIDE,
			},
		},
	},
	{
		// The group picker (member mode, and the dependency for the OAuth2 plan picker)
		// is part of the member-mode flow that has no app-only form — hidden under the
		// Service Principal credential, which is forced to plan mode in execute.
		...groupRLC,
		displayOptions: {
			hide: {
				...SP_HIDE,
			},
		},
	},
	{
		...planRLC,
		displayOptions: {
			show: {
				tasksFor: ['plan'],
			},
			hide: {
				...SP_HIDE,
			},
		},
	},
	// Plan picker shown under the Service Principal credential (which has no `tasksFor`
	// selector). By-ID — plan mode is forced in execute and the value routes through
	// `buildTeamsPath`. (See `byIdUnderSp` for why list mode is dropped under SP.)
	byIdUnderSp(planRLC),
	...returnAllOrLimit,
];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// App-only Graph has no `/me`, so "Group Member" mode is unavailable; force plan
	// mode (and never read the hidden `tasksFor`) under the Service Principal credential.
	const isServicePrincipal = getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH;
	const tasksFor = isServicePrincipal ? 'plan' : (this.getNodeParameter('tasksFor', i) as string);
	const returnAll = this.getNodeParameter('returnAll', i);

	if (tasksFor === 'member') {
		//https://docs.microsoft.com/en-us/graph/api/planneruser-list-tasks?view=graph-rest-1.0&tabs=http
		const memberId = ((await microsoftApiRequest.call(this, 'GET', '/v1.0/me')) as { id: string })
			.id;
		if (returnAll) {
			return await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/v1.0/users/${memberId}/planner/tasks`,
			);
		} else {
			const limit = this.getNodeParameter('limit', i);
			// Planner endpoints don't support OData query params like $top;
			// the limit still stops pagination early
			return await microsoftApiRequestAllItems.call(
				this,
				'value',
				'GET',
				`/v1.0/users/${memberId}/planner/tasks`,
				{},
				{},
				limit,
			);
		}
	} else {
		//https://docs.microsoft.com/en-us/graph/api/plannerplan-list-tasks?view=graph-rest-1.0&tabs=http
		const planId = this.getNodeParameter('planId', i, '', { extractValue: true }) as string;
		const endpoint = buildTeamsPath.call(this, ['/v1.0/planner/plans/', { id: planId }, '/tasks']);
		if (returnAll) {
			return await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint);
		} else {
			const limit = this.getNodeParameter('limit', i);
			return await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint, {}, {}, limit);
		}
	}
}
