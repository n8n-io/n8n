import { DateTime } from 'luxon';
import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { bucketRLC, groupRLC, memberRLC, planRLC } from '../../descriptions';
import {
	buildTeamsPath,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
	SP_HIDE,
	validateTaskBodyIdsUnderSp,
} from '../../transport';

// SP-shown By-ID copy of an RLC inside the updateFields collection: app-only has no
// group-scoped list to depend on, so drop list mode + `loadOptionsDependsOn` and
// default to By-ID, mirroring task:getAll / task:create.
const byIdUnderSp = (
	rlc: INodeProperties,
	overrides: Partial<INodeProperties> = {},
): INodeProperties => ({
	...rlc,
	...overrides,
	default: { mode: 'id', value: '' },
	modes: (rlc.modes ?? []).filter((mode) => mode.name === 'id'),
	typeOptions: undefined,
	displayOptions: {
		show: {
			'/authentication': [SERVICE_PRINCIPAL_AUTH],
		},
	},
});

const properties: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. h3ufgLvXPkSRzYm-zO5cY5gANtBQ',
		description: 'The ID of the task to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				...memberRLC,
				displayName: 'Assigned To',
				name: 'assignedTo',
				description: 'Who the task should be assigned to',
				hint: "Select 'Team' from options first",
				required: false,
				typeOptions: {
					loadOptionsDependsOn: ['updateFields.groupId.value'],
				},
			},
			// OAuth2 bucket picker (list, depends on plan) — hidden under SP.
			{
				...bucketRLC,
				required: false,
				typeOptions: {
					loadOptionsDependsOn: ['updateFields.planId.value'],
				},
				displayOptions: { hide: { ...SP_HIDE } },
			},
			// SP bucket picker: By-ID.
			byIdUnderSp(bucketRLC, { required: false }),
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'string',
				validateType: 'dateTime',
				default: '',
				description:
					'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.',
			},
			// Group picker is OAuth2-only (used to scope the plan/bucket lists); hidden
			// under SP, which uses By-ID plan/bucket.
			{
				...groupRLC,
				required: false,
				typeOptions: {
					loadOptionsDependsOn: ['/groupSource'],
				},
				displayOptions: { hide: { ...SP_HIDE } },
			},
			{
				displayName: 'Percent Complete',
				name: 'percentComplete',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: 0,
				placeholder: 'e.g. 75',
				description:
					'Percentage of task completion. When set to 100, the task is considered completed.',
			},
			// OAuth2 plan picker (list, depends on group) — hidden under SP.
			{
				...planRLC,
				required: false,
				hint: "Select 'Team' from options first",
				typeOptions: {
					loadOptionsDependsOn: ['updateFields.groupId.value'],
				},
				displayOptions: { hide: { ...SP_HIDE } },
			},
			// SP plan picker: By-ID.
			byIdUnderSp(planRLC, { required: false }),
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'e.g. my task',
				description: 'Title of the task',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['task'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://docs.microsoft.com/en-us/graph/api/plannertask-update?view=graph-rest-1.0&tabs=http

	const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true }) as string;
	const updateFields = this.getNodeParameter('updateFields', i);

	for (const key of Object.keys(updateFields)) {
		if (key === 'groupId') {
			// tasks are assigned to a plan and bucket, group is used for filtering
			delete updateFields.groupId;
			continue;
		}

		if (key === 'assignedTo') {
			const assignedTo = this.getNodeParameter('updateFields.assignedTo', i, '', {
				extractValue: true,
			}) as string;

			updateFields.assignments = {
				[assignedTo]: {
					'@odata.type': 'microsoft.graph.plannerAssignment',
					orderHint: ' !',
				},
			};
			delete updateFields.assignedTo;
			continue;
		}

		if (['bucketId', 'planId'].includes(key)) {
			updateFields[key] = this.getNodeParameter(`updateFields.${key}`, i, '', {
				extractValue: true,
			}) as string;
		}

		if (key === 'dueDateTime' && updateFields.dueDateTime instanceof DateTime) {
			updateFields.dueDateTime = updateFields.dueDateTime.toISO();
		}
	}

	// `planId`/`bucketId` are written into the PATCH body; shape-validate them under SP
	// (defense-in-depth, same as task:create).
	validateTaskBodyIdsUnderSp.call(this, {
		planId: updateFields.planId as string | undefined,
		bucketId: updateFields.bucketId as string | undefined,
	});

	const body: IDataObject = {};
	Object.assign(body, updateFields);

	const taskPath = buildTeamsPath.call(this, ['/v1.0/planner/tasks/', { id: taskId }]);

	const task = await microsoftApiRequest.call(this, 'GET', taskPath);

	await microsoftApiRequest.call(this, 'PATCH', taskPath, body, {}, undefined, {
		'If-Match': task['@odata.etag'],
	});

	return { success: true };
}
